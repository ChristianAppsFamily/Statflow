export type ThemeColors = {
  background: string;
  card: string;
  cardBorder: string;
  navy: string;
  gold: string;
  green: string;
  red: string;
  textPrimary: string;
  textSecondary: string;
  goldFaded: string;
  greenFaded: string;
  redFaded: string;
  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  inputBg: string;
  inputBorder: string;
  switchTrackOn: string;
  switchTrackOff: string;
};

export const DarkColors: ThemeColors = {
  background: '#0B1220',
  card: '#121C2E',
  cardBorder: '#1A2742',
  navy: '#0A1F44',

  gold: '#D4AF37',
  green: '#2ECC71',
  red: '#ef4444',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',

  goldFaded: 'rgba(212, 175, 55, 0.15)',
  greenFaded: 'rgba(46, 204, 113, 0.15)',
  redFaded: 'rgba(239, 68, 68, 0.15)',

  tabBarBg: '#0A1220',
  tabBarBorder: '#1A2742',
  tabActive: '#D4AF37',
  tabInactive: '#A0AEC0',

  inputBg: '#0B1220',
  inputBorder: '#1A2742',

  switchTrackOn: '#D4AF37',
  switchTrackOff: '#1A2742',
};

export const LightColors: ThemeColors = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  cardBorder: '#E2E8F0',
  navy: '#0A1F44',

  gold: '#D4AF37',
  green: '#2ECC71',
  red: '#ef4444',

  textPrimary: '#0B1220',
  textSecondary: '#64748B',

  goldFaded: 'rgba(212, 175, 55, 0.12)',
  greenFaded: 'rgba(46, 204, 113, 0.12)',
  redFaded: 'rgba(239, 68, 68, 0.12)',

  tabBarBg: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#D4AF37',
  tabInactive: '#64748B',

  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',

  switchTrackOn: '#D4AF37',
  switchTrackOff: '#CBD5E1',
};

/** Non-reactive dark fallback for early boot / non-hook contexts. */
export const Colors = DarkColors;

export default {
  light: {
    text: LightColors.textPrimary,
    background: LightColors.background,
    tint: LightColors.gold,
    tabIconDefault: LightColors.tabInactive,
    tabIconSelected: LightColors.tabActive,
  },
  dark: {
    text: DarkColors.textPrimary,
    background: DarkColors.background,
    tint: DarkColors.gold,
    tabIconDefault: DarkColors.tabInactive,
    tabIconSelected: DarkColors.tabActive,
  },
};
