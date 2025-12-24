/**
 * معلومات الشركة الرسمية
 * Company Official Information
 */

export const COMPANY_INFO = {
    // اسم الشركة
    name: {
        ar: 'منصة الحلم الرقمية',
        en: 'El7lm Digital Platform'
    },

    // الوصف
    description: {
        ar: 'أول متجر إلكتروني لتسويق وبيع اللاعبين في الشرق الأوسط',
        en: 'First digital marketplace for marketing and selling players in the Middle East'
    },

    // الشركة المالكة
    owner: {
        name: {
            ar: 'شركة ميسك القطرية',
            en: 'Mesk Qatar Company'
        },
        website: 'www.mesk.qa',
        websiteUrl: 'https://www.mesk.qa'
    },

    // البريد الإلكتروني
    email: {
        support: 'info@el7lm.com',
        info: 'info@el7lm.com',
        // للاستخدام في رسائل البريد
        formatted: 'info@el7lm.com'
    },

    // أرقام الهاتف - مصر
    phones: {
        egypt: [
            {
                number: '01017799580',
                displayNumber: '+20 101 779 9580',
                whatsappLink: 'https://wa.me/201017799580',
                type: 'primary'
            },
            {
                number: '0102655899',
                displayNumber: '+20 102 655 899',
                whatsappLink: 'https://wa.me/20102655899',
                type: 'secondary'
            },
            {
                number: '01000940321',
                displayNumber: '+20 100 094 0321',
                whatsappLink: 'https://wa.me/201000940321',
                type: 'secondary'
            }
        ],
        qatar: [
            {
                number: '70542458',
                displayNumber: '+974 7054 2458',
                whatsappLink: 'https://wa.me/97470542458',
                type: 'primary',
                isOfficial: true, // الواتساب الرسمي
                label: 'الواتساب الرسمي للشركة'
            }
        ]
    },

    // روابط التواصل الاجتماعي (إضافة مستقبلية)
    social: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: ''
    },

    // عنوان الشركة (إذا كان متوفراً)
    address: {
        egypt: '',
        qatar: ''
    }
} as const;

/**
 * دالة مساعدة للحصول على رقم WhatsApp الرئيسي
 */
export function getPrimaryWhatsAppNumber(country: 'egypt' | 'qatar' = 'qatar'): string {
    const phones = COMPANY_INFO.phones[country];
    const primary = phones.find(p => p.type === 'primary');
    return primary?.whatsappLink || phones[0].whatsappLink;
}

/**
 * دالة مساعدة للحصول على رقم الهاتف للعرض
 */
export function getDisplayPhoneNumber(country: 'egypt' | 'qatar' = 'qatar'): string {
    const phones = COMPANY_INFO.phones[country];
    const primary = phones.find(p => p.type === 'primary');
    return primary?.displayNumber || phones[0].displayNumber;
}

/**
 * دالة مساعدة للحصول على جميع أرقام الدعم
 */
export function getAllSupportNumbers() {
    return {
        egypt: COMPANY_INFO.phones.egypt,
        qatar: COMPANY_INFO.phones.qatar
    };
}

/**
 * دالة مساعدة للحصول على بريد الدعم
 */
export function getSupportEmail(): string {
    return COMPANY_INFO.email.support;
}
