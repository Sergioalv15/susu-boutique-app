# Purchase-cost stock subgroups
Feature: distinguish purchase-cost subgroups inside a sale-price group and let sellers select one at checkout.
Risk: item 1 (stock and sale cost provenance); item 2 (purchase-cost confidentiality); item 4 (concurrent stock allocation).

## Specs
- S1: “tenemos que hacer sub-grupos dentro de cada grupo de euros. Es decir, 20 unidades de anillos a 5 euros comprados a 2,50 no son lo mismo que 20 unidades a 5 euros comprados a 1,50. Actualmente la app une esos dos independientemente del precio de compra de cada unidad”
- S2: “espera, mejor que esten separados en inventario y a la hora de vender se seleccione de que subgrupo viene la venta”
- S3: Selected access behavior: “Owner y staff, con etiquetas neutras” — “Owner y staff eligen subgrupo sin mostrar el coste en euros; `staff` sí verá cantidades separadas por subgrupo.”

## Tasks
- T1 — S1–S3 — Expose purchase-cost subgroups from existing stock lots and show them inside each inventory sale-price group; retain cost visibility for owners only — done (focused subgroup/store tests 32/32; typecheck and diff check pass) — inline — commit: pending.
- T2 — S2–S3 — Add subgroup selection to the sale line and cart; show neutral subgroup/count labels to staff and purchase-cost labels to owners — in_progress — inline — commit: pending.
- T3 — S2–S3 — Constrain SQLite and Supabase sale transactions to the chosen subgroup, preserve FIFO within that subgroup, request idempotency, and legacy no-subgroup callers — pending — inline — commit: pending.
- T4 — S1–S3 — Verify subgroup access, stale-stock and concurrent sale behavior; run the full checks and independent security review — pending — independent verifier — commit: pending.

## Log
- L1: tenemos que hacer sub-grupos dentro de cada grupo de euros. Es decir, 20 unidades de anillos a 5 euros comprados a 2,50 no son lo mismo que 20 unidades a 5 euros comprados a 1,50. Actualmente la app une esos dos independientemente del precio de compra de cada unidad
- L2: espera, mejor que esten separados en inventario y a la hora de vender se seleccione de que subgrupo viene la venta
- L3: User selected `Owner y staff, con etiquetas neutras`: both roles select the source subgroup; staff sees subgroup counts but no euro purchase costs.
- L4: Verified branch `feat/manejo-precios-grupo` was clean before implementation. Existing `store_price_groups` is unique by business/category/sale price; `store_stock_lots` already stores `unit_cost_cents` per receipt. Inventory currently displays a single aggregate group and the sale RPC consumes FIFO across all lots for that group. The read-only explorer attempt was cancelled before returning evidence; parent used bounded inline reads instead.
- L5: Technical direction: aggregate remaining lots by unit purchase cost for subgroup display; use an opaque subgroup token rather than sending the cost value to staff. A selected sale consumes FIFO only within that subgroup; omitted subgroup selection preserves legacy FIFO behavior.
- L6: Test-first RED: `npm test -- src/features/store/infrastructure/SQLiteStoreRepository.test.ts src/features/store/infrastructure/SupabaseStoreAccess.test.ts` first failed because the SQLite subgroup method was not implemented; 25 existing tests passed.
- L7: After adding the local subgroup aggregation, SQLite tests pass; the Supabase role-boundary test initially failed as expected because `public.list_store_stock_subgroups(bigint)` was not yet in the migration chain. `npm run typecheck` found one existing `StoreRepository` mock missing the new method; the fixture was updated.
- L8: Added `public.list_store_stock_subgroups(bigint)` in `supabase/migrations/20261115110000_list_store_stock_subgroups.sql`; owners receive exact unit costs, staff receive the same subgroup ids/counts with all euro costs masked, and nonmembers are denied. The focused SQLite/service/PGlite tests pass (30/30) and `npm run typecheck` passes. LSP returned no diagnostics but its 2-file scan was inconclusive.
- L9: Test-first RED for the display privacy helper: `src/features/store/domain/stockCostSubgroups.test.ts` failed to import `stockCostSubgroups` until implemented. The expected cases distinguish known/free/unknown costs for owners and ensure staff receives neutral labels without a cost property.
- L10: Implemented `describeStockCostSubgroup`; its focused tests pass (2/2) and `npm run typecheck` passes. The UI descriptor omits cost entirely for staff. Inventory rendering is still pending.
- L11: T1 is implemented: SQLite and Supabase subgroup queries group remaining lots by cost, SQL returns exact costs only for owners and neutral subgroup counts to staff, and the Store group detail renders the breakdown. Focused SQLite/service/PGlite/privacy tests pass (32/32), typecheck and diff check pass. No hosted Supabase calls were made.
