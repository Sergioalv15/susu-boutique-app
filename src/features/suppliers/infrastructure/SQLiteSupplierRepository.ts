import { withDatabaseAccess } from '../../../core/storage/sqlite';
import { toIsoDate } from '../../../core/utils/date';
import { SupplierRepository } from '../application/SupplierRepository';
import { NewSupplier, Supplier } from '../domain/types';

type SupplierRow = {
  id: number;
  name: string;
  phone: string;
  notes: string;
  created_at: string;
};

function mapRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export class SQLiteSupplierRepository implements SupplierRepository {
  async list(): Promise<Supplier[]> {
    const rows = await withDatabaseAccess((db) =>
      db.getAllAsync<SupplierRow>(
        `SELECT id, name, phone, notes, created_at FROM suppliers ORDER BY name COLLATE NOCASE ASC`
      )
    );

    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Supplier | null> {
    const row = await withDatabaseAccess((db) =>
      db.getFirstAsync<SupplierRow>(
        `SELECT id, name, phone, notes, created_at FROM suppliers WHERE id = ?`,
        [id]
      )
    );

    return row ? mapRow(row) : null;
  }

  async create(input: NewSupplier): Promise<Supplier> {
    const createdAt = toIsoDate(new Date());
    const result = await withDatabaseAccess((db) =>
      db.runAsync(
        `INSERT INTO suppliers (name, phone, notes, created_at) VALUES (?, ?, ?, ?)`,
        [input.name, input.phone, input.notes, createdAt]
      )
    );

    return {
      id: result.lastInsertRowId,
      name: input.name,
      phone: input.phone,
      notes: input.notes,
      createdAt,
    };
  }

  async update(id: number, input: NewSupplier): Promise<Supplier | null> {
    const row = await withDatabaseAccess(async (db) => {
      await db.runAsync(
        `UPDATE suppliers SET name = ?, phone = ?, notes = ? WHERE id = ?`,
        [input.name, input.phone, input.notes, id]
      );

      return db.getFirstAsync<SupplierRow>(
        `SELECT id, name, phone, notes, created_at FROM suppliers WHERE id = ?`,
        [id]
      );
    });

    return row ? mapRow(row) : null;
  }

  async remove(id: number): Promise<void> {
    await withDatabaseAccess((db) => db.runAsync(`DELETE FROM suppliers WHERE id = ?`, [id]));
  }
}
