import { getSupabaseClient } from '../../../core/backend/supabaseClient';
import { getCurrentBusinessId, removeProductImage, uploadProductImage } from './SupabaseStoreRepository';
import { StoreCategory } from '../domain/types';
import {
  CorrectStockSubgroupCostInput,
  CorrectStockSubgroupCostResult,
  RemoveStockSubgroupInput,
  RemoveStockSubgroupResult,
  StockAdministrationRepository,
  StockLifecycleResult,
  StockPriceGroupUpdateInput,
  StockPriceGroupUpdateResult,
} from '../application/StockAdministrationRepository';

function safeInteger(value: number | string, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error(`El valor de ${label} supera el límite permitido.`);
  return result;
}

function lifecycleResult(value: unknown): StockLifecycleResult {
  const row = value as { id: number | string; status: string; adjustedUnits: number | string };
  if (row.status !== 'deleted' && row.status !== 'archived') {
    throw new Error('Supabase devolvió un estado de archivo no válido.');
  }
  return {
    id: safeInteger(row.id, 'grupo'),
    status: row.status,
    adjustedUnits: safeInteger(row.adjustedUnits, 'unidades ajustadas'),
  };
}

export class SupabaseStockAdministrationRepository implements StockAdministrationRepository {
  async updateCategory(id: number, name: string): Promise<StoreCategory> {
    const { data, error } = await getSupabaseClient().rpc('update_store_category', {
      p_category_id: id,
      p_name: name,
    });
    if (error) throw error;
    const row = data as { id: number | string; name: string; sortOrder: number };
    return { id: safeInteger(row.id, 'tipo de joya'), name: row.name, sortOrder: row.sortOrder };
  }

  async deleteCategory(id: number): Promise<StockLifecycleResult> {
    const { data, error } = await getSupabaseClient().rpc('delete_store_category', { p_category_id: id });
    if (error) throw error;
    return lifecycleResult(data);
  }

  async updatePriceGroup(input: StockPriceGroupUpdateInput): Promise<StockPriceGroupUpdateResult> {
    const businessId = input.photoDataUrl ? await getCurrentBusinessId() : null;
    const photoPath = input.photoDataUrl && businessId
      ? await uploadProductImage(input.photoDataUrl, businessId)
      : null;
    let data: unknown;
    try {
      const result = await getSupabaseClient().rpc('update_store_price_group', {
        p_price_group_id: input.priceGroupId,
        p_price_cents: input.priceCents,
        p_sort_order: input.sortOrder,
        p_photo_path: photoPath,
      });
      if (result.error) throw result.error;
      data = result.data;
    } catch (error) {
      if (photoPath) await removeProductImage(photoPath).catch(() => undefined);
      throw error;
    }
    const row = data as {
      id: number | string;
      previousGroupId: number | string;
      categoryId: number | string;
      priceCents: number | string;
      stockUnits: number | string;
      sortOrder: number | string;
      photoPath: string;
      status: string;
    };
    if (row.status !== 'updated' && row.status !== 'versioned') {
      throw new Error('Supabase devolvió un estado de grupo no válido.');
    }
    return {
      id: safeInteger(row.id, 'grupo de precio'),
      previousGroupId: safeInteger(row.previousGroupId, 'grupo anterior'),
      categoryId: safeInteger(row.categoryId, 'tipo de joya'),
      priceCents: safeInteger(row.priceCents, 'precio'),
      stockUnits: safeInteger(row.stockUnits, 'unidades'),
      sortOrder: safeInteger(row.sortOrder, 'orden'),
      photoPath: row.photoPath,
      status: row.status,
    };
  }

  async deletePriceGroup(id: number): Promise<StockLifecycleResult> {
    const { data, error } = await getSupabaseClient().rpc('delete_store_price_group', { p_price_group_id: id });
    if (error) throw error;
    return lifecycleResult(data);
  }

  async removeSubgroupUnits(input: RemoveStockSubgroupInput): Promise<RemoveStockSubgroupResult> {
    const { data, error } = await getSupabaseClient().rpc('remove_store_stock_subgroup_units', {
      p_price_group_id: input.priceGroupId,
      p_subgroup_id: input.subgroupId,
      p_units: input.units,
      p_note: input.note,
    });
    if (error) throw error;
    const row = data as {
      priceGroupId: number | string;
      subgroupId: string;
      unitsRemoved: number | string;
      stockUnits: number | string;
      costTotalCents: number | string | null;
    };
    return {
      priceGroupId: safeInteger(row.priceGroupId, 'grupo de precio'),
      subgroupId: row.subgroupId,
      unitsRemoved: safeInteger(row.unitsRemoved, 'unidades retiradas'),
      stockUnits: safeInteger(row.stockUnits, 'unidades restantes'),
      costTotalCents: row.costTotalCents == null ? null : safeInteger(row.costTotalCents, 'coste retirado'),
    };
  }

  async correctSubgroupCost(input: CorrectStockSubgroupCostInput): Promise<CorrectStockSubgroupCostResult> {
    const { data, error } = await getSupabaseClient().rpc('correct_store_stock_subgroup_cost', {
      p_price_group_id: input.priceGroupId,
      p_subgroup_id: input.subgroupId,
      p_new_unit_cost_cents: input.unitCostCents,
    });
    if (error) throw error;
    const row = data as {
      priceGroupId: number | string;
      previousSubgroupId: string;
      subgroupId: string;
      unitsMoved: number | string;
      previousUnitCostCents: number | string | null;
      unitCostCents: number | string | null;
    };
    return {
      priceGroupId: safeInteger(row.priceGroupId, 'grupo de precio'),
      previousSubgroupId: row.previousSubgroupId,
      subgroupId: row.subgroupId,
      unitsMoved: safeInteger(row.unitsMoved, 'unidades corregidas'),
      previousUnitCostCents: row.previousUnitCostCents == null ? null : safeInteger(row.previousUnitCostCents, 'coste anterior'),
      unitCostCents: row.unitCostCents == null ? null : safeInteger(row.unitCostCents, 'coste nuevo'),
    };
  }
}
