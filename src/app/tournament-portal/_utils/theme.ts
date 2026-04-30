/**
 * Portal Theme Utility
 * ألوان مشتركة لكل صفحات البوابة — استخدم usePortalColors() في كل صفحة
 */
import { usePortalTheme } from '../_components/PortalShell';

export interface PortalColors {
  // Backgrounds
  bg:         string;  // card/section background
  bgSoft:     string;  // subtle background
  bgPage:     string;  // page background
  // Borders
  border:     string;
  borderDash: string;
  // Text
  text:       string;  // primary text
  textSec:    string;  // secondary text
  textMuted:  string;  // muted text
  // Status colors (always same, just backgrounds differ)
  successBg:  string;
  successText:string;
  warningBg:  string;
  warningText:string;
  errorBg:    string;
  errorText:  string;
  infoBg:     string;
  infoText:   string;
  // Input
  inputBg:    string;
  inputBorder:string;
  // Table
  tableHdr:   string;
  tableRow:   string;
  tableHover: string;
  // Divider
  divider:    string;
}

export function usePortalColors(): PortalColors & { isDark: boolean } {
  const { isDark } = usePortalTheme();

  const c: PortalColors = isDark ? {
    bg:         '#1e293b',
    bgSoft:     '#0f172a',
    bgPage:     '#070e1c',
    border:     'rgba(255,255,255,0.08)',
    borderDash: 'rgba(255,255,255,0.14)',
    text:       '#e2e8f0',
    textSec:    '#64748b',
    textMuted:  '#475569',
    successBg:  'rgba(22,163,74,0.12)',
    successText:'#4ade80',
    warningBg:  'rgba(217,119,6,0.12)',
    warningText:'#fbbf24',
    errorBg:    'rgba(239,68,68,0.12)',
    errorText:  '#f87171',
    infoBg:     'rgba(99,102,241,0.12)',
    infoText:   '#a5b4fc',
    inputBg:    'rgba(255,255,255,0.06)',
    inputBorder:'rgba(255,255,255,0.12)',
    tableHdr:   '#0f172a',
    tableRow:   '#1e293b',
    tableHover: 'rgba(255,255,255,0.04)',
    divider:    'rgba(255,255,255,0.07)',
  } : {
    bg:         '#ffffff',
    bgSoft:     '#f8fafc',
    bgPage:     '#f1f5f9',
    border:     '#e2e8f0',
    borderDash: '#d1d5db',
    text:       '#0f172a',
    textSec:    '#6b7280',
    textMuted:  '#94a3b8',
    successBg:  '#dcfce7',
    successText:'#16a34a',
    warningBg:  '#fef3c7',
    warningText:'#d97706',
    errorBg:    '#fee2e2',
    errorText:  '#dc2626',
    infoBg:     '#eef2ff',
    infoText:   '#4f46e5',
    inputBg:    '#f8fafc',
    inputBorder:'#e2e8f0',
    tableHdr:   '#f9fafb',
    tableRow:   '#ffffff',
    tableHover: '#f8fafc',
    divider:    '#e5e7eb',
  };

  return { ...c, isDark };
}
