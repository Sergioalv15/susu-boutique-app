import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../../core/theme/ThemeProvider";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          padding: theme.spacing.sm,
        },
      ]}
    >
      <Text style={[styles.label, { color: theme.colors.mutedText }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: theme.colors.mutedText }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    borderWidth: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
  },
  hint: {
    fontSize: 11,
  },
});
