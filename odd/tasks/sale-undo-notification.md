# Sale Undo Notification
Branch: `feat/manejo-precios-grupo`.
Scope: Provide a temporary undo action for a completed sale while preserving sales and stock-movement history.

## Specs
- S1: “Necesito poder hacer undo de las compras. Es decir: En venta, al realizar una venta, quiero que aparezca una notificacion para poder deshacer la ultima venta que se hizo.”
- S2: “Lotes FIFO exactos”

## Tasks
- T1 — S1–S2 — Persist exact FIFO lot allocations and add an idempotent, authorized audit reversal that restores those lots, preserves original sales/movements, and excludes reversed sales from net summaries — done (focused PGlite undo/history/security cases and two sale regressions pass) — inline — commit: pending.
- T2 — S1 — Add a temporary, sale-bound “Deshacer” notification action; refresh stock and owner summary after reversal — in_progress — inline — commit: pending.
- T3 — S1–S2 — Verify exact restoration, authorization, idempotency, history, summary, and concurrency behavior; run suite/typecheck/web build and independent review — pending — inline + independent verifier — commit: pending.

## Log
- L1: Necesito poder hacer undo de las compras. Es decir: En venta, al realizar una venta, quiero que aparezca una notificacion para poder deshacer la ultima venta que se hizo.
- L2: User selected “Lotes FIFO exactos” for stock restoration.
- L3: Inherit the prior user decision in `odd/tasks/supabase-only-data-backup-crud.md` L2: sales and stock movements stay append-only; undo must be a compensating reversal, not deletion.
- L4: Exploration found that current sale receipts and sale rows do not persist exact per-lot consumption. Exact FIFO restoration therefore requires allocation records written atomically with each new sale before the undo action is enabled.
- L5: No hosted Supabase access or migration application. Preserve the existing uncommitted `app.json` change.
- L6: The earlier independent verifier setup failed before probes; no new review attempt is authorized by this feature request alone.
- L7: Combined allocation persistence and the reversal RPC into one backend task so RED/GREEN coverage can exercise exact restoration through the public sale/undo interface rather than reading internal allocation tables.
- L8: Added public PGlite end-to-end cases for exact FIFO restoration, retry/idempotency, actor authorization, and net summaries. The initial full-file focused run timed out at 30 seconds before results; a single exact-lot case then produced RED because `public.undo_store_sale(bigint)` is not implemented. No production code changed before RED.
- L9: Added `supabase/migrations/20261120100000_sale_undo.sql` with per-lot allocation capture, creator identity, authenticated reversal, append-only stock adjustments, and net-summary filtering. Focused GREEN verification was pending.
- L10: Focused PGlite GREEN checks now pass for exact FIFO-lot/subgroup restoration, append-only reversal movements, idempotent retry, creator authorization, staff-safe receipt, anonymous privilege denial, expired-window rejection, and net-summary filtering. Two existing staff receipt/retry and subgroup-sale regressions also pass.
- L11: T1's backend slice is one high-risk SQL/API work unit (617-line migration plus focused PGlite tests), kept together because exact lot capture, reversal, authorization, append-only movements, and net summaries are verified end-to-end. Risk: item 1 (inventory/financial data), item 2 (authorization/privacy), and item 4 (concurrent stock operations). No hosted migration was applied; the UI is a separate following slice.