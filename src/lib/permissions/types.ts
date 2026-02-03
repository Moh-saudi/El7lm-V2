
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'manage';

// 🏗️ خريطة موارد النظام الكاملة
export type PermissionResource =
    | 'users'           // إدارة المستخدمين واللاعبين
    | 'tournaments'     // إدارة البطولات والمسابقات
    | 'financials'      // المدفوعات، الفواتير، التسعير
    | 'subscriptions'   // إدارة الاشتراكات
    | 'content'         // إدارة المحتوى، أكاديمية الحلم، الإعلانات
    | 'media'           // مكتبة الوسائط (صور/فيديو)
    | 'communications'  // الرسائل، الإشعارات، البريد، واتساب
    | 'support'         // الدعم الفني والتذاكر
    | 'reports'         // التقارير والتحليلات
    | 'employees'       // إدارة الموظفين
    | 'settings'        // إعدادات النظام
    | 'roles'           // إدارة الصلاحيات
    | 'dashboard'       // لوحة التحكم والصفحة الرئيسية
    | 'opportunities'   // اكتشاف الفرص والبحث عن اللاعبين
    | 'all';            // كل شيء (للسوبر أدمن)

// تعريف الصلاحية الدقيقة
export type Permission = `${PermissionAction}:${PermissionResource}`;

// تعريف الدور الوظيفي
export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    isSystem?: boolean;
}

// الأدوار الافتراضية للنظام
export const DEFAULT_ROLES: Role[] = [
    {
        id: 'admin',
        name: 'مدير النظام',
        description: 'صلاحيات كاملة للوصول لكل شيء',
        permissions: [],
        isSystem: true
    },
    {
        id: 'editor',
        name: 'محرر محتوى',
        description: 'إدارة المحتوى والمقالات فقط',
        permissions: ['read:content', 'create:content', 'update:content', 'delete:content', 'read:media', 'create:media'],
        isSystem: true
    },
    {
        id: 'support_agent',
        name: 'موظف دعم وتواصل',
        description: 'الرد على التذاكر والتواصل مع العملاء عبر القنوات المختلفة',
        permissions: [
            'read:dashboard',
            'read:users',
            'read:support',
            'update:support',
            'read:communications',
            'manage:communications'
        ],
        isSystem: true
    },
    {
        id: 'accountant',
        name: 'محاسب',
        description: 'إدارة المالية والاشتراكات',
        permissions: ['read:dashboard', 'read:financials', 'manage:financials', 'read:subscriptions', 'update:subscriptions'],
        isSystem: true
    }
];
