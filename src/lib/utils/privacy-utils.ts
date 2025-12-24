/**
 * دوال مساعدة لإخفاء البيانات الحساسة
 */

/**
 * إخفاء جزء من رقم الهاتف
 * مثال: 01017799580 -> 010****9580
 */
export function maskPhoneNumber(phone: string | null | undefined): string {
    if (!phone || typeof phone !== 'string') {
        return 'غير محدد';
    }

    const cleanPhone = phone.trim();

    if (cleanPhone.length < 6) {
        return cleanPhone;
    }

    // إخفاء الأرقام الوسطى
    const firstPart = cleanPhone.substring(0, 3);
    const lastPart = cleanPhone.substring(cleanPhone.length - 4);
    const maskedPart = '*'.repeat(Math.min(cleanPhone.length - 7, 6));

    return `${firstPart}${maskedPart}${lastPart}`;
}

/**
 * إخفاء جزء من البريد الإلكتروني
 * مثال: example@gmail.com -> ex****@gmail.com
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return 'غير محدد';
    }

    const [localPart, domain] = email.split('@');

    if (localPart.length <= 2) {
        return `${localPart}@${domain}`;
    }

    const visiblePart = localPart.substring(0, 2);
    const maskedPart = '*'.repeat(Math.min(localPart.length - 2, 4));

    return `${visiblePart}${maskedPart}@${domain}`;
}

/**
 * إخفاء جزء من الاسم
 * مثال: محمد أحمد علي -> محمد ا**** ع**
 */
export function maskName(name: string | null | undefined): string {
    if (!name || typeof name !== 'string') {
        return 'غير محدد';
    }

    const parts = name.trim().split(' ');

    if (parts.length === 1) {
        // اسم واحد فقط
        if (parts[0].length <= 3) {
            return parts[0];
        }
        return `${parts[0].substring(0, 3)}${'*'.repeat(Math.min(parts[0].length - 3, 3))}`;
    }

    // أسماء متعددة - نُظهر الأول كاملاً ونخفي البقية
    const maskedParts = parts.map((part, index) => {
        if (index === 0) {
            return part; // الاسم الأول كاملاً
        }
        if (part.length <= 1) {
            return part;
        }
        return `${part.substring(0, 1)}${'*'.repeat(Math.min(part.length - 1, 3))}`;
    });

    return maskedParts.join(' ');
}

/**
 * التحقق من صلاحية الإدمن لرؤية البيانات الكاملة
 */
export function canViewFullData(userRole: string | undefined): boolean {
    // فقط الأدمن الرئيسي يمكنه رؤية البيانات الكاملة
    return userRole === 'super_admin' || userRole === 'owner';
}

/**
 * تطبيق الخصوصية على بيانات المدفوعة
 */
export function applyPaymentPrivacy(
    payment: any,
    showFullData: boolean = false
): any {
    if (showFullData) {
        return payment; // إرجاع البيانات كاملة
    }

    return {
        ...payment,
        playerName: maskName(payment.playerName),
        playerPhone: maskPhoneNumber(payment.playerPhone),
        playerEmail: maskEmail(payment.playerEmail),
        // إخفاء معلومات حساسة أخرى
        cardNumber: payment.cardNumber ? `****${payment.cardNumber.slice(-4)}` : undefined,
    };
}
