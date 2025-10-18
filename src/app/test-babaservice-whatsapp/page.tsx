'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, Info, Loader2, MessageSquare, QrCode, Settings, Smartphone, Users, XCircle } from 'lucide-react';
import { useState } from 'react';

interface TestResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

interface Country {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  phoneCode: string;
  testNumber: string;
  region: string;
}

export default function TestBabaserviceWhatsAppPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [instanceId, setInstanceId] = useState('68F243B3A8D8D'); // Pre-filled from profile
  const [qrCode, setQrCode] = useState('');
  const [activeTab, setActiveTab] = useState('instance');
  const [resultsFilter, setResultsFilter] = useState<'all' | 'success' | 'error'>('all');
  const [whatsappNumber, setWhatsappNumber] = useState('97472053188@s.whatsapp.net');

  // Test data states
  const [testPhone, setTestPhone] = useState('966501234567');
  const [testMessage, setTestMessage] = useState('مرحباً! هذا اختبار لـ WhatsApp API الجديد 🚀');
  const [testGroupId, setTestGroupId] = useState('');
  const [testMediaUrl, setTestMediaUrl] = useState('https://i.pravatar.cc/300');
  const [testWebhookUrl, setTestWebhookUrl] = useState('https://webhook.site/your-unique-url');
  const [selectedCountry, setSelectedCountry] = useState('SA');

  // Generate comprehensive countries list with focus on Middle East, Africa, and North Africa
  const generateCountriesList = (): Country[] => {
    // Use comprehensive list directly instead of relying on world-countries library
    const countries = [
        // الدول العربية - الخليج العربي
        { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', phoneCode: '966', testNumber: '966501234567', region: 'Asia' },
        { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: '🇦🇪', phoneCode: '971', testNumber: '971501234567', region: 'Asia' },
        { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', phoneCode: '965', testNumber: '96550123456', region: 'Asia' },
        { code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', phoneCode: '974', testNumber: '97450123456', region: 'Asia' },
        { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', phoneCode: '973', testNumber: '97350123456', region: 'Asia' },
        { code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', phoneCode: '968', testNumber: '96850123456', region: 'Asia' },

        // الدول العربية - المشرق العربي
        { code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', phoneCode: '20', testNumber: '201234567890', region: 'Africa' },
        { code: 'JO', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', phoneCode: '962', testNumber: '962501234567', region: 'Asia' },
        { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧', phoneCode: '961', testNumber: '96150123456', region: 'Asia' },
        { code: 'SY', name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾', phoneCode: '963', testNumber: '963501234567', region: 'Asia' },
        { code: 'IQ', name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', phoneCode: '964', testNumber: '964501234567', region: 'Asia' },
        { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸', phoneCode: '970', testNumber: '970501234567', region: 'Asia' },

        // الدول العربية - المغرب العربي
        { code: 'MA', name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦', phoneCode: '212', testNumber: '212501234567', region: 'Africa' },
        { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿', phoneCode: '213', testNumber: '213501234567', region: 'Africa' },
        { code: 'TN', name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳', phoneCode: '216', testNumber: '21650123456', region: 'Africa' },
        { code: 'LY', name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾', phoneCode: '218', testNumber: '218501234567', region: 'Africa' },
        { code: 'SD', name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩', phoneCode: '249', testNumber: '249501234567', region: 'Africa' },
        { code: 'SS', name: 'South Sudan', nameAr: 'جنوب السودان', flag: '🇸🇸', phoneCode: '211', testNumber: '211501234567', region: 'Africa' },

        // الدول العربية - شبه الجزيرة العربية
        { code: 'YE', name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪', phoneCode: '967', testNumber: '967501234567', region: 'Asia' },

        // تركيا
        { code: 'TR', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷', phoneCode: '90', testNumber: '905551234567', region: 'Asia' },

        // إيران
        { code: 'IR', name: 'Iran', nameAr: 'إيران', flag: '🇮🇷', phoneCode: '98', testNumber: '989121234567', region: 'Asia' },

        // إسرائيل
        { code: 'IL', name: 'Israel', nameAr: 'إسرائيل', flag: '🇮🇱', phoneCode: '972', testNumber: '972501234567', region: 'Asia' },

        // الدول الأفريقية الرئيسية
        { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', flag: '🇿🇦', phoneCode: '27', testNumber: '27821234567', region: 'Africa' },
        { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', flag: '🇳🇬', phoneCode: '234', testNumber: '2348012345678', region: 'Africa' },
        { code: 'KE', name: 'Kenya', nameAr: 'كينيا', flag: '🇰🇪', phoneCode: '254', testNumber: '254701234567', region: 'Africa' },
        { code: 'ET', name: 'Ethiopia', nameAr: 'إثيوبيا', flag: '🇪🇹', phoneCode: '251', testNumber: '251911234567', region: 'Africa' },
        { code: 'GH', name: 'Ghana', nameAr: 'غانا', flag: '🇬🇭', phoneCode: '233', testNumber: '233241234567', region: 'Africa' },
        { code: 'CI', name: 'Ivory Coast', nameAr: 'ساحل العاج', flag: '🇨🇮', phoneCode: '225', testNumber: '22507123456', region: 'Africa' },
        { code: 'SN', name: 'Senegal', nameAr: 'السنغال', flag: '🇸🇳', phoneCode: '221', testNumber: '221701234567', region: 'Africa' },
        { code: 'ML', name: 'Mali', nameAr: 'مالي', flag: '🇲🇱', phoneCode: '223', testNumber: '22370123456', region: 'Africa' },
        { code: 'UG', name: 'Uganda', nameAr: 'أوغندا', flag: '🇺🇬', phoneCode: '256', testNumber: '256701234567', region: 'Africa' },
        { code: 'TZ', name: 'Tanzania', nameAr: 'تنزانيا', flag: '🇹🇿', phoneCode: '255', testNumber: '255701234567', region: 'Africa' },
        { code: 'RW', name: 'Rwanda', nameAr: 'رواندا', flag: '🇷🇼', phoneCode: '250', testNumber: '250701234567', region: 'Africa' },
        { code: 'BI', name: 'Burundi', nameAr: 'بوروندي', flag: '🇧🇮', phoneCode: '257', testNumber: '257701234567', region: 'Africa' },
        { code: 'MW', name: 'Malawi', nameAr: 'ملاوي', flag: '🇲🇼', phoneCode: '265', testNumber: '265701234567', region: 'Africa' },
        { code: 'ZM', name: 'Zambia', nameAr: 'زامبيا', flag: '🇿🇲', phoneCode: '260', testNumber: '260701234567', region: 'Africa' },
        { code: 'ZW', name: 'Zimbabwe', nameAr: 'زيمبابوي', flag: '🇿🇼', phoneCode: '263', testNumber: '263701234567', region: 'Africa' },
        { code: 'BW', name: 'Botswana', nameAr: 'بوتسوانا', flag: '🇧🇼', phoneCode: '267', testNumber: '267701234567', region: 'Africa' },
        { code: 'NA', name: 'Namibia', nameAr: 'ناميبيا', flag: '🇳🇦', phoneCode: '264', testNumber: '264701234567', region: 'Africa' },
        { code: 'SZ', name: 'Eswatini', nameAr: 'إسواتيني', flag: '🇸🇿', phoneCode: '268', testNumber: '268701234567', region: 'Africa' },
        { code: 'LS', name: 'Lesotho', nameAr: 'ليسوتو', flag: '🇱🇸', phoneCode: '266', testNumber: '266701234567', region: 'Africa' },
        { code: 'MZ', name: 'Mozambique', nameAr: 'موزمبيق', flag: '🇲🇿', phoneCode: '258', testNumber: '258701234567', region: 'Africa' },
        { code: 'MG', name: 'Madagascar', nameAr: 'مدغشقر', flag: '🇲🇬', phoneCode: '261', testNumber: '261701234567', region: 'Africa' },
        { code: 'MU', name: 'Mauritius', nameAr: 'موريشيوس', flag: '🇲🇺', phoneCode: '230', testNumber: '230701234567', region: 'Africa' },
        { code: 'SC', name: 'Seychelles', nameAr: 'سيشل', flag: '🇸🇨', phoneCode: '248', testNumber: '248701234567', region: 'Africa' },
        { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر', flag: '🇰🇲', phoneCode: '269', testNumber: '269701234567', region: 'Africa' },
        { code: 'AO', name: 'Angola', nameAr: 'أنغولا', flag: '🇦🇴', phoneCode: '244', testNumber: '244701234567', region: 'Africa' },
        { code: 'CD', name: 'DR Congo', nameAr: 'جمهورية الكونغو الديمقراطية', flag: '🇨🇩', phoneCode: '243', testNumber: '243701234567', region: 'Africa' },
        { code: 'CG', name: 'Congo', nameAr: 'جمهورية الكونغو', flag: '🇨🇬', phoneCode: '242', testNumber: '242701234567', region: 'Africa' },
        { code: 'CF', name: 'Central African Republic', nameAr: 'جمهورية أفريقيا الوسطى', flag: '🇨🇫', phoneCode: '236', testNumber: '236701234567', region: 'Africa' },
        { code: 'TD', name: 'Chad', nameAr: 'تشاد', flag: '🇹🇩', phoneCode: '235', testNumber: '235701234567', region: 'Africa' },
        { code: 'CM', name: 'Cameroon', nameAr: 'الكاميرون', flag: '🇨🇲', phoneCode: '237', testNumber: '237701234567', region: 'Africa' },
        { code: 'GQ', name: 'Equatorial Guinea', nameAr: 'غينيا الاستوائية', flag: '🇬🇶', phoneCode: '240', testNumber: '240701234567', region: 'Africa' },
        { code: 'GA', name: 'Gabon', nameAr: 'الغابون', flag: '🇬🇦', phoneCode: '241', testNumber: '241701234567', region: 'Africa' },
        { code: 'ST', name: 'São Tomé and Príncipe', nameAr: 'ساو تومي وبرينسيبي', flag: '🇸🇹', phoneCode: '239', testNumber: '239701234567', region: 'Africa' },
        { code: 'BJ', name: 'Benin', nameAr: 'بنين', flag: '🇧🇯', phoneCode: '229', testNumber: '229701234567', region: 'Africa' },
        { code: 'TG', name: 'Togo', nameAr: 'توغو', flag: '🇹🇬', phoneCode: '228', testNumber: '228701234567', region: 'Africa' },
        { code: 'BF', name: 'Burkina Faso', nameAr: 'بوركينا فاسو', flag: '🇧🇫', phoneCode: '226', testNumber: '226701234567', region: 'Africa' },
        { code: 'LR', name: 'Liberia', nameAr: 'ليبيريا', flag: '🇱🇷', phoneCode: '231', testNumber: '231701234567', region: 'Africa' },
        { code: 'SL', name: 'Sierra Leone', nameAr: 'سيراليون', flag: '🇸🇱', phoneCode: '232', testNumber: '232701234567', region: 'Africa' },
        { code: 'GN', name: 'Guinea', nameAr: 'غينيا', flag: '🇬🇳', phoneCode: '224', testNumber: '224701234567', region: 'Africa' },
        { code: 'GW', name: 'Guinea-Bissau', nameAr: 'غينيا بيساو', flag: '🇬🇼', phoneCode: '245', testNumber: '245701234567', region: 'Africa' },
        { code: 'GM', name: 'Gambia', nameAr: 'غامبيا', flag: '🇬🇲', phoneCode: '220', testNumber: '220701234567', region: 'Africa' },
        { code: 'NE', name: 'Niger', nameAr: 'النيجر', flag: '🇳🇪', phoneCode: '227', testNumber: '227701234567', region: 'Africa' },
        { code: 'ER', name: 'Eritrea', nameAr: 'إريتريا', flag: '🇪🇷', phoneCode: '291', testNumber: '291701234567', region: 'Africa' },
        { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي', flag: '🇩🇯', phoneCode: '253', testNumber: '253701234567', region: 'Africa' },
        { code: 'SO', name: 'Somalia', nameAr: 'الصومال', flag: '🇸🇴', phoneCode: '252', testNumber: '252701234567', region: 'Africa' },

        // دول آسيوية مهمة
        { code: 'AF', name: 'Afghanistan', nameAr: 'أفغانستان', flag: '🇦🇫', phoneCode: '93', testNumber: '93701234567', region: 'Asia' },
        { code: 'PK', name: 'Pakistan', nameAr: 'باكستان', flag: '🇵🇰', phoneCode: '92', testNumber: '923001234567', region: 'Asia' },
        { code: 'BD', name: 'Bangladesh', nameAr: 'بنغلاديش', flag: '🇧🇩', phoneCode: '880', testNumber: '8801712345678', region: 'Asia' },
        { code: 'IN', name: 'India', nameAr: 'الهند', flag: '🇮🇳', phoneCode: '91', testNumber: '919876543210', region: 'Asia' },
        { code: 'CN', name: 'China', nameAr: 'الصين', flag: '🇨🇳', phoneCode: '86', testNumber: '8613812345678', region: 'Asia' },
        { code: 'JP', name: 'Japan', nameAr: 'اليابان', flag: '🇯🇵', phoneCode: '81', testNumber: '819012345678', region: 'Asia' },
        { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', flag: '🇰🇷', phoneCode: '82', testNumber: '821012345678', region: 'Asia' },
        { code: 'TH', name: 'Thailand', nameAr: 'تايلاند', flag: '🇹🇭', phoneCode: '66', testNumber: '66812345678', region: 'Asia' },
        { code: 'VN', name: 'Vietnam', nameAr: 'فيتنام', flag: '🇻🇳', phoneCode: '84', testNumber: '84901234567', region: 'Asia' },
        { code: 'ID', name: 'Indonesia', nameAr: 'إندونيسيا', flag: '🇮🇩', phoneCode: '62', testNumber: '628123456789', region: 'Asia' },
        { code: 'MY', name: 'Malaysia', nameAr: 'ماليزيا', flag: '🇲🇾', phoneCode: '60', testNumber: '60123456789', region: 'Asia' },
        { code: 'SG', name: 'Singapore', nameAr: 'سنغافورة', flag: '🇸🇬', phoneCode: '65', testNumber: '6512345678', region: 'Asia' },
        { code: 'PH', name: 'Philippines', nameAr: 'الفلبين', flag: '🇵🇭', phoneCode: '63', testNumber: '639171234567', region: 'Asia' },

        // دول أوروبية مهمة
        { code: 'RU', name: 'Russia', nameAr: 'روسيا', flag: '🇷🇺', phoneCode: '7', testNumber: '79161234567', region: 'Europe' },
        { code: 'GB', name: 'United Kingdom', nameAr: 'بريطانيا', flag: '🇬🇧', phoneCode: '44', testNumber: '447501234567', region: 'Europe' },
        { code: 'FR', name: 'France', nameAr: 'فرنسا', flag: '🇫🇷', phoneCode: '33', testNumber: '33612345678', region: 'Europe' },
        { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪', phoneCode: '49', testNumber: '4915123456789', region: 'Europe' },
        { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', flag: '🇮🇹', phoneCode: '39', testNumber: '393123456789', region: 'Europe' },
        { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', flag: '🇪🇸', phoneCode: '34', testNumber: '34612345678', region: 'Europe' },

        // دول أمريكية مهمة
        { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', flag: '🇺🇸', phoneCode: '1', testNumber: '15551234567', region: 'Americas' },
        { code: 'CA', name: 'Canada', nameAr: 'كندا', flag: '🇨🇦', phoneCode: '1', testNumber: '15551234567', region: 'Americas' },
        { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', flag: '🇧🇷', phoneCode: '55', testNumber: '5511987654321', region: 'Americas' },
        { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', flag: '🇦🇷', phoneCode: '54', testNumber: '549112345678', region: 'Americas' },

        // دول أوقيانوسية
        { code: 'AU', name: 'Australia', nameAr: 'أستراليا', flag: '🇦🇺', phoneCode: '61', testNumber: '61412345678', region: 'Oceania' },
        { code: 'NZ', name: 'New Zealand', nameAr: 'نيوزيلندا', flag: '🇳🇿', phoneCode: '64', testNumber: '64211234567', region: 'Oceania' }
      ];

    // ترتيب الدول مع إعطاء الأولوية للدول العربية والأفريقية
    return countries.sort((a, b) => {
      const arabicCountries = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'];
      const africanCountries = ['ZA', 'NG', 'KE', 'ET', 'GH', 'CI', 'SN', 'ML', 'UG', 'TZ', 'RW', 'BI', 'MW', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MZ', 'MG', 'MU', 'SC', 'KM', 'AO', 'CD', 'CG', 'CF', 'TD', 'CM', 'GQ', 'GA', 'ST', 'BJ', 'TG', 'BF', 'LR', 'SL', 'GN', 'GW', 'GM', 'NE', 'ER', 'DJ', 'SO'];

      const aIsArabic = arabicCountries.includes(a.code);
      const bIsArabic = arabicCountries.includes(b.code);
      const aIsAfrican = africanCountries.includes(a.code);
      const bIsAfrican = africanCountries.includes(b.code);

      // الدول العربية أولاً
      if (aIsArabic && !bIsArabic) return -1;
      if (!aIsArabic && bIsArabic) return 1;

      // الدول الأفريقية ثانياً
      if (aIsAfrican && !bIsAfrican && !bIsArabic) return -1;
      if (!aIsAfrican && bIsAfrican && !aIsArabic) return 1;

      // ترتيب أبجدي للأسماء العربية
      return a.nameAr.localeCompare(b.nameAr, 'ar');
    });
  };

  const countriesList = generateCountriesList();

  // Debug: التأكد من وجود الدول العربية
  console.log('🌍 قائمة البلدان:', countriesList.length, 'دولة');
  const arabicCountries = countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code));
  console.log('🇸🇦 الدول العربية:', arabicCountries.length, 'دولة');
  console.log('🇸🇦 أسماء الدول العربية:', arabicCountries.map(c => `${c.flag} ${c.nameAr} (${c.code})`));
  console.log('🇸🇦 أول 5 دول عربية:', arabicCountries.slice(0, 5).map(c => c.nameAr));

  // إضافة متغير للدول العربية
  const arabicCountriesList = countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code));
  const nonArabicCountriesList = countriesList.filter(c => !['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code));

  const addResult = (result: TestResult) => {
    console.log('📊 إضافة نتيجة:', result);
    setResults(prev => [result, ...prev]);
  };

  // دالة مساعدة لمعالجة الاستجابات
  const handleApiResponse = async (response: Response, context: string) => {
    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error(`❌ استجابة غير صحيحة لـ ${context}:`, textResponse);
      return {
        success: false,
        error: `خطأ في الخادم: ${response.status} ${response.statusText}`,
        data: {
          response: textResponse.substring(0, 200) + '...',
          status: response.status,
          statusText: response.statusText
        }
      };
    }

    try {
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`❌ خطأ في تحليل JSON لـ ${context}:`, error);
      return {
        success: false,
        error: 'خطأ في تحليل استجابة الخادم',
        data: { error: error.toString() }
      };
    }
  };

  // Function to handle country selection
  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    const selectedCountryData = countriesList.find(country => country.code === countryCode);
    if (selectedCountryData) {
      setTestPhone(selectedCountryData.testNumber);
    }
  };

  // Get current selected country data
  const currentCountry = countriesList.find(country => country.code === selectedCountry);

  // Function to test multiple countries
  const testMultipleCountries = async () => {
    if (!instanceId) {
      addResult({
        success: false,
        message: 'اختبار متعدد البلدان',
        error: 'يجب إنشاء Instance أولاً قبل إرسال الرسائل'
      });
      return;
    }

    setLoading(true);
    const testCountries = countriesList.slice(0, 5); // Test first 5 countries

    for (const country of testCountries) {
      try {
        const response = await fetch('/api/whatsapp/babaservice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_text',
            data: {
              phoneNumber: country.testNumber,
              message: `مرحباً من ${country.flag} ${country.name}! هذا اختبار لـ WhatsApp API الجديد 🚀`,
              instance_id: instanceId
            }
          })
        });

        const result = await handleApiResponse(response, `${country.name}`);
        addResult({
          success: response.ok && result.success,
          message: `رسالة إلى ${country.flag} ${country.name} (${country.testNumber})`,
          data: result,
          error: response.ok && result.success ? null : result.error || 'خطأ غير معروف'
        });
      } catch (error) {
        console.error(`❌ خطأ في ${country.name}:`, error);
        addResult({
          success: false,
          message: `رسالة إلى ${country.flag} ${country.name} (${country.testNumber})`,
          error: error instanceof Error ? error.message : 'خطأ في الاتصال',
          data: { error: error.toString() }
        });
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setLoading(false);
  };

  const testAPI = async (action: string, data: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/babaservice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await handleApiResponse(response, action);
      addResult(result);

      if (result.success && result.data?.instance_id) {
        setInstanceId(result.data.instance_id);
      }

      if (result.success && result.data?.qr_code) {
        setQrCode(result.data.qr_code);
      }

    } catch (error: any) {
      console.error('❌ خطأ في API:', error);
      addResult({
        success: false,
        error: error.message || 'حدث خطأ في الاتصال',
        data: { error: error.toString() }
      });
    } finally {
      setLoading(false);
    }
  };

  const testOTP = async () => {
    if (!instanceId) {
      addResult({
        success: false,
        message: 'اختبار OTP',
        error: 'يجب إنشاء Instance أولاً قبل إرسال OTP'
      });
      return;
    }

    setLoading(true);
    try {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();

      const requestBody = {
        phoneNumber: testPhone, // إرسال الرقم كما هو (سيتم تنسيقه في الـ backend)
        otp: otp,
        name: 'مستخدم الاختبار',
        instance_id: instanceId
      };

      console.log('📤 إرسال OTP:', requestBody);

      const response = await fetch('/api/whatsapp/babaservice/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await handleApiResponse(response, 'OTP');
      addResult(result);

    } catch (error: any) {
      console.error('❌ خطأ في OTP:', error);
      addResult({
        success: false,
        error: error.message || 'حدث خطأ في إرسال OTP',
        data: { error: error.toString() }
      });
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async () => {
    if (!instanceId) {
      addResult({
        success: false,
        message: 'اختبار الإشعارات',
        error: 'يجب إنشاء Instance أولاً قبل إرسال الإشعارات'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/babaservice/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test',
          phoneNumbers: [testPhone],
          message: testMessage,
          instance_id: instanceId
        }),
      });

      const result = await handleApiResponse(response, 'الإشعارات');
      addResult(result);

    } catch (error: any) {
      console.error('❌ خطأ في الإشعارات:', error);
      addResult({
        success: false,
        error: error.message || 'حدث خطأ في إرسال الإشعارات',
        data: { error: error.toString() }
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Enhanced Header with Stats */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-green-500 to-blue-600 p-4 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
                <MessageSquare className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  اختبار Babaservice WhatsApp API
                </h1>
                <p className="text-gray-600 mt-1">منصة اختبار شاملة لجميع وظائف WhatsApp API الجديد</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex flex-col items-end gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${
                instanceId
                  ? 'bg-green-100 border-2 border-green-400 shadow-lg shadow-green-100'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  instanceId ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className={`text-sm font-bold ${
                  instanceId ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {instanceId ? '🟢 متصل' : '⚪ غير متصل'}
                </span>
              </div>

              {instanceId && (
                <div className="bg-blue-50 border-2 border-blue-200 px-3 py-1 rounded-lg">
                  <span className="text-xs text-blue-700 font-mono font-semibold">
                    ID: {instanceId.substring(0, 10)}...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">نجح</p>
                  <p className="text-3xl font-bold text-green-700 mt-1">
                    {results.filter(r => r.success).length}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    {results.length > 0 ? `${Math.round((results.filter(r => r.success).length / results.length) * 100)}%` : '0%'}
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-30" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">فشل</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">
                    {results.filter(r => !r.success).length}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {results.length > 0 ? `${Math.round((results.filter(r => !r.success).length / results.length) * 100)}%` : '0%'}
                  </p>
                </div>
                <XCircle className="h-10 w-10 text-red-500 opacity-30" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">المجموع</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{results.length}</p>
                  <p className="text-xs text-blue-500 mt-1">اختبار</p>
                </div>
                <MessageSquare className="h-10 w-10 text-blue-500 opacity-30" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-semibold uppercase tracking-wide">البلدان</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">{arabicCountriesList.length}</p>
                  <p className="text-xs text-purple-500 mt-1">دولة عربية</p>
                </div>
                <Users className="h-10 w-10 text-purple-500 opacity-30" />
              </div>
            </div>
          </div>
        </div>

      {/* Monthly Limit Warning */}
      <Alert className="border-red-300 bg-gradient-to-r from-red-50 to-orange-50 shadow-xl">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-800 font-bold text-lg">⚠️ تحذير: تجاوز حد الرسائل الشهري</AlertTitle>
        <AlertDescription className="text-red-700 mt-2 space-y-3">
          <p className="font-semibold">
            تم تجاوز الحد الأقصى لعدد الرسائل المسموح بها شهرياً لحساب WhatsApp الخاص بك
          </p>
          <div className="bg-white rounded-lg p-4 border-2 border-red-200">
            <p className="text-sm text-gray-700 mb-2"><strong>رسالة الخطأ:</strong></p>
            <code className="text-xs bg-red-100 text-red-800 p-2 rounded block">
              "The number of messages you have sent per month has exceeded the maximum limit"
            </code>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-red-800">🔧 الحلول الممكنة:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>انتظر حتى بداية الشهر القادم لإعادة تعيين الحد</li>
              <li>تواصل مع دعم Babaservice لرفع الحد الشهري</li>
              <li>ترقية الحساب إلى خطة أعلى (إذا كانت متوفرة)</li>
              <li>استخدم حساب WhatsApp Business API مختلف</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
            <p className="text-sm text-yellow-800">
              <strong>ℹ️ ملاحظة:</strong> يمكنك الاستمرار في اختبار الوظائف الأخرى مثل إدارة Instance والحصول على QR Code
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="instance" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <TabsTrigger value="instance" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium">
            إدارة Instance
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium">
            الرسائل
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium">
            المجموعات
          </TabsTrigger>
          <TabsTrigger value="otp" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium">
            OTP
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white font-medium">
            الإشعارات
          </TabsTrigger>
        </TabsList>

        {/* Instance Management Tab */}
        <TabsContent value="instance" className="space-y-4">
          {/* Important Notice */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">مهم: خطوات العمل</AlertTitle>
            <AlertDescription className="text-blue-700">
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>انقر على "إنشاء Instance" لإنشاء معرف جديد</li>
                <li>انقر على "الحصول على QR Code" لعرض رمز الاستجابة السريعة</li>
                <li>امسح الرمز بـ WhatsApp على هاتفك</li>
                <li>بعد الاتصال، يمكنك استخدام باقي التبويبات لإرسال الرسائل</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Enhanced Instance Management Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Controls */}
            <div className="lg:col-span-2">
              <Card className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100">
                <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg">
                        <Settings className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">إدارة Instance</CardTitle>
                        <CardDescription className="text-green-100 mt-1">
                          إنشاء وإدارة اتصالك بـ WhatsApp
                        </CardDescription>
                      </div>
                    </div>
                    {instanceId && (
                      <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                        <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold">نشط</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Primary Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => testAPI('create_instance')}
                      disabled={loading}
                      className="w-full h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      <div className="flex items-center gap-3">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Settings className="h-6 w-6" />}
                        <div className="text-left">
                          <div>إنشاء Instance جديد</div>
                          <div className="text-xs opacity-90 font-normal">خطوة 1: إنشاء معرف</div>
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() => testAPI('get_qr_code', { instance_id: instanceId })}
                      disabled={loading || !instanceId}
                      className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <QrCode className="h-6 w-6" />}
                        <div className="text-left">
                          <div>الحصول على QR Code</div>
                          <div className="text-xs opacity-90 font-normal">خطوة 2: مسح الرمز</div>
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Instance Info */}
                  {instanceId && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-8 w-8 text-green-600" />
                          <div>
                            <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Instance ID</p>
                            <p className="text-lg font-mono font-bold text-green-800 mt-1">{instanceId}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(instanceId);
                            addResult({ success: true, message: 'تم نسخ Instance ID' });
                          }}
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-100"
                        >
                          📋 نسخ
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-medium">Instance نشط وجاهز للاستخدام</span>
                      </div>
                    </div>
                  )}

                  {/* Enhanced QR Code Display */}
                  {qrCode && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-xl font-bold text-gray-800">🔗 QR Code للاتصال</Label>
                        <Button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrCode;
                            link.download = `whatsapp-qr-${instanceId}.png`;
                            link.click();
                            addResult({ success: true, message: 'تم تنزيل QR Code' });
                          }}
                          variant="outline"
                          size="sm"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                        >
                          💾 تنزيل
                        </Button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative p-8 bg-white border-4 border-purple-200 rounded-2xl shadow-2xl">
                          <img src={qrCode} alt="QR Code" className="mx-auto rounded-xl shadow-xl max-w-xs" />
                          <p className="text-center mt-4 text-sm text-gray-600 font-medium">
                            امسح الرمز بـ WhatsApp على هاتفك
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advanced Controls */}
                  <div className="space-y-3">
                    <Label className="text-lg font-bold text-gray-800">⚙️ إجراءات متقدمة</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        onClick={() => testAPI('reboot', { instance_id: instanceId })}
                        disabled={loading || !instanceId}
                        className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        🔄 إعادة تشغيل
                      </Button>

                      <Button
                        onClick={() => testAPI('reconnect', { instance_id: instanceId })}
                        disabled={loading || !instanceId}
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        🔌 إعادة اتصال
                      </Button>

                      <Button
                        onClick={() => testAPI('reset', { instance_id: instanceId })}
                        disabled={loading || !instanceId}
                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        ♻️ إعادة تعيين
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats & Actions Sidebar */}
            <div className="lg:col-span-1">
              <Card className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100 sticky top-6">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-2xl">
                  <CardTitle className="text-lg font-bold">📊 معلومات سريعة</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Connection Status */}
                  <div className={`p-4 rounded-xl ${instanceId ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full ${instanceId ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="font-bold text-sm">حالة الاتصال</span>
                    </div>
                    <p className={`text-xs ${instanceId ? 'text-green-700' : 'text-gray-600'}`}>
                      {instanceId ? '✓ متصل ونشط' : '✗ غير متصل'}
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-gray-700 mb-3">⚡ إجراءات سريعة</p>

                    <Button
                      onClick={() => setActiveTab('messages')}
                      disabled={!instanceId}
                      className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm py-2 rounded-lg shadow-md disabled:opacity-50"
                    >
                      📱 إرسال رسالة
                    </Button>

                    <Button
                      onClick={() => setActiveTab('otp')}
                      disabled={!instanceId}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm py-2 rounded-lg shadow-md disabled:opacity-50"
                    >
                      🔐 إرسال OTP
                    </Button>

                    <Button
                      onClick={() => setActiveTab('groups')}
                      disabled={!instanceId}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm py-2 rounded-lg shadow-md disabled:opacity-50"
                    >
                      👥 المجموعات
                    </Button>
                  </div>

                  {/* WhatsApp Profile */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-800">حساب WhatsApp</p>
                        <p className="text-xs text-green-600">El7lm منصة الحلم</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-gray-500 text-[10px] uppercase">WhatsApp ID</p>
                        <p className="font-mono text-green-700 font-semibold break-all">{whatsappNumber}</p>
                      </div>

                      <div className="bg-white rounded-lg p-2">
                        <p className="text-gray-500 text-[10px] uppercase">Instance ID</p>
                        <p className="font-mono text-green-700 font-semibold">{instanceId}</p>
                      </div>

                      <div className="bg-white rounded-lg p-2">
                        <p className="text-gray-500 text-[10px] uppercase">Access Token</p>
                        <p className="font-mono text-green-700 font-semibold">68f0029b4ce90</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const info = `WhatsApp: ${whatsappNumber}\nInstance: ${instanceId}\nToken: 68f0029b4ce90`;
                        navigator.clipboard.writeText(info);
                        addResult({ success: true, message: 'تم نسخ معلومات الحساب' });
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full border-green-300 text-green-700 hover:bg-green-100 mt-2"
                    >
                      📋 نسخ كل المعلومات
                    </Button>
                  </div>

                  {/* API Info */}
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-bold text-gray-700 mb-2">🔧 معلومات API</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base URL:</span>
                        <span className="font-mono text-gray-800">babaservice.online</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Version:</span>
                        <span className="font-mono text-gray-800">v1.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">الحالة:</span>
                        <span className="text-green-600 font-semibold">✓ نشط</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {/* Instance Status Alert */}
          {!instanceId && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">تحذير: Instance غير موجود</AlertTitle>
              <AlertDescription className="text-red-700">
                يجب إنشاء Instance أولاً من تبويب "إدارة Instance" قبل إرسال الرسائل
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setActiveTab('instance')}
                >
                  انتقل إلى إدارة Instance
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {instanceId && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Instance جاهز</AlertTitle>
              <AlertDescription className="text-green-700">
                Instance ID: <code className="bg-green-100 px-2 py-1 rounded text-sm">{instanceId}</code>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-6 w-6" />
                إرسال الرسائل
              </CardTitle>
              <CardDescription className="text-blue-100">
                اختبار إرسال الرسائل النصية والميديا
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Debug Button */}
              <Button
                onClick={() => {
                  const arabicList = countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code));
                  console.log('📋 قائمة الدول العربية الكاملة:', arabicList);
                  console.log('🇪🇬 مصر موجودة؟', arabicList.find(c => c.code === 'EG'));
                  alert(`عدد الدول العربية: ${arabicList.length}\nمصر موجودة: ${arabicList.find(c => c.code === 'EG') ? 'نعم ✅' : 'لا ❌'}`);
                }}
                variant="outline"
                size="sm"
                className="mb-2"
              >
                🔍 فحص قائمة البلدان
              </Button>

              {/* Country Selection */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold text-gray-700">اختر البلد للاختبار</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="countrySelect">البلد</Label>
                    <Select value={selectedCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="اختر البلد" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]" position="popper" side="bottom" sideOffset={5}>
                        {/* الدول العربية أولاً */}
                        {countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{country.flag}</span>
                              <span className="font-bold text-green-700">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">عربي</span>
                            </div>
                          </SelectItem>
                        ))}

                        {/* باقي الدول */}
                        {countriesList.filter(c => !['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{country.flag}</span>
                              <span className="font-medium">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testPhone">رقم الهاتف التجريبي</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="testPhone"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="966501234567"
                        className="h-12"
                      />
                      {currentCountry && (
                        <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg">
                          <span className="text-lg">{currentCountry.flag}</span>
                          <span className="text-sm font-medium">+{currentCountry.phoneCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMessage">الرسالة</Label>
                <Textarea
                  id="testMessage"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => testAPI('send_text', {
                    phoneNumber: testPhone,
                    message: testMessage,
                    instance_id: instanceId
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                  إرسال رسالة نصية
                </Button>

                <Button
                  onClick={() => testAPI('send_media', {
                    phoneNumber: testPhone,
                    message: testMessage,
                    media_url: testMediaUrl,
                    instance_id: instanceId
                  })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                  إرسال رسالة مع ميديا
                </Button>
              </div>

              {/* Multi-Country Test */}
              <div className="border-t pt-4">
                <div className="text-center space-y-3">
                  <h3 className="text-lg font-semibold text-gray-700">اختبار متعدد البلدان</h3>
                  <p className="text-sm text-gray-600">إرسال رسائل تجريبية لعدة بلدان في نفس الوقت</p>
                  <Button
                    onClick={testMultipleCountries}
                    disabled={loading || !instanceId}
                    className="bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                    اختبار 5 بلدان
                  </Button>
                  <p className="text-xs text-gray-500">
                    سيتم إرسال رسائل إلى أول 5 بلدان في القائمة (الشرق الأوسط وأفريقيا أولاً)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testMediaUrl">رابط الميديا</Label>
                <Input
                  id="testMediaUrl"
                  value={testMediaUrl}
                  onChange={(e) => setTestMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          {/* Instance Status Alert */}
          {!instanceId && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">تحذير: Instance غير موجود</AlertTitle>
              <AlertDescription className="text-red-700">
                يجب إنشاء Instance أولاً من تبويب "إدارة Instance" قبل إدارة المجموعات
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setActiveTab('instance')}
                >
                  انتقل إلى إدارة Instance
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {instanceId && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Instance جاهز</AlertTitle>
              <AlertDescription className="text-green-700">
                Instance ID: <code className="bg-green-100 px-2 py-1 rounded text-sm">{instanceId}</code>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-6 w-6" />
                إدارة المجموعات
              </CardTitle>
              <CardDescription className="text-indigo-100">
                الحصول على المجموعات وإرسال رسائل للمجموعات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testGroupId">معرف المجموعة</Label>
                <Input
                  id="testGroupId"
                  value={testGroupId}
                  onChange={(e) => setTestGroupId(e.target.value)}
                  placeholder="84987694574-1618740914@g.us"
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => testAPI('get_groups', { instance_id: instanceId })}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
                  الحصول على المجموعات
                </Button>

                <Button
                  onClick={() => testAPI('send_group_text', {
                    group_id: testGroupId,
                    message: testMessage,
                    instance_id: instanceId
                  })}
                  disabled={loading || !testGroupId}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
                  إرسال للمجموعة
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OTP Tab */}
        <TabsContent value="otp" className="space-y-6">
          {/* Instance Status Alert */}
          {!instanceId && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">تحذير: Instance غير موجود</AlertTitle>
              <AlertDescription className="text-red-700">
                يجب إنشاء Instance أولاً من تبويب "إدارة Instance" قبل إرسال OTP
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setActiveTab('instance')}
                >
                  انتقل إلى إدارة Instance
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {instanceId && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Instance جاهز</AlertTitle>
              <AlertDescription className="text-green-700">
                Instance ID: <code className="bg-green-100 px-2 py-1 rounded text-sm">{instanceId}</code>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Smartphone className="h-6 w-6" />
                إرسال OTP
              </CardTitle>
              <CardDescription className="text-orange-100">
                اختبار إرسال رموز التحقق عبر WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Country Selection for OTP */}
              <div className="space-y-4">
                <div className="text-center">
                  <Label className="text-xl font-bold text-gray-800">اختر البلد لإرسال OTP</Label>
                  <p className="text-sm text-gray-600 mt-1">اختر البلد ورقم الهاتف لإرسال رمز التحقق</p>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      🇸🇦 الدول العربية ({arabicCountriesList.length} دولة) تظهر في المقدمة مع تمييز أخضر
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="otpCountrySelect" className="text-base font-semibold text-gray-700">البلد</Label>
                    <Select value={selectedCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-14 text-base">
                        <SelectValue placeholder="اختر البلد" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]" position="popper" side="bottom" sideOffset={5}>
                        {/* الدول العربية أولاً */}
                        {countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{country.flag}</span>
                              <span className="font-bold text-green-700">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">عربي</span>
                            </div>
                          </SelectItem>
                        ))}

                        {/* باقي الدول */}
                        {countriesList.filter(c => !['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{country.flag}</span>
                              <span className="font-medium">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="otpTestPhone" className="text-base font-semibold text-gray-700">رقم الهاتف التجريبي</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="otpTestPhone"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="966501234567"
                        className="h-14 text-base"
                      />
                      {currentCountry && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-100 to-red-100 rounded-lg border border-orange-200">
                          <span className="text-xl">{currentCountry.flag}</span>
                          <span className="text-sm font-bold text-orange-800">+{currentCountry.phoneCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={testOTP}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Smartphone className="h-6 w-6" />}
                  إرسال OTP تجريبي
                </Button>
              </div>

              <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 border-l-4 border-l-orange-500">
                <AlertDescription className="text-orange-800">
                  <div className="space-y-2">
                    <p className="font-semibold">
                      سيتم إرسال OTP عشوائي إلى الرقم:
                      <Badge className="bg-orange-100 text-orange-800 border-orange-300 ml-2">{testPhone}</Badge>
                    </p>
                    {currentCountry && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">البلد:</span>
                        <span className="text-lg">{currentCountry.flag}</span>
                        <span className="font-semibold">{currentCountry.name}</span>
                        <span className="text-orange-600">(+{currentCountry.phoneCode})</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Instance Status Alert */}
          {!instanceId && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">تحذير: Instance غير موجود</AlertTitle>
              <AlertDescription className="text-red-700">
                يجب إنشاء Instance أولاً من تبويب "إدارة Instance" قبل إرسال الإشعارات
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => setActiveTab('instance')}
                >
                  انتقل إلى إدارة Instance
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {instanceId && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Instance جاهز</AlertTitle>
              <AlertDescription className="text-green-700">
                Instance ID: <code className="bg-green-100 px-2 py-1 rounded text-sm">{instanceId}</code>
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-6 w-6" />
                الإشعارات الجماعية
              </CardTitle>
              <CardDescription className="text-teal-100">
                اختبار إرسال الإشعارات لعدة أرقام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Country Selection for Notifications */}
              <div className="space-y-3">
                <div className="text-center">
                  <Label className="text-lg font-semibold text-gray-700">اختر البلد لإرسال الإشعارات</Label>
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      🇸🇦 الدول العربية ({arabicCountriesList.length} دولة) تظهر في المقدمة مع تمييز أخضر
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notificationCountrySelect">البلد</Label>
                    <Select value={selectedCountry} onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="اختر البلد" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]" position="popper" side="bottom" sideOffset={5}>
                        {/* الدول العربية أولاً */}
                        {countriesList.filter(c => ['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{country.flag}</span>
                              <span className="font-bold text-green-700">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">عربي</span>
                            </div>
                          </SelectItem>
                        ))}

                        {/* باقي الدول */}
                        {countriesList.filter(c => !['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'JO', 'LB', 'SY', 'IQ', 'PS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'YE'].includes(c.code)).map((country, index) => (
                          <SelectItem key={`${country.code}-${index}`} value={country.code}>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{country.flag}</span>
                              <span className="font-medium">
                                {country.nameAr}
                              </span>
                              <span className="text-sm text-gray-500">+{country.phoneCode}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notificationTestPhone">رقم الهاتف التجريبي</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="notificationTestPhone"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="966501234567"
                        className="h-12"
                      />
                      {currentCountry && (
                        <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg">
                          <span className="text-lg">{currentCountry.flag}</span>
                          <span className="text-sm font-medium">+{currentCountry.phoneCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={testNotifications}
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <MessageSquare className="h-6 w-6" />}
                إرسال إشعار تجريبي
              </Button>

              <Alert className="bg-teal-50 border-teal-200 border-l-4 border-l-teal-500">
                <AlertDescription className="text-teal-800">
                  سيتم إرسال الإشعار إلى الرقم: <Badge className="bg-teal-100 text-teal-800 border-teal-300">{testPhone}</Badge>
                  {currentCountry && (
                    <span className="block mt-1 text-sm">
                      البلد: {currentCountry.flag} {currentCountry.name} (+{currentCountry.phoneCode})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Enhanced Results Section */}
      <Card className="bg-white rounded-2xl shadow-2xl border-2 border-gray-100">
        <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-t-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">نتائج الاختبارات</CardTitle>
                <p className="text-sm text-gray-300 mt-1">
                  إجمالي: {results.length} | نجح: {results.filter(r => r.success).length} | فشل: {results.filter(r => !r.success).length}
                </p>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex bg-white/10 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setResultsFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    resultsFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  الكل ({results.length})
                </button>
                <button
                  onClick={() => setResultsFilter('success')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    resultsFilter === 'success'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  ✓ نجح ({results.filter(r => r.success).length})
                </button>
                <button
                  onClick={() => setResultsFilter('error')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                    resultsFilter === 'error'
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  ✗ فشل ({results.filter(r => !r.success).length})
                </button>
              </div>

              <Button
                onClick={clearResults}
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 hover:border-white/50 transition-all duration-300"
              >
                🗑️ مسح
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {results.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 shadow-lg">
                  <MessageSquare className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-600 text-xl font-semibold">لم يتم إجراء أي اختبارات بعد</p>
                <p className="text-gray-400 text-sm mt-2">ابدأ بإنشاء Instance جديد أو جرب إرسال رسالة</p>
              </div>
            ) : (
              results
                .filter(r => {
                  if (resultsFilter === 'success') return r.success;
                  if (resultsFilter === 'error') return !r.success;
                  return true;
                })
                .map((result, index) => (
                <div key={index} className={`border-2 rounded-xl p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${
                  result.success
                    ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
                    : 'border-red-200 bg-gradient-to-r from-red-50 to-pink-50'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    {result.success ? (
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    )}
                    <Badge className={`px-3 py-1 text-sm font-medium ${
                      result.success
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}>
                      {result.success ? "نجح" : "فشل"}
                    </Badge>
                  </div>

                  {result.message && (
                    <p className="text-gray-700 mb-3 font-medium">
                      {typeof result.message === 'string' ? result.message : JSON.stringify(result.message)}
                    </p>
                  )}

                  {result.error && (
                    <p className="text-red-600 mb-3 font-medium">
                      {typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}
                    </p>
                  )}

                  {result.data && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium mb-2">
                        عرض التفاصيل
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto border">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
