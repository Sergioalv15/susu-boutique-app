import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../../../../core/theme/ThemeProvider";

export type CalendarViewMode = "monthly" | "biweekly";

interface Props {
  mode: CalendarViewMode;
  onToggle: () => void;
}

const MODE_DESTINATION_LABEL: Record<CalendarViewMode, string> = {
  monthly: "Quincenal",
  biweekly: "Mensual",
};

const MODE_DESTINATION_HINT: Record<CalendarViewMode, string> = {
  monthly: "Cambiar al calendario quincenal",
  biweekly: "Cambiar al calendario mensual",
};

export function CalendarViewModeToggle({ mode, onToggle }: Props) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={MODE_DESTINATION_LABEL[mode]}
      accessibilityHint={MODE_DESTINATION_HINT[mode]}
      hitSlop={6}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggle,
        {
          borderColor: theme.colors.border,
          borderRadius: theme.radius.sm,
          backgroundColor: theme.colors.background,
          paddingHorizontal: theme.spacing.md,
        },
        pressed ? styles.togglePressed : null,
      ]}
    >
      <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
        {MODE_DESTINATION_LABEL[mode]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderWidth: 1,
    minHeight: 44,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  togglePressed: {
    opacity: 0.62,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
