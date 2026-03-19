'use client';

/**
 * SidebarNav — Renders menu groups and items.
 * Purely presentational: no data fetching, no auth calls.
 * Receives menuGroups as props from AppShell.
 */

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { ElementType } from 'react';
import { useAppShell } from './AppShellContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: ElementType;
  color?: string;
  bgColor?: string;
}

export interface MenuGroup {
  id: string;
  title: string;
  icon?: ElementType;
  items: MenuItem[];
}

interface SidebarNavProps {
  menuGroups: MenuGroup[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SidebarNav({ menuGroups }: SidebarNavProps) {
  const pathname = usePathname();
  const { isCollapsed } = useAppShell();

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">
      {menuGroups.map((group, groupIdx) => {
        if (!group.items || group.items.length === 0) return null;

        return (
          <div key={group.id}>
            {/* Group separator (except first) */}
            {groupIdx > 0 && <div className="sidebar-group-divider" />}

            {/* Group label */}
            {group.title && (
              <div className="sidebar-group-label">{group.title}</div>
            )}

            {/* Items */}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== `/dashboard/${pathname.split('/')[2]}` && pathname.startsWith(item.href + '/'));

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn('sidebar-item', isActive && 'active')}
                  data-tooltip={isCollapsed ? item.label : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="item-icon" />
                  <span className="item-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
