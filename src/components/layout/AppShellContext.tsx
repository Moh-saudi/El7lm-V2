'use client';

/**
 * AppShellContext — Single unified layout context.
 * Replaces: LayoutContext, SidebarProvider, SidebarContext, MobileSidebarManager.
 *
 * Persists collapse state to localStorage.
 * Uses matchMedia (not react-responsive) for zero-cost breakpoint detection.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AppShellContextType {
  /** Is the sidebar in icon-only collapsed mode (desktop) */
  isCollapsed: boolean;
  /** Is the mobile drawer open */
  isMobileOpen: boolean;
  /** Current viewport category */
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Actions */
  toggleCollapse: () => void;
  setCollapsed: (v: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AppShellContext = createContext<AppShellContextType | undefined>(undefined);

export function useAppShell(): AppShellContextType {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell must be used inside <AppShellProvider>');
  return ctx;
}

// ─── Breakpoints (matches Tailwind defaults) ──────────────────────────────────

const MQ_MOBILE  = '(max-width: 767px)';
const MQ_TABLET  = '(min-width: 768px) and (max-width: 1023px)';
const MQ_DESKTOP = '(min-width: 1024px)';

function getBreakpoint() {
  if (typeof window === 'undefined') return { isMobile: false, isTablet: false, isDesktop: true };
  return {
    isMobile:  window.matchMedia(MQ_MOBILE).matches,
    isTablet:  window.matchMedia(MQ_TABLET).matches,
    isDesktop: window.matchMedia(MQ_DESKTOP).matches,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AppShellProviderProps {
  children: ReactNode;
  /** Initial collapsed state (overridden by localStorage after mount) */
  defaultCollapsed?: boolean;
}

export function AppShellProvider({ children, defaultCollapsed = false }: AppShellProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [breakpoint, setBreakpoint] = useState(getBreakpoint);
  const initialized = useRef(false);

  // ── Restore collapsed state from localStorage (once, client-side) ──
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const saved = localStorage.getItem('el7lm-sidebar-collapsed');
      if (saved !== null) setIsCollapsed(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // ── Persist collapsed state ──
  useEffect(() => {
    try {
      localStorage.setItem('el7lm-sidebar-collapsed', JSON.stringify(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  // ── Swipe gesture to open/close sidebar on mobile ──
  useEffect(() => {
    const EDGE_THRESHOLD = 30;   // px from edge to start swipe detection
    const MIN_SWIPE = 50;        // minimum px moved to trigger open/close

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      // RTL: sidebar is on the right — detect swipe from right edge
      const fromRightEdge = window.innerWidth - touch.clientX < EDGE_THRESHOLD;
      tracking = fromRightEdge || isMobileOpen;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Ignore vertical scrolls
      if (Math.abs(dy) > Math.abs(dx)) { tracking = false; return; }

      if (!isMobileOpen && dx < -MIN_SWIPE) {
        // Swipe left → open (RTL: reveals right sidebar)
        setIsMobileOpen(true);
      } else if (isMobileOpen && dx > MIN_SWIPE) {
        // Swipe right → close
        setIsMobileOpen(false);
      }
      tracking = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobileOpen]);

  // ── Breakpoint listeners — fire only on boundary crossings ──
  useEffect(() => {
    const queries = [
      { mq: window.matchMedia(MQ_MOBILE),  key: 'isMobile'  },
      { mq: window.matchMedia(MQ_TABLET),  key: 'isTablet'  },
      { mq: window.matchMedia(MQ_DESKTOP), key: 'isDesktop' },
    ] as const;

    const handlers = queries.map(({ mq, key }) => {
      const handler = (e: MediaQueryListEvent) => {
        setBreakpoint(prev => ({ ...prev, [key]: e.matches }));
        // Auto-close mobile drawer on resize to desktop
        if (key === 'isDesktop' && e.matches) {
          setIsMobileOpen(false);
        }
      };
      mq.addEventListener('change', handler);
      return { mq, handler };
    });

    return () => handlers.forEach(({ mq, handler }) => mq.removeEventListener('change', handler));
  }, []);

  // ── Actions ──
  const toggleCollapse  = useCallback(() => setIsCollapsed(v => !v), []);
  const setCollapsed    = useCallback((v: boolean) => setIsCollapsed(v), []);
  const openMobile      = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile     = useCallback(() => setIsMobileOpen(false), []);
  const toggleMobile    = useCallback(() => setIsMobileOpen(v => !v), []);

  const value: AppShellContextType = {
    isCollapsed,
    isMobileOpen,
    ...breakpoint,
    toggleCollapse,
    setCollapsed,
    openMobile,
    closeMobile,
    toggleMobile,
  };

  return (
    <AppShellContext.Provider value={value}>
      {children}
    </AppShellContext.Provider>
  );
}
