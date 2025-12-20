export interface ResponseTemplate {
    id: string;
    title: string;
    content: string;
    category: 'greeting' | 'closing' | 'technical' | 'billing';
}

export const SUPPORT_TEMPLATES: ResponseTemplate[] = [
    {
        id: 'greet_1',
        title: 'ترحيب رسمي',
        content: 'مرحباً بك في الدعم الفني لمنصة الحلم. معك [الاسم]، كيف يمكنني مساعدتك اليوم؟',
        category: 'greeting'
    },
    {
        id: 'greet_2',
        title: 'ترحيب ودود',
        content: 'أهلاً بك! سعداء بتواصلك معنا. تفضل بطرح استفسارك وسنكون سعداء بمساعدتك.',
        category: 'greeting'
    },
    {
        id: 'wait_1',
        title: 'طلب انتظار',
        content: 'يرجى الانتظار للحظات بينما أقوم بمراجعة بيانات حسابك للتأكد من المشكلة.',
        category: 'technical'
    },
    {
        id: 'tech_fix',
        title: 'حل تقني عام',
        content: 'يرجى تجربة تحديث الصفحة أو مسح ذاكرة التخزين المؤقت للمتصفح (Clear Cache) والمحاولة مرة أخرى.',
        category: 'technical'
    },
    {
        id: 'close_1',
        title: 'إغلاق المحادثة',
        content: 'شكراً لتواصلك معنا. هل هناك أي شيء آخر يمكنني مساعدتك به اليوم؟',
        category: 'closing'
    },
    {
        id: 'rating_request',
        title: 'طلب تقييم',
        content: 'يسعدنا خدمتك! إذا كنت راضياً عن الخدمة المقدمة، نرجو منك تقييم المحادثة بعد انتهائها.',
        category: 'closing'
    }
];
