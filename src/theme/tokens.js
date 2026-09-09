/**
 * AGENTVERSE Centralized Theme Tokens & Color System
 *
 * Strict palette guidelines:
 * - Neutral canvas and surfaces for scannability
 * - Deep emerald green (#176B52) for primary actions, active navigation, and key accents
 * - Soft mint green (#E3F2EC) for active states, tags, and highlights
 * - Vibrant green (#2FA87A) for interactive highlights and charts
 * - Semantic alerts: #3E9B68 (Success), #D69A3A (Warning), #D76565 (Error)
 */

export const THEME_COLORS = {
  // Background & Surfaces
  background: '#F4F7F5',
  surface: '#FFFFFF',
  surfaceSubtle: '#EEF3F0',
  muted: '#EEF3F0',

  // Primary Emerald Greens
  primary: '#176B52',
  primaryHover: '#125641',
  primarySoft: '#E3F2EC',
  primarySoftHover: '#D4EBE1',

  // Accent Green
  accent: '#2FA87A',

  // Typography
  text: '#18221E',
  textSecondary: '#66736C',
  textMuted: '#8A958F',

  // Borders & Dividers
  border: '#DDE6E1',
  borderLight: '#EDF2EF',

  // Semantic Status Colors
  success: '#3E9B68',
  successSoft: '#E7F6EE',
  warning: '#D69A3A',
  warningSoft: '#FCF5E8',
  error: '#D76565',
  errorSoft: '#FDF2F2',

  // Interactive Hover Tokens
  cardHover: '#F4F8F6',
  chipHover: '#D4EBE1',
};

// Cohesive professional chart palette
export const CHART_PALETTE = {
  primary: '#176B52',
  secondary: '#2FA87A',
  light: '#72B89D',
  veryLight: '#B9DCCE',
  success: '#3E9B68',
  warning: '#D69A3A',
  negative: '#D76565',
};

// Recharts series array in prioritized order
export const CHART_COLORS_SERIES = [
  '#176B52', // Primary Dark Emerald
  '#2FA87A', // Accent Green
  '#72B89D', // Soft Mint / Sage
  '#B9DCCE', // Pale Mint
  '#3E9B68', // Success Green
  '#D69A3A', // Amber Warning
  '#D76565', // Red Negative
];

export default THEME_COLORS;
