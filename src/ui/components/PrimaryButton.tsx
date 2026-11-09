import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../core/theme/ThemeProvider';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  accessibilityLabel?: string;
  busy?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  accessibilityLabel,
  busy = false,
  disabled = false,
}: PrimaryButtonProps) {
  const { theme } = useTheme();
  const isDisabled = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.sm,
        },
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {busy ? <ActivityIndicator color={theme.colors.onPrimary} /> : null}
      <Text style={[styles.label, { color: theme.colors.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.6,
  },
});
