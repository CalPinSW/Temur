import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { formatUsername } from '@temur/shared';

interface UsernameInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  editable?: boolean;
}

export function UsernameInput({
  value,
  onChangeText,
  error,
  label = 'Username',
  required = false,
  editable = true,
}: UsernameInputProps) {
  const { colors } = useTheme();

  const handleChange = (text: string) => {
    onChangeText(formatUsername(text));
  };

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
          error && { borderColor: colors.error, backgroundColor: colors.errorBackground },
          !editable && { backgroundColor: colors.inputDisabled, color: colors.textSecondary },
        ]}
        value={value}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
        placeholder="e.g. the_batman"
        placeholderTextColor={colors.inputPlaceholder}
        editable={editable}
        autoComplete="username"
      />
      {error ? (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      ) : (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Used by friends to find you
        </Text>
      )}
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
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
});
