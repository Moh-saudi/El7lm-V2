'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Avatar, Badge, Dropdown, Typography, Tooltip, ConfigProvider, theme as antdTheme,
} from 'antd';
import type { MenuProps } from 'antd';
import arEG from 'antd/locale/ar_EG';
import {
  TrophyOutlined, PlusOutlined, LogoutOutlined, UserOutlined,
  BellOutlined, MenuOutlined, DashboardOutlined,
  SunOutlined, MoonOutlined, CloseOutlined,
} from '@ant-design/icons';
import { Toaster } from 'sonner';
import { signOutClient, TournamentClient } from '@/lib/tournament-portal/auth';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

const { Text } = Typography;

// ── Theme context (يُشاركه TournamentNav) ─────────────────────────────────────
export const PortalThemeContext = createContext<{ isDark: boolean }>({ isDark: false });
export const usePortalTheme = () => useContext(PortalThemeContext);

// ── Color tokens ───────────────────────────────────────────────────────────────
const DARK = {
  sidebarBg:    '#0b1120',
  sidebarBorder:'rgba(255,255,255,0.06)',
  headerBg:     '#0f172a',
  headerBorder: 'rgba(255,255,255,0.07)',
  contentBg:    '#070e1c',
  navItemColor:  '#64748b',
  navItemHover:  '#94a3b8',
  navItemActive: '#facc15',
  navActiveBg:   'rgba(250,204,21,0.1)',
  textPrimary:   '#f1f5f9',
  textSec:       '#64748b',
  divider:       'rgba(255,255,255,0.06)',
  orgBadgeBg:    'rgba(255,255,255,0.04)',
  orgBadgeBorder:'rgba(255,255,255,0.08)',
  overlayBg:     'rgba(0,0,0,0.6)',
  toggleBg:      'rgba(255,255,255,0.07)',
  toggleBorder:  'rgba(255,255,255,0.1)',
  toggleColor:   '#facc15',
};

const LIGHT = {
  sidebarBg:    '#ffffff',
  sidebarBorder:'#e2e8f0',
  headerBg:     '#ffffff',
  headerBorder: '#e2e8f0',
  contentBg:    '#f8fafc',
  navItemColor:  '#64748b',
  navItemHover:  '#374151',
  navItemActive: '#d97706',
  navActiveBg:   'rgba(217,119,6,0.07)',
  textPrimary:   '#0f172a',
  textSec:       '#94a3b8',
  divider:       '#f0f0f0',
  orgBadgeBg:    '#f8fafc',
  orgBadgeBorder:'#e2e8f0',
  overlayBg:     'rgba(0,0,0,0.4)',
  toggleBg:      '#f1f5f9',
  toggleBorder:  '#e2e8f0',
  toggleColor:   '#475569',
};

const SIDEBAR_W = 252;

interface Props {
  client: TournamentClient;
  children: React.ReactNode;
}

