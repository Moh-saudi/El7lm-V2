// @ts-ignore
import Tesseract from 'tesseract.js';

export interface ReceiptData {
  text: string;
  amount?: number;
  currency?: string;
  date?: string;
  transactionId?: string;
  merchantName?: string;
  confidence: number;
}

export interface ReceiptValidationResult {
  isValid: boolean;
  extractedAmount: number;
  expectedAmount: number;
  currency: string;
  matchPercentage: number;
  confidence: number;
  extractedData: ReceiptData;
}

export class ReceiptReader {
  private static instance: ReceiptReader;
  
  private constructor() {}
  
  public static getInstance(): ReceiptReader {
    if (!ReceiptReader.instance) {
      ReceiptReader.instance = new ReceiptReader();
    }
    return ReceiptReader.instance;
  }

  /**
   * قراءة النص من صورة الإيصال
   */
  async readReceipt(imageFile: File): Promise<ReceiptData> {
    try {
      console.log('🔍 بدء قراءة الإيصال...');
      
      const result = await Tesseract.recognize(
        imageFile,
        'ara+eng', // العربية والإنجليزية
        {
          logger: m => console.log('OCR Progress:', m)
        }
      );

      const extractedText = result.data.text;
      console.log('📝 النص المستخرج:', extractedText);

      // تحليل النص المستخرج
      const parsedData = this.parseReceiptText(extractedText);
      
      return {
        text: extractedText,
        ...parsedData,
        confidence: result.data.confidence
      };
    } catch (error) {
      console.error('❌ خطأ في قراءة الإيصال:', error);
      throw new Error('فشل في قراءة الإيصال');
    }
  }

  /**
   * تحليل النص المستخرج من الإيصال
   */
  private parseReceiptText(text: string): Partial<ReceiptData> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let amount: number | undefined;
    let currency: string | undefined;
    let date: string | undefined;
    let transactionId: string | undefined;
    let merchantName: string | undefined;

    // البحث عن المبلغ
    const amountPatterns = [
      /(?:المبلغ|المبلغ المدفوع|المبلغ الإجمالي|Total|Amount|Paid):\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*(?:ج\.م|جنيه|ريال|دولار|دينار|درهم|ليرة|د\.ك|ر\.س|SAR|EGP|USD|KWD|AED|LBP|KWD)/i,
      /(?:SAR|EGP|USD|KWD|AED|LBP|KWD)\s*([\d,]+\.?\d*)/i
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // البحث عن العملة
    const currencyPatterns = [
      /(ج\.م|جنيه|ريال|دولار|دينار|درهم|ليرة|د\.ك|ر\.س)/i,
      /(SAR|EGP|USD|KWD|AED|LBP|KWD)/i
    ];

    for (const pattern of currencyPatterns) {
      const match = text.match(pattern);
      if (match) {
        currency = match[1];
        break;
      }
    }

    // البحث عن التاريخ
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
      /(\d{4}-\d{1,2}-\d{1,2})/,
      /(?:التاريخ|Date):\s*([\d\/\-]+)/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        date = match[1];
        break;
      }
    }

    // البحث عن رقم المعاملة
    const transactionPatterns = [
      /(?:رقم المعاملة|رقم العملية|Transaction ID|Ref):\s*([A-Z0-9\-]+)/i,
      /([A-Z0-9]{8,})/i
    ];

    for (const pattern of transactionPatterns) {
      const match = text.match(pattern);
      if (match) {
        transactionId = match[1];
        break;
      }
    }

    // البحث عن اسم التاجر
    const merchantPatterns = [
      /(?:التاجر|المتجر|Merchant|Store):\s*([^\n]+)/i,
      /^([^\n]{3,50})$/m // السطر الأول (عادة اسم المتجر)
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchantName = match[1].trim();
        break;
      }
    }

    return {
      amount,
      currency,
      date,
      transactionId,
      merchantName
    };
  }

  /**
   * التحقق من صحة الإيصال مقارنة بالمبلغ المتوقع
   */
  async validateReceipt(
    imageFile: File, 
    expectedAmount: number, 
    expectedCurrency: string = 'EGP'
  ): Promise<ReceiptValidationResult> {
    try {
      const extractedData = await this.readReceipt(imageFile);
      
      if (!extractedData.amount) {
        return {
          isValid: false,
          extractedAmount: 0,
          expectedAmount,
          currency: expectedCurrency,
          matchPercentage: 0,
          confidence: extractedData.confidence,
          extractedData
        };
      }

      // تحويل العملات إذا لزم الأمر
      let extractedAmountInExpectedCurrency = extractedData.amount;
      if (extractedData.currency && extractedData.currency !== expectedCurrency) {
        extractedAmountInExpectedCurrency = await this.convertCurrency(
          extractedData.amount, 
          extractedData.currency, 
          expectedCurrency
        );
      }

      // حساب نسبة التطابق
      const matchPercentage = this.calculateMatchPercentage(
        extractedAmountInExpectedCurrency, 
        expectedAmount
      );

      // تحديد ما إذا كان الإيصال صحيح
      const isValid = matchPercentage >= 90; // 90% تطابق أو أكثر

      return {
        isValid,
        extractedAmount: extractedAmountInExpectedCurrency,
        expectedAmount,
        currency: expectedCurrency,
        matchPercentage,
        confidence: extractedData.confidence,
        extractedData
      };
    } catch (error) {
      console.error('❌ خطأ في التحقق من صحة الإيصال:', error);
      throw new Error('فشل في التحقق من صحة الإيصال');
    }
  }

  /**
   * حساب نسبة التطابق بين المبلغ المستخرج والمبلغ المتوقع
   */
  private calculateMatchPercentage(extracted: number, expected: number): number {
    if (expected === 0) return 0;
    
    const difference = Math.abs(extracted - expected);
    const percentage = ((expected - difference) / expected) * 100;
    
    return Math.max(0, Math.min(100, percentage));
  }

  /**
   * تحويل العملات (مبسط - يمكن استبداله بخدمة تحويل حقيقية)
   */
  private async convertCurrency(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<number> {
    // أسعار صرف مبسطة (يمكن استبدالها بخدمة API حقيقية)
    const exchangeRates: Record<string, number> = {
      'SAR': 0.13, // ريال سعودي إلى جنيه مصري
      'USD': 0.032, // دولار أمريكي إلى جنيه مصري
      'KWD': 0.098, // دينار كويتي إلى جنيه مصري
      'AED': 0.087, // درهم إماراتي إلى جنيه مصري
      'LBP': 0.000021, // ليرة لبنانية إلى جنيه مصري
      'EGP': 1 // جنيه مصري
    };

    const rate = exchangeRates[fromCurrency] || 1;
    return amount * rate;
  }

  /**
   * تحسين جودة الصورة قبل القراءة
   */
  async preprocessImage(imageFile: File): Promise<File> {
    // يمكن إضافة معالجة للصورة هنا (تحسين التباين، إزالة الضوضاء، إلخ)
    // حالياً نعيد الملف كما هو
    return imageFile;
  }

  /**
   * قراءة الإيصال مع معالجة مسبقة للصورة
   */
  async readReceiptWithPreprocessing(imageFile: File): Promise<ReceiptData> {
    const processedImage = await this.preprocessImage(imageFile);
    return this.readReceipt(processedImage);
  }
}

// تصدير نسخة واحدة من الخدمة
export const receiptReader = ReceiptReader.getInstance();
