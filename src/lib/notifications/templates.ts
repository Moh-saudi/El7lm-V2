import { MessageTemplate } from '@/app/dashboard/admin/send-notifications/types';

export const messageTemplates: MessageTemplate[] = [
  {
    id: 'subscription-renewal',
    title: 'تذكير بتجديد الاشتراك',
    message: 'عزيزي المشترك، يرجى تجديد اشتراكك لضمان استمرار الاستفادة من كافة خدمات منصة الحلم.',
    type: 'warning',
    priority: 'high',
    category: 'الاشتراكات والدفع',
    description: 'تذكير بقرب انتهاء الاشتراك'
  },
  {
    id: 'payment-confirmed',
    title: 'تأكيد الدفع',
    message: 'تم تأكيد عملية الدفع بنجاح. شكراً لثقتكم بمنصة الحلم.',
    type: 'success',
    priority: 'medium',
    category: 'الاشتراكات والدفع',
    description: 'إشعار تأكيد سداد الرسوم'
  },
  {
    id: 'new-opportunity',
    title: 'فرصة رياضية جديدة',
    message: 'تم طرح فرصة جديدة تناسب فئتك العمرية ومركزك. تفقد صفحة الفرص الآن!',
    type: 'info',
    priority: 'high',
    category: 'الفرص والمعايشات',
    description: 'تنبيه بطرح فرصة جديدة'
  },
  {
    id: 'profile-update-reminder',
    title: 'استكمال بيانات الملف الرياضي',
    message: 'ملفك الشخصي بحاجة لبيانات إضافية لتسهيل وصول الكشافين والمدربين إليك.',
    type: 'info',
    priority: 'medium',
    category: 'الملف الشخصي',
    description: 'تذكير باستكمال بيانات الملف'
  },
  {
    id: 'tournament-announcement',
    title: 'إعلان بطولة جديدة',
    message: 'يسر منصة الحلم الإعلان عن انطلاق بطولة جديدة. بادر بالتسجيل لمعرفة التفاصيل.',
    type: 'info',
    priority: 'high',
    category: 'البطولات والمسابقات',
    description: 'إعلان انطلاق بطولة'
  },
  {
    id: 'system-maintenance',
    title: 'تحديث مجدول للنظام',
    message: 'سيتم إجراء صيانة مجدولة لتحسين أداء المنصة قريباً. نشكر حسن تعاونكم.',
    type: 'warning',
    priority: 'medium',
    category: 'النظام والصيانة',
    description: 'تنبيه بأعمال الصيانة الدورية'
  }
];
