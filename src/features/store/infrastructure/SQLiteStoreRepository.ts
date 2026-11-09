import { withDatabaseAccess } from '../../../core/storage/sqlite';
import { toIsoDate } from '../../../core/utils/date';
import {
  AddStoreStockInput,
  CompleteSaleInput,
  CreateCategoryInput,
  CreatePriceGroupInput,
  ReceiveStockInput,
  SaleReceipt,
  StockMovement,
  StoreCategory,
  StorePriceGroup,
  StoreStockItem,
  TodaySalesSummary,
} from '../domain/types';
import { StoreRepository } from '../application/StoreRepository';

type CategoryRow = {
  id: number;
  name: string;
  sort_order: number;
};

type PriceGroupRow = {
  id: number;
  category_id: number;
  price_cents: number;
  stock_units: number;
  sort_order: number;
  photo_data_url: string;
};

type StockItemRow = PriceGroupRow & {
  category_name: string;
};

type StockMovementRow = {
  id: number;
  category_name: string;
  price_cents: number;
  movement_type: StockMovement['movementType'];
  units_delta: number;
  supplier_name: string | null;
  note: string;
  created_at: string;
};

function mapCategory(row: CategoryRow): StoreCategory {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

function mapPriceGroup(row: PriceGroupRow): StorePriceGroup {
  return {
    id: row.id,
    categoryId: row.category_id,
    priceCents: row.price_cents,
    stockUnits: row.stock_units,
    sortOrder: row.sort_order,
    photoDataUrl: row.photo_data_url,
  };
}

function mapStockItem(row: StockItemRow): StoreStockItem {
  return { ...mapPriceGroup(row), categoryName: row.category_name };
}

function mapStockMovement(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    categoryName: row.category_name,
    priceCents: row.price_cents,
    movementType: row.movement_type,
    unitsDelta: row.units_delta,
    supplierName: row.supplier_name,
    note: row.note,
    createdAt: row.created_at,
  };
}

function localTimestamp(date = new Date()): string {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  return `${toIsoDate(date)}T${time}`;
}

export class SQLiteStoreRepository implements StoreRepository {
  async listCategories(): Promise<StoreCategory[]> {
    const rows = await withDatabaseAccess((db) => db.getAllAsync<CategoryRow>(
      `SELECT id, name, sort_order
       FROM store_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, name COLLATE NOCASE ASC`,
    ));
    return rows.map(mapCategory);
  }

  async listStockItems(): Promise<StoreStockItem[]> {
    const rows = await withDatabaseAccess((db) => db.getAllAsync<StockItemRow>(
      `SELECT price_group.id, price_group.category_id, price_group.price_cents,
              price_group.stock_units, price_group.sort_order,
              price_group.photo_data_url, category.name AS category_name
       FROM store_price_groups AS price_group
       JOIN store_categories AS category ON category.id = price_group.category_id
       WHERE price_group.is_active = 1 AND category.is_active = 1
       ORDER BY category.sort_order ASC, category.name COLLATE NOCASE ASC,
                price_group.price_cents ASC`,
    ));
    return rows.map(mapStockItem);
  }

  async createCategory(input: CreateCategoryInput): Promise<StoreCategory> {
    return withDatabaseAccess(async (db) => {
      const order = await db.getFirstAsync<{ next_order: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM store_categories',
      );
      const result = await db.runAsync(
        'INSERT INTO store_categories (name, sort_order) VALUES (?, ?)',
        [input.name, order?.next_order ?? 0],
      );
      return { id: result.lastInsertRowId, name: input.name, sortOrder: order?.next_order ?? 0 };
    });
  }

  async listPriceGroups(categoryId: number): Promise<StorePriceGroup[]> {
    const rows = await withDatabaseAccess((db) => db.getAllAsync<PriceGroupRow>(
      `SELECT id, category_id, price_cents, stock_units, sort_order, photo_data_url
       FROM store_price_groups
       WHERE category_id = ? AND is_active = 1
       ORDER BY sort_order ASC, price_cents ASC`,
      [categoryId],
    ));
    return rows.map(mapPriceGroup);
  }

