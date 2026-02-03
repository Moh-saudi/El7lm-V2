'use client';

import React, { useState, useMemo, useEffect, createContext, useContext, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Home,
    Users,
    Settings,
    DollarSign,
    FileText,
    Bell,
    BarChart3,
    LogOut,
    Menu,
    ChevronRight,
    ChevronDown,
    Trophy,
    HelpCircle,
    Image as ImageIcon,
    MessageSquare,
    Tag,
    CreditCard,
    Database,
    Search,
    User,
    Briefcase,
    Package,
    Mail,
    Video,
    Megaphone,
    Activity,
    TrendingUp,
    ShoppingCart,
    Award
} from 'lucide-react';
import LogoutScreen from '@/components/auth/LogoutScreen';
import UnifiedNotificationsButton from '@/components/shared/UnifiedNotificationsButton';
import UnifiedMessagesButton from '@/components/shared/UnifiedMessagesButton';
import { useEmployeePermissions, EmployeePermissions } from '@/hooks/useEmployeePermissions';

// ============================================
// LAYOUT CONTEXT
// ============================================
interface LayoutContextType {
    isSidebarOpen: boolean;
    isSidebarCollapsed: boolean;
    isMobile: boolean;
    isClient: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
    collapseSidebar: () => void;
    expandSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error('useLayout must be used within a LayoutProvider');
    return context;
};

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isClient, setIsClient] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const isMobile = useMediaQuery('(max-width: 768px)');

    useEffect(() => setIsClient(true), []);

    const value: LayoutContextType = {
        isSidebarOpen,
        isSidebarCollapsed,
        isMobile,
        isClient,
        openSidebar: useCallback(() => setIsSidebarOpen(true), []),
        closeSidebar: useCallback(() => setIsSidebarOpen(false), []),
        toggleSidebar: useCallback(() => {
            if (isMobile) setIsSidebarOpen(prev => !prev);
            else setIsSidebarCollapsed(prev => !prev);
        }, [isMobile]),
        collapseSidebar: useCallback(() => setIsSidebarCollapsed(true), []),
        expandSidebar: useCallback(() => setIsSidebarCollapsed(false), []),
    };

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

// ============================================
// MENU STRUCTURE
// ============================================
interface MenuItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    children?: MenuItem[];
}

