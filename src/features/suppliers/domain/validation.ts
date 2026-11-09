import { SupplierFormValues } from './types';

export interface SupplierValidation {
  ok: boolean;
  error?: string;
}

export function validateSupplier(values: SupplierFormValues): SupplierValidation {
  const name = values.name.trim();

  if (!name) {
    return { ok: false, error: 'El nombre es obligatorio.' };
  }

  if (name.length > 60) {
    return { ok: false, error: 'El nombre no puede superar los 60 caracteres.' };
  }

  if (values.notes.length > 300) {
    return { ok: false, error: 'Las notas no pueden superar los 300 caracteres.' };
  }

  if (values.phone.length > 30) {
    return { ok: false, error: 'El teléfono no puede superar los 30 caracteres.' };
  }

  return { ok: true };
}