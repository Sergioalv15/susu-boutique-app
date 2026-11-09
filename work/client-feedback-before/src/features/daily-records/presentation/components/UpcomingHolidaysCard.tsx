import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { useUpcomingHolidays } from '../../../holidays/presentation/hooks/useUpcomingHolidays';

function formatHolidayDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: 'numeric', weekday: 'short', month: 'short' });
}

export function UpcomingHolidaysCard() {
  const { theme } = useTheme();
  const router = useRouter();
  const { loading, holidays, error, refresh } = useUpcomingHolidays(14, 3);

  return (
    <View accessibilityLiveRegion="polite" style={styles.section}>
      <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Próximos festivos</Text>

      {loading ? (
        <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>
          Cargando festivos...
        </Text>
      ) : error ? (
        <View style={styles.stateRow}>
          <Text style={[styles.stateText, { color: theme.colors.danger }]}>
            No se pudieron cargar los festivos.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reintentar cargar festivos"
            onPress={() => void refresh()}
            style={styles.action}
          >
            <Text style={[styles.link, { color: theme.colors.primary }]}>Reintentar</Text>
          </Pressable>
        </View>
      ) : holidays.length === 0 ? (
        <Text style={[styles.stateText, { color: theme.colors.mutedText }]}>
          No hay festivos próximos.
        </Text>
      ) : (
        <>
          {holidays.map((holiday) => (
            <View key={holiday.date} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.dot, { color: theme.colors.primary }]}>●</Text>
              <Text style={[styles.holidayName, { color: theme.colors.text }]}>{holiday.name}</Text>
              <Text style={[styles.holidayDate, { color: theme.colors.mutedText }]}>
                {formatHolidayDate(holiday.date)}{holiday.daysUntil <= 1 ? '' : ` (en ${holiday.daysUntil}d)`}
              </Text>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver calendario completo"
            style={({ pressed }) => [styles.action, pressed ? styles.linkPressed : null]}
            onPress={() => router.push('/calendar' as never)}
          >
            <Text style={[styles.link, { color: theme.colors.primary }]}>Ver todo →</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 10,
    gap: 4,
  },
  title: {
    fontSize: 20,
    marginBottom: 2,
  },
  row: {
    minHeight: 44,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    fontSize: 6,
  },
  holidayName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  holidayDate: {
    fontSize: 13,
  },
  stateText: {
    fontSize: 13,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  link: {
    minHeight: 44,
    textAlignVertical: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  linkPressed: {
    opacity: 0.6,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
