'use client';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building,
  GraduationCap,
  Home,
  Menu,
  Search,
  ShoppingBag,
  Trophy,
  User,
  Users,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useAppShell } from './AppShellContext';

interface NavTab {
  id: string;
  icon: React.ElementType;
  href: string;
}

function getBottomTabs(accountType: string): NavTab[] {
  switch (accountType) {
    case 'player':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/player' },
        { id: 'profile', icon: User, href: '/dashboard/player/profile' },
        { id: 'videos', icon: Video, href: '/dashboard/player/player-videos' },
        { id: 'search', icon: Search, href: '/dashboard/player/search' },
      ];
    case 'club':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/club' },
        { id: 'players', icon: Users, href: '/dashboard/club/players' },
        { id: 'player-videos', icon: Video, href: '/dashboard/club/player-videos' },
        { id: 'search', icon: Search, href: '/dashboard/club/search-players' },
      ];
    case 'academy':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/academy' },
        { id: 'profile', icon: GraduationCap, href: '/dashboard/academy/profile' },
        { id: 'players', icon: Users, href: '/dashboard/academy/players' },
        { id: 'store', icon: ShoppingBag, href: '/dashboard/academy/store' },
      ];
    case 'agent':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/agent' },
        { id: 'profile', icon: User, href: '/dashboard/agent/profile' },
        { id: 'players', icon: Users, href: '/dashboard/agent/players' },
        { id: 'contracts', icon: Trophy, href: '/dashboard/agent/contracts' },
      ];
    case 'trainer':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/trainer' },
        { id: 'profile', icon: User, href: '/dashboard/trainer/profile' },
        { id: 'players', icon: Users, href: '/dashboard/trainer/players' },
        { id: 'stats', icon: BarChart3, href: '/dashboard/trainer/stats' },
      ];
    case 'admin':
      return [
        { id: 'dashboard', icon: Home, href: '/dashboard/admin' },
        { id: 'admin-users-management', icon: Users, href: '/dashboard/admin/users-management' },
        { id: 'admin-payments', icon: BarChart3, href: '/dashboard/admin/payments' },
        { id: 'admin-reports', icon: Building, href: '/dashboard/admin/reports' },
      ];
    default:
      return [{ id: 'dashboard', icon: Home, href: '/dashboard' }];
  }
}

export default function MobileBottomNav({ accountType }: { accountType: string }) {
  const { isMobile, toggleMobile } = useAppShell();
  const pathname = usePathname();
  const { t } = useTranslation();

  if (!isMobile) return null;

  const tabs = getBottomTabs(accountType);

  return (
    <nav
      className="mobile-bottom-nav"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      aria-label={t('sidebar.quickNavigation')}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn('mobile-bottom-tab', isActive && 'active')}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{t(`sidebar.${tab.id}`)}</span>
          </Link>
        );
      })}

      <button
        onClick={toggleMobile}
        className="mobile-bottom-tab-more"
        aria-label={t('sidebar.fullMenu')}
      >
        <Menu size={22} strokeWidth={1.8} />
        <span style={{ fontSize: 10, fontWeight: 700 }}>{t('sidebar.more')}</span>
      </button>
    </nav>
  );
}
