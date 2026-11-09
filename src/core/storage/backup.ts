import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { backupDatabaseAsync, deserializeDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import {
  advanceDatabaseGeneration,
  blockDatabaseOperations,
  withDatabaseAccess,
} from './sqlite';
import { runMigrations } from './sqliteMigrations';
import { validateBackupDatabase } from './backupValidation';
import { RestoreAdapter, restoreWithRecovery } from './restoreCoordinator';

export interface BackupService {
  exportBackup(): Promise<BackupResult>;
  restoreFromBackup(): Promise<BackupResult>;
}

export interface BackupResult {
  ok: boolean;
  message: string;
}

const BACKUP_DIRECTORY_NAME = 'backups';
const BACKUP_FILE_NAME = 'susu-boutique-backup.sqlite';
const RESTORE_TOKEN_KEY = 'restore_verification_token';

export function createBackupService(): BackupService {
  return { exportBackup, restoreFromBackup };
}

async function exportBackup(): Promise<BackupResult> {
  try {
    const bytes = await withDatabaseAccess((liveDb) => liveDb.serializeAsync());
    const dir = new Directory(Paths.cache, BACKUP_DIRECTORY_NAME);
    dir.create({ idempotent: true, intermediates: true });
    const file = new File(dir, BACKUP_FILE_NAME);
    file.create({ overwrite: true, intermediates: true });
    file.write(bytes);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/x-sqlite3' });
    }

    return { ok: true, message: 'Copia de seguridad exportada' };
  } catch {
    return { ok: false, message: 'No se pudo exportar la copia de seguridad' };
  }
}

async function restoreFromBackup(): Promise<BackupResult> {
  let pickedFile: File | null = null;
  try {
    const picked = await getDocumentAsync({
      type: ['application/x-sqlite3', 'application/octet-stream', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (picked.canceled) {
      return { ok: false, message: 'Restauración cancelada' };
    }

    const asset = picked.assets[0];
    if (!asset) {
      return { ok: false, message: 'No se seleccionó ningún archivo' };
    }

    pickedFile = new File(asset.uri);
    const outcome = await applyBackupBytes(await pickedFile.bytes());

    if (outcome.ok) {
      return { ok: true, message: 'Copia de seguridad restaurada' };
    }

    if (outcome.recovered) {
      return { ok: false, message: 'No se pudo restaurar la copia; se recuperaron tus datos actuales.' };
    }

    return {
      ok: false,
      message: outcome.recoveryPath
        ? `No se pudo restaurar ni recuperar la base local. La aplicación quedó bloqueada para proteger tus datos. Se conservó la copia de recuperación en ${outcome.recoveryPath}.`
        : 'No se pudo restaurar la copia de seguridad',
    };
  } catch {
    return { ok: false, message: 'No se pudo restaurar la copia de seguridad' };
  }
}

async function applyBackupBytes(bytes: Uint8Array) {
  return withDatabaseAccess(async (liveDb) => {
    const adapter = createNativeRestoreAdapter(liveDb);
    return restoreWithRecovery(bytes, adapter);
  });
}

function createNativeRestoreAdapter(liveDb: SQLiteDatabase): RestoreAdapter<SQLiteDatabase> {
  return {
    deserialize: (bytes) => deserializeDatabaseAsync(bytes),
    close: (database) => database.closeAsync(),
    validate: async (database) => {
      await validateBackupDatabase(database);
    },
    migrate: runMigrations,
    serializeLive: () => liveDb.serializeAsync(),
    persistRecovery: persistRecoverySnapshot,
    createVerificationToken: () => `restore-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    writeVerificationToken: async (database, token) => {
      await database.runAsync(
        `INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [RESTORE_TOKEN_KEY, token],
      );
    },
    copyToLive: async (database) => {
      await backupDatabaseAsync({
        sourceDatabase: database,
        sourceDatabaseName: 'main',
        destDatabase: liveDb,
        destDatabaseName: 'main',
      });
    },
    verifyLive: async (token) => {
      await validateBackupDatabase(liveDb);
      const marker = await liveDb.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_meta WHERE key = ?`,
        [RESTORE_TOKEN_KEY],
      );
      if (marker?.value !== token) {
        throw new Error('La copia no se aplicó completamente');
      }
    },
    clearLiveVerificationToken: async (token) => {
      await liveDb.runAsync(
        `DELETE FROM app_meta WHERE key = ? AND value = ?`,
        [RESTORE_TOKEN_KEY, token],
      );
      const marker = await liveDb.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_meta WHERE key = ?`,
        [RESTORE_TOKEN_KEY],
      );
      if (marker) {
        throw new Error('No se pudo limpiar la marca de verificación');
      }
    },
    advanceGeneration: advanceDatabaseGeneration,
    blockDatabaseOperations,
  };
}

async function persistRecoverySnapshot(bytes: Uint8Array): Promise<string> {
  const directory = new Directory(Paths.document, BACKUP_DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  const filename = `pre-restore-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`;
  const file = new File(directory, filename);
  file.create({ overwrite: false, intermediates: true });
  file.write(bytes);

  if (!file.exists || file.info().size !== bytes.byteLength) {
    throw new Error('No se pudo guardar la copia de recuperación');
  }

  return file.uri;
}
