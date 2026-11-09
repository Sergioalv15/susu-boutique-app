import { PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../../../core/theme/ThemeProvider';

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function StoreCard({
  children,
  onPress,
  disabled = false,
  selected = false,
  accessibilityLabel,
  style,
}: PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || !onPress, selected }}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? theme.colors.card : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
        },
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function QuantityStepper({
  value,
  onChange,
  max,
  label = 'unidades',
}: {
  value: number;
  onChange: (value: number) => void;
  max: number;
  label?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Restar una ${label}`}
        accessibilityState={{ disabled: value <= 0 }}
        disabled={value <= 0}
        style={({ pressed }) => [
          styles.stepperButton,
          { borderColor: theme.colors.border, borderRadius: theme.radius.md },
          pressed ? styles.pressed : null,
          value <= 0 ? styles.disabled : null,
        ]}
        onPress={() => onChange(value - 1)}
      >
        <Text style={[styles.stepperSymbol, { color: theme.colors.text }]}>−</Text>
      </Pressable>
      <View style={styles.stepperValue}>
        <Text accessibilityLabel={`${value} ${label}`} style={[styles.stepperNumber, { color: theme.colors.text }]}>
          {value}
        </Text>
        <Text style={[styles.stepperLabel, { color: theme.colors.mutedText }]}>{label}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sumar una ${label}`}
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepperButton,
          { borderColor: theme.colors.border, borderRadius: theme.radius.md },
          pressed ? styles.pressed : null,
          value >= max ? styles.disabled : null,
        ]}
        onPress={() => onChange(value + 1)}
      >
        <Text style={[styles.stepperSymbol, { color: theme.colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function StoreMessage({ message, error = false }: { message: string; error?: boolean }) {
  const { theme } = useTheme();
  return (
    <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.message, { color: error ? theme.colors.danger : theme.colors.mutedText }]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.48,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  stepperButton: {
    width: 64,
    height: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: {
    fontSize: 30,
    lineHeight: 34,
  },
  stepperValue: {
    minWidth: 90,
    alignItems: 'center',
  },
  stepperNumber: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stepperLabel: {
    fontSize: 13,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
});