const getAdminMenu = (permissions: EmployeePermissions | null): MenuItem[] => {
    // إذا لم يتم تحميل الصلاحيات بعد، نعيد قائمة فارغة أو القائمة الأساسية فقط (للأمان)
    // ولكن إذا كنت سوبر أدمن، قد تحتاج لتعديل هذا ليعرض كل شيء. 
    // hook useEmployeePermissions يعالج السوبر أدمن ويعيد له صلاحيات كاملة.
    if (!permissions) return [{ title: 'الرئيسية', href: '/dashboard/admin', icon: Home }];

    const items: MenuItem[] = [
        {
            title: 'الرئيسية',
            href: '/dashboard/admin',
            icon: Home,
            children: [
                { title: 'لوحة التحكم', href: '/dashboard/admin/dashboard', icon: BarChart3 }
            ]
        },
    ];

    // قسم المستخدمين - يتطلب صلاحية عرض العملاء
    if (permissions.canViewCustomers) {
        const userChildren: MenuItem[] = [
            { title: 'جميع المستخدمين', href: '/dashboard/admin/users', icon: Users },
            { title: 'المستخدمين V2', href: '/dashboard/admin/users-v2', icon: Users },
            { title: 'اللاعبين', href: '/dashboard/admin/players', icon: User },
            { title: 'الأندية', href: '/dashboard/admin/clubs', icon: Trophy },
            { title: 'الأكاديميات', href: '/dashboard/admin/academies', icon: Trophy },
            { title: 'المدربين', href: '/dashboard/admin/trainers', icon: User },
            { title: 'الوكلاء', href: '/dashboard/admin/agents', icon: Briefcase },
            { title: 'المسوقين', href: '/dashboard/admin/marketers', icon: Megaphone },
            { title: 'إدارة العملاء', href: '/dashboard/admin/customer-management', icon: Users },
        ];

        // الموظفين - يتطلب صلاحية إدارة المستخدمين
        if (permissions.canManageUsers) {
            userChildren.push({ title: 'الموظفين', href: '/dashboard/admin/employees-v2', icon: Briefcase });
        }

        items.push({
            title: 'المستخدمين',
            href: '#',
            icon: Users,
            children: userChildren,
        });
    }

    // إدارة البطولات - يتطلب صلاحية الأدوات المتقدمة أو العرض (يمكن تعديلها)
    // سأفترض أنها متاحة لخدمة العملاء والمشرفين
    if (permissions.canViewCustomers) {
        items.push({
            title: 'المحتوى',
            href: '#',
            icon: FileText,
            children: [
                { title: 'البطولات', href: '/dashboard/admin/tournaments', icon: Trophy, badge: 'جديد' },
                // المكتبة الإعلامية والفيديوهات قد تكون خاصة بإدارة المحتوى
                ...(permissions.canAccessAdvancedTools ? [
                    { title: 'المكتبة الإعلامية', href: '/dashboard/admin/media', icon: ImageIcon },
                    { title: 'الفيديوهات', href: '/dashboard/admin/videos', icon: Video },
                    { title: 'الإعلانات', href: '/dashboard/admin/ads', icon: Megaphone },
                    { title: 'إدارة المحتوى', href: '/dashboard/admin/content', icon: FileText },
                ] : [])
            ],
        });
    }

    // المالية - يتطلب صلاحية عرض الإحصائيات أو إدارة النظام
    if (permissions.canViewStatistics || permissions.canAccessAdminPanel) {
        items.push({
            title: 'المالية',
            href: '#',
            icon: DollarSign,
            children: [
                { title: 'المدفوعات', href: '/dashboard/admin/payments', icon: CreditCard },
                { title: 'المدفوعات V2', href: '/dashboard/admin/payments-v2', icon: CreditCard },
                { title: 'الباقات والأسعار', href: '/dashboard/admin/pricing-management', icon: Tag },
                { title: 'الفواتير', href: '/dashboard/admin/invoices', icon: FileText },
                { title: 'الاشتراكات', href: '/dashboard/admin/subscriptions', icon: DollarSign },
                { title: 'Geidea إعدادات', href: '/dashboard/admin/geidea-settings', icon: Settings },
                { title: 'Geidea المعاملات', href: '/dashboard/admin/geidea-transactions', icon: CreditCard },
                { title: 'SkipCash', href: '/dashboard/admin/skipcash', icon: CreditCard },
            ],
        });
    }

    // التواصل - يتطلب صلاحيات التواصل
    if (permissions.canSendWhatsApp || permissions.canSendEmails) {
        const commChildren: MenuItem[] = [];

        if (permissions.canSendEmails) {
            commChildren.push(
                { title: 'إرسال إشعارات', href: '/dashboard/admin/send-notifications', icon: Bell },
                { title: 'مركز البريد', href: '/dashboard/admin/email-center', icon: Mail }
            );
        }

        commChildren.push(
            { title: 'الإشعارات', href: '/dashboard/admin/notifications', icon: Bell },
            { title: 'مركز الإشعارات', href: '/dashboard/admin/notification-center', icon: Bell },
            { title: 'الدعم الفني', href: '/dashboard/admin/support', icon: HelpCircle },
            { title: 'الرسائل', href: '/dashboard/admin/messages', icon: MessageSquare },
            { title: 'إدارة الرسائل', href: '/dashboard/admin/message-management', icon: MessageSquare }
        );

        if (permissions.canSendWhatsApp) {
            commChildren.push(
                { title: 'واتساب', href: '/dashboard/admin/whatsapp', icon: MessageSquare },
                { title: 'ChatAman', href: '/dashboard/admin/chataman', icon: MessageSquare }
            );
        }

        items.push({
            title: 'التواصل',
            href: '#',
            icon: MessageSquare,
            children: commChildren,
        });
    }

    // أكاديمية الحلم - يتطلب صلاحيات عامة
    if (permissions.canViewCustomers) {
        items.push({
            title: 'أكاديمية الحلم',
            href: '#',
            icon: Trophy,
            children: [
                { title: 'أكاديمية الحلم', href: '/dashboard/admin/dream-academy', icon: Trophy },
                { title: 'التوظيف', href: '/dashboard/admin/careers', icon: Briefcase },
                { title: 'المخزون', href: '/dashboard/admin/inventory', icon: Package },
            ],
        });
    }

    // التقارير - يتطلب صلاحية عرض الإحصائيات
    if (permissions.canViewStatistics) {
        items.push({
            title: 'التقارير',
            href: '#',
            icon: BarChart3,
            children: [
                { title: 'التقارير', href: '/dashboard/admin/reports', icon: BarChart3 },
                { title: 'سجل الفيديو', href: '/dashboard/admin/video-logs', icon: Video },
                { title: 'Clarity', href: '/dashboard/admin/clarity', icon: BarChart3 },
            ],
        });
    }

    // النظام - يتطلب صلاحية إدارة النظام أو الأدمن
    if (permissions.canManageUsers || permissions.canAccessAdminPanel || permissions.canManageRoles) {
        const sysChildren: MenuItem[] = [
            { title: 'الملف الشخصي', href: '/dashboard/admin/profile', icon: User },
        ];

        if (permissions.canAccessAdminPanel) {
            sysChildren.push(
                { title: 'الإعدادات', href: '/dashboard/admin/settings', icon: Settings },
                { title: 'قاعدة البيانات', href: '/dashboard/admin/system', icon: Database },
                { title: 'تهيئة الأسعار', href: '/dashboard/admin/init-pricing', icon: Tag },
                { title: 'ترحيل البريد', href: '/dashboard/admin/email-migration', icon: Mail },
                { title: 'اختبار الوصول', href: '/dashboard/admin/test-access', icon: Settings }
            );
        }

        items.push({
            title: 'النظام',
            href: '#',
            icon: Settings,
            children: sysChildren,
        });
    }

    return items;
};

