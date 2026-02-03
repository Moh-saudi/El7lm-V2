import { PermissionAction, PermissionResource, Role, Permission, DEFAULT_ROLES } from '@/lib/permissions/types';
export type { PermissionAction, PermissionResource, Role, Permission };
export { DEFAULT_ROLES };

export interface EmployeeDocument {
    id: string;
    name: string;
    url: string;
    type: string; // 'id', 'contract', 'cv', 'other'
    uploadedAt: Date;
}

// تعريف الموظف
export interface Employee {
    id: string;
    uid: string;
    name: string;
    email: string; // البريد الوظيفي (للدخول)
    personalEmail?: string; // البريد الشخصي
    phone: string;
    roleId: string;
    roleName?: string;
    department: string;
    isActive: boolean;
    avatar?: string;
    jobTitle?: string;
    // 🌍 النطاق الجغرافي
    allowedCountries?: string[]; // مثال: ['Egypt', 'Saudi Arabia']
    allowedCities?: string[];
    documents?: EmployeeDocument[]; // المستندات

    // بيانات النظام
    createdAt: Date;
    updatedAt?: Date;
    lastLogin?: Date;
    notes?: string;
}

// 📋 القائمة الشاملة للصلاحيات (للعرض في لوحة التحكم)
export const ALL_PERMISSIONS_LIST: { resource: PermissionResource; actions: PermissionAction[]; label: string; description?: string }[] = [
    {
        resource: 'users',
        actions: ['read', 'create', 'update', 'delete'],
        label: '👥 إدارة المستخدمين',
        description: 'الوصول لقائمة المستخدمين، اللاعبين، الأكاديميات، وتعديل بياناتهم.'
    },
    {
        resource: 'dashboard',
        actions: ['read'],
        label: '🏠 لوحة التحكم',
        description: 'عرض الإحصائيات العامة والوصول للصفحة الرئيسية للوحة الإدارة.'
    },
    {
        resource: 'opportunities',
        actions: ['read'],
        label: '🔎 اكتشاف الفرص',
        description: 'البحث عن اللاعبين واكتشاف الفرص والبطولات.'
    },
    {
        resource: 'tournaments',
        actions: ['read', 'create', 'update', 'delete', 'manage'],
        label: '🏆 إدارة البطولات',
        description: 'إنشاء البطولات، إدارة المباريات، والنتائج.'
    },
    {
        resource: 'financials',
        actions: ['read', 'manage'],
        label: '💰 المالية والمدفوعات',
        description: 'عرض الفواتير، سجل المدفوعات، وإعدادات التسعير (Geidea/SkipCash).'
    },
    {
        resource: 'subscriptions',
        actions: ['read', 'update', 'manage'],
        label: '💳 إدارة الاشتراكات',
        description: 'متابعة اشتراكات الباقات وتجديدها.'
    },
    {
        resource: 'content',
        actions: ['read', 'create', 'update', 'delete'],
        label: '📝 المحتوى والأكاديمية',
        description: 'إدارة الفيديوهات التعليمية، المقالات، والإعلانات.'
    },
    {
        resource: 'media',
        actions: ['read', 'create', 'delete'],
        label: '📸 مكتبة الوسائط',
        description: 'رفع وإدارة الصور والفيديوهات في المكتبة العامة.'
    },
    {
        resource: 'communications',
        actions: ['read', 'create', 'manage'],
        label: '💬 مركز التواصل',
        description: 'إرسال الإشعارات، الرسائل، وإدارة قوالب البريد والواتساب.'
    },
    {
        resource: 'support',
        actions: ['read', 'update', 'manage'],
        label: '🎫 الدعم الفني',
        description: 'الرد على تذاكر الدعم وحل مشاكل العملاء.'
    },
    {
        resource: 'reports',
        actions: ['read'],
        label: '📊 التقارير والتحليلات',
        description: 'عرض إحصائيات النظام، سجلات الفيديو (Clarity)، وتقارير الأداء.'
    },
    {
        resource: 'employees',
        actions: ['read', 'create', 'update', 'delete'],
        label: '👔 الموارد البشرية',
        description: 'إدارة ملفات الموظفين والرواتب.'
    },
    {
        resource: 'roles',
        actions: ['read', 'create', 'update', 'delete'],
        label: '🛡️ الأدوار والصلاحيات',
        description: 'إنشاء وتعديل الأدوار وتوزيع الصلاحيات.'
    },
    {
        resource: 'settings',
        actions: ['read', 'update'],
        label: '⚙️ إعدادات النظام',
        description: 'الإعدادات العامة للمنصة.'
    }
];

