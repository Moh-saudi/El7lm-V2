'use client';

import LogoutScreen from '@/components/auth/LogoutScreen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/firebase/auth-provider';
import { db } from '@/lib/firebase/config';
import { getPlayerAvatarUrl, getSupabaseImageUrl } from '@/lib/supabase/image-utils';
import { EmployeeRole, RolePermissions } from '@/types/employees';
import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Award,
    BarChart3,
    Bell,
    Brain,
    Briefcase,
    Building,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    DollarSign,
    FileText,
    GraduationCap,
    Headphones,
    Home,
    LogOut,
    Mail,
    Menu,
    MessageSquare,
    Play,
    Search,
    Send,
    Settings,
    Shield,
    ShoppingBag,
    Star,
    Target,
    TrendingUp,
    Trophy,
    User,
    UserCheck,
    UserPlus,
    Users,
    Video,
    X
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from 'react-responsive';

// ===== Context للتحكم في التخطيط =====
interface LayoutContextType {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isClient: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  closeSidebar: () => void;
  openSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

// ===== Provider للتحكم في التخطيط =====
interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // استخدام react-responsive للكشف عن حجم الشاشة
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  // التأكد من أن المكون يعمل على العميل فقط
  useEffect(() => {
    setIsClient(true);
  }, []);

  // إدارة حالة السايدبار حسب حجم الشاشة
  useEffect(() => {
    if (!isClient) return; // لا نطبق التغييرات حتى يعمل على العميل

    if (isMobile) {
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    } else if (isTablet) {
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(false); // تغيير من true إلى false
    } else {
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(false);
    }
  }, [isMobile, isTablet, isDesktop, isClient]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(!isSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
      // تأكد من أن السايدبار مفتوح على الشاشات الكبيرة
      if (isSidebarCollapsed) {
        setIsSidebarOpen(true);
      }
    }
  };

  const toggleSidebarCollapse = () => {
    if (!isMobile) {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarCollapsed(true);
    }
  };

