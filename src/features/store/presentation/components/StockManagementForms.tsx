import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton } from '../../../../ui/components/PrimaryButton';
import { useTheme } from '../../../../core/theme/ThemeProvider';
import { StockCostSubgroup } from '../../domain/types';

export function CategoryNameForm({
  initialName,
  busy,
  onSave,
  onCancel,
}: {
  initialName: string;
  busy: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [name, setName] = useState(initialName);
  return (
    <View style={styles.form}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Editar tipo de joya</Text>
      <Text style={[styles.help, { color: theme.colors.mutedText }]}>El nuevo nombre también se verá en los movimientos asociados; sus importes y costes no cambiarán.</Text>
      <TextInput
        accessibilityLabel="Nombre del tipo de joya"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={40}
        placeholder="Nombre del tipo"
        placeholderTextColor={theme.colors.mutedText}
        editable={!busy}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      <PrimaryButton title="Guardar tipo" onPress={() => onSave(name)} busy={busy} disabled={!name.trim()} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
        <Text style={{ color: theme.colors.mutedText }}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

export function PriceGroupForm({
  priceCents,
  currentPhotoDataUrl,
  selectedPhotoDataUrl,
  busy,
  onPickPhoto,
  onSave,
  onCancel,
}: {
  priceCents: number;
  currentPhotoDataUrl: string;
  selectedPhotoDataUrl: string | null;
  busy: boolean;
  onPickPhoto: () => void;
  onSave: (price: string, photoDataUrl: string | null) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [price, setPrice] = useState((priceCents / 100).toFixed(2));
  const previewPhoto = selectedPhotoDataUrl ?? currentPhotoDataUrl;
  return (
    <View style={styles.form}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Editar precio del grupo</Text>
      <Text style={[styles.help, { color: theme.colors.mutedText }]}>Si el grupo tiene historial, se conservará y el stock restante se trasladará a una nueva versión.</Text>
      <View style={styles.photoField}>
        {previewPhoto ? <Image source={{ uri: previewPhoto }} style={styles.formPhoto} resizeMode="cover" /> : <Text style={[styles.help, { color: theme.colors.mutedText }]}>Sin foto de ejemplo</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={onPickPhoto} style={styles.cancel}>
          <Text style={{ color: theme.colors.primary }}>{previewPhoto ? 'Cambiar foto de ejemplo' : 'Elegir foto de ejemplo'}</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Precio de venta del grupo en euros"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Precio en euros"
        placeholderTextColor={theme.colors.mutedText}
        editable={!busy}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      <PrimaryButton title="Guardar cambios" onPress={() => onSave(price, selectedPhotoDataUrl)} busy={busy} disabled={!price.trim()} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
        <Text style={{ color: theme.colors.mutedText }}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

export function SubgroupCostForm({
  subgroup,
  busy,
  onSave,
  onCancel,
}: {
  subgroup: StockCostSubgroup;
  busy: boolean;
  onSave: (cost: string, unknown: boolean) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [cost, setCost] = useState(subgroup.unitCostCents == null ? '' : (subgroup.unitCostCents / 100).toFixed(2));
  const [unknown, setUnknown] = useState(subgroup.unitCostCents == null);
  return (
    <View style={styles.form}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Corregir coste de compra</Text>
      <Text style={[styles.help, { color: theme.colors.mutedText }]}>{subgroup.remainingUnits} unidades restantes. Las ventas anteriores no se modificarán; se registrará un ajuste.</Text>
      {!unknown ? <TextInput
        accessibilityLabel="Nuevo coste de compra por unidad en euros"
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        placeholder="Coste por unidad en euros"
        placeholderTextColor={theme.colors.mutedText}
        editable={!busy}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      /> : <Text style={{ color: theme.colors.mutedText }}>El coste quedará como desconocido.</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: unknown, disabled: busy }}
        disabled={busy}
        onPress={() => setUnknown((current) => !current)}
        style={styles.cancel}
      >
        <Text style={{ color: theme.colors.primary }}>{unknown ? 'Introducir un coste conocido' : 'Marcar coste como desconocido'}</Text>
      </Pressable>
      <PrimaryButton title="Guardar coste" onPress={() => onSave(cost, unknown)} busy={busy} disabled={!unknown && !cost.trim()} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
        <Text style={{ color: theme.colors.mutedText }}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

export function SubgroupRemovalForm({
  subgroup,
  busy,
  onSave,
  onCancel,
}: {
  subgroup: StockCostSubgroup;
  busy: boolean;
  onSave: (units: string, note: string) => void;
  onCancel: () => void;
}) {
  const { theme } = useTheme();
  const [units, setUnits] = useState('1');
  const [note, setNote] = useState('');
  return (
    <View style={styles.form}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Retirar unidades del subgrupo</Text>
      <Text style={[styles.help, { color: theme.colors.mutedText }]}>Quedan {subgroup.remainingUnits} unidades. La salida se guardará como un ajuste trazable.</Text>
      <TextInput
        accessibilityLabel="Unidades que se van a retirar"
        value={units}
        onChangeText={setUnits}
        keyboardType="number-pad"
        placeholder="Unidades"
        placeholderTextColor={theme.colors.mutedText}
        editable={!busy}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      <TextInput
        accessibilityLabel="Motivo del ajuste de stock"
        value={note}
        onChangeText={setNote}
        maxLength={200}
        placeholder="Motivo (por ejemplo, daño o pérdida)"
        placeholderTextColor={theme.colors.mutedText}
        editable={!busy}
        style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radius.md }]}
      />
      <PrimaryButton title="Registrar ajuste" onPress={() => onSave(units, note)} busy={busy} disabled={!units.trim() || !note.trim()} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.cancel}>
        <Text style={{ color: theme.colors.mutedText }}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8CEC2',
    borderRadius: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  photoField: {
    gap: 8,
    alignItems: 'flex-start',
  },
  formPhoto: {
    width: 112,
    height: 112,
    borderRadius: 8,
  },
  cancel: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
