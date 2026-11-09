import { NewSupplier, Supplier } from '../domain/types';

export interface SupplierRepository {
  list(): Promise<Supplier[]>;
  findById(id: number): Promise<Supplier | null>;
  create(input: NewSupplier): Promise<Supplier>;
  update(id: number, input: NewSupplier): Promise<Supplier | null>;
  remove(id: number): Promise<void>;
}