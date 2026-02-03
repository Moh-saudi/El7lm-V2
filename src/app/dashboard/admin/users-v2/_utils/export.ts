/**
 * أدوات التصدير
 */

import { User, ACCOUNT_TYPE_LABELS, STATUS_LABELS, VERIFICATION_LABELS } from '../_types';

// تصدير إلى CSV
export function exportToCSV(users: User[], filename = 'users'): void {
    const headers = [
        'المعرف',
        'الاسم',
        'البريد الإلكتروني',
        'الهاتف',
        'نوع الحساب',
        'الحالة',
        'التحقق',
        'البلد',
        'المدينة',
        'اكتمال الملف (%)',
        'تاريخ التسجيل',
    ];

    const rows = users.map(user => [
        user.id,
        user.name,
        user.email,
        user.phone,
        ACCOUNT_TYPE_LABELS[user.accountType] || user.accountType,
        STATUS_LABELS[user.status] || user.status,
        VERIFICATION_LABELS[user.verificationStatus] || user.verificationStatus,
        user.country,
        user.city,
        user.profileCompletion,
        user.createdAt ? user.createdAt.toLocaleDateString('ar-EG') : '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // إضافة BOM للتوافق مع Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// تصدير إلى JSON
export function exportToJSON(users: User[], filename = 'users'): void {
    const data = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        accountType: user.accountType,
        status: user.status,
        verificationStatus: user.verificationStatus,
        country: user.country,
        city: user.city,
        profileCompletion: user.profileCompletion,
        createdAt: user.createdAt?.toISOString(),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}
