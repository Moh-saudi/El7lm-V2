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
import { DEFAULT_ROLES } from "@/lib/permissions/types";
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  Star,
  Target,
  TrendingUp,
  Trophy,
  User,
  LayoutTemplate,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Zap,
  Globe,
  Heart,
  Key,
  X,
  Megaphone
} from 'lucide-react';

import { usePathname, useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import UnifiedNotificationsButton from '@/components/shared/UnifiedNotificationsButton';
import UnifiedMessagesButton from '@/components/shared/UnifiedMessagesButton';
import { cn } from '@/lib/utils';
import { useAbility } from '@/hooks/useAbility';
import { PermissionAction, PermissionResource } from '@/lib/permissions/types';
import { ADMIN_DASHBOARD_MENU } from '@/config/menu-config';


// Layout Context
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

// ===== Layout Provider =====
interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Use react-responsive to detect screen size
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  const isDesktop = useMediaQuery({ minWidth: 1024 });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (isMobile) {
      setIsSidebarOpen(false);
      setIsSidebarCollapsed(false);
    } else if (isTablet) {
      setIsSidebarOpen(true);
      setIsSidebarCollapsed(false); // Change from true to false
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
      // Ensure sidebar is open on large screens
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

// ===== Professional Sidebar Component =====
interface ResponsiveSidebarProps {
  accountType?: string;
}

const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({ accountType: propAccountType = 'player' }) => {
  const { user, userData, logout } = useAuth();

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
    closeSidebar,
    openSidebar,
    toggleSidebar
  } = useLayout();

  const { can, userRole: currentAbilityRole } = useAbility();

  const [activeItem, setActiveItem] = useState('dashboard');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['main']));
  const [clubLogo, setClubLogo] = useState<string | null>(null);

  // Account type information
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

  // Determine sidebar width - compact sizes
  const getSidebarWidth = () => {
    if (isMobile) return 'w-72';
    if (isSidebarCollapsed) {
      if (isTablet) return 'w-14';
      return 'w-16';
    }
    if (isTablet) return 'w-56';
    return 'w-64';
  };

  // Determine if text should be shown
  const shouldShowText = () => {
    if (isMobile) return true;
    if (isTablet) return !isSidebarCollapsed;
    return !isSidebarCollapsed;
  };

  // Get menu groups
  // Default permissions for each role (from employees/page.tsx)
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

  // Get employee permissions
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

    // If employee (has employeeId or employeeRole or role)
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

    // If real admin (not employee)
    console.log('✅ ResponsiveSidebar - Real admin detected (not employee) - showing all items');
    return null; // null means show everything
  }, [userData, accountType]);

  // Check permission for menu item
  const hasPermissionForMenuItem = (menuItemId: string, permissions: RolePermissions | null): boolean => {
    // If no specific permissions (not employee), show everything
    if (!permissions) return true;

    // Mapping between menu items and required permissions
    const menuItemPermissions: Record<string, keyof RolePermissions> = {
      'admin-users-management': 'canViewUsers',
      'admin-employees': 'canManageEmployees',
      'admin-email-migration': 'canManageEmployees',
      'admin-check-phone': 'canViewUsers',
      'admin-payments': 'canManagePayments',
      'admin-geidea-transactions': 'canViewFinancials',
      'admin-geidea-settings': 'canManagePayments',
      'admin-subscriptions': 'canManagePayments',
      'admin-pricing': 'canManagePayments',
      'admin-email-center': 'canManageSupport',

      'admin-invoices': 'canViewFinancials',
      'admin-reports': 'canViewReports',
      'admin-clarity': 'canViewReports',
      'admin-support': 'canViewSupport',
      'admin-system': 'canManageEmployees', // Requires employee management permission
      'admin-beon-v3': 'canManageEmployees',
      'admin-whatsapp-test': 'canManageSupport',
      'admin-tournaments': 'canManageContent',
      'admin-dream-academy-categories': 'canManageContent',
      'admin-customer-management': 'canViewUsers',
      'admin-careers': 'canManageContent',
      'admin-content-mgmt': 'canManageContent',
      'admin-send-notifications': 'canManageSupport',
      'admin-notification-center': 'canManageSupport',
      'admin-notifications': 'canManageSupport',
      'admin-chataman': 'canManageSupport',
      'admin-shared-messages': 'canManageSupport',
      'admin-marketing-ads': 'canManageContent',
      'admin-marketing-campaigns': 'canManageContent',
      'admin-marketing-analytics': 'canViewReports',
      'admin-convert-players': 'canEditUsers',
    };

    const requiredPermission = menuItemPermissions[menuItemId];
    if (!requiredPermission) {
      // Items that don't need special permissions (like profile, messages) always show
      return true;
    }

    return permissions[requiredPermission] === true;
  };

  // Filter group items based on permissions
  const filterGroupItems = (items: any[], permissions: RolePermissions | null): any[] => {
    if (!permissions) return items;
    return items.filter(item => hasPermissionForMenuItem(item.id, permissions));
  };

  const getMenuGroups = () => {
    // --- 1. Player Platform (Exact User Request) ---
    if (accountType === 'player') {
      return [
        // Group 1: Control Panel
        {
          id: 'main',
          title: 'لوحة التحكم',
          icon: Home,
          items: [
            { id: 'dashboard', label: 'الرئيسية', icon: Home, href: `/dashboard/player`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'profile', label: 'الملف الشخصي', icon: User, href: `/dashboard/player/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'career', label: 'مسيرتي الرياضية', icon: Trophy, href: `/dashboard/player/career`, color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'videos', label: 'فيديوهاتي', icon: Video, href: `/dashboard/player/videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
            { id: 'stats', label: 'إحصائياتي', icon: BarChart3, href: `/dashboard/player/stats`, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
            { id: 'reports', label: 'تقارير الكشافين', icon: FileText, href: `/dashboard/player/reports`, color: 'text-orange-600', bgColor: 'bg-orange-50' },
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/player/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        // Group 2: Finance & Subscriptions
        {
          id: 'finance',
          title: 'المالية والاشتراكات',
          icon: CreditCard,
          items: [
            { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/player/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'payment-service', label: 'خدمة الدفع', icon: DollarSign, href: `/dashboard/player/bulk-payment`, color: 'text-green-600', bgColor: 'bg-green-50' },
          ]
        },
        // Group 3: Discovery
        {
          id: 'discovery',
          title: 'اكتشاف الفرص',
          icon: Search,
          items: [
            { id: 'search-opps', label: 'البحث عن الفرص والأندية', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Users, href: `/dashboard/player/search-players`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
            { id: 'player-cinema', label: 'سينما اللاعبين', icon: Play, href: `/dashboard/player/player-videos`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'tournaments', label: 'البطولات الحالية', icon: Trophy, href: `/dashboard/player/tournaments`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          ]
        },
        // Group 4: Academy (Renamed to Dream School)
        {
          id: 'academy',
          title: 'مدرسة الحلم',
          icon: GraduationCap,
          items: [
            { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: `/dashboard/dream-academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        }
      ];
    }

    // --- 2. Club Platform (Based on Actual File Structure) ---
    if (accountType === 'club') {
      return [
        // Group 1: Main
        {
          id: 'main',
          title: 'لوحة التحكم',
          icon: Home,
          items: [
            { id: 'dashboard', label: 'الرئيسية', icon: Home, href: `/dashboard/club`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'profile', label: 'الملف الشخصي', icon: Building, href: `/dashboard/club/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
          ]
        },
        // Group 2: Team Management
        {
          id: 'team-mgmt',
          title: 'إدارة الفريق',
          icon: Users,
          items: [
            { id: 'players', label: 'إدارة اللاعبين', icon: Users, href: `/dashboard/club/players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-evaluation', label: 'تقييم اللاعبين', icon: BarChart3, href: `/dashboard/club/player-evaluation`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
            { id: 'contracts', label: 'العقود', icon: FileText, href: `/dashboard/club/contracts`, color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'negotiations', label: 'المفاوضات', icon: MessageSquare, href: `/dashboard/club/negotiations`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Video, href: `/dashboard/club/player-videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
          ]
        },
        // Group 3: Analysis & Marketing
        {
          id: 'analysis',
          title: 'التحليل والتسويق',
          icon: TrendingUp,
          items: [
            { id: 'ai-analysis', label: 'تحليل الذكاء الاصطناعي', icon: Zap, href: `/dashboard/club/ai-analysis`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
            { id: 'market-values', label: 'القيم السوقية', icon: TrendingUp, href: `/dashboard/club/market-values`, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
            { id: 'marketing', label: 'التسويق', icon: Megaphone, href: `/dashboard/club/marketing`, color: 'text-orange-600', bgColor: 'bg-orange-50' },
          ]
        },
        // Group 4: Dream School
        {
          id: 'school',
          title: 'مدرسة الحلم',
          icon: GraduationCap,
          items: [
            { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: `/dashboard/dream-academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        // Group 5: Finance
        {
          id: 'finance',
          title: 'المالية والاشتراكات',
          icon: CreditCard,
          items: [
            { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/club/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'bulk-payment', label: 'خدمة الدفع', icon: DollarSign, href: `/dashboard/club/bulk-payment`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/club/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        // Group 5: Discovery
        {
          id: 'discovery',
          title: 'اكتشاف الفرص',
          icon: Search,
          items: [
            { id: 'search-opps', label: 'البحث عن الفرص والأندية', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Search, href: `/dashboard/club/search-players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-cinema', label: 'سينما اللاعبين', icon: Play, href: `/dashboard/club/player-videos`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'tournaments', label: 'البطولات الحالية', icon: Trophy, href: `/tournaments/unified-registration`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          ]
        }
      ];
    }

    // --- 3. Academy Platform (Exact User Request) ---
    if (accountType === 'academy') {
      return [
        // Group 1: Control Panel
        {
          id: 'main',
          title: 'لوحة التحكم',
          icon: Home,
          items: [
            { id: 'dashboard', label: 'الرئيسية', icon: Home, href: `/dashboard/academy`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'profile', label: 'الملف الشخصي', icon: GraduationCap, href: `/dashboard/academy/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
          ]
        },
        // Group 2: Academy Management
        {
          id: 'management',
          title: 'إدارة الأكاديمية',
          icon: Users,
          items: [
            { id: 'players', label: 'إدارة اللاعبين', icon: Users, href: `/dashboard/academy/players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Video, href: `/dashboard/academy/player-videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
          ]
        },
        // Group 3: Dream School
        {
          id: 'school',
          title: 'مدرسة الحلم',
          icon: GraduationCap,
          items: [
            { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: `/dashboard/dream-academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        // Group 4: Finance & Subscriptions
        {
          id: 'finance',
          title: 'المالية والاشتراكات',
          icon: CreditCard,
          items: [
            { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/academy/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'bulk-payment', label: 'خدمة الدفع', icon: DollarSign, href: `/dashboard/academy/bulk-payment`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/academy/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        // Group 4: Discovery
        {
          id: 'discovery',
          title: 'اكتشاف الفرص',
          icon: Search,
          items: [
            { id: 'search-opps', label: 'البحث عن الفرص والأندية', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Search, href: `/dashboard/academy/search-players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-cinema', label: 'سينما اللاعبين', icon: Play, href: `/dashboard/academy/player-videos`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'tournaments', label: 'البطولات الحالية', icon: Trophy, href: `/tournaments/unified-registration`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          ]
        }
      ];
    }

    // --- 4. Agent & Trainer (Unified Structure) ---
    if (accountType === 'agent' || accountType === 'trainer') {
      const typeLabel = accountType === 'agent' ? 'الوكيل' : 'المدرب';
      const typeIcon = accountType === 'agent' ? Briefcase : Target;

      return [
        {
          id: 'main',
          title: 'لوحة التحكم',
          icon: Home,
          items: [
            { id: 'dashboard', label: 'الرئيسية', icon: Home, href: `/dashboard/${accountType}`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'profile', label: 'الملف الشخصي', icon: typeIcon, href: `/dashboard/${accountType}/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
          ]
        },
        {
          id: 'management',
          title: `إدارة ${typeLabel}`,
          icon: Users,
          items: [
            { id: 'players', label: 'إدارة اللاعبين', icon: Users, href: `/dashboard/${accountType}/players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Video, href: `/dashboard/${accountType}/player-videos`, color: 'text-red-600', bgColor: 'bg-red-50' },
          ]
        },
        {
          id: 'school',
          title: 'مدرسة الحلم',
          icon: GraduationCap,
          items: [
            { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: `/dashboard/dream-academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        {
          id: 'finance',
          title: 'المالية والاشتراكات',
          icon: CreditCard,
          items: [
            { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/${accountType}/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'bulk-payment', label: 'خدمة الدفع', icon: DollarSign, href: `/dashboard/${accountType}/bulk-payment`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/${accountType}/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'discovery',
          title: 'اكتشاف الفرص',
          icon: Search,
          items: [
            { id: 'search-opps', label: 'البحث عن الفرص والأندية', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Search, href: `/dashboard/${accountType}/search-players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-cinema', label: 'سينما اللاعبين', icon: Play, href: `/dashboard/${accountType}/player-videos`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'tournaments', label: 'البطولات الحالية', icon: Trophy, href: `/tournaments/unified-registration`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          ]
        }
      ];
    }

    // --- 5. Marketer Platform ---
    if (accountType === 'marketer') {
      return [
        {
          id: 'main',
          title: 'لوحة التحكم',
          icon: Home,
          items: [
            { id: 'dashboard', label: 'الرئيسية', icon: Home, href: `/dashboard/marketer`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'profile', label: 'الملف الشخصي', icon: Briefcase, href: `/dashboard/marketer/profile`, color: 'text-green-600', bgColor: 'bg-green-50' },
          ]
        },
        {
          id: 'school',
          title: 'مدرسة الحلم',
          icon: GraduationCap,
          items: [
            { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: `/dashboard/dream-academy`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        {
          id: 'management',
          title: 'إدارة التسويق',
          icon: Users,
          items: [
            { id: 'players', label: 'إدارة اللاعبين', icon: Users, href: `/dashboard/marketer/players`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'contracts', label: 'العقود', icon: FileText, href: `/dashboard/marketer/contracts`, color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'ai-analysis', label: 'تحليل الذكاء الاصطناعي', icon: Zap, href: `/dashboard/marketer/ai-analysis`, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          ]
        },
        {
          id: 'finance',
          title: 'المالية والاشتراكات',
          icon: CreditCard,
          items: [
            { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock, href: '/dashboard/shared/subscription-status', color: 'text-amber-600', bgColor: 'bg-amber-50' },
            { id: 'billing', label: 'فواتيري', icon: FileText, href: `/dashboard/marketer/billing`, color: 'text-slate-600', bgColor: 'bg-slate-50' },
            { id: 'payment', label: 'خدمة الدفع', icon: DollarSign, href: `/dashboard/marketer/payment`, color: 'text-green-600', bgColor: 'bg-green-50' },
            { id: 'referrals', label: 'سفراء الحلم', icon: UserPlus, href: `/dashboard/marketer/referrals`, color: 'text-purple-600', bgColor: 'bg-purple-50' },
          ]
        },
        {
          id: 'discovery',
          title: 'اكتشاف الفرص',
          icon: Search,
          items: [
            { id: 'search-opps', label: 'البحث عن الفرص والأندية', icon: Search, href: `/dashboard/player/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'search-players', label: 'البحث عن لاعبين', icon: Search, href: `/dashboard/marketer/search`, color: 'text-blue-600', bgColor: 'bg-blue-50' },
            { id: 'player-cinema', label: 'سينما اللاعبين', icon: Play, href: `/dashboard/marketer/videos`, color: 'text-pink-600', bgColor: 'bg-pink-50' },
            { id: 'tournaments', label: 'البطولات الحالية', icon: Trophy, href: `/tournaments/unified-registration`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
          ]
        }
      ];
    }

    // --- 6. Admin Platform (Config-Driven) ---
    if (accountType === 'admin') {
      if (getEmployeePermissions) {
        return ADMIN_DASHBOARD_MENU.map(group => ({
          ...group,
          items: filterGroupItems(group.items, getEmployeePermissions)
        })).filter(group => group.items.length > 0);
      }
      return ADMIN_DASHBOARD_MENU;
    }

    // Default Fallback
    return [];
  };

  const menuGroups = useMemo(() => getMenuGroups(), [accountType, userData, getEmployeePermissions]);
  const showText = useMemo(() => shouldShowText(), [isMobile, isTablet, isSidebarCollapsed]);
  const sidebarWidth = useMemo(() => getSidebarWidth(), [isMobile, isTablet, isSidebarCollapsed]);

  useEffect(() => {
    if (accountType !== 'club' || !user?.uid) {
      return;
    }

    const clubRef = doc(db, 'clubs', user.uid);

    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            if (data.logo) {
              if (data.logo.startsWith('http')) {
                setClubLogo(data.logo);
              } else {
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  setClubLogo(null);
                }
              }
            } else {
              setClubLogo(null);
            }
          } else {
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

    // Cleanup listener on unmount
    return () => {
      console.log('🔄 ResponsiveSidebar: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  const getUserAvatar = () => {
    // If club type and logo exists in Firestore, use it
    if (accountType === 'club' && clubLogo) {
      console.log('✅ ResponsiveSidebar: Using club logo from Firestore:', clubLogo);
      return clubLogo;
    }

    if (accountType === 'club') {
      console.log('⚠️ ResponsiveSidebar: Club account but no logo found, clubLogo:', clubLogo, 'falling back to getPlayerAvatarUrl');
    }

    // Use optimized function to find image in Supabase
    return getPlayerAvatarUrl(userData, user);
  };

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';

    // Search all potential fields for name based on account type
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
        console.log('✅ Logout successful, displaying logout screen');
      } catch (error) {
        console.error('❌ Logout error:', error);
        // Even if logout fails, show logout screen
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

  // Determine active item
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

  // Don't show sidebar until component mounted on client
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
        className={`fixed top-0 right-0 h-full bg-gradient-to-b ${accountInfo.color} z-50 shadow-xl backdrop-blur-xl border-l border-white/20 ${isMobile ? 'w-72' : sidebarWidth
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
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <div className="flex gap-1 items-center">
                        <Badge variant="secondary" className={`${accountInfo.bgColor} ${accountInfo.textColor} border-0 text-xs px-1.5 py-0.5`}>
                          {(!userData?.isEmployee && !userData?.employeeId && !userData?.roleId && !userData?.employeeRole && !userData?.role) ? '👑' : '👤'} {userData?.roleName || userData?.jobTitle || (userData?.roleId && DEFAULT_ROLES.find(r => r.id === userData.roleId)?.name) || userData?.role || accountInfo.subtitle}
                        </Badge>
                      </div>
                      {userData?.department && (
                        <div className="text-[10px] text-white/70 px-1 truncate max-w-[150px]">
                          {userData.department}
                        </div>
                      )}
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
                      className={`w-full justify-between h-8 px-2 text-white hover:bg-white/20 ${group.id === 'main' ? 'font-semibold' : 'font-medium'
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
                                    className={`w-full justify-start gap-2 h-8 px-2 transition-all duration-500 ease-out ${isActive
                                      ? 'text-gray-900 bg-white shadow-lg'
                                      : 'text-white hover:bg-white/20'
                                      }`}
                                  >
                                    <div className={`p-1 rounded-md transition-colors ${isActive ? item.bgColor : (item.isHighlighted ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-white/10')
                                      }`}>
                                      <IconComponent className={`w-3 h-3 ${isActive ? item.color : (item.isHighlighted ? 'text-yellow-300' : 'text-white')
                                        }`} />
                                    </div>

                                    <AnimatePresence>
                                      {showText && (
                                        <motion.span
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: -10 }}
                                          className={`text-xs font-medium ${isActive ? 'text-gray-900' : (item.isHighlighted ? 'text-yellow-300 font-bold' : 'text-white')
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

// ===== Professional Header Component =====
const ResponsiveHeader: React.FC = () => {

  const { user, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toggleSidebar, isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  const [clubLogo, setClubLogo] = useState<string | null>(null);

  const getUserDisplayName = () => {
    if (!userData) return 'مستخدم';
    switch (userData.accountType) {
      case 'player': return userData.full_name || userData.name || 'لاعب';
      case 'club': return userData.club_name || userData.name || 'نادي';
      case 'academy': return userData.academy_name || userData.name || 'أكاديمية';
      default: return userData.full_name || userData.name || user?.displayName || 'مستخدم';
    }
  };

  const getUserAvatar = () => {
    if (accountType === 'club' && clubLogo) return clubLogo;
    return getPlayerAvatarUrl(userData, user);
  };

  const resolvedAccountType = useMemo(() => {
    if (userData?.accountType) return userData.accountType;

    const pathSegments = pathname.split('/');
    if (pathSegments.length >= 3 && pathSegments[1] === 'dashboard') {
      const segment = pathSegments[2];
      // Check if it's one of the known types
      const knownTypes = ['player', 'admin', 'club', 'academy', 'trainer', 'agent', 'marketer', 'dream-academy'];
      if (knownTypes.includes(segment)) return segment;
    }
    return 'player';
  }, [userData?.accountType, pathname]);

  const accountType = resolvedAccountType;

  const getHeaderMargin = () => {
    if (!isClient) return ''; // Don't apply margin on server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  useEffect(() => {
    if (accountType !== 'club' || !user?.uid) {
      return;
    }

    const clubRef = doc(db, 'clubs', user.uid);

    // استخدام onSnapshot للاستماع للتحديثات الفورية
    const unsubscribe = onSnapshot(
      clubRef,
      (clubDoc) => {
        try {
          if (clubDoc.exists()) {
            const data = clubDoc.data();
            if (data.logo) {
              if (data.logo.startsWith('http')) {
                setClubLogo(data.logo);
              } else {
                const logoUrl = getSupabaseImageUrl(data.logo, 'clubavatar');
                if (logoUrl && logoUrl !== '') {
                  setClubLogo(logoUrl);
                } else {
                  setClubLogo(null);
                }
              }
            } else {
              setClubLogo(null);
            }
          } else {
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

    // Cleanup listener on unmount
    return () => {
      console.log('🔄 ResponsiveHeader: Unsubscribing from club logo updates');
      unsubscribe();
    };
  }, [accountType, user?.uid]);

  // Fetch notification data or other header requirements
  useEffect(() => {
    // Additional logic can be added here
  }, []);

  // Account theming information based on type
  const getAccountTheming = () => {
    switch (accountType) {
      case 'admin': return { label: 'منصة الإدارة', color: 'text-red-600', bg: 'bg-red-500/10' };
      case 'academy': return { label: 'منصة الأكاديمية', color: 'text-indigo-600', bg: 'bg-indigo-500/10' };
      case 'club': return { label: 'منصة النادي', color: 'text-emerald-600', bg: 'bg-emerald-500/10' };
      case 'trainer': return { label: 'منصة المدرب', color: 'text-pink-600', bg: 'bg-pink-500/10' };
      default: return { label: 'منصة اللاعب', color: 'text-blue-600', bg: 'bg-blue-500/10' };
    }
  };

  const theme = getAccountTheming();

  return (
    <header className={cn(
      "sticky top-0 z-40 transition-all duration-700 ease-in-out",
      "bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl",
      "border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm",
      getHeaderMargin()
    )}>
      <div className="flex relative justify-between items-center px-4 h-16 lg:px-10 max-w-[2200px] mx-auto">
        {/* Left Side: Navigation & Title */}
        <div className="flex gap-6 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="group relative h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all duration-500 active:scale-90"
          >
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-2xl transition-all duration-500" />
            {isMobile ? (
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
            ) : (
              isSidebarCollapsed ?
                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" /> :
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors" />
            )}
          </Button>

          <div className="hidden sm:flex flex-col">
            <h1 className="text-[19px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {userData?.full_name?.split(' ')[0] || 'أهلاً بك'} 👋
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-md", theme.bg, theme.color)}>
                {theme.label}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar (Premium Mockup) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="البحث عن لاعبين، أندية، أو عمليات..."
              className="w-full h-11 pr-11 pl-4 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500/30 rounded-2xl text-sm font-medium text-slate-900 dark:text-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex overflow-visible gap-4 items-center">
          <div className="flex items-center gap-2 pr-1">
            <UnifiedMessagesButton />
            <UnifiedNotificationsButton />
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-200/60 dark:bg-slate-800/60 mx-1"></div>

          <div className="flex items-center gap-3 pr-2 group cursor-pointer transition-all active:scale-95">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                {getUserDisplayName()}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-black text-green-500 uppercase tracking-widest ring-1 ring-green-500/20 px-1.5 py-0.5 rounded-full bg-green-500/5">
                  نشط الآن
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[1.2rem] opacity-0 group-hover:opacity-20 blur-md transition-all duration-500" />
              <Avatar className="h-11 w-11 rounded-[1.1rem] border-2 border-white dark:border-slate-800 shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <AvatarImage
                  key={getUserAvatar() || 'default'}
                  src={getUserAvatar() || undefined}
                  alt={getUserDisplayName()}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-sm">
                  {getUserDisplayName().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

// ===== Professional Footer Component =====
const ResponsiveFooter: React.FC = () => {
  const { isMobile, isTablet, isDesktop, isSidebarCollapsed, isClient } = useLayout();

  // Determine footer margin to align with sidebar - compact sizes
  const getFooterMargin = () => {
    if (!isClient) return ''; // Don't apply margin on server
    if (isMobile) return '';
    if (isSidebarCollapsed) {
      if (isTablet) return 'mr-14'; // 56px - يتطابق مع motion.div
      return 'mr-16'; // 64px - يتطابق مع motion.div
    }
    if (isTablet) return 'mr-56'; // 224px - يتطابق مع motion.div
    return 'mr-64'; // 256px - يتطابق مع motion.div
  };

  return (
    <footer className={cn(
      "px-6 py-6 transition-all duration-700 ease-in-out",
      "bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800/60",
      getFooterMargin()
    )}>
      <div className="max-w-[2200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black text-xl">H</span>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">منصة الحلم 2024</p>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">جميع الحقوق محفوظة لشركة ميسك القطرية</p>
          </div>
        </div>

        <div className="flex gap-8 items-center">
          <div className="flex gap-6">
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الشروط</a>
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الخصوصية</a>
            <a href="#" className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">الدعم</a>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em]">Vers v1.0.0-PRO</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// ===== Main Layout Component =====
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  accountType = 'player',
  showSidebar = true,
  showHeader = true,
  showFooter = true,
  noPadding = false
}) => {
  const { isSidebarOpen, isSidebarCollapsed, isMobile, isTablet, isDesktop, isClient } = useLayout();

  // Determine main content margin - compact sizes
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
    <div className={`flex flex-col min-h-screen ${noPadding ? 'bg-black h-screen overflow-hidden' : 'bg-gray-50'}`}>
      {/* Header */}
      {showHeader && <ResponsiveHeader />}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 h-full">
        {/* Sidebar */}
        {showSidebar && <ResponsiveSidebar accountType={accountType} />}

        {/* Content */}
        <main
          className={`overflow-auto flex-1 min-h-0 transition-all duration-300 ease-in-out ${getMainContentMargin()} rtl ${noPadding ? 'p-0 h-full flex flex-col overflow-hidden' : 'p-4 lg:p-6'}`}
        >
          <div className={`${noPadding ? 'h-full flex-1 flex flex-col' : 'h-full'}`}>
            <motion.div
              initial={noPadding ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`${noPadding ? 'h-full flex-1 flex flex-col' : 'h-full'}`}
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

// ===== Exported Main Layout Wrapper =====
interface ResponsiveLayoutWrapperProps {
  children: React.ReactNode;
  accountType?: string;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  noPadding?: boolean;
}

export const ResponsiveLayoutWrapper: React.FC<ResponsiveLayoutWrapperProps> = (props) => {
  return (
    <LayoutProvider>
      <ResponsiveLayout {...props} />
    </LayoutProvider>
  );
};

export default ResponsiveLayoutWrapper;
