import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../../ui/components/PrimaryButton';
import { Screen } from '../../../ui/components/Screen';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { BusinessRole } from '../../../core/auth/businessRole';
import { activateExistingBusinessMember } from '../../../core/auth/businessMemberActivation';

type RoleOption = {
  value: BusinessRole;
  label: string;
  description: string;
};

const roleOptions: RoleOption[] = [
  { value: 'staff', label: 'Personal', description: 'Acceso a la pantalla de ventas.' },
  { value: 'owner', label: 'Propietario', description: 'Acceso a las secciones de gestión.' },
];

export function SettingsScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BusinessRole>('staff');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const submit = async () => {
    const normalizedEmail = email.trim();
    if (busy) return;
    if (!normalizedEmail) {
      setErrorMessage('Escribe el correo de una cuenta existente.');
      setSuccessMessage(null);
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    const error = await activateExistingBusinessMember(normalizedEmail, role);
    setBusy(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setSuccessMessage(`Acceso activado para ${normalizedEmail}.`);
    setEmail('');
    setRole('staff');
  };

  return (
    <Screen keyboardAware contentContainerStyle={styles.content}>
      <View style={styles.headingGroup}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Ajustes</Text>
        <Text style={[styles.description, { color: theme.colors.mutedText }]}>Activa el acceso de una cuenta existente a Susu’s Boutique.</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Correo electrónico</Text>
        <TextInput
          accessibilityLabel="Correo electrónico de la cuenta"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          placeholder="persona@ejemplo.com"
          placeholderTextColor={theme.colors.mutedText}
          editable={!busy}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.sm }]}
        />

        <Text style={[styles.label, { color: theme.colors.text }]}>Rol</Text>
        <View style={styles.roleOptions}>
          {roleOptions.map((option) => {
            const selected = role === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityLabel={`${option.label}, ${option.description}`}
                accessibilityState={{ checked: selected, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  setRole(option.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={({ pressed }) => [
                  styles.roleOption,
                  {
                    backgroundColor: selected ? theme.colors.surface : theme.colors.background,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    borderRadius: theme.radius.sm,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <View style={[styles.radio, { borderColor: selected ? theme.colors.primary : theme.colors.mutedText }]}>
                  {selected ? <View style={[styles.radioSelected, { backgroundColor: theme.colors.primary }]} /> : null}
                </View>
                <View style={styles.roleCopy}>
                  <Text style={[styles.roleLabel, { color: theme.colors.text }]}>{option.label}</Text>
                  <Text style={[styles.roleDescription, { color: theme.colors.mutedText }]}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.helper, { color: theme.colors.mutedText }]}>La cuenta debe existir en Supabase Auth. Este proceso no envía invitaciones.</Text>
        {errorMessage ? <Text accessibilityRole="alert" style={[styles.feedback, { color: theme.colors.danger }]}>{errorMessage}</Text> : null}
        {successMessage ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.feedback, { color: theme.colors.success }]}>{successMessage}</Text> : null}
        <PrimaryButton title="Activar cuenta" onPress={() => void submit()} busy={busy} disabled={!email.trim()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  headingGroup: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  roleOptions: {
    gap: 8,
  },
  roleOption: {
    minHeight: 64,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleCopy: {
    flex: 1,
    gap: 2,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    fontSize: 13,
    lineHeight: 19,
  },
  feedback: {
    fontSize: 14,
    lineHeight: 20,
  },
});
