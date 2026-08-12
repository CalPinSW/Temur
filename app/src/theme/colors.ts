export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F9F9F9',
    backgroundTertiary: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceSecondary: '#F9F9F9',

    text: '#1A1A1A',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',

    primary: '#4F46E5',
    primaryHover: '#4338CA',

    border: '#DDDDDD',
    borderLight: '#E0E0E0',

    error: '#EF4444',
    errorBackground: '#FEF2F2',

    success: '#10B981',

    divider: '#E0E0E0',

    card: '#FFFFFF',
    cardBorder: '#DDDDDD',

    input: '#F9F9F9',
    inputBorder: '#DDDDDD',
    inputDisabled: '#EEEEEE',
    inputPlaceholder: '#999999',

    shadow: 'rgba(0, 0, 0, 0.3)',
  },
  dark: {
    background: '#000000',
    backgroundSecondary: '#1A1A1A',
    backgroundTertiary: '#2A2A2A',
    surface: '#1A1A1A',
    surfaceSecondary: '#2A2A2A',

    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textTertiary: '#808080',
    textInverse: '#000000',

    primary: '#6366F1',
    primaryHover: '#818CF8',

    border: '#3A3A3A',
    borderLight: '#2A2A2A',

    error: '#F87171',
    errorBackground: '#3A1A1A',

    success: '#34D399',

    divider: '#3A3A3A',

    card: '#1A1A1A',
    cardBorder: '#3A3A3A',

    input: '#2A2A2A',
    inputBorder: '#3A3A3A',
    inputDisabled: '#6a6969b3',
    inputPlaceholder: '#8e8787ff',

    shadow: 'rgba(0, 0, 0, 0.5)',
  },
};

export type ThemeColors = typeof Colors.light;