export function PortalShell({ client, children }: Props) {
  const { isRTL, getTranslations } = useTranslation();
  const t = getTranslations<any>('tournamentPortal');
  const pathname    = usePathname();
  const router      = useRouter();
  const [open,     setOpen]     = useState(false);   // mobile drawer
  const [isDark,   setIsDark]   = useState(false);

  const C = isDark ? DARK : LIGHT;
  const nav = [
    { href: '/tournament-portal', icon: <DashboardOutlined />, label: t.common.dashboard },
    { href: '/tournament-portal/new', icon: <PlusOutlined />, label: t.common.newTournament },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('portal-theme');
    if (saved === 'dark') setIsDark(true);
  }, []);

  // أغلق الدراور عند تغيير الصفحة
  useEffect(() => { setOpen(false); }, [pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('portal-theme', next ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await signOutClient();
    router.push('/tournament-portal/login');
  };

  const orgName  = client.organization_name || client.name;
  const initials = orgName.charAt(0).toUpperCase();
  const hasLogo  = !!client.logo_url;

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile', icon: <UserOutlined />,
      label: <span style={{ color: C.textPrimary }}>{t.common.profile}</span>,
      onClick: () => router.push('/tournament-portal/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout', icon: <LogoutOutlined />,
      label: <span style={{ color: '#ef4444' }}>{t.common.logout}</span>,
      onClick: handleSignOut,
    },
  ];

  // ── Sidebar content (shared between fixed desktop + mobile drawer) ──────────
  const SidebarContent = () => (
    <div style={{
      width: SIDEBAR_W, height: '100%',
      background: C.sidebarBg,
      borderLeft: `1px solid ${C.sidebarBorder}`,
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s',
    }}>

      {/* ── Header الشعار ── */}
      <div style={{ padding: '20px 18px 16px', borderBottom: `1px solid ${C.divider}` }}>
        {/* El7lm branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
            background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc',
            border: `1px solid ${C.sidebarBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/el7lm-logo.png" alt="El7lm" width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>
          <div>
            <p style={{ color: C.textPrimary, fontWeight: 800, fontSize: 16, margin: 0, lineHeight: 1.2, transition: 'color 0.3s' }}>
              {t.common.platform}
            </p>
            <p style={{ color: C.textSec, fontSize: 12, margin: 0, transition: 'color 0.3s' }}>
              {t.common.organizerPortal}
            </p>
          </div>
        </div>

        {/* شعار المنظم + اسمه */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: C.orgBadgeBg, border: `1px solid ${C.orgBadgeBorder}`,
          borderRadius: 12, padding: '10px 12px',
          transition: 'all 0.3s',
        }}>
          {hasLogo ? (
            <div style={{
              width: 36, height: 36, borderRadius: 9, overflow: 'hidden', flexShrink: 0,
              border: `1px solid ${C.sidebarBorder}`,
            }}>
              <img
                src={client.logo_url!} alt={orgName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: 'linear-gradient(135deg, #d97706, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(217,119,6,0.25)',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{initials}</span>
            </div>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text ellipsis={{ tooltip: orgName }}
              style={{ color: C.textPrimary, fontWeight: 700, fontSize: 14, display: 'block', transition: 'color 0.3s' }}>
              {orgName}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              <Text style={{ color: C.textSec, fontSize: 12, transition: 'color 0.3s' }}>{t.common.organizer}</Text>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, marginBottom: 2,
                background: active ? C.navActiveBg : 'transparent',
                border: `1px solid ${active ? (isDark ? 'rgba(250,204,21,0.15)' : 'rgba(217,119,6,0.12)') : 'transparent'}`,
                color: active ? C.navItemActive : C.navItemColor,
                fontSize: 14, fontWeight: active ? 700 : 500,
                cursor: 'pointer', textAlign: 'right',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {item.label}
              {active && (
                <span style={{
                  marginRight: 'auto', width: 6, height: 6, borderRadius: '50%',
                  background: C.navItemActive, flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.divider}` }}>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 14px', borderRadius: 10,
            background: isDark ? 'rgba(239,68,68,0.07)' : '#fff5f5',
            border: isDark ? '1px solid rgba(239,68,68,0.12)' : '1px solid #fecaca',
            color: '#ef4444', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', textAlign: 'right', transition: 'all 0.15s',
          }}
        >
          <LogoutOutlined style={{ fontSize: 14 }} />
          {t.common.logout}
        </button>
      </div>
    </div>
  );

  return (
    <PortalThemeContext.Provider value={{ isDark }}>
      <ConfigProvider
        locale={arEG}
        direction={isRTL ? 'rtl' : 'ltr'}
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#d97706',
            borderRadius: 10,
            fontFamily: 'inherit',
          },
        }}
      >
      <Toaster position="top-center" richColors />

      <div style={{ minHeight: '100vh', background: C.contentBg, direction: isRTL ? 'rtl' : 'ltr', transition: 'background 0.3s' }}>

        {/* ══════════════════════════════════════
            DESKTOP: Sidebar ثابت على اليمين
        ══════════════════════════════════════ */}
        <div className="portal-sidebar-desktop" style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: SIDEBAR_W, zIndex: 200,
          display: 'none',
        }}>
          <SidebarContent />
        </div>

        {/* ══════════════════════════════════════
            MOBILE: Drawer (overlay)
        ══════════════════════════════════════ */}
        {open && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: C.overlayBg, backdropFilter: 'blur(2px)',
            }}
            onClick={() => setOpen(false)}
          />
        )}
        <div style={{
          position: 'fixed', top: 0, right: open ? 0 : -SIDEBAR_W, bottom: 0,
          width: SIDEBAR_W, zIndex: 310,
          transition: 'right 0.3s cubic-bezier(0.4,0,0.2,1)',
        }} className="portal-sidebar-mobile">
          <div style={{ position: 'relative', height: '100%' }}>
            <SidebarContent />
            <button
              onClick={() => setOpen(false)}
              style={{
                position: 'absolute', top: 16, left: 16,
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CloseOutlined />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════
            Main area — بعيداً عن الـ sidebar
        ══════════════════════════════════════ */}
        <div className="portal-main" style={{
          marginRight: 0,
          transition: 'margin 0.3s',
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
        }}>

          {/* ── Header ── */}
          <header style={{
            background: C.headerBg,
            borderBottom: `1px solid ${C.headerBorder}`,
            height: 60, display: 'flex', alignItems: 'center',
            padding: '0 20px', gap: 12,
            position: 'sticky', top: 0, zIndex: 100,
            transition: 'all 0.3s',
          }}>
            {/* Hamburger (mobile) */}
            <button
              className="portal-hamburger"
              onClick={() => setOpen(true)}
              style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: C.toggleBg, border: `1px solid ${C.toggleBorder}`,
                display: 'none', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.navItemColor, fontSize: 16,
                transition: 'all 0.2s',
              }}
            >
              <MenuOutlined />
            </button>

            {/* El7lm logo + portal label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image src="/el7lm-logo.png" alt="El7lm" width={24} height={24} style={{ objectFit: 'contain', opacity: isDark ? 0.6 : 0.7 }} />
              <Text style={{ color: C.textSec, fontSize: 12, fontWeight: 500, transition: 'color 0.3s' }}>
                {t.common.portal}
              </Text>
            </div>

            <div style={{ flex: 1 }} />

            {/* Theme toggle */}
            <Tooltip title={isDark ? t.common.lightMode : t.common.darkMode}>
              <button
                onClick={toggleTheme}
                style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: C.toggleBg, border: `1px solid ${C.toggleBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: C.toggleColor, fontSize: 15,
                  transition: 'all 0.25s',
                }}
              >
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </button>
            </Tooltip>

            <LanguageSwitcher />

            {/* Bell */}
            <Badge dot offset={[-3, 3]} color="#d97706">
              <button style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: C.toggleBg, border: `1px solid ${C.toggleBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: C.navItemColor, fontSize: 15,
                transition: 'all 0.25s',
              }}>
                <BellOutlined />
              </button>
            </Badge>

            {/* User */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomLeft" trigger={['click']}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                paddingRight: 12, borderRight: `1px solid ${C.divider}`,
                marginRight: 4, transition: 'border-color 0.3s',
              }}>
                {hasLogo ? (
                  <Avatar src={client.logo_url!} size={32} style={{ border: `1.5px solid ${C.sidebarBorder}` }} />
                ) : (
                  <Avatar size={32} style={{ background: 'linear-gradient(135deg, #d97706, #ea580c)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                    {initials}
                  </Avatar>
                )}
                <div className="portal-user-info">
                  <Text style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, display: 'block', lineHeight: 1.2, transition: 'color 0.3s' }}>
                    {client.name}
                  </Text>
                  {client.organization_name && (
                    <Text style={{ fontSize: 12, color: C.textSec, display: 'block', transition: 'color 0.3s' }}>
                      {client.organization_name}
                    </Text>
                  )}
                </div>
              </div>
            </Dropdown>
          </header>

          {/* ── Page content ── */}
          <main style={{ flex: 1, padding: 24, transition: 'background 0.3s' }}>
            {children}
          </main>
        </div>
      </div>

      {/* ── Global styles ── */}
      <style jsx global>{`

        /* ══════════════════════════════════════════════
           حجم الخط الأساسي لكل البوابة
        ══════════════════════════════════════════════ */
        .portal-main,
        .portal-main * {
          font-size: inherit;
        }
        .portal-main {
          font-size: 15px;
        }

        /* Ant Design — رفع الخطوط الأساسية */
        .portal-main .ant-typography,
        .portal-main .ant-table,
        .portal-main .ant-form,
        .portal-main .ant-select,
        .portal-main .ant-input,
        .portal-main .ant-btn,
        .portal-main .ant-tag,
        .portal-main .ant-collapse,
        .portal-main .ant-tabs {
          font-size: 14px !important;
        }
        .portal-main .ant-table-thead > tr > th {
          font-size: 13px !important;
        }
        .portal-main .ant-table-tbody > tr > td {
          font-size: 14px !important;
        }
        .portal-main .ant-btn {
          font-size: 14px !important;
          height: auto !important;
          min-height: 36px !important;
        }
        .portal-main .ant-btn-sm {
          font-size: 13px !important;
          min-height: 30px !important;
        }
        .portal-main .ant-btn-lg {
          font-size: 15px !important;
          min-height: 44px !important;
        }
        .portal-main .ant-form-item-label > label {
          font-size: 14px !important;
        }
        .portal-main .ant-select-selection-item,
        .portal-main .ant-select-selection-placeholder {
          font-size: 14px !important;
        }
        .portal-main .ant-input,
        .portal-main .ant-input-affix-wrapper {
          font-size: 14px !important;
        }
        .portal-main .ant-card-head-title {
          font-size: 15px !important;
          font-weight: 700 !important;
        }
        .portal-main .ant-tabs-tab {
          font-size: 14px !important;
        }
        .portal-main .ant-steps-item-title {
          font-size: 14px !important;
        }
        .portal-main .ant-tag {
          font-size: 13px !important;
        }
        .portal-main .ant-pagination {
          font-size: 14px !important;
        }
        .portal-main .ant-empty-description {
          font-size: 14px !important;
        }
        .portal-main .ant-collapse-header-text {
          font-size: 14px !important;
        }
        .portal-main .ant-alert-message {
          font-size: 14px !important;
        }
        .portal-main .ant-alert-description {
          font-size: 13px !important;
        }

        /* Responsive layout */
        @media (min-width: 1024px) {
          .portal-sidebar-desktop { display: block !important; }
          .portal-main { margin-right: ${SIDEBAR_W}px !important; }
          .portal-hamburger { display: none !important; }
          .portal-sidebar-mobile { display: none !important; }
          .portal-user-info { display: block; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .portal-sidebar-desktop { display: none !important; }
          .portal-main { margin-right: 0 !important; }
          .portal-hamburger { display: flex !important; }
          .portal-user-info { display: block; }
        }
        @media (max-width: 639px) {
          .portal-sidebar-desktop { display: none !important; }
          .portal-main { margin-right: 0 !important; }
          .portal-hamburger { display: flex !important; }
          .portal-user-info { display: none; }
          .portal-main { font-size: 14px; }
        }

        /* Ant Design dropdown */
        .ant-dropdown-menu {
          background: ${isDark ? '#1e293b' : '#fff'} !important;
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} !important;
          font-size: 14px !important;
        }
        .ant-dropdown-menu-item {
          color: ${C.textPrimary} !important;
          font-size: 14px !important;
        }
        .ant-dropdown-menu-item:hover {
          background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'} !important;
        }
      `}</style>
      </ConfigProvider>
    </PortalThemeContext.Provider>
  );
}
