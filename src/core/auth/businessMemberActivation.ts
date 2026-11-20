import { getSupabaseClient } from '../backend/supabaseClient';
import { BusinessRole } from './businessRole';

const CONNECTION_ERROR = 'No se pudo conectar con Supabase. Comprueba la conexión e inténtalo de nuevo.';
const UNKNOWN_ERROR_PREFIX = 'No se pudo activar la cuenta (código';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

function unknownErrorMessage(code: string | undefined): string {
  if (code && /^[A-Za-z0-9_-]{1,32}$/.test(code)) {
    return `${UNKNOWN_ERROR_PREFIX} ${code}). Comprueba la conexión y que la app use el proyecto correcto.`;
  }
  return CONNECTION_ERROR;
}

export async function activateExistingBusinessMember(email: string, role: BusinessRole): Promise<string | null> {
  const normalizedEmail = email.trim();
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Introduce un correo electrónico válido.';
  }

  try {
    const { error } = await getSupabaseClient().rpc('add_business_member_by_email', {
      p_email: normalizedEmail,
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
        return 'El correo o el rol no es válido. Selecciona owner o staff.';
      case 'PGRST202':
      case '42883':
        return 'Supabase no encuentra la función de activación. Confirma que la migración esté aplicada al proyecto conectado y vuelve a cargar la app.';
      case 'PGRST301':
        return 'Tu sesión expiró. Cierra sesión y vuelve a iniciar sesión.';
      default:
        return unknownErrorMessage(error.code);
    }
  } catch {
    return CONNECTION_ERROR;
  }
}
