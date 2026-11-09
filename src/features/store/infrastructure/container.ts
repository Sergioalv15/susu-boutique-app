import { StoreService } from '../application/StoreService';
import { SQLiteStoreRepository } from './SQLiteStoreRepository';

export const storeService = new StoreService(new SQLiteStoreRepository());
