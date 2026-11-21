import { StoreService } from '../application/StoreService';
import { StockAdministrationService } from '../application/StockAdministrationService';
import { SupabaseStoreRepository } from './SupabaseStoreRepository';
import { SupabaseStockAdministrationRepository } from './SupabaseStockAdministrationRepository';

export const storeService = new StoreService(new SupabaseStoreRepository());
export const stockAdministrationService = new StockAdministrationService(new SupabaseStockAdministrationRepository());
