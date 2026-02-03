import { PermissionAction, PermissionResource } from '@/lib/permissions/types';
import {
    Award,
    BarChart3,
    Bell,
    Briefcase,
    Building,
    CreditCard,
    DollarSign,
    FileText,
    GraduationCap,
    Headphones,
    Heart,
    History,
    Home,
    LayoutTemplate,
    Mail,
    Megaphone,
    MessageCircle,
    MessageSquare,
    Package,
    Play,
    Search,
    Send,
    Settings,
    Shield,
    Star,
    Target,
    TrendingUp,
    Trophy,
    User,
    UserCheck,
    UserPlus,
    Users,
    Video,
    Zap,
    Link,
    Activity,
    Smartphone,
    Server
} from 'lucide-react';

export interface MenuItem {
    id: string;
    label: string;
    icon: any;
    href: string;
    permission?: { action: PermissionAction; resource: PermissionResource }; // If undefined, accessible to all authenticated users
    color?: string;
    bgColor?: string;
    isHighlighted?: boolean;
}

export interface MenuGroup {
    id: string;
    title: string;
    icon?: any;
    items: MenuItem[];
}

// 1. القائمة الرئيسية (للكل)
export const MAIN_GROUP: MenuGroup = {
    id: 'main',
    title: 'لوحة التحكم',
    icon: Home,
    items: [
        {
            id: 'dashboard',
            label: 'الرئيسية',
            icon: Home,
            href: '/dashboard/admin',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
        {
            id: 'profile',
            label: 'الملف الشخصي',
            icon: User,
            href: '/dashboard/admin/profile',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
    ]
};

// 2. إدارة الهوية والمستخدمين (مقيدة)
export const IDENTITY_GROUP: MenuGroup = {
    id: 'identity-mgmt',
    title: 'إدارة الهوية',
    icon: Users,
    items: [
        {
            id: 'admin-users-management',
            label: 'إدارة المستخدمين',
            icon: Users,
            href: '/dashboard/admin/users',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'read', resource: 'users' }
        },
        {
            id: 'admin-customer-management',
            label: 'إدارة العملاء',
            icon: UserPlus,
            href: '/dashboard/admin/customer-management',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'manage', resource: 'users' } // Restricted to managers
        },
        {
            id: 'admin-employees',
            label: 'فريق العمل والصلاحيات',
            icon: UserCheck,
            href: '/dashboard/admin/employees',
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            permission: { action: 'manage', resource: 'employees' } // Restricted to HR/Admin
        },
        {
            id: 'admin-check-phone',
            label: 'فحص الهواتف',
            icon: Search,
            href: '/dashboard/admin/users/check-phone',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'users' } // Restricted
        },
        {
            id: 'admin-referrals-mgmt',
            label: 'سفراء الحلم',
            icon: Award,
            href: '/dashboard/admin/users/referrals',
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            permission: { action: 'manage', resource: 'users' } // Restricted
        },
    ]
};

// 3. الدعم والتواصل (للدعم الفني والإدارة)
export const COMMUNICATION_GROUP: MenuGroup = {
    id: 'comm-mgmt',
    title: 'الدعم والتواصل',
    icon: MessageSquare,
    items: [
        {
            id: 'admin-support',
            label: 'مركز الدعم والبلاغات',
            icon: Headphones,
            href: '/dashboard/admin/support',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'read', resource: 'support' }
        },
        {
            id: 'admin-shared-messages',
            label: 'المحادثات المباشرة',
            icon: MessageSquare,
            href: '/dashboard/shared/messages',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'read', resource: 'communications' }
        },
        {
            id: 'admin-notifications',
            label: 'سجل الإشعارات',
            icon: History,
            href: '/dashboard/admin/notifications',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'communications' }
        },
        {
            id: 'admin-send-notifications',
            label: 'إرسال إشعارات',
            icon: Send,
            href: '/dashboard/admin/send-notifications',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'communications' }
        },
        {
            id: 'admin-email-center',
            label: 'مركز البريد الإلكتروني',
            icon: Mail,
            href: '/dashboard/admin/email-center',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'communications' } // Restricted
        },
        {
            id: 'admin-chataman',
            label: 'إعدادات ChatAman',
            icon: MessageCircle,
            href: '/dashboard/admin/chataman',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'manage', resource: 'communications' }
        },
    ]
};