const getAgentMenu = () => [
    { title: 'الرئيسية', href: '/dashboard/agent', icon: Home },
    {
        title: 'اللاعبين',
        href: '#',
        icon: Users,
        children: [
            { title: 'لاعبيني', href: '/dashboard/agent/players', icon: Users },
            { title: 'البحث عن لاعبين', href: '/dashboard/agent/search-players', icon: Search },
            { title: 'فيديوهات اللاعبين', href: '/dashboard/agent/player-videos', icon: Video },
        ],
    },
    { title: 'الرسائل', href: '/dashboard/agent/messages', icon: MessageSquare },
    {
        title: 'المالية',
        href: '#',
        icon: CreditCard,
        children: [
            { title: 'الفواتير', href: '/dashboard/agent/billing', icon: FileText },
            { title: 'حالة الاشتراك', href: '/dashboard/agent/subscription-status', icon: Activity },
            { title: 'الدفع الجماعي', href: '/dashboard/agent/bulk-payment', icon: CreditCard },
        ],
    },
    { title: 'الملف الشخصي', href: '/dashboard/agent/profile', icon: User },
];

const getClubMenu = () => [
    { title: 'الرئيسية', href: '/dashboard/club', icon: Home },
    {
        title: 'الفريق',
        href: '#',
        icon: Users,
        children: [
            { title: 'اللاعبين', href: '/dashboard/club/players', icon: Users },
            { title: 'تقييم اللاعبين', href: '/dashboard/club/player-evaluation', icon: Activity },
            { title: 'فيديوهات اللاعبين', href: '/dashboard/club/player-videos', icon: Video },
        ],
    },
    {
        title: 'الكشافة',
        href: '#',
        icon: Search,
        children: [
            { title: 'البحث عن لاعبين', href: '/dashboard/club/search-players', icon: Search },
            { title: 'تحليل الذكاء الاصطناعي', href: '/dashboard/club/ai-analysis', icon: TrendingUp },
            { title: 'قيم السوق', href: '/dashboard/club/market-values', icon: BarChart3 },
        ],
    },
    {
        title: 'الإدارة',
        href: '#',
        icon: Briefcase,
        children: [
            { title: 'العقود', href: '/dashboard/club/contracts', icon: FileText },
            { title: 'المفاوضات', href: '/dashboard/club/negotiations', icon: User },
            { title: 'التسويق', href: '/dashboard/club/marketing', icon: Megaphone },
        ],
    },
    { title: 'الرسائل', href: '/dashboard/club/messages', icon: MessageSquare },
    {
        title: 'المالية',
        href: '#',
        icon: CreditCard,
        children: [
            { title: 'الفواتير', href: '/dashboard/club/billing', icon: FileText },
            { title: 'حالة الاشتراك', href: '/dashboard/club/subscription-status', icon: Activity },
            { title: 'الدفع الجماعي', href: '/dashboard/club/bulk-payment', icon: CreditCard },
        ],
    },
    { title: 'تغيير كلمة المرور', href: '/dashboard/club/change-password', icon: Settings },
    { title: 'الملف الشخصي', href: '/dashboard/club/profile', icon: User },
];

