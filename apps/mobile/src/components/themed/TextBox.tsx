import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

type TextVariant = 'heading' | 'subheading' | 'body' | 'caption' | 'label';
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';

interface ThemedTextBoxProps {
  children: string | string[];
  variant?: TextVariant;
  weight?: TextWeight;
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success';
  align?: 'left' | 'center' | 'right';
  style?: TextStyle;
}

export function ThemedTextBox({
  children,
  variant = 'body',
  weight = 'normal',
  color = 'primary',
  align = 'left',
  style,
}: ThemedTextBoxProps) {
  const { colors } = useTheme();

  const getTextColor = () => {
    const colorMap = {
      primary: colors.text,
      secondary: colors.textSecondary,
      tertiary: colors.textTertiary,
      error: colors.error,
      success: colors.success,
    };
    return colorMap[color];
  };

  const getFontSize = () => {
    const sizeMap: Record<TextVariant, number> = {
      heading: 24,
      subheading: 18,
      body: 14,
      caption: 12,
      label: 11,
    };
    return sizeMap[variant];
  };

  const getFontWeight = () => {
    const weightMap: Record<TextWeight, '400' | '500' | '600' | '700'> = {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    };
    return weightMap[weight];
  };

  return (
    <Text
      style={[
        styles.text,
        {
          color: getTextColor(),
          fontSize: getFontSize(),
          fontWeight: getFontWeight(),
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {},
});
