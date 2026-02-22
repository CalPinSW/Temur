import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  ExampleButton,
  ExampleTextBox,
  ExampleInput,
  ExampleToggle,
  ExampleCard,
  ExampleBadge,
  ExampleDivider,
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
      <ExampleCard title="Theme Settings" variant="outlined">
        <View style={styles.themeModeContainer}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <ExampleButton
              key={mode}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              variant={themeMode === mode ? 'primary' : 'secondary'}
              size="small"
              onPress={() => setThemeMode(mode)}
              style={styles.themeModeButton}
            />
          ))}
        </View>
        <ExampleTextBox variant="caption" color="secondary" align="center">
          Current theme: {theme}
        </ExampleTextBox>
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Typography Examples */}
      <ExampleCard title="Typography" variant="elevated">
        <View style={styles.typographyContainer}>
          <ExampleTextBox variant="heading" weight="bold">
            Heading Text
          </ExampleTextBox>
          <ExampleTextBox variant="subheading" weight="semibold">
            Subheading Text
          </ExampleTextBox>
          <ExampleTextBox variant="body">
            Body text for regular content and descriptions.
          </ExampleTextBox>
          <ExampleTextBox variant="caption" color="secondary">
            Caption text for secondary information
          </ExampleTextBox>
          <ExampleTextBox variant="body" color="error">
            Error colored text
          </ExampleTextBox>
          <ExampleTextBox variant="body" color="success">
            Success colored text
          </ExampleTextBox>
        </View>
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Button Examples */}
      <ExampleCard title="Buttons" variant="elevated">
        <View style={styles.buttonRow}>
          <ExampleButton title="Primary" variant="primary" />
          <ExampleButton title="Secondary" variant="secondary" />
        </View>
        <View style={styles.buttonRow}>
          <ExampleButton title="Outline" variant="outline" />
          <ExampleButton title="Ghost" variant="ghost" />
        </View>
        <ExampleDivider label="Sizes" />
        <View style={styles.buttonRow}>
          <ExampleButton title="Small" size="small" />
          <ExampleButton title="Medium" size="medium" />
          <ExampleButton title="Large" size="large" />
        </View>
        <ExampleDivider label="States" />
        <View style={styles.buttonRow}>
          <ExampleButton title="Disabled" disabled />
          <ExampleButton title="Loading" loading />
        </View>
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Input Examples */}
      <ExampleCard title="Inputs" variant="elevated">
        <ExampleInput
          label="Default Input"
          placeholder="Enter text..."
          value={inputValue}
          onChangeText={setInputValue}
        />
        <View style={styles.inputSpacer} />
        <ExampleInput
          label="With Hint"
          placeholder="Enter email..."
          hint="We'll never share your email"
        />
        <View style={styles.inputSpacer} />
        <ExampleInput
          label="With Error"
          placeholder="Enter password..."
          error="Password must be at least 8 characters"
        />
        <View style={styles.inputSpacer} />
        <ExampleInput label="Disabled" placeholder="Cannot edit..." disabled />
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Toggle Examples */}
      <ExampleCard title="Toggles" variant="elevated">
        <ExampleToggle
          label="Enable notifications"
          value={toggleValue}
          onValueChange={setToggleValue}
        />
        <View style={styles.toggleSpacer} />
        <ExampleToggle label="Disabled toggle" value={true} onValueChange={() => {}} disabled />
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Badge Examples */}
      <ExampleCard title="Badges" variant="elevated">
        <View style={styles.badgeContainer}>
          <ExampleBadge text="Default" variant="default" />
          <ExampleBadge text="Success" variant="success" />
          <ExampleBadge text="Error" variant="error" />
          <ExampleBadge text="Warning" variant="warning" />
          <ExampleBadge text="Info" variant="info" />
        </View>
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Card Variants */}
      <ExampleCard title="Card Variants" variant="filled">
        <View style={styles.cardVariantsContainer}>
          <ExampleCard variant="elevated" padding="small">
            <ExampleTextBox variant="caption">Elevated Card</ExampleTextBox>
          </ExampleCard>
          <View style={styles.cardSpacer} />
          <ExampleCard variant="outlined" padding="small">
            <ExampleTextBox variant="caption">Outlined Card</ExampleTextBox>
          </ExampleCard>
          <View style={styles.cardSpacer} />
          <ExampleCard variant="filled" padding="small">
            <ExampleTextBox variant="caption">Filled Card</ExampleTextBox>
          </ExampleCard>
        </View>
      </ExampleCard>

      <View style={styles.spacer} />

      {/* Color Palette */}
      <ExampleCard title="Color Palette" variant="outlined">
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
      </ExampleCard>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ExampleButton
          title="Components"
          variant={screen === 'tab1' ? 'primary' : 'secondary'}
          size="small"
          onPress={onSelectTab1}
        />
        <ExampleButton
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
          <ExampleTextBox variant="heading" weight="bold" align="center">
            Theme Demo
          </ExampleTextBox>
          <View style={styles.aboutSpacer} />
          <ExampleTextBox variant="body" color="secondary" align="center">
            This template demonstrates a custom theming system with light and dark mode support.
          </ExampleTextBox>
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
      <ExampleTextBox variant="caption" color="secondary">
        {label}
      </ExampleTextBox>
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
