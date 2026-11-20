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

  it('returns a safe fallback if the RPC call fails unexpectedly', async () => {
    rpc.mockRejectedValue(new Error('network details should not reach the user'));

    await expect(activateExistingBusinessMember('member@example.test', 'staff'))
      .resolves.toBe('No se pudo activar la cuenta. Revisa la conexión e inténtalo de nuevo.');
  });
});
