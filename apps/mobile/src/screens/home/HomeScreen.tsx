import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ThemedButton,
  ThemedTextBox,
  ThemedInput,
  ThemedToggle,
  ThemedCard,
  ThemedBadge,
  ThemedDivider,
} from '@/components/themed';

interface HomeScreenProps {
  screen: string;
  onSelectTab1?: () => void;
  onSelectTab2?: () => void;
}

export function HomeScreen({ screen, onSelectTab1, onSelectTab2 }: HomeScreenProps) {
  const { colors, theme, themeMode, setThemeMode } = useTheme();
  const [toggleValue, setToggleValue] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const renderThemeShowcase = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Theme Mode Selector */}
      <ThemedCard title="Theme Settings" variant="outlined">
        <View style={styles.themeModeContainer}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <ThemedButton
              key={mode}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              variant={themeMode === mode ? 'primary' : 'secondary'}
              size="small"
              onPress={() => setThemeMode(mode)}
              style={styles.themeModeButton}
            />
          ))}
        </View>
        <ThemedTextBox variant="caption" color="secondary" align="center">
          Current theme: {theme}
        </ThemedTextBox>
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Typography Themeds */}
      <ThemedCard title="Typography" variant="elevated">
        <View style={styles.typographyContainer}>
          <ThemedTextBox variant="heading" weight="bold">
            Heading Text
          </ThemedTextBox>
          <ThemedTextBox variant="subheading" weight="semibold">
            Subheading Text
          </ThemedTextBox>
          <ThemedTextBox variant="body">
            Body text for regular content and descriptions.
          </ThemedTextBox>
          <ThemedTextBox variant="caption" color="secondary">
            Caption text for secondary information
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="error">
            Error colored text
          </ThemedTextBox>
          <ThemedTextBox variant="body" color="success">
            Success colored text
          </ThemedTextBox>
        </View>
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Button Themeds */}
      <ThemedCard title="Buttons" variant="elevated">
        <View style={styles.buttonRow}>
          <ThemedButton title="Primary" variant="primary" />
          <ThemedButton title="Secondary" variant="secondary" />
        </View>
        <View style={styles.buttonRow}>
          <ThemedButton title="Outline" variant="outline" />
          <ThemedButton title="Ghost" variant="ghost" />
        </View>
        <ThemedDivider label="Sizes" />
        <View style={styles.buttonRow}>
          <ThemedButton title="Small" size="small" />
          <ThemedButton title="Medium" size="medium" />
          <ThemedButton title="Large" size="large" />
        </View>
        <ThemedDivider label="States" />
        <View style={styles.buttonRow}>
          <ThemedButton title="Disabled" disabled />
          <ThemedButton title="Loading" loading />
        </View>
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Input Themeds */}
      <ThemedCard title="Inputs" variant="elevated">
        <ThemedInput
          label="Default Input"
          placeholder="Enter text..."
          value={inputValue}
          onChangeText={setInputValue}
        />
        <View style={styles.inputSpacer} />
        <ThemedInput
          label="With Hint"
          placeholder="Enter email..."
          hint="We'll never share your email"
        />
        <View style={styles.inputSpacer} />
        <ThemedInput
          label="With Error"
          placeholder="Enter password..."
          error="Password must be at least 8 characters"
        />
        <View style={styles.inputSpacer} />
        <ThemedInput label="Disabled" placeholder="Cannot edit..." disabled />
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Toggle Themeds */}
      <ThemedCard title="Toggles" variant="elevated">
        <ThemedToggle
          label="Enable notifications"
          value={toggleValue}
          onValueChange={setToggleValue}
        />
        <View style={styles.toggleSpacer} />
        <ThemedToggle label="Disabled toggle" value={true} onValueChange={() => {}} disabled />
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Badge Themeds */}
      <ThemedCard title="Badges" variant="elevated">
        <View style={styles.badgeContainer}>
          <ThemedBadge text="Default" variant="default" />
          <ThemedBadge text="Success" variant="success" />
          <ThemedBadge text="Error" variant="error" />
          <ThemedBadge text="Warning" variant="warning" />
          <ThemedBadge text="Info" variant="info" />
        </View>
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Card Variants */}
      <ThemedCard title="Card Variants" variant="filled">
        <View style={styles.cardVariantsContainer}>
          <ThemedCard variant="elevated" padding="small">
            <ThemedTextBox variant="caption">Elevated Card</ThemedTextBox>
          </ThemedCard>
          <View style={styles.cardSpacer} />
          <ThemedCard variant="outlined" padding="small">
            <ThemedTextBox variant="caption">Outlined Card</ThemedTextBox>
          </ThemedCard>
          <View style={styles.cardSpacer} />
          <ThemedCard variant="filled" padding="small">
            <ThemedTextBox variant="caption">Filled Card</ThemedTextBox>
          </ThemedCard>
        </View>
      </ThemedCard>

      <View style={styles.spacer} />

      {/* Color Palette */}
      <ThemedCard title="Color Palette" variant="outlined">
        <View style={styles.colorGrid}>
          <ColorSwatch color={colors.primary} label="Primary" />
          <ColorSwatch color={colors.background} label="Background" />
          <ColorSwatch color={colors.surface} label="Surface" />
          <ColorSwatch color={colors.text} label="Text" />
          <ColorSwatch color={colors.error} label="Error" />
          <ColorSwatch color={colors.success} label="Success" />
          <ColorSwatch color={colors.border} label="Border" />
          <ColorSwatch color={colors.input} label="Input" />
        </View>
      </ThemedCard>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ThemedButton
          title="Components"
          variant={screen === 'tab1' ? 'primary' : 'secondary'}
          size="small"
          onPress={onSelectTab1}
        />
        <ThemedButton
          title="About"
          variant={screen === 'tab2' ? 'primary' : 'secondary'}
          size="small"
          onPress={onSelectTab2}
        />
      </View>
      {screen === 'tab1' ? (
        renderThemeShowcase()
      ) : (
        <View style={[styles.centeredContent, { backgroundColor: colors.background }]}>
          <ThemedTextBox variant="heading" weight="bold" align="center">
            Theme Demo
          </ThemedTextBox>
          <View style={styles.aboutSpacer} />
          <ThemedTextBox variant="body" color="secondary" align="center">
            This template demonstrates a custom theming system with light and dark mode support.
          </ThemedTextBox>
        </View>
      )}
    </SafeAreaView>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.swatchContainer}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: colors.border }]} />
      <ThemedTextBox variant="caption" color="secondary">
        {label}
      </ThemedTextBox>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  themeModeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  themeModeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  spacer: {
    height: 16,
  },
  typographyContainer: {
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  inputSpacer: {
    height: 12,
  },
  toggleSpacer: {
    height: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardVariantsContainer: {
    gap: 0,
  },
  cardSpacer: {
    height: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchContainer: {
    alignItems: 'center',
    width: 70,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  bottomPadding: {
    height: 32,
  },
  aboutSpacer: {
    height: 16,
  },
});
