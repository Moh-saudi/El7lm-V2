export const OPPORTUNITY_TYPES = {
  trial:    { label: 'معايشة',        labelEn: 'Trial Stay',       emoji: '🏕️', color: '#00DC6C' },
  tryout:   { label: 'جلسة اختبار',   labelEn: 'Tryout Session',   emoji: '🧪', color: '#00C4EE' },
  training: { label: 'برنامج تدريبي', labelEn: 'Training Program', emoji: '🎓', color: '#9870E4' },
  loan:     { label: 'إعارة مؤقتة',   labelEn: 'Temporary Loan',   emoji: '📋', color: '#F0C438' },
  job:      { label: 'وظيفة رياضية',  labelEn: 'Sports Job',       emoji: '💼', color: '#EE6432' },
  camp:     { label: 'معسكر تدريبي',  labelEn: 'Training Camp',    emoji: '⛺', color: '#E85888' },
  scout:    { label: 'كشف مواهب',     labelEn: 'Talent Scout',     emoji: '🔍', color: '#3B82F6' },
  intl:     { label: 'فرصة دولية',    labelEn: 'International',    emoji: '🌍', color: '#9870E4' },
} as const;

export const FOOTBALL_POSITIONS = ['GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

export const PUBLISHER_TYPES: string[] = ['club', 'academy', 'agent', 'trainer', 'marketer'];
