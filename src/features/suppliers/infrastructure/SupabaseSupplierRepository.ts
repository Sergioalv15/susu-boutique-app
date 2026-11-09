import { getSupabaseClient } from '../../../core/backend/supabaseClient';
import { SUSU_BOUTIQUE_BUSINESS_ID } from '../../../core/backend/config';
import { SupplierRepository } from '../application/SupplierRepository';
import { NewSupplier, Supplier } from '../domain/types';

type SupplierRow = {
  id: number | string;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
};

function mapRow(row: SupplierRow): Supplier {
  return {
    id: Number(row.id),
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export class SupabaseSupplierRepository implements SupplierRepository {
  async list(): Promise<Supplier[]> {
    const { data, error } = await getSupabaseClient()
      .from('suppliers')
      .select('id,name,phone,notes,created_at')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as SupplierRow));
  }

  async findById(id: number): Promise<Supplier | null> {
    const { data, error } = await getSupabaseClient()
      .from('suppliers')
      .select('id,name,phone,notes,created_at')
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data as SupplierRow) : null;
  }

  async create(input: NewSupplier): Promise<Supplier> {
    const { data, error } = await getSupabaseClient()
      .from('suppliers')
      .insert({ business_id: SUSU_BOUTIQUE_BUSINESS_ID, ...input })
      .select('id,name,phone,notes,created_at')
      .single();

    if (error) throw error;
    return mapRow(data as SupplierRow);
  }

  async update(id: number, input: NewSupplier): Promise<Supplier | null> {
    const { data, error } = await getSupabaseClient()
      .from('suppliers')
      .update(input)
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .eq('id', id)
      .select('id,name,phone,notes,created_at')
      .maybeSingle();

    if (error) throw error;
    return data ? mapRow(data as SupplierRow) : null;
  }

  async remove(id: number): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('suppliers')
      .delete()
      .eq('business_id', SUSU_BOUTIQUE_BUSINESS_ID)
      .eq('id', id);

    if (error) throw error;
  }
}
