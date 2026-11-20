import { getSupabaseClient } from '../backend/supabaseClient';
import { BusinessRole } from './businessRole';

const FALLBACK_ERROR = 'No se pudo activar la cuenta. Revisa la conexión e inténtalo de nuevo.';

export async function activateExistingBusinessMember(email: string, role: BusinessRole): Promise<string | null> {
  try {
    const { error } = await getSupabaseClient().rpc('add_business_member_by_email', {
      p_email: email.trim(),
      p_role: role,
    });

    if (!error) return null;

    switch (error.code) {
      case 'P0001':
        return 'No encontramos una cuenta de Supabase Auth con ese correo. La cuenta debe existir antes de activarla.';
      case '23505':
        return 'Esta cuenta ya tiene acceso al negocio.';
      case '42501':
        return 'Solo una persona propietaria puede activar cuentas.';
      case '22023':
        return 'Revisa el correo y el rol seleccionado.';
      default:
        return FALLBACK_ERROR;
    }
  } catch {
    return FALLBACK_ERROR;
  }
}
