/**
 * Unified Messaging Service
 * خدمة الرسائل الموحدة
 * 
 * هذه الخدمة توحد إرسال الرسائل مع توضيح أن BeOn V3 لا يدعم WhatsApp فعلياً
 */

import { beonSMSService } from './sms-service';
import { BeOnResponse } from './config';

export interface MessageRequest {
  phoneNumbers: string[];
  message: string;
  preferredMethod?: 'sms' | 'whatsapp';
}

export class UnifiedMessagingService {
  
  /**
   * إرسال رسائل موحدة
   * Unified message sending
   */
  async sendMessage(request: MessageRequest): Promise<BeOnResponse> {
    const { phoneNumbers, message, preferredMethod = 'sms' } = request;
    
    console.log('📱 إرسال رسالة موحدة:', { 
      phoneCount: phoneNumbers.length, 
      messageLength: message.length,
      preferredMethod
    });

    if (preferredMethod === 'whatsapp') {
      // استخدام خاصية الشير لـ WhatsApp
      return this.sendWhatsAppShare(phoneNumbers, message);
    } else {
      // إرسال SMS عادي
      const result = await beonSMSService.sendBulkSMS(phoneNumbers, message);
      
      return {
        ...result,
        data: {
          ...result.data,
          preferredMethod,
          actualMethod: 'SMS'
        }
      };
    }
  }

  /**
   * إرسال رسائل WhatsApp باستخدام خاصية الشير
   * Send WhatsApp messages using share feature
   */
  private async sendWhatsAppShare(phoneNumbers: string[], message: string): Promise<BeOnResponse> {
    try {
      console.log('📱 إرسال WhatsApp باستخدام الشير:', { 
        phoneCount: phoneNumbers.length, 
        messageLength: message.length 
      });

      // إنشاء روابط WhatsApp محسنة مع التحقق من صحة الأرقام
      const whatsappLinks = phoneNumbers.map(phone => {
        // تنظيف وتنسيق رقم الهاتف
        let cleanPhone = phone.replace(/[^\d+]/g, '');
        
        // إزالة + إذا كانت موجودة
        if (cleanPhone.startsWith('+')) {
          cleanPhone = cleanPhone.substring(1);
        }
        
        // التحقق من أن الرقم يبدأ بـ 20 (مصر)
        if (!cleanPhone.startsWith('20')) {
          console.warn(`⚠️ رقم غير مصري: ${phone} -> ${cleanPhone}`);
        }
        
        // ترميز الرسالة مع دعم أفضل للنصوص العربية
        const encodedMessage = encodeURIComponent(message);
        
        // إنشاء رابط WhatsApp مع معلومات إضافية
        const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        console.log(`📱 رابط WhatsApp للرقم ${phone}:`, whatsappLink);
        
        return {
          phone: phone,
          cleanPhone: cleanPhone,
          link: whatsappLink,
          messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        };
      });

      // إرجاع النتائج مع روابط WhatsApp محسنة
      return {
        success: true,
        message: `تم إنشاء ${whatsappLinks.length} رابط WhatsApp بنجاح`,
        data: {
          method: 'whatsapp_share',
          phoneCount: phoneNumbers.length,
          whatsappLinks: whatsappLinks.map(item => item.link),
          detailedLinks: whatsappLinks,
          originalMessage: message,
          instructions: {
            step1: 'انقر على أي رابط لفتح WhatsApp',
            step2: 'تأكد من أن الرقم صحيح في WhatsApp',
            step3: 'انقر على "إرسال" لإرسال الرسالة',
            note: 'إذا لم يفتح WhatsApp، تأكد من تثبيت التطبيق'
          },
          troubleshooting: {
            problem1: 'الرابط لا يفتح WhatsApp',
            solution1: 'تأكد من تثبيت WhatsApp على الجهاز',
            problem2: 'الرسالة لا تظهر',
            solution2: 'انسخ الرسالة من النص الأصلي وألصقها في WhatsApp',
            problem3: 'الرقم غير صحيح',
            solution3: 'تحقق من رقم الهاتف في قاعدة البيانات'
          }
        }
      };
    } catch (error) {
      console.error('❌ خطأ في إنشاء روابط WhatsApp:', error);
      return {
        success: false,
        error: 'فشل في إنشاء روابط WhatsApp',
        data: { 
          error: error,
          message: 'حدث خطأ في إنشاء روابط WhatsApp. يرجى المحاولة مرة أخرى.'
        }
      };
    }
  }

  /**
   * إرسال رسالة واحدة
   * Send single message
   */
  async sendSingleMessage(phoneNumber: string, message: string, preferredMethod: 'sms' | 'whatsapp' = 'sms'): Promise<BeOnResponse> {
    return this.sendMessage({
      phoneNumbers: [phoneNumber],
      message,
      preferredMethod
    });
  }

  /**
   * إرسال رسائل جماعية
   * Send bulk messages
   */
  async sendBulkMessages(phoneNumbers: string[], message: string, preferredMethod: 'sms' | 'whatsapp' = 'sms'): Promise<BeOnResponse> {
    return this.sendMessage({
      phoneNumbers,
      message,
      preferredMethod
    });
  }
}

// Export singleton instance
export const unifiedMessagingService = new UnifiedMessagingService();



