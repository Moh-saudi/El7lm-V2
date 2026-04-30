'use client';

import { usePathname, useRouter } from 'next/navigation';
import { usePortalTheme } from '../../_components/PortalShell';

const NAV_ITEMS = [
  { href: 'overview',      emoji: '🏠', label: 'الرئيسية'  },
  { href: 'setup',         emoji: '⚙️', label: 'الإعداد'   },
  { href: 'registrations', emoji: '👥', label: 'الفرق'     },
  { href: 'draw',          emoji: '🎲', label: 'القرعة'    },
  { href: 'schedule',      emoji: '📅', label: 'الجدول'    },
  { href: 'matches',       emoji: '⚽', label: 'النتائج'   },
  { href: 'groups',        emoji: '📊', label: 'الترتيب'   },
  { href: 'bracket',       emoji: '🏆', label: 'الكأس'     },
  { href: 'stats',         emoji: '📈', label: 'الإحصاء'  },
  { href: 'notifications', emoji: '🔔', label: 'الإشعارات' },
  { href: 'analytics',     emoji: '📉', label: 'التحليلات' },
  { href: 'certificates',  emoji: '🎖️', label: 'الشهادات'  },
  { href: 'gallery',       emoji: '🖼️', label: 'المعرض'    },
];

export function TournamentNav({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const base     = `/tournament-portal/${tournamentId}`;
  const { isDark } = usePortalTheme();

  const bg       = isDark ? '#0f172a'                  : '#ffffff';
  const border   = isDark ? 'rgba(255,255,255,0.07)'   : '#e2e8f0';
  const clr      = isDark ? '#64748b'                  : '#94a3b8';
  const active   = isDark ? '#facc15'                  : '#d97706';
  const activeBg = isDark ? 'rgba(250,204,21,0.08)'    : 'rgba(217,119,6,0.06)';

  return (
    <>
      <style>{`
        .portal-subnav::-webkit-scrollbar { display: none; }
        .portal-nav-btn { -webkit-tap-highlight-color: transparent; }
        @media (max-width: 639px) {
          .portal-nav-label { display: none; }
          .portal-nav-btn   { padding: 10px 12px !important; gap: 0 !important; }
          .portal-nav-emoji { font-size: 18px !important; }
        }
        @media (min-width: 640px) and (max-width: 900px) {
          .portal-nav-btn { padding: 10px 12px !important; }
          .portal-nav-label { font-size: 13px !important; }
        }
      `}</style>

      <div
        className="portal-subnav"
        style={{
          background: bg,
          borderBottom: `1px solid ${border}`,
          position: 'sticky', top: 60, zIndex: 50,
          overflowX: 'auto', scrollbarWidth: 'none',
          direction: 'rtl', transition: 'background 0.3s',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ display: 'flex', padding: '0 4px', minWidth: 'max-content' }}>
          {NAV_ITEMS.map((item) => {
            const href     = `${base}/${item.href}`;
            const isActive = pathname === href;

            return (
              <button
                key={item.href}
                onClick={() => router.push(href)}
                className="portal-nav-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '11px 16px', fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? active : clr,
                  background: isActive ? activeBg : 'transparent',
                  border: 'none',
                  borderBottom: `2.5px solid ${isActive ? active : 'transparent'}`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s', marginBottom: -1, flexShrink: 0,
                }}
              >
                <span className="portal-nav-emoji" style={{ fontSize: 15 }}>{item.emoji}</span>
                <span className="portal-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
