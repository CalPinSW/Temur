import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface DisplayNameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  required?: boolean;
}

export function DisplayNameInput({
  value,
  onChangeText,
  label = 'Display Name',
  required = false,
}: DisplayNameInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label}
        {required && ' *'}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.input,
            borderColor: colors.inputBorder,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder="e.g. Bruce Wayne"
        placeholderTextColor={colors.inputPlaceholder}
        autoComplete="name"
      />
      <Text style={[styles.hint, { color: colors.textTertiary }]}>How friends see you</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});
