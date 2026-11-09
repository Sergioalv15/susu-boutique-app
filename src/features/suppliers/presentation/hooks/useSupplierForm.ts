import { useEffect, useState } from 'react';
import { SupplierFormValues } from '../../domain/types';
import { supplierService } from '../../infrastructure/container';

export function useSupplierForm(editingId: number | null, onSaved: () => void) {
  const [values, setValues] = useState<SupplierFormValues>({ name: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingId === null) {
      setLoading(false);
      return;
    }

    let mounted = true;
    void (async () => {
      try {
        const supplier = await supplierService.findById(editingId);
        if (!mounted) return;

        if (supplier) {
          setValues({
            name: supplier.name,
            phone: supplier.phone,
            notes: supplier.notes,
          });
        } else {
          setError('El proveedor no existe.');
        }
        setLoading(false);
      } catch {
        if (mounted) {
          setError('No se pudo cargar el proveedor.');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [editingId]);

  const setName = (name: string) => setValues((prev) => ({ ...prev, name }));
  const setPhone = (phone: string) => setValues((prev) => ({ ...prev, phone }));
  const setNotes = (notes: string) => setValues((prev) => ({ ...prev, notes }));

  const save = async () => {
    setSaving(true);
    setError(null);

    try {
      if (editingId === null) {
        await supplierService.create(values);
      } else {
        await supplierService.update(editingId, values);
      }
      onSaved();
      setSaving(false);
      return true;
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message.trim().length > 0
          ? cause.message
          : 'No se pudo guardar el proveedor.';
      setError(message);
      setSaving(false);
      return false;
    }
  };

  return {
    values,
    loading,
    saving,
    error,
    isEditing: editingId !== null,
    setName,
    setPhone,
    setNotes,
    save,
  };
}