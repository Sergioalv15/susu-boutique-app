import { useRef, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { useBusinessRole } from '../auth/AuthGate';
import { confirmSignOut, showSignOutFailure } from '../auth/signOutConfirmation';
import { useTheme } from '../theme/ThemeProvider';
import { AppHeaderMenuAction, getAppHeaderMenuActions } from './appHeaderMenuModel';

const menuLabels: Record<AppHeaderMenuAction, string> = {
  settings: 'Ajustes',
  signOut: 'Cerrar sesión',
};

export function AppHeaderMenu() {
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const role = useBusinessRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const inProgress = useRef(false);
  const actions = getAppHeaderMenuActions(role);

  const handleSignOut = async () => {
    if (inProgress.current) return;
    inProgress.current = true;
    setBusy(true);
    try {
      if (!await confirmSignOut()) return;
      setOpen(false);
      const error = await signOut();
      if (error) showSignOutFailure();
    } catch {
      showSignOutFailure();
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  };

  const selectAction = (action: AppHeaderMenuAction) => {
    if (action === 'settings') {
      setOpen(false);
      router.push('/(drawer)/settings' as never);
      return;
    }
    void handleSignOut();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Cerrar menú' : 'Abrir menú'}
        accessibilityHint="Abre las opciones de la cuenta."
        accessibilityState={{ expanded: open, disabled: busy, busy }}
        disabled={busy}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor: focused ? theme.colors.primary : theme.colors.border,
            borderWidth: focused ? 2 : 1,
            borderRadius: theme.radius.sm,
            opacity: pressed && !busy ? 0.82 : 1,
          },
        ]}
      >
        {busy ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Feather name="menu" size={21} color={theme.colors.text} />}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar menú"
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!busy) setOpen(false);
            }}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.menu,
              {
                top: insets.top + 8,
                right: 16,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            {actions.map((action, index) => (
              <Pressable
                key={action}
                accessibilityRole="button"
                accessibilityLabel={menuLabels[action]}
                accessibilityState={{ disabled: busy, busy: action === 'signOut' && busy }}
                disabled={busy}
                onPress={() => selectAction(action)}
                style={({ pressed }) => [
                  styles.menuAction,
                  index > 0 ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Feather
                  name={action === 'settings' ? 'settings' : 'log-out'}
                  size={17}
                  color={action === 'signOut' ? theme.colors.danger : theme.colors.text}
                />
                <Text style={[styles.menuLabel, { color: action === 'signOut' ? theme.colors.danger : theme.colors.text }]}>
                  {menuLabels[action]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  menu: {
    position: 'absolute',
    minWidth: 208,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
  },
  menuAction: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
