'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building,
  GraduationCap,
  Home,
  Menu,
  Search,
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
  label: string;
  icon: React.ElementType;
  href: string;
}

function getBottomTabs(accountType: string): NavTab[] {
  switch (accountType) {
    case 'player':
      return [
        { label: 'الرئيسية',   icon: Home,    href: '/dashboard/player' },
        { label: 'ملفي',        icon: User,    href: '/dashboard/player/profile' },
        { label: 'فيديوهات',   icon: Video,   href: '/dashboard/player/player-videos' },
        { label: 'بحث',         icon: Search,  href: '/dashboard/player/search' },
      ];
    case 'club':
      return [
        { label: 'الرئيسية',  icon: Home,   href: '/dashboard/club' },
        { label: 'اللاعبون',  icon: Users,  href: '/dashboard/club/players' },
        { label: 'فيديوهات',  icon: Video,  href: '/dashboard/club/player-videos' },
        { label: 'بحث',        icon: Search, href: '/dashboard/club/search-players' },
      ];
    case 'academy':
      return [
        { label: 'الرئيسية', icon: Home,          href: '/dashboard/academy' },
        { label: 'ملفي',      icon: GraduationCap, href: '/dashboard/academy/profile' },
        { label: 'اللاعبون', icon: Users,          href: '/dashboard/academy/players' },
        { label: 'إحصاءات',  icon: BarChart3,      href: '/dashboard/academy/stats' },
      ];
    case 'agent':
      return [
        { label: 'الرئيسية', icon: Home,   href: '/dashboard/agent' },
        { label: 'ملفي',      icon: User,   href: '/dashboard/agent/profile' },
        { label: 'لاعبون',   icon: Users,  href: '/dashboard/agent/players' },
        { label: 'عقود',      icon: Trophy, href: '/dashboard/agent/contracts' },
      ];
    case 'trainer':
      return [
        { label: 'الرئيسية', icon: Home,      href: '/dashboard/trainer' },
        { label: 'ملفي',      icon: User,      href: '/dashboard/trainer/profile' },
        { label: 'لاعبون',   icon: Users,     href: '/dashboard/trainer/players' },
        { label: 'إحصاءات',  icon: BarChart3, href: '/dashboard/trainer/stats' },
      ];
    case 'admin':
      return [
        { label: 'الرئيسية', icon: Home,      href: '/dashboard/admin' },
        { label: 'مستخدمون', icon: Users,     href: '/dashboard/admin/users-management' },
        { label: 'مدفوعات',  icon: BarChart3, href: '/dashboard/admin/payments' },
        { label: 'تقارير',   icon: Building,  href: '/dashboard/admin/reports' },
      ];
    default:
      return [{ label: 'الرئيسية', icon: Home, href: '/dashboard' }];
  }
}

export default function MobileBottomNav({ accountType }: { accountType: string }) {
  const { isMobile, toggleMobile } = useAppShell();
  const pathname = usePathname();

  if (!isMobile) return null;

  const tabs = getBottomTabs(accountType);

  return (
    <nav
      className="mobile-bottom-nav"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      aria-label="التنقل السريع"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn('mobile-bottom-tab', isActive && 'active')}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{tab.label}</span>
          </Link>
        );
      })}

      {/* More — opens sidebar */}
      <button
        onClick={toggleMobile}
        className="mobile-bottom-tab-more"
        aria-label="القائمة الكاملة"
      >
        <Menu size={22} strokeWidth={1.8} />
        <span style={{ fontSize: 10, fontWeight: 700 }}>المزيد</span>
      </button>
    </nav>
  );
}
