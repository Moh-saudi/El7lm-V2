'use client';

/**
 * SidebarUserPanel — User identity block at the top of sidebar.
 * Expanded: shows avatar + name + role badge.
 * Collapsed: shows avatar only.
 * Purely presentational.
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import React from 'react';
import { useAppShell } from './AppShellContext';

interface SidebarUserPanelProps {
  displayName: string;
  avatarUrl?: string | null;
  roleName: string;
  /** hex or CSS color for role badge accent */
  accentColor?: string;
  /** logo url for club/academy accounts */
  logoUrl?: string | null;
}

export default function SidebarUserPanel({
  displayName,
  avatarUrl,
  roleName,
  logoUrl,
}: SidebarUserPanelProps) {
  const { isCollapsed } = useAppShell();

  const initials = displayName
    ? displayName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  const imageUrl = logoUrl || avatarUrl;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-4 border-b',
        'transition-all duration-200',
        isCollapsed ? 'justify-center px-2' : 'px-4',
      )}
      style={{ borderColor: 'var(--sidebar-border)' }}
    >
      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-white/10">
        <AvatarImage src={imageUrl || undefined} alt={displayName} />
        <AvatarFallback
          className="text-sm font-bold"
          style={{ background: 'var(--accent-current)', color: '#fff' }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {!isCollapsed && (
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className="text-sm font-semibold truncate leading-tight"
            style={{ color: 'var(--sidebar-text-active)' }}
          >
            {displayName}
          </p>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--sidebar-text)' }}
          >
            {roleName}
          </p>
        </div>
      )}
    </div>
  );
}
