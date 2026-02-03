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
  X
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


  // Check permission for menu item using new CASL system
  const hasPermissionForMenuItem = (menuItemId: string, can: any): boolean => {
    // Mapping between menu items and CASL resources
    const menuItemMapping: Record<string, { action: PermissionAction, resource: PermissionResource }> = {
      // --- Green Zone: Operational (Read/Create) ---
      'dashboard': { action: 'read', resource: 'dashboard' },
      'profile': { action: 'read', resource: 'dashboard' },

      // Identity & Users
      'admin-users-management': { action: 'read', resource: 'users' },
      'admin-customer-management': { action: 'manage', resource: 'users' },
      'admin-check-phone': { action: 'manage', resource: 'users' },
      'admin-referrals-mgmt': { action: 'manage', resource: 'users' },

      // Finance (Staff View)
      'admin-payments': { action: 'read', resource: 'financials' },
      'admin-invoices': { action: 'read', resource: 'financials' },
      'admin-subscriptions': { action: 'read', resource: 'subscriptions' },

      // Communication & Support
      'admin-support': { action: 'read', resource: 'support' },
      'admin-shared-messages': { action: 'read', resource: 'communications' },
      'admin-notifications': { action: 'read', resource: 'communications' },
      'admin-email-center': { action: 'read', resource: 'communications' },

      // Content & Sports
      'admin-content-mgmt': { action: 'read', resource: 'content' },
      'admin-videos': { action: 'read', resource: 'media' },
      'admin-tournaments': { action: 'read', resource: 'tournaments' },
      'admin-careers': { action: 'read', resource: 'content' },
      'admin-dream-academy-home': { action: 'read', resource: 'content' },
      'dream-academy-home': { action: 'read', resource: 'content' },

      // --- Yellow/Red Zone: Management (Manage/Update) ---
      // Sensitive Communications
      'admin-notification-center': { action: 'manage', resource: 'communications' },
      'admin-send-notifications': { action: 'manage', resource: 'communications' },
      'admin-chataman': { action: 'manage', resource: 'communications' },

      // Financial Master Data & Gateways
      'admin-pricing': { action: 'manage', resource: 'financials' },
      'admin-geidea-settings': { action: 'manage', resource: 'financials' },
      'admin-geidea-transactions': { action: 'manage', resource: 'financials' }, // Transactions at gateway level is sensitive
      'admin-skipcash': { action: 'manage', resource: 'financials' },

      // HR & System Core (Strictly Admin Only)
      'admin-employees': { action: 'manage', resource: 'employees' },
      'admin-system': { action: 'manage', resource: 'settings' },
      'admin-email-migration': { action: 'manage', resource: 'settings' },
      'admin-beon-v3': { action: 'manage', resource: 'employees' },
      'admin-dream-academy-mgmt': { action: 'manage', resource: 'content' },

      // Marketing Execution
      'admin-ads': { action: 'manage', resource: 'content' },

      // Opportunities
      'search-players': { action: 'read', resource: 'opportunities' },

      // Missing items
      'messages': { action: 'read', resource: 'communications' },
      'notifications': { action: 'read', resource: 'communications' },
      'admin-messages': { action: 'read', resource: 'communications' },
    };

    const requirement = menuItemMapping[menuItemId];

