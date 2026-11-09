# Susu’s Boutique

Local-first sales and stock app for the boutique. The current development build follows three areas: **Venta**, **Tienda**, and **Logística**.

## Current flow

- **Venta:** choose a category and price group, count sold units, review remaining stock, then tap **LISTO** to save the sale and deduct stock.
- **Tienda:** manage categories and add price groups.
- **Logística:** receive stock, optionally associate a supplier, and review recent stock movements.
- **Proveedores:** the existing supplier list and forms are reused from the previous app.

The starter catalog contains Anillos, Collares, Pulseras, and Pendientes. Stock is kept per category/price group, with one representative photo per group; adding to an existing group increases its stock rather than creating a duplicate.

## Development

```bash
npm install
npm run web
npm run android   # or: npm run ios
npm run typecheck
npm test
```

## Data and Supabase

- Development data is stored locally in `susu-boutique.db` using `expo-sqlite`.
- The previous `appjorge.db` remains untouched. Its records are not shown or imported.
- The earlier Supabase schema was for the previous finance tracker. It is not connected to the new store model and must be redesigned before enabling shared online data.
- See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the status and next steps of the later online phase.

## Structure

- `app/(drawer)/` — the three main Expo Router tabs.
- `src/features/store/` — local catalog, sales, inventory movements, service, repository, and screens.
- `src/features/suppliers/` — reused supplier management.
- `src/core/storage/` — SQLite access and schema migrations.
- `src/ui/` — shared theme and components.
