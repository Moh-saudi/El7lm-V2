'use client';

/**
 * Sports UI — مكونات التصميم الرياضي المشترك
 * مستوحى من 360score / FilGoal / Sofascore
 */

import { theme } from 'antd';

const { useToken } = theme;

// ─────────────────────────────────────────────────────────────
// Hook: useSports — ألوان وأدوات التصميم الرياضي
// ─────────────────────────────────────────────────────────────
export function useSports() {
  const { token } = useToken();

  // Detect dark mode from Ant Design token
  const isDark = parseFloat(token.colorBgContainer.replace(/[^0-9.]/g, '')) < 50
    || token.colorBgContainer === '#141414'
    || token.colorBgContainer === '#1f1f1f';

  const colors = {
    // Surfaces
    bg:        isDark ? '#0d1117' : '#f4f6f9',
    surface:   isDark ? '#161b27' : '#ffffff',
    surface2:  isDark ? '#1c2333' : '#f8fafc',
    surface3:  isDark ? '#232d42' : '#f1f5f9',
    // Borders
    border:    isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
    border2:   isDark ? 'rgba(255,255,255,0.04)' : '#f0f0f0',
    // Text
    text:      isDark ? '#e2e8f0' : '#0f172a',
    textSec:   isDark ? '#64748b' : '#64748b',
    textMuted: isDark ? '#374151' : '#cbd5e1',
    // Sport-specific
    win:       '#16a34a',
    winBg:     isDark ? 'rgba(22,163,74,0.12)' : '#dcfce7',
    draw:      '#d97706',
    drawBg:    isDark ? 'rgba(217,119,6,0.12)' : '#fef3c7',
    loss:      '#dc2626',
    lossBg:    isDark ? 'rgba(220,38,38,0.12)' : '#fee2e2',
    live:      '#ef4444',
    // Rounds
    final:     '#f59e0b',
    semi:      '#8b5cf6',
    quarter:   '#3b82f6',
    r16:       '#06b6d4',
    // Primary
    primary:   token.colorPrimary,
  };

  return { colors, isDark, token };
}

// ─────────────────────────────────────────────────────────────
// SportsPageHeader — عنوان الصفحة مع إحصائيات سريعة
// ─────────────────────────────────────────────────────────────
export function SportsPageHeader({
  title, subtitle, stats = [], actions,
}: {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: string | number; color?: string }[];
  actions?: React.ReactNode;
}) {
  const { colors } = useSports();

  return (
    <div style={{
      background: colors.surface, border: `1px solid ${colors.border}`,
      borderRadius: 16, padding: '16px 22px',
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: colors.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: colors.textSec, marginTop: 2 }}>{subtitle}</div>}
      </div>

      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, color: s.color || colors.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: colors.textSec, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {actions && <div>{actions}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SportCard — بطاقة رياضية أساسية
// ─────────────────────────────────────────────────────────────
export function SportCard({
  children, style, noPadding = false,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  noPadding?: boolean;
}) {
  const { colors } = useSports();

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      overflow: 'hidden',
      padding: noPadding ? 0 : '16px 20px',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SectionHeader — رأس قسم مثل 360score
// ─────────────────────────────────────────────────────────────
export function SectionHeader({
  title, count, color, icon, right,
}: {
  title: string;
  count?: number;
  color?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { colors } = useSports();
  const c = color || colors.primary;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: colors.surface3, borderBottom: `1px solid ${colors.border}` }}>
      {icon && <span style={{ color: c, fontSize: 14 }}>{icon}</span>}
      <span style={{ fontSize: 13, fontWeight: 800, color: c, flex: 1 }}>{title}</span>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: colors.textSec, background: colors.surface2, padding: '2px 8px', borderRadius: 10 }}>
          {count}
        </span>
      )}
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TeamBadge — شعار الفريق + الاسم
// ─────────────────────────────────────────────────────────────
export function TeamBadge({
  name, logo, size = 32, direction = 'row', bold = false, muted = false,
}: {
  name: string;
  logo?: string | null;
  size?: number;
  direction?: 'row' | 'col';
  bold?: boolean;
  muted?: boolean;
}) {
  const { colors } = useSports();

  return (
    <div style={{
      display: 'flex',
      flexDirection: direction === 'col' ? 'column' : 'row',
      alignItems: 'center',
      gap: direction === 'col' ? 6 : 8,
    }}>
      <TeamLogo name={name} logo={logo} size={size} />
      <span style={{
        fontSize: direction === 'col' ? 11 : 13,
        fontWeight: bold ? 700 : 600,
        color: muted ? colors.textSec : colors.text,
        textAlign: direction === 'col' ? 'center' : 'inherit',
        maxWidth: direction === 'col' ? 72 : undefined,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: direction === 'col' ? 'normal' : 'nowrap',
      }}>
        {name}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TeamLogo — شعار فريق مع fallback
// ─────────────────────────────────────────────────────────────
export function TeamLogo({ name, logo, size = 32 }: { name: string; logo?: string | null; size?: number }) {
  if (logo) return (
    <img src={logo} alt={name}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), objectFit: 'cover', flexShrink: 0 }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.25), flexShrink: 0,
      background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.38),
      letterSpacing: -0.5,
    }}>
      {name?.charAt(0) || '?'}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// StatPill — إحصائية مضغوطة (فاز/تعادل/خسر...)