// 4. المالية والاشتراكات (للمحاسبين)
export const FINANCE_GROUP: MenuGroup = {
    id: 'finance-mgmt',
    title: 'المالية والاشتراكات',
    icon: DollarSign,
    items: [
        {
            id: 'admin-payments',
            label: 'السجل المالي',
            icon: CreditCard,
            href: '/dashboard/admin/payments',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'read', resource: 'financials' }
        },
        {
            id: 'admin-pricing',
            label: 'الأسعار وبوابات الدفع',
            icon: DollarSign,
            href: '/dashboard/admin/pricing-management',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'manage', resource: 'financials' }
        },
        {
            id: 'admin-invoices',
            label: 'الفواتير والحسابات',
            icon: FileText,
            href: '/dashboard/admin/invoices',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'financials' }
        },
        {
            id: 'admin-subscriptions',
            label: 'الاشتراكات',
            icon: CreditCard,
            href: '/dashboard/admin/subscriptions',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'read', resource: 'financials' }
        },
    ]
};

// 5. العمليات والتقارير (للإدارة)
export const OPERATIONS_GROUP: MenuGroup = {
    id: 'ops-mgmt',
    title: 'العمليات والنظام',
    icon: Settings,
    items: [
        {
            id: 'admin-system',
            label: 'إعدادات النظام',
            icon: Settings,
            href: '/dashboard/admin/system',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-reports',
            label: 'تقارير الأداء',
            icon: FileText,
            href: '/dashboard/admin/reports',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'reports' }
        },
        {
            id: 'admin-inventory',
            label: 'المخزون',
            icon: Package,
            href: '/dashboard/admin/inventory',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-careers',
            label: 'الوظائف',
            icon: Briefcase,
            href: '/dashboard/admin/careers',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'content' }
        },
    ]
};

// 6. التسويق والمحتوى
export const CONTENT_GROUP: MenuGroup = {
    id: 'content-mgmt',
    title: 'التسويق والإعلام',
    icon: TrendingUp,
    items: [
        {
            id: 'admin-content-mgmt',
            label: 'إدارة المحتوى',
            icon: LayoutTemplate,
            href: '/dashboard/admin/content',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'content' }
        },
        {
            id: 'admin-media',
            label: 'مكتبة الوسائط',
            icon: Video,
            href: '/dashboard/admin/media',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'read', resource: 'media' }
        },
        {
            id: 'admin-ads',
            label: 'الإعلانات',
            icon: Megaphone,
            href: '/dashboard/admin/ads',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'manage', resource: 'content' }
        },
        {
            id: 'admin-dream-academy',
            label: 'أكاديمية الحلم',
            icon: GraduationCap,
            href: '/dashboard/admin/dream-academy',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'manage', resource: 'content' }
        },
        {
            id: 'admin-tournaments',
            label: 'تنظيم البطولات',
            icon: Award,
            href: '/dashboard/admin/tournaments',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'manage', resource: 'tournaments' }
        },
        {
            id: 'admin-video-logs',
            label: 'سجلات الفيديو',
            icon: Video,
            href: '/dashboard/admin/video-logs',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            permission: { action: 'read', resource: 'media' }
        },
    ]
};

// 7. الربط والتكامل (Integrations)
export const INTEGRATIONS_GROUP: MenuGroup = {
    id: 'integrations-mgmt',
    title: 'الربط والتكامل',
    icon: Link,
    items: [
        {
            id: 'admin-whatsapp',
            label: 'ربط واتساب',
            icon: MessageCircle,
            href: '/dashboard/admin/whatsapp',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-geidea-settings',
            label: 'إعدادات Geidea',
            icon: CreditCard,
            href: '/dashboard/admin/geidea-settings',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            permission: { action: 'manage', resource: 'financials' }
        },
        {
            id: 'admin-skipcash',
            label: 'إعدادات SkipCash',
            icon: CreditCard,
            href: '/dashboard/admin/skipcash',
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            permission: { action: 'manage', resource: 'financials' }
        },
        {
            id: 'admin-clarity',
            label: 'تحليلات Clarity',
            icon: Activity,
            href: '/dashboard/admin/clarity',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'read', resource: 'reports' }
        },
    ]
};

export const ADMIN_DASHBOARD_MENU: MenuGroup[] = [
    MAIN_GROUP,
    IDENTITY_GROUP,
    COMMUNICATION_GROUP,
    FINANCE_GROUP,
    CONTENT_GROUP,
    OPERATIONS_GROUP,
    INTEGRATIONS_GROUP
];
