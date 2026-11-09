# Product Readiness

Outcome: **Not release-ready.** A read-only audit and the first financial-correctness slice are complete. Reported numbers now match the business model defined in `mission.md`; device QA and store builds have **not** been performed.

## Baseline (confirmed)

- `npm test` green before any change: **114 tests across 21 test files** (vitest 4.1.10, node env).
- `npm run typecheck` clean before any change (strict TS, typed routes).

## Slice 1 — Financial correctness (COMPLETED)

**Outcome:** `grossProfit` is now the margin (`sales × profitPercent`, rounded to cents) instead of revenue, matching `mission.md` (Beneficio bruto = Ventas − Inversión). `netProfit` is `grossProfit − additionalExpenses`, rounded to cents, **preserves negatives** and normalizes negative zero. Monthly totals and averages include loss days. `estimatedSalary` behavior is unchanged and still reported as `sales × 30%` — left as an **unresolved product naming issue** (a fixed share of sales does not account for expenses and needs a clearer label).

**Acceptance criteria (met):**
- `netProfit` shows a negative value for a loss day; never clamped at 0.
- `netProfit === 0` and `Object.is(netProfit, -0) === false` for the negative-zero edge case.
- Monthly `netProfit` and `averageDailyNetProfit` include loss days; `trackedDays` unchanged.
- Negative net values render with the minus sign via `formatCurrency`.
- No rendered `netProfit` uses the success color for a negative value; the changed summary components use `theme.colors.danger` for losses and, in the daily form, the label reads "Pérdida neta (calculada)".
- `README.md` formulas updated; nothing else touched there.
- UI copy stays Spanish; code and docs English.

**Changed files**
- `src/features/daily-records/domain/calculators.ts`
- `src/features/daily-records/domain/calculators.test.ts`
- `src/features/daily-records/application/DailyRecordService.test.ts`
- `src/features/daily-records/presentation/components/DailyRecordForm.tsx`
- `src/features/daily-records/presentation/components/MonthSummaryCard.tsx`
- `src/features/daily-records/presentation/components/OverviewCard.tsx`
- `src/features/daily-records/presentation/components/BiweeklyWindow.tsx`
- `README.md`
- `docs/PRODUCT_READINESS.md`

**Final validation:** focused tests passed (15 tests across 4 files); full `npm test` passed (117 tests across 21 files); `npm run typecheck` passed after this slice. No device or native build validation was performed.

## Slice 1.5 — Audit findings (verified) remaining

Paths are evidence-bearing findings; hypotheses are marked as such.

| # | Finding | Evidence |
|---|---------|----------|
| 1 | Restore overwrites live data without confirmation, backup of current data, or integrity/schema/version validation; no consumer refresh after restore; migrations won't re-run in-session | `src/core/storage/backup.ts`, `src/core/storage/sqlite.ts` |
| 2 | EAS iOS submit `ascAppId` is set to the bundle id `com.appjorge.mobile` instead of a numeric App Store Connect app id | `eas.json` |
| 3 | `allowBackup="true"` with a plaintext SQLite DB — **a policy/design decision, not a proven exploit** | `android/app/src/main/AndroidManifest.xml` |
| 4 | Blank saves create zero-value tracked days; no delete UI for daily records; supplier delete has no UI | `src/features/daily-records/application/DailyRecordService.ts`, suppliers feature |
| 5 | A11y/UX gaps: biweekly control buttons lack roles/labels; quincenal summaries use 9px type; loading/error screens hardcode light colors | `BiweeklyWindow.tsx`, `src/core/providers/AppProviders.tsx` |
| 6 | Dev-client manifest carries `SYSTEM_ALERT_WINDOW` + storage permissions (hypothesis: verify production EAS build does not include dev-client) | `AndroidManifest.xml` |

**Audit overclaims corrected:** 21 test files, not 25. Supplier delete has no UI (correct as stated). Android auto-backup is a product/policy decision, not proof of data theft. Zero-value business days can be legitimate (e.g. closed days) and are not bugs by themselves.

## Remaining release gates (ordered, concrete)

### Slice 2 — Safe backup/restore
- Preflight: reject newer-schema, foreign, and corrupt files before any replacement.
- Restore path: validate integrity (`PRAGMA integrity_check`), schema, and version; migrate an **isolated candidate** DB before touching the live file; only then swap.
- Ask for explicit confirmation of overwrite; write a durable recovery copy of the current DB before replacing.
- Never lose live data on validation errors.
- Refresh consumers after restore; do **not** assume `expo-updates` exists — use a plain re-init of the SQLite provider plus screen-level reload if possible.
- Real native tests (expo-sqlite actually opens the file) rather than mocking the module.

### Slice 3 — Configurable business identity + onboarding
- Configurable business name and a minimal onboarding flow; preserve all existing user data on upgrade (idempotent, back-compatible).
- Keep `estimatedSalary` naming decision visible here (rename UI meaning before real users see it).

### Slice 4 — Accessible, coherent mobile UI
- Device pass on physical iOS and Android: font scaling, keyboard behavior, offline cold start, and full dark mode parity (remove hardcoded light colors in loading/error screens).
- A11y pass on biweekly controls and small quincenal type.

### Slice 5 — Android + iOS production readiness
- Correct `ascAppId` from the **actual numeric App Store Connect app id** (never invent one).
- EAS profiles for each environment; clean builds from a fresh checkout (note: `android/` is gitignored, verify EAS prebuild path).
- TestFlight and Play internal testing; icons, screenshots, support URLs, and privacy/data declarations reflecting the actual flows (financial data stored locally only; no analytics).

### Slice 6 — Monetization validation
- Gate billing on the chosen model. If optional paid local Pro export/reporting later becomes a subscription, the recurring service must actually exist; keep free access and backups for existing records.
- Real store products + purchase/restore/expiry tests; follow current official Apple/Google policies (see Sources).

## Commercial hypothesis (to validate before pricing)
Spanish small-shop daily close. Interview 5–10 shops; run a measurable pilot (first-record completion, repeated use, willingness to pay) **before** choosing pricing. Compare optional paid local Pro export/reporting against a subscription; assume no revenue promises until the pilot shows repeatable value.

**No device QA and no store builds have been performed.** Status: NOT RELEASE-READY.

## Sources
- [Expo build setup](https://docs.expo.dev/build/setup/)
- [Expo iOS submission](https://docs.expo.dev/submit/ios/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