const getAcademyMenu = () => [
    { title: 'الرئيسية', href: '/dashboard/academy', icon: Home },
    {
        title: 'اللاعبين',
        href: '#',
        icon: Users,
        children: [
            { title: 'اللاعبين', href: '/dashboard/academy/players', icon: Users },
            { title: 'البحث عن لاعبين', href: '/dashboard/academy/search-players', icon: Search },
            { title: 'فيديوهات اللاعبين', href: '/dashboard/academy/player-videos', icon: Video },
        ],
    },
    { title: 'الرسائل', href: '/dashboard/academy/messages', icon: MessageSquare },
    {
        title: 'المالية',
        href: '#',
        icon: CreditCard,
        children: [
            { title: 'الفواتير', href: '/dashboard/academy/billing', icon: FileText },
            { title: 'حالة الاشتراك', href: '/dashboard/academy/subscription-status', icon: Activity },
            { title: 'الدفع الجماعي', href: '/dashboard/academy/bulk-payment', icon: CreditCard },
        ],
    },
    { title: 'الملف الشخصي', href: '/dashboard/academy/profile', icon: User },
];

const getPlayerMenu = () => [
    { title: 'الرئيسية', href: '/dashboard/player', icon: Home },
    { title: 'الملف الشخصي', href: '/dashboard/player/profile', icon: User },
    {
        title: 'وسائط',
        href: '#',
        icon: Video,
        children: [
            { title: 'الفيديوهات', href: '/dashboard/player/videos', icon: Video },
            { title: 'فيديوهات مشتركة', href: '/dashboard/player/shared-videos', icon: Video },
        ],
    },
    {
        title: 'الأداء',
        href: '#',
        icon: Activity,
        children: [
            { title: 'الإحصائيات', href: '/dashboard/player/stats', icon: BarChart3 },
            { title: 'التقارير', href: '/dashboard/player/reports', icon: FileText },
        ],
    },
    {
        title: 'السوق',
        href: '#',
        icon: ShoppingCart,
        children: [
            { title: 'المتجر', href: '/dashboard/player/store', icon: ShoppingCart },
            { title: 'البحث', href: '/dashboard/player/search', icon: Search },
        ],
    },
    { title: 'الإحالات', href: '/dashboard/player/referrals', icon: Users },
    { title: 'الرسائل', href: '/dashboard/player/messages', icon: MessageSquare },
    {
        title: 'المالية',
        href: '#',
        icon: CreditCard,
        children: [
            { title: 'الفواتير', href: '/dashboard/player/billing', icon: FileText },
            { title: 'حالة الاشتراك', href: '/dashboard/player/subscription-status', icon: Activity },
        ],
    },
];

// ============================================
// SIDEBAR COMPONENT
// ============================================
interface SidebarProps {
    accountType?: string;
}

