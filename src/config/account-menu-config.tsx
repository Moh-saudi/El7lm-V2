/**
 * account-menu-config.tsx
 * Centralized menu definitions for all non-admin account types.
 * Extracted from ResponsiveLayout.tsx getMenuGroups().
 *
 * Admin menus remain in menu-config.tsx (ADMIN_DASHBOARD_MENU) — unchanged.
 */

import {
  BarChart3,
  Briefcase,
  Building,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  GraduationCap,
  Home,
  Megaphone,
  MessageSquare,
  Play,
  Search,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { MenuGroup } from '@/components/layout/SidebarNav';
import { ADMIN_DASHBOARD_MENU } from './menu-config';
import { RolePermissions } from '@/types/employees';

// ─── Admin permission filter helpers ─────────────────────────────────────────

const MENU_ITEM_PERMISSIONS: Record<string, keyof RolePermissions> = {
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
  'admin-system': 'canManageEmployees',
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
  'admin-chataman-messenger': 'canManageSupport',
  'admin-shared-messages': 'canManageSupport',
  'admin-marketing-ads': 'canManageContent',
  'admin-marketing-campaigns': 'canManageContent',
  'admin-marketing-analytics': 'canViewReports',
  'admin-convert-players': 'canEditUsers',
};

function filterByPermissions(items: any[], permissions: RolePermissions | null): any[] {
  if (!permissions) return items;
  return items.filter(item => {
    const required = MENU_ITEM_PERMISSIONS[item.id];
    if (!required) return true;
    return permissions[required] === true;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns menu groups for the given account type.
 * Admin menus support optional permission filtering.
 */
export function getAccountMenuGroups(
  accountType: string,
  employeePermissions: RolePermissions | null = null,
): MenuGroup[] {

  // ── Player ──────────────────────────────────────────────────────────────────
  if (accountType === 'player') {
    return [
      {
        id: 'main',
        title: 'لوحة التحكم',
        icon: Home,
        items: [
          { id: 'dashboard',  label: 'الرئيسية',          icon: Home,        href: '/dashboard/player' },
          { id: 'profile',    label: 'الملف الشخصي',       icon: User,        href: '/dashboard/player/profile' },
          { id: 'career',     label: 'مسيرتي الرياضية',    icon: Trophy,      href: '/dashboard/player/career' },
          { id: 'videos',     label: 'فيديوهاتي',           icon: Video,       href: '/dashboard/player/videos' },
          { id: 'stats',      label: 'إحصائياتي',           icon: BarChart3,   href: '/dashboard/player/stats' },
          { id: 'reports',    label: 'تقارير الكشافين',     icon: FileText,    href: '/dashboard/player/reports' },
          { id: 'referrals',  label: 'سفراء الحلم',         icon: UserPlus,    href: '/dashboard/player/referrals' },
        ],
      },
      {
        id: 'finance',
        title: 'المالية والاشتراكات',
        icon: CreditCard,
        items: [
          { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock,     href: '/dashboard/shared/subscription-status' },
          { id: 'billing',             label: 'فواتيري',        icon: FileText,  href: '/dashboard/player/billing' },
          { id: 'payment-service',     label: 'خدمة الدفع',     icon: DollarSign, href: '/dashboard/player/bulk-payment' },
        ],
      },
      {
        id: 'discovery',
        title: 'اكتشاف الفرص',
        icon: Search,
        items: [
          { id: 'search-opps',       label: 'البحث عن الفرص والأندية', icon: Search,   href: '/dashboard/player/search' },
          { id: 'my-applications',  label: 'طلباتي',                   icon: FileText, href: '/dashboard/player/my-applications' },
          { id: 'search-players',  label: 'البحث عن لاعبين',           icon: Users,   href: '/dashboard/player/search-players' },
          { id: 'player-cinema',   label: 'سينما اللاعبين',             icon: Play,    href: '/dashboard/player/player-videos' },
          { id: 'tournaments',     label: 'البطولات الحالية',            icon: Trophy,  href: '/dashboard/player/tournaments' },
        ],
      },
      {
        id: 'academy',
        title: 'مدرسة الحلم',
        icon: GraduationCap,
        items: [
          { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: '/dashboard/dream-academy' },
        ],
      },
    ];
  }

  // ── Club ────────────────────────────────────────────────────────────────────
  if (accountType === 'club') {
    return [
      {
        id: 'main',
        title: 'لوحة التحكم',
        icon: Home,
        items: [
          { id: 'dashboard', label: 'الرئيسية',       icon: Home,     href: '/dashboard/club' },
          { id: 'profile',   label: 'الملف الشخصي',   icon: Building, href: '/dashboard/club/profile' },
        ],
      },
      {
        id: 'team-mgmt',
        title: 'إدارة الفريق',
        icon: Users,
        items: [
          { id: 'players',           label: 'إدارة اللاعبين',         icon: Users,        href: '/dashboard/club/players' },
          { id: 'player-evaluation', label: 'تقييم اللاعبين',          icon: BarChart3,    href: '/dashboard/club/player-evaluation' },
          { id: 'contracts',         label: 'العقود',                   icon: FileText,     href: '/dashboard/club/contracts' },
          { id: 'negotiations',      label: 'المفاوضات',                icon: MessageSquare, href: '/dashboard/club/negotiations' },
          { id: 'player-videos',     label: 'فيديوهات اللاعبين',        icon: Video,        href: '/dashboard/club/player-videos' },
        ],
      },
      {
        id: 'analysis',
        title: 'التحليل والتسويق',
        icon: TrendingUp,
        items: [
          { id: 'ai-analysis',    label: 'تحليل الذكاء الاصطناعي', icon: Zap,       href: '/dashboard/club/ai-analysis' },
          { id: 'market-values',  label: 'القيم السوقية',            icon: TrendingUp, href: '/dashboard/club/market-values' },
          { id: 'marketing',      label: 'التسويق',                   icon: Megaphone,  href: '/dashboard/club/marketing' },
        ],
      },
      {
        id: 'finance',
        title: 'المالية والاشتراكات',
        icon: CreditCard,
        items: [
          { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock,      href: '/dashboard/shared/subscription-status' },
          { id: 'billing',             label: 'فواتيري',        icon: FileText,   href: '/dashboard/club/billing' },
          { id: 'bulk-payment',        label: 'خدمة الدفع',     icon: DollarSign, href: '/dashboard/club/bulk-payment' },
          { id: 'referrals',           label: 'سفراء الحلم',    icon: UserPlus,   href: '/dashboard/club/referrals' },
        ],
      },
      {
        id: 'discovery',
        title: 'اكتشاف الفرص',
        icon: Search,
        items: [
          { id: 'search-opps',    label: 'البحث عن الفرص والأندية', icon: Search, href: '/dashboard/player/search' },
          { id: 'search-players', label: 'البحث عن لاعبين',          icon: Search, href: '/dashboard/club/search-players' },
          { id: 'player-cinema',  label: 'سينما اللاعبين',            icon: Play,   href: '/dashboard/club/player-videos' },
          { id: 'tournaments',    label: 'البطولات الحالية',           icon: Trophy, href: '/tournaments/unified-registration' },
        ],
      },
      {
        id: 'school',
        title: 'مدرسة الحلم',
        icon: GraduationCap,
        items: [
          { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: '/dashboard/dream-academy' },
        ],
      },
    ];
  }

  // ── Academy ─────────────────────────────────────────────────────────────────
  if (accountType === 'academy') {
    return [
      {
        id: 'main',
        title: 'لوحة التحكم',
        icon: Home,
        items: [
          { id: 'dashboard', label: 'الرئيسية',       icon: Home,         href: '/dashboard/academy' },
          { id: 'profile',   label: 'الملف الشخصي',   icon: GraduationCap, href: '/dashboard/academy/profile' },
        ],
      },
      {
        id: 'management',
        title: 'إدارة الأكاديمية',
        icon: Users,
        items: [
          { id: 'players',       label: 'إدارة اللاعبين',      icon: Users, href: '/dashboard/academy/players' },
          { id: 'player-videos', label: 'فيديوهات اللاعبين',   icon: Video, href: '/dashboard/academy/player-videos' },
        ],
      },
      {
        id: 'finance',
        title: 'المالية والاشتراكات',
        icon: CreditCard,
        items: [
          { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock,      href: '/dashboard/shared/subscription-status' },
          { id: 'billing',             label: 'فواتيري',        icon: FileText,   href: '/dashboard/academy/billing' },
          { id: 'bulk-payment',        label: 'خدمة الدفع',     icon: DollarSign, href: '/dashboard/academy/bulk-payment' },
          { id: 'referrals',           label: 'سفراء الحلم',    icon: UserPlus,   href: '/dashboard/academy/referrals' },
        ],
      },
      {
        id: 'discovery',
        title: 'اكتشاف الفرص',
        icon: Search,
        items: [
          { id: 'search-opps',    label: 'البحث عن الفرص والأندية', icon: Search, href: '/dashboard/player/search' },
          { id: 'search-players', label: 'البحث عن لاعبين',          icon: Search, href: '/dashboard/academy/search-players' },
          { id: 'player-cinema',  label: 'سينما اللاعبين',            icon: Play,   href: '/dashboard/academy/player-videos' },
          { id: 'tournaments',    label: 'البطولات الحالية',           icon: Trophy, href: '/tournaments/unified-registration' },
        ],
      },
      {
        id: 'school',
        title: 'مدرسة الحلم',
        icon: GraduationCap,
        items: [
          { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: '/dashboard/dream-academy' },
        ],
      },
    ];
  }

  // ── Agent & Trainer (shared structure) ──────────────────────────────────────
  if (accountType === 'agent' || accountType === 'trainer') {
    const typeLabel = accountType === 'agent' ? 'الوكيل' : 'المدرب';
    const typeIcon  = accountType === 'agent' ? Briefcase : Target;

    return [
      {
        id: 'main',
        title: 'لوحة التحكم',
        icon: Home,
        items: [
          { id: 'dashboard', label: 'الرئيسية',      icon: Home,     href: `/dashboard/${accountType}` },
          { id: 'profile',   label: 'الملف الشخصي',  icon: typeIcon, href: `/dashboard/${accountType}/profile` },
        ],
      },
      {
        id: 'management',
        title: `إدارة ${typeLabel}`,
        icon: Users,
        items: [
          { id: 'players',       label: 'إدارة اللاعبين',    icon: Users, href: `/dashboard/${accountType}/players` },
          { id: 'player-videos', label: 'فيديوهات اللاعبين', icon: Video, href: `/dashboard/${accountType}/player-videos` },
        ],
      },
      {
        id: 'finance',
        title: 'المالية والاشتراكات',
        icon: CreditCard,
        items: [
          { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock,      href: '/dashboard/shared/subscription-status' },
          { id: 'billing',             label: 'فواتيري',        icon: FileText,   href: `/dashboard/${accountType}/billing` },
          { id: 'bulk-payment',        label: 'خدمة الدفع',     icon: DollarSign, href: `/dashboard/${accountType}/bulk-payment` },
          { id: 'referrals',           label: 'سفراء الحلم',    icon: UserPlus,   href: `/dashboard/${accountType}/referrals` },
        ],
      },
      {
        id: 'discovery',
        title: 'اكتشاف الفرص',
        icon: Search,
        items: [
          { id: 'search-opps',    label: 'البحث عن الفرص والأندية', icon: Search, href: '/dashboard/player/search' },
          { id: 'search-players', label: 'البحث عن لاعبين',          icon: Search, href: `/dashboard/${accountType}/search-players` },
          { id: 'player-cinema',  label: 'سينما اللاعبين',            icon: Play,   href: `/dashboard/${accountType}/player-videos` },
          { id: 'tournaments',    label: 'البطولات الحالية',           icon: Trophy, href: '/tournaments/unified-registration' },
        ],
      },
      {
        id: 'school',
        title: 'مدرسة الحلم',
        icon: GraduationCap,
        items: [
          { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: '/dashboard/dream-academy' },
        ],
      },
    ];
  }

  // ── Marketer ─────────────────────────────────────────────────────────────────
  if (accountType === 'marketer') {
    return [
      {
        id: 'main',
        title: 'لوحة التحكم',
        icon: Home,
        items: [
          { id: 'dashboard', label: 'الرئيسية',      icon: Home,     href: '/dashboard/marketer' },
          { id: 'profile',   label: 'الملف الشخصي',  icon: Briefcase, href: '/dashboard/marketer/profile' },
        ],
      },
      {
        id: 'management',
        title: 'إدارة التسويق',
        icon: Users,
        items: [
          { id: 'players',        label: 'إدارة اللاعبين',         icon: Users,    href: '/dashboard/marketer/players' },
          { id: 'contracts',      label: 'العقود',                   icon: FileText, href: '/dashboard/marketer/contracts' },
          { id: 'ai-analysis',    label: 'تحليل الذكاء الاصطناعي', icon: Zap,      href: '/dashboard/marketer/ai-analysis' },
          { id: 'opportunities',  label: 'الفرص والخدمات',            icon: Target,   href: '/dashboard/opportunities' },
        ],
      },
      {
        id: 'finance',
        title: 'المالية والاشتراكات',
        icon: CreditCard,
        items: [
          { id: 'subscription-status', label: 'حالة اشتراكي', icon: Clock,      href: '/dashboard/shared/subscription-status' },
          { id: 'billing',             label: 'فواتيري',        icon: FileText,   href: '/dashboard/marketer/billing' },
          { id: 'payment',             label: 'خدمة الدفع',     icon: DollarSign, href: '/dashboard/marketer/payment' },
          { id: 'referrals',           label: 'سفراء الحلم',    icon: UserPlus,   href: '/dashboard/marketer/referrals' },
        ],
      },
      {
        id: 'discovery',
        title: 'اكتشاف الفرص',
        icon: Search,
        items: [
          { id: 'search-opps',    label: 'البحث عن الفرص والأندية', icon: Search, href: '/dashboard/player/search' },
          { id: 'search-players', label: 'البحث عن لاعبين',          icon: Search, href: '/dashboard/marketer/search-players' },
          { id: 'player-cinema',  label: 'سينما اللاعبين',            icon: Play,   href: '/dashboard/marketer/videos' },
          { id: 'tournaments',    label: 'البطولات الحالية',           icon: Trophy, href: '/tournaments/unified-registration' },
        ],
      },
      {
        id: 'school',
        title: 'مدرسة الحلم',
        icon: GraduationCap,
        items: [
          { id: 'lessons', label: 'الدروس والتدريبات', icon: GraduationCap, href: '/dashboard/dream-academy' },
        ],
      },
    ];
  }

  // ── Admin (config-driven, with optional permission filtering) ────────────────
  if (accountType === 'admin') {
    if (employeePermissions) {
      return ADMIN_DASHBOARD_MENU
        .map(group => ({
          ...group,
          items: filterByPermissions(group.items, employeePermissions),
        }))
        .filter(group => group.items.length > 0) as MenuGroup[];
    }
    return ADMIN_DASHBOARD_MENU as MenuGroup[];
  }

  return [];
}