  async createPriceGroup(input: CreatePriceGroupInput): Promise<StorePriceGroup> {
    return withDatabaseAccess(async (db) => {
      const order = await db.getFirstAsync<{ next_order: number }>(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
         FROM store_price_groups WHERE category_id = ?`,
        [input.categoryId],
      );
      const sortOrder = order?.next_order ?? 0;
      const result = await db.runAsync(
        `INSERT INTO store_price_groups (category_id, price_cents, sort_order, photo_data_url)
         VALUES (?, ?, ?, ?)`,
        [input.categoryId, input.priceCents, sortOrder, input.photoDataUrl ?? ''],
      );
      return {
        id: result.lastInsertRowId,
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        stockUnits: 0,
        sortOrder,
        photoDataUrl: input.photoDataUrl ?? '',
      };
    });
  }

  async addStock(input: AddStoreStockInput): Promise<StorePriceGroup> {
    return withDatabaseAccess(async (db) => {
      let updatedGroup: StorePriceGroup | null = null;
      const createdAt = localTimestamp();

      await db.withTransactionAsync(async () => {
        const category = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM store_categories WHERE id = ? AND is_active = 1',
          [input.categoryId],
        );
        if (!category) throw new Error('El tipo de joya ya no está disponible.');

        const existing = await db.getFirstAsync<PriceGroupRow>(
          `SELECT id, category_id, price_cents, stock_units, sort_order, photo_data_url
           FROM store_price_groups
           WHERE category_id = ? AND price_cents = ? AND is_active = 1`,
          [input.categoryId, input.priceCents],
        );

        if (existing) {
          const photoDataUrl = input.photoDataUrl ?? existing.photo_data_url;
          await db.runAsync(
            `UPDATE store_price_groups
             SET stock_units = stock_units + ?, photo_data_url = ?
             WHERE id = ?`,
            [input.units, photoDataUrl, existing.id],
          );
          await db.runAsync(
            `INSERT INTO store_stock_movements
              (price_group_id, movement_type, units_delta, note, created_at)
             VALUES (?, 'entrada', ?, '', ?)`,
            [existing.id, input.units, createdAt],
          );
          updatedGroup = mapPriceGroup({
            ...existing,
            stock_units: existing.stock_units + input.units,
            photo_data_url: photoDataUrl,
          });
          return;
        }

        const order = await db.getFirstAsync<{ next_order: number }>(
          `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
           FROM store_price_groups WHERE category_id = ?`,
          [input.categoryId],
        );
        const sortOrder = order?.next_order ?? 0;
        const photoDataUrl = input.photoDataUrl ?? '';
        const result = await db.runAsync(
          `INSERT INTO store_price_groups
            (category_id, price_cents, stock_units, sort_order, photo_data_url)
           VALUES (?, ?, ?, ?, ?)`,
          [input.categoryId, input.priceCents, input.units, sortOrder, photoDataUrl],
        );
        await db.runAsync(
          `INSERT INTO store_stock_movements
            (price_group_id, movement_type, units_delta, note, created_at)
           VALUES (?, 'entrada', ?, '', ?)`,
          [result.lastInsertRowId, input.units, createdAt],
        );
        updatedGroup = {
          id: result.lastInsertRowId,
          categoryId: input.categoryId,
          priceCents: input.priceCents,
          stockUnits: input.units,
          sortOrder,
          photoDataUrl,
        };
      });

      if (!updatedGroup) throw new Error('No se pudo agregar el stock.');
      return updatedGroup;
    });
  }

  async receiveStock(input: ReceiveStockInput): Promise<StorePriceGroup> {
    return withDatabaseAccess(async (db) => {
      let updatedGroup: StorePriceGroup | null = null;
      const createdAt = localTimestamp();

      await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<PriceGroupRow>(
          `SELECT id, category_id, price_cents, stock_units, sort_order, photo_data_url
           FROM store_price_groups
           WHERE id = ? AND is_active = 1`,
          [input.priceGroupId],
        );
        if (!row) throw new Error('El grupo de precio ya no está disponible.');

        await db.runAsync(
          'UPDATE store_price_groups SET stock_units = stock_units + ? WHERE id = ?',
          [input.units, input.priceGroupId],
        );
        await db.runAsync(
          `INSERT INTO store_stock_movements
            (price_group_id, movement_type, units_delta, supplier_id, note, created_at)
           VALUES (?, 'entrada', ?, ?, ?, ?)`,
          [input.priceGroupId, input.units, input.supplierId, input.note, createdAt],
        );
        updatedGroup = mapPriceGroup({ ...row, stock_units: row.stock_units + input.units });
      });

      if (!updatedGroup) throw new Error('No se pudo actualizar el stock.');
      return updatedGroup;
    });
  }

  async completeSale(input: CompleteSaleInput): Promise<SaleReceipt> {
    return withDatabaseAccess(async (db) => {
      let receipt: SaleReceipt | null = null;
      const soldAt = localTimestamp();

      await db.withTransactionAsync(async () => {
        const group = await db.getFirstAsync<PriceGroupRow>(
          `SELECT id, category_id, price_cents, stock_units, sort_order, photo_data_url
           FROM store_price_groups
           WHERE id = ? AND is_active = 1`,
          [input.priceGroupId],
        );
        if (!group) throw new Error('El grupo de precio ya no está disponible.');
        if (group.stock_units < input.units) {
          throw new Error(`Solo quedan ${group.stock_units} unidades disponibles.`);
        }

        const totalCents = group.price_cents * input.units;
        const sale = await db.runAsync(
          'INSERT INTO store_sales (sold_at, total_cents) VALUES (?, ?)',
          [soldAt, totalCents],
        );
        await db.runAsync(
          `INSERT INTO store_sale_items
            (sale_id, price_group_id, units_sold, unit_price_cents, total_cents)
           VALUES (?, ?, ?, ?, ?)`,
          [sale.lastInsertRowId, input.priceGroupId, input.units, group.price_cents, totalCents],
        );
        await db.runAsync(
          'UPDATE store_price_groups SET stock_units = stock_units - ? WHERE id = ?',
          [input.units, input.priceGroupId],
        );
        await db.runAsync(
          `INSERT INTO store_stock_movements
            (price_group_id, movement_type, units_delta, sale_id, created_at)
           VALUES (?, 'venta', ?, ?, ?)`,
          [input.priceGroupId, -input.units, sale.lastInsertRowId, soldAt],
        );
        receipt = {
          saleId: sale.lastInsertRowId,
          unitsSold: input.units,
          unitPriceCents: group.price_cents,
          totalCents,
          remainingUnits: group.stock_units - input.units,
        };
      });

      if (!receipt) throw new Error('No se pudo registrar la venta.');
      return receipt;
    });
  }

  async getTodaySummary(date: string): Promise<TodaySalesSummary> {
    const row = await withDatabaseAccess((db) => db.getFirstAsync<{
      total_cents: number | null;
      units_sold: number | null;
    }>(
      `SELECT COALESCE(SUM(sale.total_cents), 0) AS total_cents,
              COALESCE(SUM(item.units_sold), 0) AS units_sold
       FROM store_sales AS sale
       LEFT JOIN store_sale_items AS item ON item.sale_id = sale.id
       WHERE substr(sale.sold_at, 1, 10) = ?`,
      [date],
    ));

    return {
      totalCents: row?.total_cents ?? 0,
      unitsSold: row?.units_sold ?? 0,
    };
  }

  async listRecentMovements(limit = 30): Promise<StockMovement[]> {
    const normalizedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    const rows = await withDatabaseAccess((db) => db.getAllAsync<StockMovementRow>(
      `SELECT movement.id,
              category.name AS category_name,
              price_group.price_cents,
              movement.movement_type,
              movement.units_delta,
              supplier.name AS supplier_name,
              movement.note,
              movement.created_at
       FROM store_stock_movements AS movement
       JOIN store_price_groups AS price_group ON price_group.id = movement.price_group_id
       JOIN store_categories AS category ON category.id = price_group.category_id
       LEFT JOIN suppliers AS supplier ON supplier.id = movement.supplier_id
       ORDER BY movement.created_at DESC, movement.id DESC
       LIMIT ?`,
      [normalizedLimit],
    ));
    return rows.map(mapStockMovement);
  }
}
