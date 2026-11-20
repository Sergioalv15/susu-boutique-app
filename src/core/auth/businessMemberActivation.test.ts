import { afterEach, describe, expect, it, vi } from 'vitest';
import { activateExistingBusinessMember } from './businessMemberActivation';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('../backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc }),
}));

afterEach(() => {
  rpc.mockReset();
});

describe('activateExistingBusinessMember', () => {
  it('sends a trimmed email and selected role to the owner-authorized RPC', async () => {
    rpc.mockResolvedValue({ error: null });

    await expect(activateExistingBusinessMember('  staff@example.test  ', 'staff')).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith('add_business_member_by_email', {
      p_email: 'staff@example.test',
      p_role: 'staff',
    });
  });

  it('explains when the email has no existing Auth account', async () => {
    rpc.mockResolvedValue({ error: { code: 'P0001' } });

    await expect(activateExistingBusinessMember('unknown@example.test', 'staff'))
      .resolves.toBe('No encontramos una cuenta de Supabase Auth con ese correo. La cuenta debe existir antes de activarla.');
  });

  it('explains duplicate membership and authorization failures', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '23505' } });
    rpc.mockResolvedValueOnce({ error: { code: '42501' } });

    await expect(activateExistingBusinessMember('member@example.test', 'staff'))
      .resolves.toBe('Esta cuenta ya tiene acceso al negocio.');
    await expect(activateExistingBusinessMember('member@example.test', 'staff'))
      .resolves.toBe('Solo una persona propietaria puede activar cuentas.');
  });

  it('rejects malformed email input without calling Supabase', async () => {
    await expect(activateExistingBusinessMember('cualquier cosa', 'staff'))
      .resolves.toBe('Introduce un correo electrónico válido.');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explains invalid email or role responses', async () => {
    rpc.mockResolvedValue({ error: { code: '22023' } });

    await expect(activateExistingBusinessMember('person@example.test', 'staff'))
      .resolves.toBe('El correo o el rol no es válido. Selecciona owner o staff.');
  });

  it('explains when Supabase cannot find the activation RPC', async () => {
    rpc.mockResolvedValueOnce({ error: { code: 'PGRST202', message: 'internal schema details' } });
    rpc.mockResolvedValueOnce({ error: { code: '42883', message: 'internal schema details' } });

    const expected = 'Supabase no encuentra la función de activación. Confirma que la migración esté aplicada al proyecto conectado y vuelve a cargar la app.';
    await expect(activateExistingBusinessMember('person@example.test', 'staff')).resolves.toBe(expected);
    await expect(activateExistingBusinessMember('person@example.test', 'staff')).resolves.toBe(expected);
  });

  it('asks expired sessions to sign in again', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST301' } });

    await expect(activateExistingBusinessMember('person@example.test', 'staff'))
      .resolves.toBe('Tu sesión expiró. Cierra sesión y vuelve a iniciar sesión.');
  });

  it('shows a safe error code for unknown RPC errors without exposing raw details', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST999', message: 'private server detail' } });

    const message = await activateExistingBusinessMember('person@example.test', 'staff');
    expect(message).toBe('No se pudo activar la cuenta (código PGRST999). Comprueba la conexión y que la app use el proyecto correcto.');
    expect(message).not.toContain('private server detail');
  });

  it('returns a safe connection message if the RPC call rejects unexpectedly', async () => {
    rpc.mockRejectedValue(new Error('network details should not reach the user'));

    await expect(activateExistingBusinessMember('member@example.test', 'staff'))
      .resolves.toBe('No se pudo conectar con Supabase. Comprueba la conexión e inténtalo de nuevo.');
  });
});
