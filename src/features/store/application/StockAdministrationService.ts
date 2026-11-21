import {
  CorrectStockSubgroupCostInput,
  CorrectStockSubgroupCostResult,
  RemoveStockSubgroupInput,
  RemoveStockSubgroupResult,
  StockAdministrationRepository,
  StockLifecycleResult,
  StockPriceGroupUpdateInput,
  StockPriceGroupUpdateResult,
} from './StockAdministrationRepository';
import { StoreCategory } from '../domain/types';

function positiveId(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`El identificador de ${label} no es válido.`);
}

function validSubgroupId(value: string): void {
  if (!/^[1-9]\d*$/.test(value)) throw new RangeError('El subgrupo de compra no es válido.');
}

export class StockAdministrationService {
  constructor(private readonly repository: StockAdministrationRepository) {}

  updateCategory(id: number, name: string): Promise<StoreCategory> {
    positiveId(id, 'tipo de joya');
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName.length > 40) {
      throw new RangeError('El nombre debe tener entre 1 y 40 caracteres.');
    }
    return this.repository.updateCategory(id, normalizedName);
  }

  deleteCategory(id: number): Promise<StockLifecycleResult> {
    positiveId(id, 'tipo de joya');
    return this.repository.deleteCategory(id);
  }

  updatePriceGroup(input: StockPriceGroupUpdateInput): Promise<StockPriceGroupUpdateResult> {
    positiveId(input.priceGroupId, 'grupo de precio');
    if (!Number.isSafeInteger(input.priceCents) || input.priceCents <= 0) {
      throw new RangeError('El precio debe ser mayor que cero.');
    }
    if (!Number.isSafeInteger(input.sortOrder) || input.sortOrder < 0) {
      throw new RangeError('El orden del grupo no es válido.');
    }
    if (input.photoDataUrl && input.photoDataUrl.length > 4_000_000) {
      throw new RangeError('La imagen es demasiado grande. Elige una imagen más ligera.');
    }
    return this.repository.updatePriceGroup(input);
  }

  deletePriceGroup(id: number): Promise<StockLifecycleResult> {
    positiveId(id, 'grupo de precio');
    return this.repository.deletePriceGroup(id);
  }

  removeSubgroupUnits(input: RemoveStockSubgroupInput): Promise<RemoveStockSubgroupResult> {
    positiveId(input.priceGroupId, 'grupo de precio');
    validSubgroupId(input.subgroupId);
    if (!Number.isSafeInteger(input.units) || input.units <= 0) {
      throw new RangeError('Las unidades a retirar deben ser un entero mayor que cero.');
    }
    const note = input.note.trim();
    if (note.length > 200) throw new RangeError('La nota no puede superar los 200 caracteres.');
    return this.repository.removeSubgroupUnits({ ...input, note });
  }

  correctSubgroupCost(input: CorrectStockSubgroupCostInput): Promise<CorrectStockSubgroupCostResult> {
    positiveId(input.priceGroupId, 'grupo de precio');
    validSubgroupId(input.subgroupId);
    if (input.unitCostCents !== null && (!Number.isSafeInteger(input.unitCostCents) || input.unitCostCents < 0)) {
      throw new RangeError('El coste debe ser cero o mayor y expresarse en céntimos enteros.');
    }
    return this.repository.correctSubgroupCost(input);
  }
}
