export const Colors = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#FAF8F3',
    backgroundTertiary: '#F1EEE6',
    surface: '#FFFFFF',
    surfaceSecondary: '#FAF8F3',

    text: '#12231C',
    textSecondary: '#586158',
    textTertiary: '#8A9089',
    textInverse: '#FFFFFF',

    primary: '#146B45',
    primaryHover: '#0F5636',
    accent: '#D89B2A',

    border: '#DED7C7',
    borderLight: '#E8E2D5',

    error: '#C93B3B',
    errorBackground: '#FBF0F0',

    success: '#0C7A8F',

    divider: '#E8E2D5',

    card: '#FFFFFF',
    cardBorder: '#DED7C7',

    input: '#FAF8F3',
    inputBorder: '#DED7C7',
    inputDisabled: '#EEEAE0',
    inputPlaceholder: '#8A9089',

    shadow: 'rgba(0, 0, 0, 0.15)',
  },
  dark: {
    background: '#0A1310',
    backgroundSecondary: '#141F1A',
    backgroundTertiary: '#1E2B24',
    surface: '#141F1A',
    surfaceSecondary: '#1E2B24',

    text: '#F5F3EE',
    textSecondary: '#A9B3AD',
    textTertiary: '#7C8880',
    textInverse: '#0A1310',

    primary: '#34A873',
    primaryHover: '#4FBE8D',
    accent: '#F0B93D',

    border: '#2A3830',
    borderLight: '#1E2B24',

    error: '#FA8072',
    errorBackground: '#2A1512',

    success: '#1EC8C8',

    divider: '#2A3830',

    card: '#141F1A',
    cardBorder: '#2A3830',

    input: '#1E2B24',
    inputBorder: '#2A3830',
    inputDisabled: 'rgba(169, 179, 173, 0.25)',
    inputPlaceholder: '#7C8880',

    shadow: 'rgba(0, 0, 0, 0.4)',
  },
};

export type ThemeColors = typeof Colors.light;
