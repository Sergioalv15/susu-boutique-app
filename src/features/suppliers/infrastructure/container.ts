import { SupplierService } from '../application/SupplierService';
import { SQLiteSupplierRepository } from './SQLiteSupplierRepository';

const supplierRepository = new SQLiteSupplierRepository();

export const supplierService = new SupplierService(supplierRepository);
