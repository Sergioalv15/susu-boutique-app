import { validateSupplier } from '../domain/validation';
import { NewSupplier, Supplier, SupplierFormValues } from '../domain/types';
import { SupplierRepository } from './SupplierRepository';

export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  async list(): Promise<Supplier[]> {
    return this.repository.list();
  }

  async findById(id: number): Promise<Supplier | null> {
    return this.repository.findById(id);
  }

  async create(values: SupplierFormValues): Promise<Supplier> {
    const validation = validateSupplier(values);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const input: NewSupplier = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
    };

    return this.repository.create(input);
  }

  async update(id: number, values: SupplierFormValues): Promise<Supplier | null> {
    const validation = validateSupplier(values);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const input: NewSupplier = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      notes: values.notes.trim(),
    };

    return this.repository.update(id, input);
  }

  async remove(id: number): Promise<void> {
    await this.repository.remove(id);
  }
}