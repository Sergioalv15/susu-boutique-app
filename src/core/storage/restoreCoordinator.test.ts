import { describe, expect, it } from 'vitest';
import { RestoreAdapter, restoreWithRecovery } from './restoreCoordinator';

type FakeDatabase = {
  bytes: Uint8Array;
  token: string | null;
};

function createAdapter(options: { failCopy?: boolean; failVerification?: boolean; failRecovery?: boolean } = {}) {
  const live: FakeDatabase = { bytes: new Uint8Array([1]), token: null };
  const recoveryPaths: string[] = [];
  let generation = 0;
  let blockedReason: string | null = null;
  let copyCount = 0;

  const adapter: RestoreAdapter<FakeDatabase> = {
    deserialize: async (bytes) => ({ bytes, token: null }),
    close: async () => undefined,
    validate: async () => undefined,
    migrate: async () => undefined,
    serializeLive: async () => live.bytes,
    persistRecovery: async () => {
      const path = `recovery-${recoveryPaths.length + 1}.sqlite`;
      recoveryPaths.push(path);
      return path;
    },
    createVerificationToken: () => `token-${copyCount + 1}`,
    writeVerificationToken: async (database, token) => {
      database.token = token;
    },
    copyToLive: async (database) => {
      copyCount += 1;
      if ((options.failCopy && copyCount === 1) || (options.failRecovery && copyCount === 2)) {
        throw new Error('copy failed');
      }
      live.bytes = database.bytes;
      live.token = database.token;
    },
    verifyLive: async (token) => {
      if (options.failVerification && copyCount === 1) {
        throw new Error('verification failed');
      }
      if (live.token !== token) {
        throw new Error('token missing');
      }
    },
    clearLiveVerificationToken: async (token) => {
      if (live.token !== token) {
        throw new Error('wrong token');
      }
      live.token = null;
    },
    advanceGeneration: () => {
      generation += 1;
    },
    blockDatabaseOperations: (reason) => {
      blockedReason = reason;
    },
  };

  return { adapter, live, recoveryPaths, getGeneration: () => generation, getBlockedReason: () => blockedReason };
}

describe('restoreWithRecovery', () => {
  it('persists a recovery snapshot before a verified candidate replacement', async () => {
    const harness = createAdapter();

    const outcome = await restoreWithRecovery(new Uint8Array([2]), harness.adapter);

    expect(outcome).toEqual({ ok: true, recovered: false, recoveryPath: 'recovery-1.sqlite' });
    expect(harness.live.bytes).toEqual(new Uint8Array([2]));
    expect(harness.live.token).toBeNull();
    expect(harness.getGeneration()).toBe(1);
  });

  it('restores the durable snapshot when copy verification fails', async () => {
    const harness = createAdapter({ failVerification: true });

    const outcome = await restoreWithRecovery(new Uint8Array([2]), harness.adapter);

    expect(outcome).toEqual({ ok: false, recovered: true, recoveryPath: 'recovery-1.sqlite' });
    expect(harness.live.bytes).toEqual(new Uint8Array([1]));
    expect(harness.live.token).toBeNull();
    expect(harness.getGeneration()).toBe(1);
    expect(harness.getBlockedReason()).toBeNull();
  });

  it('blocks subsequent database operations when recovery cannot be verified', async () => {
    const harness = createAdapter({ failCopy: true, failRecovery: true });

    const outcome = await restoreWithRecovery(new Uint8Array([2]), harness.adapter);

    expect(outcome).toEqual({ ok: false, recovered: false, recoveryPath: 'recovery-1.sqlite' });
    expect(harness.getBlockedReason()).toContain('recovery-1.sqlite');
  });
});
