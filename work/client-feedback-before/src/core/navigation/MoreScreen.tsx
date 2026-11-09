import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../ui/components/Screen';
import { LedgerRow } from '../../ui/components/LedgerRow';
import { UpcomingHolidaysCard } from '../../features/daily-records/presentation/components/UpcomingHolidaysCard';
import { backupService } from '../../features/daily-records/infrastructure/container';
import { useTheme } from '../theme/ThemeProvider';

export function MoreScreen() {
  const { theme, mode, toggleTheme } = useTheme();
  const router = useRouter();
  const darkEnabled = mode === 'dark';
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const runExport = async () => {
    if (backingUp || restoring) return;
    setBackingUp(true);
    const result = await backupService.exportBackup();
    setBackingUp(false);
    Alert.alert(result.ok ? 'Copia de seguridad' : 'Error', result.message);
  };

  const performRestore = async () => {
    if (restoring || backingUp) return;
    setRestoring(true);
    const result = await backupService.restoreFromBackup();
    setRestoring(false);
    Alert.alert(result.ok ? 'Copia de seguridad' : 'Error', result.message);
  };

  const runRestore = () => {
    if (restoring || backingUp) return;
    Alert.alert(
      'Restaurar copia de seguridad',
      'Esto reemplazará los datos actuales. Antes se guardará una copia de recuperación en este dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Elegir copia',
          style: 'destructive',
          onPress: () => void performRestore(),
        },
      ],
    );
  };

  return (
    <Screen topInset bottomInset={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Más</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Herramientas del negocio</Text>
      </View>

      <View style={styles.links}>
        <LedgerRow label="Proveedores" value="Ver agenda" onPress={() => router.push('/suppliers' as never)} />
        <LedgerRow label="Capital para invertir" value="Saldo e historial" onPress={() => router.push('/investment/balance' as never)} />
      </View>

      <UpcomingHolidaysCard />

      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Apariencia</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>Tema oscuro</Text>
            <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Se guarda para próximos inicios</Text>
          </View>
          <Switch
            accessibilityLabel="Tema oscuro"
            accessibilityHint="Activa o desactiva el modo oscuro en toda la app"
            value={darkEnabled}
            onValueChange={() => void toggleTheme()}
            trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
            thumbColor={darkEnabled ? theme.colors.primary : theme.colors.white}
          />
        </View>
      </View>

      <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text, fontFamily: theme.typography.serifFamily }]}>Copia de seguridad</Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedText }]}>Exporta tus datos o restáuralos desde un archivo.</Text>
        <View style={styles.backupActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Exportar copia de seguridad"
            accessibilityHint="Crea un archivo con todos los datos para guardarlo o compartirlo"
            accessibilityState={{ disabled: backingUp || restoring, busy: backingUp }}
            disabled={backingUp || restoring}
            onPress={() => void runExport()}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.border, borderRadius: theme.radius.sm },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.actionText, { color: theme.colors.text }]}>{backingUp ? 'Exportando…' : 'Exportar'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restaurar copia de seguridad"
            accessibilityHint="Recupera los datos desde un archivo de copia"
            accessibilityState={{ disabled: backingUp || restoring, busy: restoring }}
            disabled={backingUp || restoring}
            onPress={runRestore}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.border, borderRadius: theme.radius.sm },
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={[styles.actionText, { color: theme.colors.text }]}>{restoring ? 'Restaurando…' : 'Restaurar'}</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 2,
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 13,
  },
  links: {
    marginTop: -8,
  },
  section: {
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: 18,
  },
  settingRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.65,
  },
});
