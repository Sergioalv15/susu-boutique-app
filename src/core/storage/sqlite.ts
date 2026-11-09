import * as SQLite from 'expo-sqlite';
import { runMigrations } from './sqliteMigrations';
import {
  advanceDatabaseGeneration,
  blockDatabaseOperations,
  getDatabaseGeneration,
  runDatabaseOperation,
  subscribeDatabaseGeneration,
} from './databaseCoordinator';

const DB_NAME = 'susu-boutique.db';

let singletonDb: SQLite.SQLiteDatabase | null = null;
let initialized = false;
let initializationPromise: Promise<void> | null = null;

async function getSingletonDb(): Promise<SQLite.SQLiteDatabase> {
  if (!singletonDb) {
    singletonDb = await SQLite.openDatabaseAsync(DB_NAME);
  }

  return singletonDb;
}

export async function initializeDatabase(): Promise<void> {
  await withDatabaseAccess(async () => undefined);
}

async function initializeDatabaseUnsafe(db: SQLite.SQLiteDatabase): Promise<void> {
  if (initialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await runMigrations(db);
    initialized = true;
  })().catch((error) => {
    initializationPromise = null;
    throw error;
  });

  await initializationPromise;
}

export async function withDatabaseAccess<T>(
  operation: (db: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return runDatabaseOperation(async () => {
    const db = await getSingletonDb();
    await initializeDatabaseUnsafe(db);
    return operation(db);
  });
}

export {
  advanceDatabaseGeneration,
  blockDatabaseOperations,
  getDatabaseGeneration,
  subscribeDatabaseGeneration,
};