const ModernSidebar: React.FC<SidebarProps> = ({ accountType = 'admin' }) => {
    const { user, userData, logout } = useAuth();
    const { permissions, loading: permissionsLoading } = useEmployeePermissions(); // استدعاء الخطاف للحصول على الصلاحيات
    const router = useRouter();
    const pathname = usePathname();
    const { isSidebarCollapsed, isMobile, closeSidebar, collapseSidebar, expandSidebar } = useLayout();
    const [showLogoutScreen, setShowLogoutScreen] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>(['الرئيسية']);

    // Account-specific gradients
    const accountGradients: Record<string, string> = {
        admin: 'from-indigo-600 via-purple-600 to-pink-600',
        player: 'from-blue-600 via-cyan-600 to-teal-600',
        club: 'from-green-600 via-emerald-600 to-lime-600',
        academy: 'from-orange-600 via-amber-600 to-yellow-600',
        trainer: 'from-red-600 via-rose-600 to-pink-600',
        agent: 'from-cyan-600 via-sky-600 to-blue-600',
        marketer: 'from-pink-600 via-fuchsia-600 to-purple-600',
    };

    const currentGradient = accountGradients[accountType] || accountGradients.admin;

    const menuItems = useMemo(() => {
        // ننتظر تحميل الصلاحيات للأدمن
        if (accountType === 'admin' && permissionsLoading) return [];

        switch (accountType) {
            case 'admin': return getAdminMenu(permissions); // تمرير الصلاحيات لدالة القائمة
            case 'agent': return getAgentMenu();
            case 'club': return getClubMenu();
            case 'academy': return getAcademyMenu();
            case 'player': return getPlayerMenu();
            default: return [];
        }
    }, [accountType, permissions, permissionsLoading]);

    const toggleExpanded = (title: string) => {
        setExpandedItems(prev =>
            prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
        );
    };

    const handleNavigation = (href: string) => {
        router.push(href);
        if (isMobile) closeSidebar();
    };

    const handleLogout = async () => {
        setShowLogoutScreen(true);
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
            setShowLogoutScreen(false);
        }
    };

    const getUserName = () => {
        if (!userData) return 'مستخدم';
        return userData.full_name || userData.name || user?.displayName || 'مستخدم';
    };

    const getRoleTitle = () => {
        const roleTitles: Record<string, string> = {
            admin: 'مدير النظام',
            player: 'لاعب',
            club: 'نادي',
            academy: 'أكاديمية',
            trainer: 'مدرب',
            agent: 'وكيل',
            marketer: 'مسوق',
        };
        return roleTitles[accountType] || 'مستخدم';
    };

    const SidebarContent = (
        <div className={`flex flex-col h-full bg-gradient-to-br ${currentGradient}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10">
                {isSidebarCollapsed ? (
                    // Collapsed view - Only avatar centered
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                                <AvatarImage src={user?.photoURL || ''} />
                                <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white font-bold text-lg">
                                    {getUserName().charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm" />
                        </div>
                        {/* Expand Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-md transition-all"
                            onClick={expandSidebar}
                            title="توسيع القائمة ◀"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    // Expanded view - Avatar, name, and collapse button
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative">
                                <Avatar className="h-10 w-10 border-2 border-white/30 shadow-lg">
                                    <AvatarImage src={user?.photoURL || ''} />
                                    <AvatarFallback className="bg-white/20 backdrop-blur-sm text-white font-bold text-lg">
                                        {getUserName().charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-400 border-2 border-white rounded-full shadow-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate drop-shadow-sm">
                                    {getUserName()}
                                </p>
                                <p className="text-xs text-white/80 truncate">{getRoleTitle()}</p>
                            </div>
                        </div>
                        {/* Collapse Button */}
                        {!isMobile && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-md transition-all"
                                onClick={collapseSidebar}
                                title="طي القائمة ▶"
                            >
                                <ChevronRight className="h-5 w-5 rotate-180" />
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isExpanded = expandedItems.includes(item.title);
                        const hasChildren = item.children && item.children.length > 0;
                        const Icon = item.icon;

                        return (
                            <div key={item.title}>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        'w-full justify-start gap-3 h-11 px-3 font-semibold transition-all text-white/90 hover:text-white hover:bg-white/15',
                                        isSidebarCollapsed && 'justify-center px-2'
                                    )}
                                    onClick={() => {
                                        if (hasChildren) toggleExpanded(item.title);
                                        else if (item.href !== '#') handleNavigation(item.href);
                                    }}
                                >
                                    <Icon className="h-5 w-5 shrink-0" />
                                    {!isSidebarCollapsed && (
                                        <>
                                            <span className="flex-1 text-right">{item.title}</span>
                                            {hasChildren && (
                                                isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                                            )}
                                        </>
                                    )}
                                </Button>

                                {/* Sub-items */}
                                {hasChildren && isExpanded && !isSidebarCollapsed && (
                                    <div className="mr-3 mt-1 space-y-0.5 border-r-2 border-white/20 pr-3">
                                        {item.children!.map((child) => {
                                            const ChildIcon = child.icon;
                                            const isActive = pathname === child.href;

                                            return (
                                                <Button
                                                    key={child.href}
                                                    variant="ghost"
                                                    className={cn(
                                                        'w-full justify-start gap-2 h-9 px-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10',
                                                        isActive && 'bg-white/20 text-white font-semibold'
                                                    )}
                                                    onClick={() => handleNavigation(child.href)}
                                                >
                                                    <ChildIcon className="h-4 w-4 shrink-0" />
                                                    <span className="flex-1 text-right">{child.title}</span>
                                                    {child.badge && (
                                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-yellow-400 text-yellow-900 border-0">
                                                            {child.badge}
                                                        </Badge>
                                                    )}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t border-white/10">
                <Button
                    variant="ghost"
                    className={cn(
                        'w-full justify-start gap-3 h-11 font-semibold text-red-200 hover:text-white hover:bg-red-500/30 border border-red-400/30',
                        isSidebarCollapsed && 'justify-center'
                    )}
                    onClick={handleLogout}
                >
                    <LogOut className="h-5 w-5" />
                    {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                </Button>
            </div>

            {showLogoutScreen && <LogoutScreen />}
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={isSidebarOpen} onOpenChange={closeSidebar}>
                <SheetContent side="right" className="p-0 w-72">
                    {SidebarContent}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <aside
            className={cn(
                'fixed right-0 top-0 z-40 h-screen border-l border-slate-200 dark:border-slate-800 transition-all duration-300',
                isSidebarCollapsed ? 'w-16' : 'w-64'
            )}
        >
            {SidebarContent}
        </aside>
    );
};

// ============================================
// HEADER COMPONENT
// ============================================
interface HeaderProps {
    accountType?: string;
}

const ModernHeader: React.FC<HeaderProps> = ({ accountType = 'admin' }) => {
    const { isMobile, isClient } = useLayout();
    const { user, userData, logout } = useAuth();
    const router = useRouter();

    if (!isClient) return null;

    const getUserName = () => {
        if (!userData) return 'مستخدم';
        return userData.full_name || userData.name || user?.displayName || 'مستخدم';
    };

    return (
        <header
            className={cn(
                'sticky top-0 z-30 h-14 flex items-center justify-end gap-3 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/95 px-6 transition-all duration-300'
            )}
        >
            {/* Notifications & Messages */}
            <UnifiedNotificationsButton />
            <UnifiedMessagesButton />

            {/* User Menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 h-9 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={user?.photoURL || ''} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                {getUserName().charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        {!isMobile && (
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getUserName()}</span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>حسابي</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/${accountType}/profile`)}>
                        <User className="ml-2 h-4 w-4" />
                        <span>الملف الشخصي</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/${accountType}/settings`)}>
                        <Settings className="ml-2 h-4 w-4" />
                        <span>الإعدادات</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-red-600 focus:text-red-600 dark:text-red-400"
                        onClick={async () => {
                            try {
                                await logout();
                                router.push('/');
                            } catch (error) {
                                console.error('Logout error:', error);
                            }
                        }}
                    >
                        <LogOut className="ml-2 h-4 w-4" />
                        <span>تسجيل الخروج</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
};

// ============================================
// MAIN LAYOUT
// ============================================
interface ResponsiveLayoutProps {
    children: React.ReactNode;
    accountType?: string;
    showHeader?: boolean;
    showFooter?: boolean;
    noPadding?: boolean;
}

const LayoutContent: React.FC<ResponsiveLayoutProps> = ({
    children,
    accountType = 'admin',
    showHeader = true,
    showFooter = true,
    noPadding = false,
}) => {
    const { isSidebarCollapsed, isMobile, isClient } = useLayout();

    if (!isClient) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <ModernSidebar accountType={accountType} />
            <div
                className={cn(
                    'flex flex-col min-h-screen transition-all duration-300',
                    !isMobile && (isSidebarCollapsed ? 'mr-16' : 'mr-64')
                )}
            >
                {showHeader && <ModernHeader accountType={accountType} />}
                <main className={cn('flex-1', noPadding ? 'p-0' : 'p-6')}>
                    {children}
                </main>
                {showFooter && (
                    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 px-6">
                        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                            <p>© 2024 El7lm. جميع الحقوق محفوظة.</p>
                            <div className="flex gap-4">
                                <a href="/privacy" className="hover:text-primary transition-colors">سياسة الخصوصية</a>
                                <a href="/terms" className="hover:text-primary transition-colors">الشروط والأحكام</a>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = (props) => {
    return (
        <LayoutProvider>
            <LayoutContent {...props} />
        </LayoutProvider>
    );
};

export const ResponsiveLayoutWrapper = ResponsiveLayout;
export default ResponsiveLayoutWrapper;