  const openSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  };

  const value: LayoutContextType = {
    isSidebarOpen,
    isSidebarCollapsed,
    isMobile,
    isTablet,
    isDesktop,
    isClient,
    toggleSidebar,
    toggleSidebarCollapse,
    closeSidebar,
    openSidebar,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

// ===== مكون السايدبار المحسن =====
interface ResponsiveSidebarProps {
  accountType?: string;
}

const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({ accountType: propAccountType = 'player' }) => {
  const { user, userData, logout } = useAuth();

  // تحديد نوع الحساب من userData أو من prop
  const accountType = userData?.accountType || propAccountType;
  const router = useRouter();
  const pathname = usePathname();

  const {
    isSidebarOpen,
    isSidebarCollapsed,
    isMobile,
    isTablet,
    isDesktop,
    isClient,
    toggleSidebar,
    closeSidebar
  } = useLayout();

  const [activeItem, setActiveItem] = useState('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['main']));
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  // معلومات أنواع الحسابات
  const ACCOUNT_TYPE_INFO = {
    player: {
      title: 'منصة اللاعب',
      subtitle: 'لاعب',
      icon: User,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      emoji: '⚽'
    },
    club: {
      title: 'منصة النادي',
      subtitle: 'نادي',
      icon: Building,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      emoji: '🏢'
    },
    admin: {
      title: 'منصة الإدارة',
      subtitle: 'مدير',
      icon: Shield,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      emoji: '👑'
    },
    agent: {
      title: 'منصة الوكيل',
      subtitle: 'وكيل',
      icon: Briefcase,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      emoji: '💼'
    },
    academy: {
      title: 'منصة الأكاديمية',
      subtitle: 'أكاديمية',
      icon: GraduationCap,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      emoji: '🎓'
    },
    trainer: {
      title: 'منصة المدرب',
      subtitle: 'مدرب',
      icon: Target,
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-600',
      emoji: '🎯'
    },
    marketer: {
      title: 'منصة المسوق',
      subtitle: 'مسوق',
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      emoji: '📈'
    },
    'dream-academy': {
      title: 'أكاديمية الحلم',
      subtitle: 'أكاديمية الحلم',
      icon: GraduationCap,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      emoji: '🎓'
    }
  };

  const accountInfo = ACCOUNT_TYPE_INFO[accountType as keyof typeof ACCOUNT_TYPE_INFO] || ACCOUNT_TYPE_INFO.player;
  const IconComponent = accountInfo.icon;

  // تحديد عرض السايدبار - أحجام مصغرة
  const getSidebarWidth = () => {
    if (isMobile) return 'w-72';
    if (isSidebarCollapsed) {
      if (isTablet) return 'w-14';
      return 'w-16';
    }
    if (isTablet) return 'w-56';
    return 'w-64';
  };

  // تحديد ما إذا كان يجب إظهار النصوص
  const shouldShowText = () => {
    if (isMobile) return true;
    if (isTablet) return !isSidebarCollapsed;
    return !isSidebarCollapsed;
  };

  // الحصول على مجموعات القائمة
  // الصلاحيات الافتراضية لكل دور وظيفي (من employees/page.tsx)
  const DEFAULT_PERMISSIONS: Record<EmployeeRole, RolePermissions> = {
    support: {
      canViewUsers: true,
      canEditUsers: false,
      canViewFinancials: false,
      canManagePayments: false,
      allowedLocations: [],
      canViewReports: false,
      canManageContent: false,
      canManageEmployees: false,
      canViewSupport: true,
      canManageSupport: true
    },
    finance: {
      canViewUsers: true,
      canEditUsers: false,
      canViewFinancials: true,
      canManagePayments: true,
      allowedLocations: [],
      canViewReports: true,
      canManageContent: false,
      canManageEmployees: false,
      canViewSupport: false,
      canManageSupport: false
    },
    sales: {
      canViewUsers: true,
      canEditUsers: false,
      canViewFinancials: false,
      canManagePayments: false,
      allowedLocations: [],
      canViewReports: true,
      canManageContent: false,
      canManageEmployees: false,
      canViewSupport: true,
      canManageSupport: false
    },
    content: {
      canViewUsers: false,
      canEditUsers: false,
      canViewFinancials: false,
      canManagePayments: false,
      allowedLocations: [],
      canViewReports: false,
      canManageContent: true,
      canManageEmployees: false,
      canViewSupport: false,
      canManageSupport: false
    },
    admin: {
      canViewUsers: true,
      canEditUsers: true,
      canViewFinancials: true,
      canManagePayments: true,
      allowedLocations: [],
      canViewReports: true,
      canManageContent: true,
      canManageEmployees: true,
      canViewSupport: true,
      canManageSupport: true
    },
    supervisor: {
      canViewUsers: true,
      canEditUsers: true,
      canViewFinancials: true,
      canManagePayments: false,
      allowedLocations: [],
      canViewReports: true,
      canManageContent: true,
      canManageEmployees: false,
      canViewSupport: true,
      canManageSupport: true
    }
  };

  // الحصول على صلاحيات الموظف
  const getEmployeePermissions = useMemo((): RolePermissions | null => {
    if (!userData || accountType !== 'admin') {
      return null;
    }
    
    console.log('🔍 ResponsiveSidebar - Checking userData:', {
      employeeId: userData.employeeId,
      employeeRole: userData.employeeRole,
      role: userData.role,
      accountType: userData.accountType,
      allKeys: Object.keys(userData)
    });
    
    // إذا كان موظفاً (لديه employeeId أو employeeRole أو role)
    if (userData.employeeId || userData.employeeRole || userData.role) {
      const role = (userData.employeeRole || userData.role) as EmployeeRole;
      
      // التحقق من أن الدور موجود في DEFAULT_PERMISSIONS
      if (role && role in DEFAULT_PERMISSIONS) {
        console.log('✅ ResponsiveSidebar - Employee detected with valid role:', {
          role,
          permissions: DEFAULT_PERMISSIONS[role]
        });
        return DEFAULT_PERMISSIONS[role];
      } else {
        console.warn('⚠️ ResponsiveSidebar - Employee role not found in DEFAULT_PERMISSIONS:', role);
        return null;
      }
    }
    
    // إذا كان admin حقيقي (ليس موظف)
    console.log('✅ ResponsiveSidebar - Real admin detected (not employee) - showing all items');
    return null; // null يعني عرض كل شيء
  }, [userData, accountType]);

  // التحقق من صلاحية لعنصر القائمة
  const hasPermissionForMenuItem = (menuItemId: string, permissions: RolePermissions | null): boolean => {
    // إذا لم تكن صلاحيات محددة (ليس موظف)، اظهر كل شيء
    if (!permissions) return true;
    
    // mapping بين عناصر القائمة والصلاحيات المطلوبة
    const menuItemPermissions: Record<string, keyof RolePermissions> = {
      'admin-users-management': 'canViewUsers',
      'admin-employees': 'canManageEmployees',
      'admin-email-migration': 'canManageEmployees',
      'admin-check-phone': 'canViewUsers',
      'admin-payments': 'canManagePayments',
      'admin-geidea-transactions': 'canViewFinancials',
      'admin-geidea-settings': 'canManagePayments',
      'admin-subscriptions': 'canManagePayments',
      'admin-invoices': 'canViewFinancials',
      'admin-reports': 'canViewReports',
      'admin-clarity': 'canViewReports',
      'admin-support': 'canViewSupport',
      'admin-system': 'canManageEmployees', // يحتاج صلاحية إدارة الموظفين
      'admin-beon-v3': 'canManageEmployees',
      'admin-whatsapp-test': 'canManageSupport',
      'admin-tournaments': 'canManageContent',
      'admin-dream-academy-categories': 'canManageContent',
      'admin-customer-management': 'canViewUsers',
      'admin-careers': 'canManageContent',
      'admin-send-notifications': 'canManageSupport',
      'admin-notification-center': 'canManageSupport',
      'admin-notifications': 'canManageSupport',
      'admin-marketing-ads': 'canManageContent',
      'admin-marketing-campaigns': 'canManageContent',
      'admin-marketing-analytics': 'canViewReports',
      'admin-convert-players': 'canEditUsers',
    };
    
    const requiredPermission = menuItemPermissions[menuItemId];
    if (!requiredPermission) {
      // العناصر التي لا تحتاج صلاحيات خاصة (مثل profile, messages) تظهر دائماً
      return true;
    }
    
    return permissions[requiredPermission] === true;
  };

  // فلترة عناصر المجموعة بناءً على الصلاحيات
  const filterGroupItems = (items: any[], permissions: RolePermissions | null): any[] => {
    if (!permissions) return items;
    return items.filter(item => hasPermissionForMenuItem(item.id, permissions));
  };

  const getMenuGroups = () => {
    const baseGroup = {
      id: 'main',
      title: 'القائمة الرئيسية',
      icon: Home,
      items: [
        {
          id: 'dashboard',
          label: 'الرئيسية',
          icon: Home,
          href: `/dashboard/${accountType}`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        },
        {
          id: 'profile',
          label: 'الملف الشخصي',
          icon: User,
          href: `/dashboard/${accountType}/profile`,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        },
        {
          id: 'messages',
          label: 'الرسائل',
          icon: MessageSquare,
          href: `/dashboard/messages`,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50'
        },
        {
          id: 'notifications',
          label: 'الإشعارات',
          icon: Bell,
          href: `/dashboard/${accountType}/notifications`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50'
        }
      ]
    };

    const subscriptionGroup = {
      id: 'subscription',
      title: 'الاشتراكات والمدفوعات',
      icon: CreditCard,
      items: [
        {
          id: 'subscription-status',
          label: 'حالة الاشتراك',
          icon: Star,
          href: `/dashboard/subscription`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        },
        {
          id: 'payment',
          label: 'الدفع',
          icon: CreditCard,
          href: accountType === 'admin' ? `/dashboard/admin/payments` : `/dashboard/shared/bulk-payment`,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      ]
    };

    const academyGroup = {
      id: 'academy',
      title: 'التدريب والتعليم',
      icon: GraduationCap,
      items: [
        {
          id: 'dream-academy',
          label: 'أكاديمية الحلم',
          icon: GraduationCap,
          href: `/dashboard/dream-academy`,
          color: 'text-indigo-600',
          bgColor: 'bg-indigo-50'
        }
      ]
    };

    const sharedGroup = {
      id: 'shared',
      title: 'الصفحات المشتركة',
      icon: Users,
      items: [
        {
          id: 'shared-bulk-payment',
          label: 'الدفع الجماعي',
          icon: CreditCard,
          href: `/dashboard/shared/bulk-payment`,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        }
      ]
    };

    const tournamentsGroup = {
      id: 'tournaments',
      title: 'البطولات',
      icon: Trophy,
      items: [
        {
          id: 'unified-tournament-registration',
          label: 'البطولات',
          icon: Trophy,
          href: `/tournaments/unified-registration`,
          color: 'text-white',
          bgColor: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          isHighlighted: true
        }
      ]
    };

    // إضافة قوائم مخصصة حسب نوع الحساب - الصفحات الموجودة فعلياً
    const accountSpecificGroups = [];

    // قائمة اللاعب - إعادة ترتيب منطقي
    if (accountType === 'player') {
      accountSpecificGroups.push({
        id: 'player-content',
        title: 'المحتوى الشخصي',
        icon: Video,
        items: [
          {
            id: 'player-videos',
            label: 'فيديوهاتي',
            icon: Video,
            href: `/dashboard/player/videos`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'player-stats',
            label: 'إحصائياتي',
            icon: BarChart3,
            href: `/dashboard/player/stats`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'player-reports',
            label: 'تقاريري',
            icon: FileText,
            href: `/dashboard/player/reports`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'player-services',
        title: 'الخدمات',
        icon: ShoppingBag,
        items: [
          {
            id: 'player-academy',
            label: 'الأكاديمية',
            icon: GraduationCap,
            href: `/dashboard/player/academy`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'player-store',
            label: 'المتجر',
            icon: ShoppingBag,
            href: `/dashboard/player/store`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'player-search',
            label: 'البحث عن الفرص والأندية والأكاديميات',
            icon: Search,
            href: `/dashboard/player/search`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          },
          {
            id: 'player-search-players',
            label: 'البحث عن لاعبين',
            icon: Users,
            href: `/dashboard/player/search-players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
        {
          id: 'player-shared-videos',
          label: 'فيديوهات اللاعبين المشتركة',
          icon: Play,
          href: `/dashboard/player/shared-videos`,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50'
        },
        {
          id: 'player-tournaments',
          label: 'البطولات',
          icon: Award,
          href: `/tournaments/unified-registration`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        },
        ]
      });

      accountSpecificGroups.push({
        id: 'player-financial',
        title: 'المالية',
        icon: DollarSign,
        items: [
          {
            id: 'player-billing',
            label: 'الفواتير',
            icon: CreditCard,
            href: `/dashboard/player/billing`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
          {
            id: 'player-referrals',
            label: 'الإحالات',
            icon: Users,
            href: `/dashboard/player/referrals`,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50'
          }
        ]
      });
    }

    // قائمة النادي - إعادة ترتيب منطقي
    if (accountType === 'club') {
      accountSpecificGroups.push({
        id: 'club-players',
        title: 'إدارة اللاعبين',
        icon: Users,
        items: [
          {
            id: 'club-players-list',
            label: 'قائمة اللاعبين',
            icon: Users,
            href: `/dashboard/club/players`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'club-search-players',
            label: 'البحث عن لاعبين',
            icon: Search,
            href: `/dashboard/club/search-players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'club-referrals',
            label: 'الإحالات',
            icon: Users,
            href: `/dashboard/club/referrals`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'club-player-videos',
            label: 'فيديوهات اللاعبين',
            icon: Video,
            href: `/dashboard/club/player-videos`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'club-player-evaluation',
            label: 'تقييم اللاعبين',
            icon: Target,
            href: `/dashboard/club/player-evaluation`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            id: 'club-tournaments',
            label: 'البطولات',
            icon: Award,
            href: `/tournaments/unified-registration`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
        ]
      });

      accountSpecificGroups.push({
        id: 'club-business',
        title: 'الأعمال التجارية',
        icon: Users,
        items: [
          {
            id: 'club-contracts',
            label: 'العقود',
            icon: FileText,
            href: `/dashboard/club/contracts`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          },
          {
            id: 'club-negotiations',
            label: 'المفاوضات',
            icon: Users,
            href: `/dashboard/club/negotiations`,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50'
          },
          {
            id: 'club-market-values',
            label: 'القيم السوقية',
            icon: DollarSign,
            href: `/dashboard/club/market-values`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'club-marketing',
        title: 'التسويق والتحليل',
        icon: TrendingUp,
        items: [
          {
            id: 'club-marketing-tools',
            label: 'التسويق',
            icon: TrendingUp,
            href: `/dashboard/club/marketing`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'club-ai-analysis',
            label: 'تحليل الذكاء الاصطناعي',
            icon: Brain,
            href: `/dashboard/club/ai-analysis`,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
          }
        ]
      });
    }

    // قائمة المدرب - إعادة ترتيب منطقي
    if (accountType === 'trainer') {
      accountSpecificGroups.push({
        id: 'trainer-players',
        title: 'إدارة اللاعبين',
        icon: Users,
        items: [
          {
            id: 'trainer-players-list',
            label: 'قائمة لاعبي',
            icon: Users,
            href: `/dashboard/trainer/players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'trainer-search-players',
            label: 'البحث عن لاعبين',
            icon: Search,
            href: `/dashboard/trainer/search-players`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'trainer-player-videos',
            label: 'فيديوهات اللاعبين',
            icon: Video,
            href: `/dashboard/trainer/player-videos`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'trainer-referrals',
            label: 'الإحالات',
            icon: Users,
            href: `/dashboard/trainer/referrals`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'trainer-tournaments',
            label: 'البطولات',
            icon: Award,
            href: `/tournaments/unified-registration`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
        ]
      });
    }

    // قائمة الأكاديمية - إعادة ترتيب منطقي
    if (accountType === 'academy') {
      accountSpecificGroups.push({
        id: 'academy-players',
        title: 'إدارة اللاعبين',
        icon: Users,
        items: [
          {
            id: 'academy-players-list',
            label: 'لاعبي الأكاديمية',
            icon: Users,
            href: `/dashboard/academy/players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'academy-search-players',
            label: 'البحث عن لاعبين',
            icon: Search,
            href: `/dashboard/academy/search-players`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'academy-player-videos',
            label: 'فيديوهات اللاعبين',
            icon: Video,
            href: `/dashboard/academy/player-videos`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'academy-referrals',
            label: 'الإحالات',
            icon: Users,
            href: `/dashboard/academy/referrals`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'academy-tournaments',
            label: 'البطولات',
            icon: Award,
            href: `/tournaments/unified-registration`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
        ]
      });
    }

    // قائمة الوكيل - إعادة ترتيب منطقي
    if (accountType === 'agent') {
      accountSpecificGroups.push({
        id: 'agent-players',
        title: 'إدارة اللاعبين',
        icon: Users,
        items: [
          {
            id: 'agent-players-list',
            label: 'قائمة لاعبي',
            icon: Users,
            href: `/dashboard/agent/players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'agent-search-players',
            label: 'البحث عن لاعبين',
            icon: Search,
            href: `/dashboard/agent/search-players`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'agent-player-videos',
            label: 'فيديوهات اللاعبين',
            icon: Video,
            href: `/dashboard/agent/player-videos`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'agent-referrals',
            label: 'الإحالات',
            icon: Users,
            href: `/dashboard/agent/referrals`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'agent-tournaments',
            label: 'البطولات',
            icon: Award,
            href: `/tournaments/unified-registration`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
        ]
      });
    }

    // قائمة الإدارة - إعادة ترتيب منطقي
    if (accountType === 'admin') {
      accountSpecificGroups.push({
        id: 'admin-users',
        title: 'إدارة المستخدمين',
        icon: Users,
        items: [
          {
            id: 'admin-users-management',
            label: 'إدارة المستخدمين',
            icon: Users,
            href: `/dashboard/admin/users`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'admin-employees',
            label: 'الموظفين',
            icon: UserCheck,
            href: `/dashboard/admin/employees`,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50'
          },
          {
            id: 'admin-email-migration',
            label: 'ترحيل البريد الإلكتروني',
            icon: Mail,
            href: `/dashboard/admin/email-migration`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            id: 'admin-check-phone',
            label: 'فحص رقم الهاتف',
            icon: Search,
            href: `/dashboard/admin/users/check-phone`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'admin-financial',
        title: 'الإدارة المالية',
        icon: DollarSign,
        items: [
          {
            id: 'admin-payments',
            label: 'المدفوعات',
            icon: CreditCard,
            href: `/dashboard/admin/payments`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'admin-geidea-transactions',
            label: 'معاملات جيديا',
            icon: CreditCard,
            href: `/dashboard/admin/geidea-transactions`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'admin-geidea-settings',
            label: 'إعدادات جيديا',
            icon: Settings,
            href: `/dashboard/admin/geidea-settings`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          },
          {
            id: 'admin-subscriptions',
            label: 'الاشتراكات',
            icon: Star,
            href: `/dashboard/admin/subscriptions`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            id: 'admin-invoices',
            label: 'الفواتير',
            icon: FileText,
            href: `/dashboard/admin/invoices`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'admin-operations',
        title: 'العمليات',
        icon: Settings,
        items: [
          {
            id: 'admin-notifications',
            label: 'الإشعارات',
            icon: Bell,
            href: `/dashboard/admin/notifications`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            id: 'admin-notification-center',
            label: 'مركز الإشعارات',
            icon: Bell,
            href: `/dashboard/admin/notification-center`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'admin-send-notifications',
            label: 'إرسال الإشعارات',
            icon: Send,
            href: `/dashboard/admin/send-notifications`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },

          {
            id: 'admin-reports',
            label: 'التقارير',
            icon: FileText,
            href: `/dashboard/admin/reports`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'admin-clarity',
            label: 'Clarity Analytics',
            icon: BarChart3,
            href: `/dashboard/admin/clarity`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          },
          {
            id: 'admin-customer-management',
            label: 'إدارة العملاء',
            icon: UserPlus,
            href: `/dashboard/admin/customer-management`,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50'
          },
          {
            id: 'admin-careers',
            label: 'الوظائف',
            icon: Briefcase,
            href: `/dashboard/admin/careers`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50'
          },
          {
            id: 'admin-support',
            label: 'الدعم الفني',
            icon: Headphones,
            href: `/dashboard/admin/support`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
          {
            id: 'admin-beon-v3',
            label: 'إدارة BeOn V3',
            icon: MessageSquare,
            href: `/dashboard/admin/beon-v3`,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50'
          },
          {
            id: 'admin-whatsapp-test',
            label: 'اختبار WhatsApp API',
            icon: MessageSquare,
            href: `/dashboard/admin/whatsapp-test`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'admin-tournaments',
            label: 'إدارة البطولات',
            icon: Award,
            href: `/dashboard/admin/tournaments`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
          {
            id: 'admin-system',
            label: 'النظام',
            icon: Settings,
            href: `/dashboard/admin/system`,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'admin-marketing',
        title: 'التسويق والإعلانات',
        icon: TrendingUp,
        items: [
          {
            id: 'admin-ads',
            label: 'إدارة الإعلانات',
            icon: TrendingUp,
            href: `/dashboard/admin/ads`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            id: 'admin-videos',
            label: 'إدارة الفيديوهات',
            icon: Video,
            href: `/dashboard/admin/media`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'admin-academy',
        title: 'أكاديمية الحلم',
        icon: GraduationCap,
        items: [
          {
            id: 'admin-dream-academy',
            label: 'إدارة الأكاديمية',
            icon: GraduationCap,
            href: `/dashboard/admin/dream-academy`,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50'
          }
        ]
      });
    }

    // قائمة المسوق - إعادة ترتيب منطقي
    if (accountType === 'marketer') {
      accountSpecificGroups.push({
        id: 'marketer-dashboard',
        title: 'لوحة التسويق',
        icon: TrendingUp,
        items: [
          {
            id: 'marketer-main',
            label: 'لوحة التسويق',
            icon: BarChart3,
            href: `/dashboard/marketer`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'marketer-content',
        title: 'إدارة المحتوى',
        icon: Video,
        items: [
          {
            id: 'marketer-videos',
            label: 'فيديوهات اللاعبين',
            icon: Video,
            href: `/dashboard/marketer/videos`,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
          },
          {
            id: 'marketer-players',
            label: 'إدارة اللاعبين',
            icon: Users,
            href: `/dashboard/marketer/players`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          },
          {
            id: 'marketer-search',
            label: 'البحث عن لاعبين',
            icon: Search,
            href: `/dashboard/marketer/search`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          },
          {
            id: 'marketer-tournaments',
            label: 'البطولات',
            icon: Award,
            href: `/tournaments/unified-registration`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
        ]
      });

      accountSpecificGroups.push({
        id: 'marketer-services',
        title: 'الخدمات',
        icon: ShoppingBag,
        items: [
          {
            id: 'marketer-dream-academy',
            label: 'أكاديمية الحلم',
            icon: GraduationCap,
            href: `/dashboard/marketer/dream-academy`,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50'
          },
          {
            id: 'marketer-subscription',
            label: 'الاشتراكات',
            icon: CreditCard,
            href: `/dashboard/marketer/subscription`,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'marketer-financial',
        title: 'المالية',
        icon: DollarSign,
        items: [
          {
            id: 'marketer-billing',
            label: 'الفواتير',
            icon: CreditCard,
            href: `/dashboard/marketer/billing`,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50'
          },
          {
            id: 'marketer-payment',
            label: 'المدفوعات',
            icon: DollarSign,
            href: `/dashboard/marketer/payment`,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          }
        ]
      });

      accountSpecificGroups.push({
        id: 'marketer-communication',
        title: 'التواصل',
        icon: MessageSquare,
        items: [
          {
            id: 'marketer-messages',
            label: 'الرسائل',
            icon: MessageSquare,
            href: `/dashboard/marketer/messages`,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            id: 'marketer-notifications',
            label: 'الإشعارات',
            icon: Bell,
            href: `/dashboard/marketer/notifications`,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
          }
        ]
      });
    }

    // قائمة الوالد - إعادة ترتيب منطقي
    if (accountType === 'parent') {
      accountSpecificGroups.push({
        id: 'parent-dashboard',
        title: 'لوحة الوالد',
        icon: User,
        items: [
        {
          id: 'parent-main',
          label: 'لوحة الوالد',
          icon: BarChart3,
          href: `/dashboard/parent`,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        },
        {
          id: 'parent-tournaments',
          label: 'البطولات',
          icon: Award,
          href: `/tournaments/unified-registration`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        },
        ]
      });
    }

    const allGroups = [baseGroup, subscriptionGroup, academyGroup, tournamentsGroup, sharedGroup, ...accountSpecificGroups];
    
    // فلترة العناصر بناءً على صلاحيات الموظف
    if (accountType === 'admin' && getEmployeePermissions) {
      const filteredGroups = allGroups.map(group => ({
        ...group,
        items: filterGroupItems(group.items, getEmployeePermissions)
      })).filter(group => group.items.length > 0); // إزالة المجموعات الفارغة
      
      console.log('✅ ResponsiveSidebar - Filtered menu groups:', {
        totalGroups: allGroups.length,
        filteredGroups: filteredGroups.length,
        removedGroups: allGroups.length - filteredGroups.length,
        employeePermissions: getEmployeePermissions
      });
      
      return filteredGroups;
    }
    
    return allGroups;
  };

  const menuGroups = useMemo(() => getMenuGroups(), [accountType, userData, getEmployeePermissions]);
  const showText = useMemo(() => shouldShowText(), [isMobile, isTablet, isSidebarCollapsed]);
  const sidebarWidth = useMemo(() => getSidebarWidth(), [isMobile, isTablet, isSidebarCollapsed]);

  // جلب صورة النادي من Firestore إذا كان accountType === 'club'
  useEffect(() => {
    console.log('🔄 ResponsiveSidebar: useEffect triggered - accountType:', accountType, 'user?.uid:', user?.uid, 'clubLogo:', clubLogo);
    
    if (accountType !== 'club' || !user?.uid) {
      console.log('🔄 ResponsiveSidebar: Skipping club logo fetch - accountType:', accountType, 'uid:', user?.uid);
      return;
    }

    console.log('🔄 ResponsiveSidebar: Starting to fetch club logo for user:', user.uid);
    const clubRef = doc(db, 'clubs', user.uid);
    
    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          console.log('🔄 ResponsiveSidebar: Club document snapshot received, exists:', clubDoc.exists());
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            console.log('🔄 ResponsiveSidebar: Club data:', { 
              hasLogo: !!data.logo, 
              logo: data.logo,
              logoType: typeof data.logo,
              logoStartsWithHttp: data.logo?.startsWith('http')
            });
            
            if (data.logo) {
              // إذا كان logo رابط كامل، استخدمه مباشرة
              if (data.logo.startsWith('http')) {
                console.log('✅ ResponsiveSidebar: Using logo as full URL:', data.logo);
                setClubLogo(data.logo);
              } else {
                // إذا كان مسار، استخدم getSupabaseImageUrl مع bucket clubavatar (المخصص للنادي)
                console.log('🔄 ResponsiveSidebar: Logo is a path, converting with clubavatar bucket:', data.logo);
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                console.log('🔄 ResponsiveSidebar: Converted logo URL:', logoUrl);
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  console.log('⚠️ ResponsiveSidebar: Logo URL is empty, setting to null');
                  setClubLogo(null);
                }
              }
            } else {
              console.log('⚠️ ResponsiveSidebar: No logo field in club data');
              setClubLogo(null);
            }
          } else {
            console.log('⚠️ ResponsiveSidebar: Club document does not exist');
            setClubLogo(null);
          }
        } catch (error) {
          console.error('❌ ResponsiveSidebar: Error processing club logo:', error);
          setClubLogo(null);
        }
      },
      (error) => {
        console.error('❌ ResponsiveSidebar: Error listening to club logo updates:', error);
        setClubLogo(null);
      }
    );

    // تنظيف المستمع عند إلغاء التثبيت
    return () => {
      console.log('🔄 ResponsiveSidebar: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  const getUserAvatar = () => {
    // إذا كان النوع نادي وكانت هناك صورة من Firestore، استخدمها
    if (accountType === 'club' && clubLogo) {
      console.log('✅ ResponsiveSidebar: Using club logo from Firestore:', clubLogo);
      return clubLogo;
    }
    
    if (accountType === 'club') {
      console.log('⚠️ ResponsiveSidebar: Club account but no logo found, clubLogo:', clubLogo, 'falling back to getPlayerAvatarUrl');
    }
    
    // استخدام الدالة المحسّنة للبحث عن الصورة في Supabase
    const avatarUrl = getPlayerAvatarUrl(userData, user);
    console.log('🔄 ResponsiveSidebar: getPlayerAvatarUrl returned:', avatarUrl);
    return avatarUrl;
  };

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';
    
    // البحث في جميع الحقول المحتملة للاسم حسب نوع الحساب
    switch (userData.accountType) {
      case 'player':
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'لاعب';
      case 'club':
        return userData.club_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'نادي رياضي';
      case 'academy':
        return userData.academy_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'أكاديمية رياضية';
      case 'agent':
        return userData.agent_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'وكيل رياضي';
      case 'trainer':
        return userData.trainer_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'مدرب';
      default:
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'مستخدم';
    }
  };

  const handleNavigation = (href: string, id: string) => {
    setActiveItem(id);
    router.push(href);
    if (isMobile) {
      closeSidebar();
    }
  };

  const [showLogoutScreen, setShowLogoutScreen] = useState(false);

  const handleLogout = async () => {
    const confirmed = window.confirm('هل أنت متأكد من تسجيل الخروج؟');
    if (confirmed) {
      try {
        await logout();
        setShowLogoutScreen(true);
        console.log('✅ تم تسجيل الخروج بنجاح وتم عرض شاشة تسجيل الخروج');
      } catch (error) {
        console.error('❌ خطأ في تسجيل الخروج:', error);
        // حتى لو فشل تسجيل الخروج، نعرض شاشة تسجيل الخروج
        setShowLogoutScreen(true);
      }
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupId)) {
      newExpandedGroups.delete(groupId);
    } else {
      newExpandedGroups.add(groupId);
    }
    setExpandedGroups(newExpandedGroups);
  };

  // تحديد العنصر النشط
  useEffect(() => {
    for (const group of menuGroups) {
      const currentItem = group.items.find(item => item.href === pathname);
      if (currentItem) {
        setActiveItem(currentItem.id);
        setExpandedGroups(prev => new Set([...prev, group.id]));
        break;
      }
    }
  }, [pathname]);

  // لا تعرض السايدبار حتى يتم تحميل المكون على العميل
  if (!isClient) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={isMobile ? { x: '100%' } : { width: isSidebarCollapsed ? 64 : 256 }}
        animate={isMobile ? { x: isSidebarOpen ? 0 : '100%' } : { width: isSidebarCollapsed ? (isTablet ? 56 : 64) : (isTablet ? 224 : 256) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed top-0 right-0 h-full bg-gradient-to-b ${accountInfo.color} z-50 shadow-xl backdrop-blur-xl border-l border-white/20 ${
          isMobile ? 'w-72' : sidebarWidth
        }`}
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-3 border-b border-white/20">
            <div className="flex gap-2 items-center">
              <div className={`p-1.5 rounded-lg ${accountInfo.bgColor}`}>
                <IconComponent className={`w-5 h-5 ${accountInfo.textColor}`} />
              </div>
              <AnimatePresence>
                {showText && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col"
                  >
                    <h2 className="text-base font-bold text-white">{accountInfo.title}</h2>
                    <p className="text-xs text-white/70">{accountInfo.subtitle}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2 items-center">
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="text-white hover:bg-white/20"
                >
                  {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
              )}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeSidebar}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div className="p-3 border-b border-white/20">
            <div className="flex gap-2 items-center">
              <Avatar className="w-10 h-10 ring-2 ring-white/30">
                <AvatarImage 
                  key={getUserAvatar() || 'default'} 
                  src={getUserAvatar() || undefined} 
                  alt={getUserDisplayName()}
                  onError={(e) => {
                    console.error('❌ ResponsiveSidebar: Error loading avatar image:', getUserAvatar());
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('✅ ResponsiveSidebar: Avatar image loaded successfully:', getUserAvatar());
                  }}
                />
                <AvatarFallback className={`${accountInfo.bgColor} ${accountInfo.textColor} font-bold text-sm`}>
                  {getUserDisplayName().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <AnimatePresence>
                {showText && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 min-w-0"
                  >
                    <h3 className="text-sm font-semibold text-white truncate">{getUserDisplayName()}</h3>
                    <div className="flex gap-1 items-center">
                      <Badge variant="secondary" className={`${accountInfo.bgColor} ${accountInfo.textColor} border-0 text-xs px-1.5 py-0.5`}>
                        {accountInfo.emoji} {accountInfo.subtitle}
                      </Badge>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Navigation */}
          <nav className="overflow-y-auto flex-1 py-3">
            <div className="px-3 space-y-1">
              {menuGroups.map((group, groupIndex) => {
                const isGroupExpanded = expandedGroups.has(group.id);
                const GroupIcon = group.icon;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                    className="space-y-1"
                  >
                    {/* Group Header */}
                    <Button
                      variant="ghost"
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full justify-between h-8 px-2 text-white hover:bg-white/20 ${
                        group.id === 'main' ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      <div className="flex gap-2 items-center">
                        <GroupIcon className="w-3.5 h-3.5" />
                        <AnimatePresence>
                          {showText && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="text-xs"
                            >
                              {group.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {showText && (
                          <motion.div
                            initial={{ opacity: 0, rotate: 0 }}
                            animate={{ opacity: 1, rotate: isGroupExpanded ? 180 : 0 }}
                            exit={{ opacity: 0, rotate: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>

                    {/* Group Items */}
                    <AnimatePresence>
                      {isGroupExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="pr-3 space-y-1">
                            {group.items.map((item, itemIndex) => {
                              const isActive = activeItem === item.id;
                              const IconComponent = item.icon;

                              return (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: itemIndex * 0.05 }}
                                >
                                  <Button
                                    variant="ghost"
                                    onClick={() => handleNavigation(item.href, item.id)}
                                    className={`w-full justify-start gap-2 h-8 px-2 transition-all duration-500 ease-out ${
                                      isActive
                                        ? 'text-gray-900 bg-white shadow-lg'
                                        : 'text-white hover:bg-white/20'
                                    }`}
                                  >
                                    <div className={`p-1 rounded-md transition-colors ${
                                      isActive ? item.bgColor : (item.isHighlighted ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-white/10')
                                    }`}>
                                      <IconComponent className={`w-3 h-3 ${
                                        isActive ? item.color : (item.isHighlighted ? 'text-yellow-300' : 'text-white')
                                      }`} />
                                    </div>

                                    <AnimatePresence>
                                      {showText && (
                                        <motion.span
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: -10 }}
                                          className={`text-xs font-medium ${
                                            isActive ? 'text-gray-900' : (item.isHighlighted ? 'text-yellow-300 font-bold' : 'text-white')
                                          }`}
                                        >
                                          {item.label}
                                        </motion.span>
                                      )}
                                    </AnimatePresence>

                                    {isActive && (
                                      <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute left-0 w-1 h-5 bg-white rounded-r-full"
                                      />
                                    )}
                                  </Button>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-white/20">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="gap-2 justify-start px-3 w-full h-10 text-white hover:bg-red-600/20 hover:text-red-200"
            >
              <div className="p-1.5 rounded-md bg-red-600/20">
                <LogOut className="w-3.5 h-3.5 text-red-200" />
              </div>

              <AnimatePresence>
                {showText && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm font-medium"
                  >
                    تسجيل الخروج
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* شاشة تسجيل الخروج */}
      {showLogoutScreen && <LogoutScreen />}
    </>
  );
};

// ===== مكون الهيدر المحسن =====
const ResponsiveHeader: React.FC = () => {
  const { user, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar, isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  // حالة للرسائل والإشعارات الحقيقية
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [isMessagesActive, setIsMessagesActive] = useState(false);
  const [isNotificationsActive, setIsNotificationsActive] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';
    
    // البحث في جميع الحقول المحتملة للاسم حسب نوع الحساب
    switch (userData.accountType) {
      case 'player':
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'لاعب';
      case 'club':
        return userData.club_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'نادي رياضي';
      case 'academy':
        return userData.academy_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'أكاديمية رياضية';
      case 'agent':
        return userData.agent_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'وكيل رياضي';
      case 'trainer':
        return userData.trainer_name || userData.full_name || userData.name || userData.displayName || user?.displayName || 'مدرب';
      default:
        return userData.full_name || userData.name || userData.displayName || user?.displayName || 'مستخدم';
    }
  };

  const getUserAvatar = () => {
    // إذا كان النوع نادي وكانت هناك صورة من Firestore، استخدمها
    if (accountType === 'club' && clubLogo) {
      console.log('✅ ResponsiveHeader: Using club logo from Firestore:', clubLogo);
      return clubLogo;
    }
    
    if (accountType === 'club') {
      console.log('⚠️ ResponsiveHeader: Club account but no logo found, clubLogo:', clubLogo, 'falling back to getPlayerAvatarUrl');
    }
    
    // استخدام الدالة المحسّنة للبحث عن الصورة في Supabase
    const avatarUrl = getPlayerAvatarUrl(userData, user);
    console.log('🔄 ResponsiveHeader: getPlayerAvatarUrl returned:', avatarUrl);
    return avatarUrl;
  };

  // تحديد margin للهيدر ليتناسق مع السايدبار - أحجام مصغرة
  const getHeaderMargin = () => {
    if (!isClient) return ''; // لا نطبق margin في الـ server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  // الحصول على نوع الحساب من المسار
  const getAccountTypeFromPath = () => {
    const pathSegments = pathname.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'dashboard') {
      return pathSegments[2];
    }
    return 'player';
  };

  const accountType = getAccountTypeFromPath();

  // جلب صورة النادي من Firestore إذا كان accountType === 'club'
  useEffect(() => {
    console.log('🔄 ResponsiveHeader: useEffect triggered - accountType:', accountType, 'user?.uid:', user?.uid, 'clubLogo:', clubLogo);
    
    if (accountType !== 'club' || !user?.uid) {
      console.log('🔄 ResponsiveHeader: Skipping club logo fetch - accountType:', accountType, 'uid:', user?.uid);
      return;
    }

    console.log('🔄 ResponsiveHeader: Starting to fetch club logo for user:', user.uid);
    const clubRef = doc(db, 'clubs', user.uid);
    
    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          console.log('🔄 ResponsiveHeader: Club document snapshot received, exists:', clubDoc.exists());
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            console.log('🔄 ResponsiveHeader: Club data:', { 
              hasLogo: !!data.logo, 
              logo: data.logo,
              logoType: typeof data.logo,
              logoStartsWithHttp: data.logo?.startsWith('http')
            });
            
            if (data.logo) {
              // إذا كان logo رابط كامل، استخدمه مباشرة
              if (data.logo.startsWith('http')) {
                console.log('✅ ResponsiveHeader: Using logo as full URL:', data.logo);
                setClubLogo(data.logo);
              } else {
                // إذا كان مسار، استخدم getSupabaseImageUrl مع bucket clubavatar (المخصص للنادي)
                console.log('🔄 ResponsiveHeader: Logo is a path, converting with clubavatar bucket:', data.logo);
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                console.log('🔄 ResponsiveHeader: Converted logo URL:', logoUrl);
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  console.log('⚠️ ResponsiveHeader: Logo URL is empty, setting to null');
                  setClubLogo(null);
                }
              }
            } else {
              console.log('⚠️ ResponsiveHeader: No logo field in club data');
              setClubLogo(null);
            }
          } else {
            console.log('⚠️ ResponsiveHeader: Club document does not exist');
            setClubLogo(null);
          }
        } catch (error) {
          console.error('❌ ResponsiveHeader: Error processing club logo:', error);
          setClubLogo(null);
        }
      },
      (error) => {
        console.error('❌ ResponsiveHeader: Error listening to club logo updates:', error);
        setClubLogo(null);
      }
    );

    // تنظيف المستمع عند إلغاء التثبيت
    return () => {
      console.log('🔄 ResponsiveHeader: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  // دالة لتنسيق الوقت
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;

    return date.toLocaleDateString('ar-EG');
  };

  // التعامل مع قائمة الرسائل المنسدلة
  const toggleMessagesDropdown = () => {
    setShowMessagesDropdown(!showMessagesDropdown);
    setShowNotificationsDropdown(false); // إغلاق قائمة الإشعارات
  };

  // التعامل مع قائمة الإشعارات المنسدلة
  const toggleNotificationsDropdown = () => {
    setShowNotificationsDropdown(!showNotificationsDropdown);
    setShowMessagesDropdown(false); // إغلاق قائمة الرسائل
  };

  // التنقل إلى صفحة الرسائل
  const navigateToMessages = () => {
    setIsMessagesActive(true);
    setShowMessagesDropdown(false);
    setNewMessagesCount(0);
    router.push('/dashboard/messages');
  };

  // التنقل إلى صفحة الإشعارات
  const navigateToNotifications = () => {
    setIsNotificationsActive(true);
    setShowNotificationsDropdown(false);
    setNewNotificationsCount(0);
    router.push(`/dashboard/${accountType}/notifications`);
  };

  // جلب الرسائل الأخيرة من Firebase
  const fetchRecentMessages = async () => {
    if (!user?.uid) return;

    setMessagesLoading(true);
    try {
      const messagesQuery = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          const otherParticipantId = data.participants.find((id: string) => id !== user.uid);
          return {
            id: doc.id,
            sender: data.participantNames?.[otherParticipantId] || 'مستخدم',
            message: data.lastMessage || 'لا توجد رسائل',
            time: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate() : new Date(),
            unread: data.unreadCount?.[user.uid] > 0,
            conversationId: doc.id
          };
        });

        setRecentMessages(messages);
        const unreadCount = messages.filter(msg => msg.unread).length;
        setNewMessagesCount(unreadCount);
      });

      return unsubscribe;
    } catch (error) {
      console.error('خطأ في جلب الرسائل:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // جلب الإشعارات الأخيرة من Firebase
  const fetchRecentNotifications = async () => {
    if (!user?.uid) return;

    setNotificationsLoading(true);
    try {
      // محاولة جلب من مجموعة interaction_notifications أولاً
      const interactionNotificationsQuery = query(
        collection(db, 'interaction_notifications'),
        where('userId', '==', user.uid),
        limit(5)
      );

      const unsubscribe = onSnapshot(interactionNotificationsQuery, (snapshot) => {
        const notifications = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'إشعار جديد',
            message: data.message || 'لا توجد تفاصيل',
            time: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            type: data.type || 'general',
            read: data.isRead || false,
            notificationId: doc.id
          };
        });

        // ترتيب البيانات يدوياً حسب التاريخ
        const sortedNotifications = notifications.sort((a, b) => {
          return b.time.getTime() - a.time.getTime();
        });

        setRecentNotifications(sortedNotifications);
        const unreadCount = sortedNotifications.filter(notif => !notif.read).length;
        setNewNotificationsCount(unreadCount);
      }, (error) => {
        console.error('خطأ في جلب interaction_notifications:', error);
        // إذا فشل، جرب مجموعة notifications العادية
        fetchRegularNotifications();
      });

      return unsubscribe;
    } catch (error) {
      console.error('خطأ في جلب الإشعارات:', error);
      // إذا فشل، جرب مجموعة notifications العادية
      fetchRegularNotifications();
    } finally {
      setNotificationsLoading(false);
    }
  };

  // جلب الإشعارات العادية كبديل
  const fetchRegularNotifications = async () => {
    if (!user?.uid) return;

    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );

      const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'إشعار جديد',
            message: data.message || 'لا توجد تفاصيل',
            time: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            type: data.type || 'general',
            read: data.isRead || false,
            notificationId: doc.id
          };
        });

        // ترتيب البيانات يدوياً حسب التاريخ
        const sortedNotifications = notifications.sort((a, b) => {
          return b.time.getTime() - a.time.getTime();
        });

        setRecentNotifications(sortedNotifications);
        const unreadCount = sortedNotifications.filter(notif => !notif.read).length;
        setNewNotificationsCount(unreadCount);
      });

      return unsubscribe;
    } catch (error) {
      console.error('خطأ في جلب notifications العادية:', error);
    }
  };

  // التعامل مع الرسالة
  const handleMessageClick = async (message: any) => {
    try {
      // تحديد الرسالة كمقروءة
      if (message.unread && message.conversationId) {
        const conversationRef = doc(db, 'conversations', message.conversationId);
        await updateDoc(conversationRef, {
          [`unreadCount.${user?.uid}`]: 0
        });
      }

      setShowMessagesDropdown(false);
      router.push('/dashboard/messages');
    } catch (error) {
      console.error('خطأ في تحديث حالة الرسالة:', error);
      router.push('/dashboard/messages');
    }
  };

  // التعامل مع الإشعار
  const handleNotificationClick = async (notification: any) => {
    try {
      // تحديد الإشعار كمقروء
      if (!notification.read && notification.notificationId) {
        // محاولة تحديث في interaction_notifications أولاً
        try {
          const interactionNotificationRef = doc(db, 'interaction_notifications', notification.notificationId);
          await updateDoc(interactionNotificationRef, {
            isRead: true
          });
        } catch (error) {
          // إذا فشل، جرب notifications العادية
          const notificationRef = doc(db, 'notifications', notification.notificationId);
          await updateDoc(notificationRef, {
            isRead: true
          });
        }
      }

      setShowNotificationsDropdown(false);
      router.push(`/dashboard/${userData?.accountType || 'player'}/notifications`);
    } catch (error) {
      console.error('خطأ في تحديث حالة الإشعار:', error);
      router.push(`/dashboard/${userData?.accountType || 'player'}/notifications`);
    }
  };

  // تحديد إذا كانت الصفحة الحالية هي صفحة الرسائل أو الإشعارات
  useEffect(() => {
    setIsMessagesActive(pathname.includes('/messages'));
    setIsNotificationsActive(pathname.includes('/notifications'));
  }, [pathname]);

  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    if (user?.uid) {
      let unsubscribeMessages: (() => void) | undefined;
      let unsubscribeNotifications: (() => void) | undefined;

      // جلب الرسائل
      fetchRecentMessages().then(unsubscribe => {
        unsubscribeMessages = unsubscribe;
      }).catch(error => {
        console.error('خطأ في جلب الرسائل:', error);
      });

      // جلب الإشعارات
      fetchRecentNotifications().then(unsubscribe => {
        unsubscribeNotifications = unsubscribe;
      }).catch(error => {
        console.error('خطأ في جلب الإشعارات:', error);
      });

      return () => {
        if (typeof unsubscribeMessages === 'function') {
          unsubscribeMessages();
        }
        if (typeof unsubscribeNotifications === 'function') {
          unsubscribeNotifications();
        }
      };
    }
  }, [user?.uid]);

  // إغلاق القوائم المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.messages-dropdown') && !target.closest('.notifications-dropdown')) {
        setShowMessagesDropdown(false);
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className={`sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm transition-all duration-300 ease-in-out ${getHeaderMargin()}`}>
      <div className="flex relative justify-between items-center px-4 py-3 lg:px-6">
        <div className="flex gap-4 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hover:bg-gray-100"
            title={isMobile ? "إظهار القائمة الجانبية" : (isSidebarCollapsed ? "إظهار القائمة الجانبية" : "إخفاء القائمة الجانبية")}
          >
            {isMobile ? <Menu className="w-5 h-5" /> : (isSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />)}
          </Button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900">لوحة التحكم</h1>
            <p className="text-sm text-gray-600">
              مرحباً بك في {accountType === 'admin' ? 'منصة الإدارة' :
                           accountType === 'academy' ? 'منصة الأكاديمية' :
                           accountType === 'club' ? 'منصة النادي' :
                           accountType === 'trainer' ? 'منصة المدرب' :
                           accountType === 'agent' ? 'منصة الوكيل' :
                           accountType === 'marketer' ? 'منصة المسوق' :
                           'منصة اللاعب'}
            </p>
          </div>
        </div>

        <div className="flex overflow-visible gap-2 items-center lg:gap-3">
          {/* أيقونة الرسائل مع القائمة المنسدلة */}
          <div className="inline-block relative messages-dropdown">
          <Button
            variant="ghost"
            size="icon"
              onClick={toggleMessagesDropdown}
              className={`relative transition-all duration-300 ease-out group h-10 w-10 lg:h-11 lg:w-11 ${
                isMessagesActive
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
              title={`الرسائل${newMessagesCount > 0 ? ` (${newMessagesCount} جديدة)` : ''}`}
            >
              <MessageSquare className="w-5 h-5 transition-transform duration-300 ease-out lg:w-6 lg:h-6 group-hover:scale-105" />
            {/* مؤشر الرسائل الجديدة */}
              {newMessagesCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] lg:min-w-[22px] lg:h-[22px] bg-red-500 rounded-full animate-pulse flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-[10px] lg:text-[11px] text-white font-bold">
                    {newMessagesCount > 9 ? '9+' : newMessagesCount}
                  </span>
                </div>
              )}
              {/* مؤشر الصفحة النشطة */}
              {isMessagesActive && (
                <div className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-600 rounded-full shadow-sm transform -translate-x-1/2"></div>
              )}
          </Button>

            {/* قائمة الرسائل المنسدلة */}
            {showMessagesDropdown && (
              <div className="absolute left-0 top-full z-50 mt-2 w-72 min-w-max rounded-xl border border-gray-200 shadow-2xl backdrop-blur-sm transform origin-top-right lg:left-auto lg:right-0 sm:w-80 lg:w-96 bg-white/98">
                <div className="p-4 border-b border-gray-100 lg:p-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-900 lg:text-lg">الرسائل الأخيرة</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateToMessages}
                      className="px-2 py-1 text-xs text-blue-600 rounded-lg lg:text-sm hover:text-blue-700 lg:px-3 lg:py-2 hover:bg-blue-50"
                    >
                      عرض الكل
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto max-w-full max-h-64 lg:max-h-80">
                  {messagesLoading ? (
                    <div className="p-4 text-center text-gray-500 lg:p-6">
                      <div className="mx-auto mb-3 w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                      <p className="text-sm lg:text-base">جاري تحميل الرسائل...</p>
                    </div>
                  ) : recentMessages.length > 0 ? (
                    recentMessages.map((message) => (
                      <div
                        key={message.id}
                        onClick={() => handleMessageClick(message)}
                        className={`p-3 lg:p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 hover:bg-blue-50 active:scale-98 ${
                          message.unread ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                        }`}
                      >
                        <div className="flex gap-3 justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center mb-1">
                              <p className="text-sm font-semibold text-gray-900 truncate lg:text-base">
                                {message.sender}
                              </p>
                              {message.unread && (
                                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed text-gray-600 truncate lg:text-base">
                              {message.message}
                            </p>
                            <p className="mt-2 text-xs font-medium text-gray-400 lg:text-sm">
                              {formatTime(message.time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500 lg:p-8">
                      <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full lg:w-20 lg:h-20">
                        <MessageSquare className="w-8 h-8 text-gray-300 lg:w-10 lg:h-10" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 lg:text-base">لا توجد رسائل جديدة</p>
                      <p className="mt-1 text-xs text-gray-400 lg:text-sm">ستظهر الرسائل الجديدة هنا</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* أيقونة الإشعارات مع القائمة المنسدلة */}
          <div className="inline-block relative notifications-dropdown">
          <Button
            variant="ghost"
            size="icon"
              onClick={toggleNotificationsDropdown}
              className={`relative transition-all duration-300 ease-out group h-10 w-10 lg:h-11 lg:w-11 ${
                isNotificationsActive
                  ? 'text-orange-600 bg-orange-50 hover:bg-orange-100'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
              title={`الإشعارات${newNotificationsCount > 0 ? ` (${newNotificationsCount} جديدة)` : ''}`}
            >
              <Bell className="w-5 h-5 transition-transform duration-300 ease-out lg:w-6 lg:h-6 group-hover:scale-105" />
            {/* مؤشر الإشعارات الجديدة */}
              {newNotificationsCount > 0 && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] lg:min-w-[22px] lg:h-[22px] bg-orange-500 rounded-full animate-pulse flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-[10px] lg:text-[11px] text-white font-bold">
                    {newNotificationsCount > 9 ? '9+' : newNotificationsCount}
                  </span>
                </div>
              )}
              {/* مؤشر الصفحة النشطة */}
              {isNotificationsActive && (
                <div className="absolute -bottom-1 left-1/2 w-1.5 h-1.5 lg:w-2 lg:h-2 bg-orange-600 rounded-full shadow-sm transform -translate-x-1/2"></div>
              )}
          </Button>

            {/* قائمة الإشعارات المنسدلة */}
            {showNotificationsDropdown && (
              <div className="absolute left-0 top-full z-50 mt-2 w-72 min-w-max rounded-xl border border-gray-200 shadow-2xl backdrop-blur-sm transform origin-top-right lg:left-auto lg:right-0 sm:w-80 lg:w-96 bg-white/98">
                <div className="p-4 border-b border-gray-100 lg:p-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-base font-bold text-gray-900 lg:text-lg">الإشعارات الأخيرة</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={navigateToNotifications}
                      className="px-2 py-1 text-xs text-orange-600 rounded-lg lg:text-sm hover:text-orange-700 lg:px-3 lg:py-2 hover:bg-orange-50"
                    >
                      عرض الكل
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto max-w-full max-h-64 lg:max-h-80">
                  {notificationsLoading ? (
                    <div className="p-4 text-center text-gray-500 lg:p-6">
                      <div className="mx-auto mb-3 w-8 h-8 rounded-full border-b-2 border-orange-600 animate-spin"></div>
                      <p className="text-sm lg:text-base">جاري تحميل الإشعارات...</p>
                    </div>
                  ) : recentNotifications.length > 0 ? (
                    recentNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 lg:p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 hover:bg-orange-50 active:scale-98 ${
                          !notification.read ? 'bg-orange-50 border-r-4 border-r-orange-500' : ''
                        }`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full mt-1.5 lg:mt-2 flex-shrink-0 ${
                            notification.type === 'message' ? 'bg-blue-500' :
                            notification.type === 'payment' ? 'bg-green-500' :
                            notification.type === 'system' ? 'bg-gray-500' :
                            notification.type === 'match' ? 'bg-purple-500' :
                            'bg-orange-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center mb-1">
                              <p className="text-sm font-semibold text-gray-900 lg:text-base">
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed text-gray-600 truncate lg:text-base">
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs font-medium text-gray-400 lg:text-sm">
                              {formatTime(notification.time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500 lg:p-8">
                      <div className="flex justify-center items-center mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full lg:w-20 lg:h-20">
                        <Bell className="w-8 h-8 text-gray-300 lg:w-10 lg:h-10" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 lg:text-base">لا توجد إشعارات جديدة</p>
                      <p className="mt-1 text-xs text-gray-400 lg:text-sm">ستظهر الإشعارات الجديدة هنا</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* فاصل */}
          <div className="w-px h-6 bg-gray-300"></div>

          {/* صورة المستخدم */}
          <div className="flex gap-2 items-center">
            <Avatar className="w-8 h-8 transition-transform duration-500 ease-out cursor-pointer hover:scale-105">
            <AvatarImage 
              key={getUserAvatar() || 'default'} 
              src={getUserAvatar() || undefined} 
              alt={getUserDisplayName()}
              onError={(e) => {
                console.error('❌ ResponsiveHeader: Error loading avatar image:', getUserAvatar());
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('✅ ResponsiveHeader: Avatar image loaded successfully:', getUserAvatar());
              }}
            />
            <AvatarFallback className="font-bold text-blue-600 bg-blue-100">
              {getUserDisplayName().slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
            {!isMobile && (
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{getUserDisplayName()}</p>
                <p className="text-xs text-gray-500 capitalize">{accountType}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// ===== مكون الفوتر المحسن =====
const ResponsiveFooter: React.FC = () => {
  const { isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  // تحديد margin للفوتر ليتناسق مع السايدبار - أحجام مصغرة
  const getFooterMargin = () => {
    if (!isClient) return ''; // لا نطبق margin في الـ server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  return (
    <footer className={`px-4 py-4 bg-white border-t border-gray-200 transition-all duration-300 ease-in-out lg:px-6 ${getFooterMargin()}`}>
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          © 2024 منصة الحلم. جميع الحقوق محفوظة.
        </div>
        <div className="flex gap-4 items-center text-sm text-gray-600">
          <span>الإصدار 1.0.0</span>
        </div>
      </div>
    </footer>
  );
};

// ===== المكون الرئيسي للتخطيط =====
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  accountType = 'player',
  showSidebar = true,
  showHeader = true,
  showFooter = true
}) => {
  const { isSidebarOpen, isSidebarCollapsed, isMobile, isTablet, isDesktop, isClient } = useLayout();

  // تحديد margin للمحتوى الرئيسي - أحجام مصغرة
  const getMainContentMargin = () => {
    if (!isClient) return '';
    if (!showSidebar) return '';
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      {showHeader && <ResponsiveHeader />}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {showSidebar && <ResponsiveSidebar accountType={accountType} />}

        {/* Content */}
        <main
          className={`overflow-auto flex-1 min-h-0 transition-all duration-300 ease-in-out ${getMainContentMargin()} rtl`}
        >
          <div className="p-4 lg:p-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Footer */}
      {showFooter && <ResponsiveFooter />}
    </div>
  );
};

// ===== المكون الرئيسي المصدر =====
interface ResponsiveLayoutWrapperProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

export const ResponsiveLayoutWrapper: React.FC<ResponsiveLayoutWrapperProps> = (props) => {
  return (
    <LayoutProvider>
      <ResponsiveLayout {...props} />
    </LayoutProvider>
  );
};

export default ResponsiveLayoutWrapper;
