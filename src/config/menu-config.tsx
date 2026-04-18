import { PermissionAction, PermissionResource } from '@/lib/permissions/types';
import {
    Activity,
    Award,
    CreditCard,
    DollarSign,
    FileText,
    GraduationCap,
    Headphones,
    History,
    Home,
    LayoutTemplate,
    Link,
    Mail,
    Megaphone,
    MessageCircle,
    MessageSquare,
    Package,
    Search,
    Send,
    Settings,
    ShoppingBag,
    ShoppingCart,
    Target,
    TrendingUp,
    Trophy,
    User,
    UserCheck,
    UserPlus,
    Users,
    Video,
    Zap,
    Briefcase,
} from 'lucide-react';

export interface MenuItem {
    id: string;
    label: string;
    icon: any;
    href: string;
    permission?: { action: PermissionAction; resource: PermissionResource };
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

export const MAIN_GROUP: MenuGroup = {
    id: 'main',
    title: '\u0644\u0648\u062d\u0629 \u0627\u0644\u062a\u062d\u0643\u0645',
    icon: Home,
    items: [
        {
            id: 'dashboard',
            label: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629',
            icon: Home,
            href: '/dashboard/admin',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
        {
            id: 'profile',
            label: '\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a',
            icon: User,
            href: '/dashboard/admin/profile',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
        {
            id: 'public-tournaments',
            label: '\u0627\u0644\u0628\u0637\u0648\u0644\u0627\u062a',
            icon: Trophy,
            href: '/tournaments',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
    ]
};

export const IDENTITY_GROUP: MenuGroup = {
    id: 'identity-mgmt',
    title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0647\u0648\u064a\u0629',
    icon: Users,
    items: [
        {
            id: 'admin-users-management',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646',
            icon: Users,
            href: '/dashboard/admin/users',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'read', resource: 'users' }
        },
        {
            id: 'admin-customer-management',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
            icon: UserPlus,
            href: '/dashboard/admin/customer-management',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'manage', resource: 'users' }
        },
        {
            id: 'admin-employees',
            label: '\u0641\u0631\u064a\u0642 \u0627\u0644\u0639\u0645\u0644 \u0648\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a',
            icon: UserCheck,
            href: '/dashboard/admin/employees',
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            permission: { action: 'manage', resource: 'employees' }
        },
        {
            id: 'admin-check-phone',
            label: '\u0641\u062d\u0635 \u0627\u0644\u0647\u0648\u0627\u062a\u0641',
            icon: Search,
            href: '/dashboard/admin/users/check-phone',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'users' }
        },
        {
            id: 'admin-referrals-mgmt',
            label: '\u0633\u0641\u0631\u0627\u0621 \u0627\u0644\u062d\u0644\u0645',
            icon: Award,
            href: '/dashboard/admin/users/referrals',
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            permission: { action: 'manage', resource: 'users' }
        },
    ]
};

export const COMMUNICATION_GROUP: MenuGroup = {
    id: 'comm-mgmt',
    title: '\u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u062a\u0648\u0627\u0635\u0644',
    icon: MessageSquare,
    items: [
        {
            id: 'admin-support',
            label: '\u0645\u0631\u0643\u0632 \u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u0628\u0644\u0627\u063a\u0627\u062a',
            icon: Headphones,
            href: '/dashboard/admin/support',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'read', resource: 'support' }
        },
        {
            id: 'admin-shared-messages',
            label: '\u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0627\u062a \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629',
            icon: MessageSquare,
            href: '/dashboard/shared/messages',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'read', resource: 'communications' }
        },
        {
            id: 'admin-notifications',
            label: '\u0633\u062c\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a',
            icon: History,
            href: '/dashboard/admin/notifications',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'communications' }
        },
        {
            id: 'admin-send-notifications',
            label: '\u0625\u0631\u0633\u0627\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062a',
            icon: Send,
            href: '/dashboard/admin/send-notifications',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'communications' }
        },
        {
            id: 'admin-email-center',
            label: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
            icon: Mail,
            href: '/dashboard/admin/email-center',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'communications' }
        },
        {
            id: 'admin-chataman',
            label: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a ChatAman',
            icon: MessageCircle,
            href: '/dashboard/admin/chataman',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'manage', resource: 'communications' }
        },
        {
            id: 'admin-ai-messenger',
            label: '\u0627\u0644\u0645\u0631\u0643\u0632 \u0627\u0644\u0630\u0643\u064a \u0644\u0644\u0645\u0631\u0627\u0633\u0644\u0627\u062a AI',
            icon: Zap,
            href: '/dashboard/admin/ai-messenger',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'manage', resource: 'communications' }
        },
    ]
};

export const SUBSCRIPTIONS_GROUP: MenuGroup = {
    id: 'subscriptions-mgmt',
    title: '\u0627\u0634\u062a\u0631\u0627\u0643\u0627\u062a \u0627\u0644\u0645\u0646\u0635\u0629',
    icon: CreditCard,
    items: [
        {
            id: 'admin-payments',
            label: '\u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0645\u0627\u0644\u064a',
            icon: CreditCard,
            href: '/dashboard/admin/payments',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'read', resource: 'financials' }
        },
        {
            id: 'admin-invoices',
            label: '\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a',
            icon: FileText,
            href: '/dashboard/admin/invoices',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'financials' }
        },
        {
            id: 'admin-geidea-transactions',
            label: '\u0645\u0639\u0627\u0645\u0644\u0627\u062a Geidea',
            icon: Activity,
            href: '/dashboard/admin/geidea-transactions',
            color: 'text-violet-600',
            bgColor: 'bg-violet-50',
            permission: { action: 'read', resource: 'financials' }
        },
        {
            id: 'admin-geidea-settings',
            label: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a Geidea',
            icon: CreditCard,
            href: '/dashboard/admin/geidea-settings',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            permission: { action: 'manage', resource: 'financials' }
        },
        {
            id: 'admin-skipcash',
            label: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a SkipCash',
            icon: CreditCard,
            href: '/dashboard/admin/skipcash',
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
            permission: { action: 'manage', resource: 'financials' }
        },
    ]
};

