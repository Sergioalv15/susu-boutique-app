export interface RestoreAdapter<Database> {
  deserialize(bytes: Uint8Array): Promise<Database>;
  close(database: Database): Promise<void>;
  validate(database: Database): Promise<void>;
  migrate(database: Database): Promise<void>;
  serializeLive(): Promise<Uint8Array>;
  persistRecovery(bytes: Uint8Array): Promise<string>;
  createVerificationToken(): string;
  writeVerificationToken(database: Database, token: string): Promise<void>;
  copyToLive(database: Database): Promise<void>;
  verifyLive(token: string): Promise<void>;
  clearLiveVerificationToken(token: string): Promise<void>;
  advanceGeneration(): void;
  blockDatabaseOperations(reason: string): void;
}

export interface RestoreOutcome {
  ok: boolean;
  recovered: boolean;
  recoveryPath: string | null;
}

async function copyAndVerify<Database>(
  adapter: RestoreAdapter<Database>,
  database: Database,
): Promise<void> {
  const token = adapter.createVerificationToken();
  await adapter.writeVerificationToken(database, token);
  await adapter.copyToLive(database);
  await adapter.verifyLive(token);
  await adapter.clearLiveVerificationToken(token);
}

async function recoverLiveDatabase<Database>(
  adapter: RestoreAdapter<Database>,
  recoveryBytes: Uint8Array,
): Promise<void> {
  const recoveryDatabase = await adapter.deserialize(recoveryBytes);

  try {
    await adapter.validate(recoveryDatabase);
    await copyAndVerify(adapter, recoveryDatabase);
    adapter.advanceGeneration();
  } finally {
    await adapter.close(recoveryDatabase);
  }
}

export async function restoreWithRecovery<Database>(
  bytes: Uint8Array,
  adapter: RestoreAdapter<Database>,
): Promise<RestoreOutcome> {
  let candidate: Database | null = null;
  let recoveryBytes: Uint8Array | null = null;
  let recoveryPath: string | null = null;

  try {
    candidate = await adapter.deserialize(bytes);
    await adapter.validate(candidate);
    await adapter.migrate(candidate);
    await adapter.validate(candidate);

    recoveryBytes = await adapter.serializeLive();
    recoveryPath = await adapter.persistRecovery(recoveryBytes);

    await copyAndVerify(adapter, candidate);
    adapter.advanceGeneration();

    return { ok: true, recovered: false, recoveryPath };
  } catch {
    if (!recoveryBytes || !recoveryPath) {
      return { ok: false, recovered: false, recoveryPath: null };
    }

    try {
      await recoverLiveDatabase(adapter, recoveryBytes);
      return { ok: false, recovered: true, recoveryPath };
    } catch {
      const reason = `La restauración falló y no se pudo recuperar la copia local (${recoveryPath}).`;
      adapter.blockDatabaseOperations(reason);
      return { ok: false, recovered: false, recoveryPath };
    }
  } finally {
    if (candidate) {
      await adapter.close(candidate);
    }
  }
}
