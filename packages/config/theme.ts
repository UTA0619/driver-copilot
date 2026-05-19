// All hardcoded colors in the app use these values — centralize here.
export const colors = {
  // Backgrounds
  bg: '#0f172a',
  bgCard: '#1e293b',
  bgCardSubtle: 'rgba(255,255,255,0.07)',
  bgCardBorder: '#334155',
  bgHighlight: '#172554',
  bgError: '#450a0a',
  bgSuccess: '#052e16',
  bgWarning: '#1c1000',
  bgOverlay: 'rgba(255,255,255,0.08)',

  // Text
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDim: '#475569',
  textFaint: '#334155',

  // Brand
  blue: '#3b82f6',
  blueDeep: '#172554',

  // Semantic
  accept: '#22c55e',
  decline: '#ef4444',
  conditional: '#f59e0b',

  // Platforms
  uberEats: '#16a34a',
  doordash: '#dc2626',
  grubhub: '#ea580c',
  instacart: '#22c55e',

  // Border
  border: '#334155',
  borderSubtle: 'rgba(255,255,255,0.07)',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 20, xl: 28, xxl: 40,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, full: 9999,
} as const;

export const fontSize = {
  xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32,
} as const;

export type Colors = typeof colors;
