import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../../core/theme/ThemeProvider';

interface Props {
  expiresAt: number;
  busy: boolean;
  onUndo: () => void;
  onHide: () => void;
}

export function SaleUndoNotification({ expiresAt, busy, onUndo, onHide }: Props) {
  const { theme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onHide, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, onHide]);

  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: theme.colors.success, borderRadius: theme.radius.md }]}>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.colors.onPrimary }]}>¿Necesitas corregirla?</Text>
        <Text style={[styles.message, { color: theme.colors.onPrimary }]}>Puedes deshacer esta venta durante 30 segundos.</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? 'Deshaciendo venta' : 'Deshacer la venta recién registrada'}
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        hitSlop={8}
        onPress={onUndo}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.sm,
            opacity: busy ? 0.6 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.actionText, { color: theme.colors.primary }]}>{busy ? 'Deshaciendo…' : 'Deshacer'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginVertical: 8,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 180,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginVertical: 2,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