// ─────────────────────────────────────────────────────────────
export function StatPill({ value, type }: { value: number; type: 'W' | 'D' | 'L' | 'pts' | 'num' }) {
  const { colors } = useSports();

  const cfg = {
    W:   { bg: colors.winBg,  text: colors.win,  label: 'و' },
    D:   { bg: colors.drawBg, text: colors.draw, label: 'ت' },
    L:   { bg: colors.lossBg, text: colors.loss, label: 'خ' },
    pts: { bg: 'transparent',  text: colors.text, label: '' },
    num: { bg: 'transparent',  text: colors.textSec, label: '' },
  }[type];

  return (
    <div style={{
      minWidth: 28, height: 24, borderRadius: 6, padding: '0 6px',
      background: cfg.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: type === 'pts' ? 14 : 12, fontWeight: type === 'pts' ? 900 : 700, color: cfg.text,
    }}>
      {value}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FormBadge — سلسلة نتائج (و/ت/خ) مثل FilGoal
// ─────────────────────────────────────────────────────────────
export function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  const { colors } = useSports();

  const cfg = {
    W: { bg: colors.win,  label: 'و' },
    D: { bg: colors.draw, label: 'ت' },
    L: { bg: colors.loss, label: 'خ' },
  }[result];

  return (
    <div style={{
      width: 20, height: 20, borderRadius: 5,
      background: cfg.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 800,
    }}>
      {cfg.label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LiveBadge — شارة المباشر
// ─────────────────────────────────────────────────────────────
export function LiveBadge() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#ef4444', borderRadius: 6, padding: '3px 8px' }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: '#fff',
        boxShadow: '0 0 0 2px rgba(255,255,255,0.3)',
        animation: 'livePulse 1.2s ease-in-out infinite',
      }} />
      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>مباشر</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SportsButton — زر رياضي
// ─────────────────────────────────────────────────────────────
export function SportsButton({
  children, onClick, variant = 'primary', size = 'md', icon, disabled, loading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors, token } = useSports();

  const variantStyle = {
    primary:   { bg: token.colorPrimary,  text: '#fff',         border: 'none' },
    secondary: { bg: colors.surface3,     text: colors.text,    border: `1px solid ${colors.border}` },
    ghost:     { bg: 'transparent',       text: colors.textSec, border: `1px solid ${colors.border}` },
    danger:    { bg: '#ef4444',            text: '#fff',         border: 'none' },
    success:   { bg: '#16a34a',            text: '#fff',         border: 'none' },
  }[variant];

  const sizeStyle = {
    sm: { padding: '5px 12px', fontSize: 12, borderRadius: 8 },
    md: { padding: '8px 18px', fontSize: 13, borderRadius: 10 },
    lg: { padding: '11px 24px', fontSize: 14, borderRadius: 12 },
  }[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontWeight: 700, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1, transition: 'all 0.15s',
        ...variantStyle, ...sizeStyle,
      }}
    >
      {loading ? <span style={{ fontSize: 12 }}>...</span> : icon}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// RoundBadge — شارة الجولة
// ─────────────────────────────────────────────────────────────
export function RoundBadge({ round }: { round: string }) {
  const colorMap: Record<string, string> = {
    F: '#f59e0b', SF: '#8b5cf6', QF: '#3b82f6',
    '3rd': '#f97316', R16: '#06b6d4', R32: '#10b981',
  };
  const labelMap: Record<string, string> = {
    league: 'الدوري', group_stage: 'المجموعات',
    R128: 'دور الـ128', R64: 'دور الـ64', R32: 'دور الـ32', R16: 'دور الـ16',
    QF: 'ربع النهائي', SF: 'نصف النهائي', F: 'النهائي', '3rd': 'المركز الثالث',
  };

  const color = colorMap[round] || '#64748b';
  const label = labelMap[round] || round;

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: `${color}18`, border: `1px solid ${color}30`,
      padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// ScoreBox — صندوق النتيجة
// ─────────────────────────────────────────────────────────────
export function ScoreBox({
  home, away, size = 'md', dark = true,
}: {
  home: number;
  away: number;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
}) {
  const { colors } = useSports();

  const s = { sm: { fontSize: 14, padding: '3px 10px', radius: 8 }, md: { fontSize: 20, padding: '6px 16px', radius: 10 }, lg: { fontSize: 28, padding: '10px 24px', radius: 14 } }[size];

  return (
    <div style={{
      background: dark ? (colors.surface === '#ffffff' ? '#0f172a' : '#0d1117') : colors.surface3,
      borderRadius: s.radius, padding: s.padding, display: 'inline-block',
    }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: s.fontSize, color: '#fff', letterSpacing: 3 }}>
        {home} - {away}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CategoryTabs — تبويبات الفئات
// ─────────────────────────────────────────────────────────────
export function CategoryTabs({
  categories, selected, onChange,
}: {
  categories: { id: string; name: string }[];
  selected: string;
  onChange: (id: string) => void;
}) {
  const { colors, token } = useSports();

  if (categories.length <= 1) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {categories.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)} style={{
          padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: selected === c.id ? token.colorPrimary : 'transparent',
          color: selected === c.id ? '#fff' : colors.textSec,
          border: `1.5px solid ${selected === c.id ? token.colorPrimary : colors.border}`,
          transition: 'all 0.15s',
        }}>
          {c.name}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Global sports styles (inject once)
// ─────────────────────────────────────────────────────────────
export const SPORTS_GLOBAL_CSS = `
  @keyframes livePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