export const STORE_GROUP: MenuGroup = {
    id: 'store-mgmt',
    title: '\u0627\u0644\u0645\u062a\u062c\u0631',
    icon: ShoppingBag,
    items: [
        {
            id: 'admin-store-home',
            label: '\u0645\u0631\u0643\u0632 \u0627\u0644\u0645\u062a\u062c\u0631',
            icon: ShoppingBag,
            href: '/dashboard/admin/store',
            color: 'text-violet-600',
            bgColor: 'bg-violet-50',
            permission: { action: 'read', resource: 'dashboard' }
        },
        {
            id: 'admin-inventory',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
            icon: Package,
            href: '/dashboard/admin/inventory',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-store-orders',
            label: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631',
            icon: ShoppingCart,
            href: '/dashboard/admin/store-orders',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-store-pricing',
            label: '\u0627\u0644\u062f\u0641\u0639 \u0648\u0627\u0644\u062a\u0642\u0633\u064a\u0637',
            icon: CreditCard,
            href: '/dashboard/admin/pricing-management',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'manage', resource: 'financials' }
        },
    ]
};

export const TOURNAMENTS_GROUP: MenuGroup = {
    id: 'tournaments-mgmt',
    title: '\u0627\u0644\u0628\u0637\u0648\u0644\u0627\u062a',
    icon: Trophy,
    items: [
        {
            id: 'admin-tournaments',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0628\u0637\u0648\u0644\u0627\u062a',
            icon: Trophy,
            href: '/dashboard/admin/tournaments',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'manage', resource: 'tournaments' }
        },
        {
            id: 'admin-tournament-clients',
            label: '\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0628\u0637\u0648\u0644\u0627\u062a',
            icon: Award,
            href: '/dashboard/admin/tournament-clients',
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
            permission: { action: 'manage', resource: 'tournaments' }
        },
    ]
};

export const ACADEMY_GROUP: MenuGroup = {
    id: 'academy-mgmt',
    title: '\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629 \u0627\u0644\u062d\u0644\u0645',
    icon: GraduationCap,
    items: [
        {
            id: 'admin-dream-academy',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0623\u0643\u0627\u062f\u064a\u0645\u064a\u0629',
            icon: GraduationCap,
            href: '/dashboard/admin/dream-academy',
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            permission: { action: 'manage', resource: 'content' }
        },
    ]
};

export const OPERATIONS_GROUP: MenuGroup = {
    id: 'ops-mgmt',
    title: '\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0648\u0627\u0644\u0646\u0638\u0627\u0645',
    icon: Settings,
    items: [
        {
            id: 'admin-system',
            label: '\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0646\u0638\u0627\u0645',
            icon: Settings,
            href: '/dashboard/admin/system',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-reports',
            label: '\u062a\u0642\u0627\u0631\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621',
            icon: FileText,
            href: '/dashboard/admin/reports',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'read', resource: 'reports' }
        },
        {
            id: 'admin-careers',
            label: '\u0627\u0644\u0648\u0638\u0627\u0626\u0641',
            icon: Briefcase,
            href: '/dashboard/admin/careers',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'content' }
        },
        {
            id: 'admin-opportunities',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0641\u0631\u0635',
            icon: Target,
            href: '/dashboard/admin/opportunities',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            permission: { action: 'manage', resource: 'content' }
        },
    ]
};

export const CONTENT_GROUP: MenuGroup = {
    id: 'content-mgmt',
    title: '\u0627\u0644\u062a\u0633\u0648\u064a\u0642 \u0648\u0627\u0644\u0625\u0639\u0644\u0627\u0645',
    icon: TrendingUp,
    items: [
        {
            id: 'admin-content-mgmt',
            label: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649',
            icon: LayoutTemplate,
            href: '/dashboard/admin/content',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            permission: { action: 'manage', resource: 'content' }
        },
        {
            id: 'admin-media',
            label: '\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0648\u0633\u0627\u0626\u0637',
            icon: Video,
            href: '/dashboard/admin/media',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'read', resource: 'media' }
        },
        {
            id: 'admin-ads',
            label: '\u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a',
            icon: Megaphone,
            href: '/dashboard/admin/ads',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            permission: { action: 'manage', resource: 'content' }
        },
    ]
};

export const INTEGRATIONS_GROUP: MenuGroup = {
    id: 'integrations-mgmt',
    title: '\u0627\u0644\u0631\u0628\u0637 \u0648\u0627\u0644\u062a\u0643\u0627\u0645\u0644',
    icon: Link,
    items: [
        {
            id: 'admin-whatsapp',
            label: '\u0631\u0628\u0637 \u0648\u0627\u062a\u0633\u0627\u0628',
            icon: MessageCircle,
            href: '/dashboard/admin/whatsapp',
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            permission: { action: 'manage', resource: 'settings' }
        },
        {
            id: 'admin-clarity',
            label: '\u062a\u062d\u0644\u064a\u0644\u0627\u062a Clarity',
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
    SUBSCRIPTIONS_GROUP,
    STORE_GROUP,
    TOURNAMENTS_GROUP,
    ACADEMY_GROUP,
    CONTENT_GROUP,
    OPERATIONS_GROUP,
    INTEGRATIONS_GROUP
];
