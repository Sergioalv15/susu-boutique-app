# Resume appJorge work

## Pending client feedback — record only (2026-09-21)

The user is collecting changes after testing Model A. Record further feedback here; do not implement this batch until the user asks to proceed.

- [ ] Inicio: add a compact summary and breakdown of the last day, following the monthly summary structure rather than showing only sales. The exact day rule (previous calendar day or most recent recorded day) remains to be resolved before implementation.
- [ ] Annual summary: present each month as a card, increase visual spacing between breakdown items, and apply the same semantic colors for profits, losses and other financial categories used in Model A.
- [ ] Inicio: give “Disponible para invertir” greater visual prominence; its current presentation is too small.
- [ ] Más: give “Proveedores” greater prominence because it is an essential feature.
- [ ] Más: remove the “Capital para invertir” entry from this screen, retaining investment access from Inicio.
- [ ] Inicio: give “Próximos festivos” greater prominence and show the next upcoming holiday even when it is far away; do not hide it because it falls outside a short time window.
- [ ] Inicio: remove “Libro del mes”.
- [ ] Inicio: remove the slogan below “Modas Nicolas”.
- [ ] Inicio, “Disponible para invertir”: remove “Ver desglose” and replace it with “Agregar inversión hoy”, explicitly targeting today.
- [ ] Daily record and investment entry: let the user choose which date to record against when the action is generic. Actions explicitly labelled “Registrar el día de hoy” / “Agregar inversión hoy” may target today directly. Make the date intent explicit in the UI; do not silently assume today for generic actions.

Status: requirements recorded only; no application code changes, builds or deployment for this feedback batch.

## Active task — Inicio Model A cards (2026-09-21)

- The user selected **A · Cuaderno con tarjetas** in `work/designs/cuaderno-cuadros.html` after asking to restore colored financial summary cards. The reference capture is `work/designs/cuadros-capturas/a-cuaderno.png`.
- Inicio places the current net result in a hero card, followed by sales, gross profit, additional expenses and assigned investment in a 2×2 grid. Available investment stays linked to its detail screen below; the disclosure explains the net calculation and that assigned investment is not an expense. Amounts come from app hooks; prototype data is never used.
- Positive profit uses green, losses and expenses red, sales blue and investment amber in both themes. Loading/error/empty states, latest-record/annual access, safe-area scrolling and daily/investment actions remain.
- Before editing, relevant owned source and documentation were copied under `work/designs/cards-a-before`; `MANIFEST.txt` names the owned paths. No credentials are in the snapshot.
- Follow-up verification: `npm run typecheck` passed and `npm test` passed 168 tests across 32 files. Scoped `git diff --check` passed (only the repository's existing LF/CRLF conversion warnings). No release/native build was started. Runtime QA for populated totals, long amounts/font scaling and both themes remains open because the previously tested emulator database was empty. The practical path is the existing emulator/dev-client connected to Expo Metro from this repository.

## Prior Cuaderno redesign — historical baseline (2026-09-21)

- The approved plan in `docs/REDESIGN_CUADERNO.md` is implemented and reviewed in the authoritative workspace `C:\dev\appJorge`. Preserve existing uncommitted audit and feature edits; staged credential removals are intentional and must stay staged. No commit or push was made.
- Unit 1 is implemented: Cuaderno theme tokens and native serif hierarchy, shared `LedgerRow`/`PrimaryButton`, responsive screen gutters, and a real-data Inicio layout with monthly totals and links to history/investment balance. Recovery snapshot: `C:\dev\appJorge-design-backups\appJorge-source-20260921-083156.zip` (app/source and package configs only).
- Unit 1 checks: `npm run typecheck` passed; `npx vitest run src/ui/theme.test.ts` passed 4/4.
- Unit 2 is implemented: four bottom tabs live inside the unchanged `(drawer)` route group, and the suppliers route remains accessible but hidden from the tab bar. Monthly and biweekly calendars have compact Cuaderno layouts and retain date params, selection, record/holiday markers, and date-specific actions. Focused calendar/navigation verification passed 54 tests across 9 files; scoped diff check passed.
- Unit 3 is implemented: daily and investment forms use keyboard-aware scrolling, annual summaries and supplier/holiday tools use the Cuaderno ledger style, and Más exposes appearance, backup/restore, suppliers and investment balance with movement history. The destructive restore confirmation and result alerts are preserved.
- Final code verification: `npm test` passed 168 tests in 32 files; `npm run typecheck` passed; scoped `git diff --check` passed. The independent reviewer found no actionable regressions.
- Previous Android QA on `emulator-5554` covered home, calendar, daily form, annual summary, More and suppliers, including dark/light appearance, 360dp narrow layout, keyboard-visible Save and read-only navigation. The local database was empty. No fatal or JS runtime exceptions appeared in the checked logcat window. Screenshots are in `C:\dev\appJorge\work\designs\cuaderno-native`; `daily-form-keyboard-save-visible.png` does not show the Save button and is invalid evidence. Use `final-daily-save-ime.png` and `narrow-daily-save-ime.png` for keyboard evidence.
- Final APK: `C:\dev\appJorge\android\app\build\outputs\apk\release\app-release.apk`, 113,314,588 bytes, SHA-256 `9D6F7A72998C0A4D086625A2C616A2571512560189281D25C9EE94B695C24B16`. `apksigner` verified APK Signature Scheme v2 with the existing Android Debug certificate. The installed and delivered APK has the same hash. [Download the APK](https://we.tl/t-vX0Xpw4dTeOxHoo5), link expires 2026-09-24. This is a private debug-signed artifact, not a production build.
- Remaining limits: no iOS runtime verification, no populated/large-real-data visual pass, and no native restore operation. No business data was entered or changed during QA.

Read this file first after a context reset, usage limit, or session interruption. Then read `PRODUCT_READINESS.md` for the product roadmap. Verify the working tree before changing anything; this checkpoint is evidence from a specific point in time, not proof that the tree has remained unchanged.

## Latest check — Cuaderno final verification (2026-09-21)

- All three implementation units and the review/verification unit in `REDESIGN_CUADERNO.md` are complete for the tested scope. The Cuaderno screenshots and exact invalid keyboard screenshot are identified above.
- `npm test` passed 168/168 tests across 32 files; `npm run typecheck` passed; scoped `git diff --check` passed. `npm run apk:release` succeeded and the delivered APK hash/signature were verified.
- Device: emulator-5554, 1080x2400 at 420 physical density and font scale 1.0 after restoring its original density and dark appearance. Narrow-layout screenshots used 480 density (360dp) and density was reset afterward. The keyboard-visible Save test passed at both widths.
- Limits: emulator database was empty; real populated totals, iOS runtime and an actual restore operation were not tested. Do not repeat the broad baseline audit or change app data to manufacture screenshot content.

## Prior audit check — 2026-09-21

- Authoritative workspace: `C:\dev\appJorge`. Preserve its existing uncommitted work; do not resume from the old Desktop copy.
- Codex is the direct implementation writer for the current bounded units. The audit used economical high-reasoning Terra review; do not invoke the historical Big Pickle workflow unless a new task explicitly asks for it.
- Completed after the audit: findings 1–5 (safe restore, fractional margin, purchase close, annual/biweekly freshness), production-release configuration, and local documentation. The local production keystore was verified in memory with its existing credentials, and `npm run apk:production:check -- 3` passed. `npm run apk:release` then produced a private debug-signed APK at 2026-09-21 07:02:53 +02:00, copied to `C:\Users\erhtu\Downloads\appJorge-audit-2026-09-21.apk` (111,757,132 bytes; SHA-256 `28670915E4F7720800747D031535C5CBD94C93113D47F439104465E47AD3212C`; `apksigner` v2 verified). No production APK, upload, signing-key rotation, or history rewrite occurred.
- Latest validation: `npm run typecheck` passed; `npm test` passed 167 tests across 32 files; `git diff --check` passed apart from existing CRLF warnings. Real Node `node:sqlite` fixtures exercised historical schema compatibility (including the defective v3 shape); separate recovery-orchestrator tests use fake adapters to cover copy/verification/rollback failures. No native database restore test was run.
- Native smoke passed on emulator-5554 (Medium_Phone, Android 17/API 37): the new APK hash was verified, `adb install -r` completed without uninstall or data clear, and cold launch took 520 ms. Home, Calendar (September 2026), and Annual Summary (2026) rendered with read-only navigation. Log inspection found no `FATAL EXCEPTION`, `AndroidRuntime`, or `ReactNativeJS` errors; `HWUI EGL_SUCCESS` was benign. Installed version: 0.1.0/code 1. Evidence: `C:\Users\erhtu\AppData\Local\Temp\appJorge-smoke-20260921` (`home.png`, `calendar.png`, `annual.png`, and XML captures).
- Current release limitation: version `3` was a configuration-only example, not a chosen publication version. The production configuration check validates the release configuration but does not itself prove signing passwords. Coordinate the next version with EAS remote versioning and store state.
- Native limits: no native database restore test, no production APK, no upload, and no iOS device/distribution verification. The smoke check covered launch and read-only navigation only; it did not exercise restore.
- Next action: coordinate the next production `versionCode` with EAS remote versioning and store state. See `ANDROID_RELEASE.md`.

## Latest check — 2026-09-17

### Four incomplete workflows implemented

- Read-only audit verified the reported flows were incomplete: calendar had no day/investment entry actions; suppliers list stayed stale after create/edit; holidays list had no meaningful states and the calendar showed no holiday markers; annual months were not navigable.
- Implemented all four under the existing workflow (Codex directs/reviews; `opencode/big-pickle` writes). Branch `master`, no commits, no pushes, no deployment, no new dependencies. Pre-existing `docs/CONTINUITY.md` modification preserved.
- Calendar: reacts to an optional `month=YYYY-MM` query param on repeated navigation even when already mounted (both monthly and biweekly reducers; biweekly gained a `showMonth` action). Added "Registrar día" and "Registrar inversión" actions tied to the selected date (default today), routing to `/day/{iso}` and `/investment/purchase?date={iso}`.
- Investment purchase: `app/investment/purchase.tsx` validates an optional `date` param with `isValidIsoDate` and prefills the modal instead of always defaulting to today.
- Suppliers: `useSuppliers` now refreshes on focus (`createFocusRefreshGuard`, moved to `src/core/utils/focusRefreshGuard.ts`) and guards stale writes after unmount.
- Holidays: sync completion now notifies subscribed UI via `holidaySyncEvents`, so the upcoming card and calendar markers re-query after sync, on return focus, and on month/year change. The card has loading/error/empty/retry states. `MonthlyCalendar` renders a holiday marker, legend, and a11y labels.
- Annual summary: `MonthSummaryCard` month tap is now accessible (`onPressMonth`) and routes to `/calendar?month=YYYY-MM`; the nested dataphone action is preserved.
- New date helpers `isValidIsoDate` and `parseYearMonth` in `src/core/utils/date.ts`.
- Verification round 1: full suite 129/129 across 22 files; `npm run typecheck` clean. Added tests for date helpers, biweekly `showMonth`, day/investment route builders, and holidays domain (`holidaysByIso`, `computeUpcomingHolidays`).
- Fresh review (2026-09-17) found and fixed four defects, all still uncommitted in the working tree:
  - A — CalendarScreen treated `month=YYYY-MM` as a persistent param, so returning to the calendar after opening a day snapped back to the param month (repro: annual January → calendar → February → day → back). Now one-shot: the param is cleared with `router.setParams({ month: undefined })` after applying, and `decideMonthParamApplication` (src/features/daily-records/presentation/calendar/monthParam.ts) owns consume/repeat semantics with regression tests (same-month repeat works after the param is gone). Dead `appliedMonthParamRef` removed; callback depends only on `params.month`/`router`, no loop.
  - B — `useUpcomingHolidays` retry (and every refresh) now performs a real synchronization instead of only querying SQLite: reports failure, keeps cached data after persistence, publishes `notifyHolidaysSynced()` after persistence, then queries. `HolidaySyncService` gained `syncYears` (no lastSync touch) and de-duplicates concurrent `syncSilently` calls, so the background `useHolidaySync` and card/retry paths never double-fetch. First-launch offline now surfaces an error instead of a valid-looking empty list. Coordinator `refreshUpcomingHolidays` tested with fake repo/API: first launch, failure with cached data, recovery/retry, publish ordering.
  - C — `useCalendarHolidays` now refreshes on focus (guard), guards stale responses and unmount with `createLatestWins` (rapid month changes can no longer be overwritten by an older load), preserves cached markers on recoverable errors, and obtains a visible year absent from cache via `holidaySyncService.syncYears` (national scope) instead of assuming current+next year suffice. It now returns `{ holidaysByIso, error }`; CalendarScreen destructures the map (error exposed to consumers, no shell redesign).
  - D — `useSuppliers` replaced the unmount-only `isMountedRef` with `createLatestWins`, so an older `list()` response can never overwrite a newer one after create/edit return. Calendar day/investment actions were reviewed for usability (they track the selected date with today fallback, and month-param navigation is covered by A); no UI redesign.
- Verification round 2: full suite 151/151 across 27 files; `npm run typecheck` clean. New tests: `monthParam` consume/repeat, `latestWins` stale guard, `HolidaySyncService` (concurrent dedup, retry-after-failure, `syncYears`), `refreshUpcomingHolidays` async flows, `loadCalendarHolidaysWithYearCoverage` year coverage.
- Runtime status corrected: the ExpoSharing runtime incident below is RESOLVED historical. The seven errors came from a stale Sep-4 dev client predating the expo-sharing dependency; a Sep-16 debug APK built from this repo installed clean on emulator-5554 (zero ExpoSharing errors, data preserved), and the user confirmed the app starts. Do not shadow that with a pending claim. On this check only device QA of the NEW changes above is pending: `adb devices` reports emulator-5554 connected (runtime QA possible), but the APK was not rebuilt this session and the new JS has not been exercised on device.

- The authoritative repository moved to `C:\dev\appJorge` because the previous Windows path was too long for the Android release build. Do not resume work in the old desktop copy.
- Branch `master` at `19254c3` includes the financial correction and the earlier documentation. At this check the new repository was clean. The previous note below describes the earlier uncommitted state and is retained as history.
- Android release APK exists at `android/app/build/outputs/apk/release/app-release.apk` (built 2026-09-16 22:22). Static inspection found `ExpoSharing` in `classes3.dex`; the old development app had seven `Cannot find native module 'ExpoSharing'` errors because it was installed before that library was added.
- This APK uses Android Debug signing and `versionCode` 1. It is not a store-ready release. No emulator or device was connected on this check, so the release APK has not been tested at runtime.
- The prior Android development APK was rebuilt and installed on emulator-5554 with `adb install -r` while that emulator was available. Both SQLite database hashes matched before and immediately after installation. Its runtime check was incomplete because Metro was no longer listening; do not claim those seven errors were cleared at runtime.
- Next action for the runtime issue: launch a device/emulator, run the current app from `C:\dev\appJorge`, and inspect fresh logs. Only pursue further source changes if the fresh error differs from the stale-client failure.

## Current checkpoint — 2026-09-16

- Goal: professionalize the daily-financial tracker for small shops, prepare Android and iOS distribution, and validate a sustainable paid product.
- Roles: Codex reviews and directs; OpenCode using `opencode/big-pickle` implements bounded changes. One writer at a time.
- Branch: `master`. Base commit: `4499abc1947d6393c154e795004fe5760b22b8f1`.
- Financial slice is implemented but **not committed or published**. Gross profit is the margin instead of revenue; net profit preserves losses, rounds to cents, and normalizes negative zero. Negative summary values no longer use success colors.
- Last executed validation: focused tests 15/15; full suite 117/117 across 21 files; TypeScript passed. The independent review found no actionable regressions in this slice. No native build, physical-device QA, or store release was performed.
- The independent reviewer also inspected pre-existing investment changes; those are not part of this financial slice.
- `.atl/.skill-registry.cache.json` and `.atl/skill-registry.md` were modified before this work. Preserve them; do not attribute or include them in a financial-fix commit.
- Codex corrected the roadmap's test count and source links after implementation. These were documentation-only edits.

## Work still required

The Cuaderno redesign is complete for its tested scope. Use `PRODUCT_READINESS.md` for unrelated follow-up product work. The prior safe-restore code path and recovery behavior were reviewed and tested at code level during the baseline audit, but a native restore operation was not exercised in this QA pass. Do not repeat the completed baseline audit without a new request.

Later units: configurable business identity/onboarding, accessible mobile UI, clean Android/iOS production builds and store setup, and monetization validation. The actual numeric App Store Connect ID is still needed; do not invent it. Pricing, final product branding, and store publication have not been decided.

## Recovery procedure

1. Verify the repository path, branch, `git status --short`, and `git diff`. Do not reset, clean, or discard existing changes.
2. Read this file and `PRODUCT_READINESS.md`. Compare the current diff with this checkpoint before assuming any task is complete.
3. Check whether an OpenCode writer is still running before launching another. Session IDs are history references, not proof of an active process.
4. Recover OpenCode context with `opencode session list` and `opencode export <session-id>` when needed. Prefer a new bounded session with these documents if the old context is bloated.
5. Review any partial edits first. Run appropriate verification when code has changed or prior verification is uncertain. Do not repeat completed broad audits unnecessarily.
6. Update this checkpoint with the next action and exact verification results before starting the next unit.

## OpenCode and memory references

- Audit + financial implementation: `ses_f563cb196ffe4zQRusSE4gQ9XE`.
- Independent review: `ses_f562fa529ffej9PhAnBofwDrjL`.
- Requested implementation model: `opencode/big-pickle`.
- Engram project used by OpenCode: `appjorge`. Financial findings saved as observation 312; implementation saved as observation 313. Session summaries were saved by the implementing agent.
- Engram tools were not callable directly from Codex in this session. Local files are the recovery source even when Engram or OpenCode is unavailable.

## Prevention protocol

- Checkpoint after each bounded unit, before switching writers, and before ending a session. Record completed/pending work, touched files, exact tests, active session IDs, and the next concrete action.
- Save the implementation brief before dispatch and persist worker results after completion. Keep reports compact; retain full tool output in local session history rather than copying it into every prompt.
- At a usage warning, stop dispatching new units. Save current and partial work, note active processes, and hand off. Do not assume there will be enough quota for one final save: checkpoint incrementally.
- Maintain one writer. After interruption, verify whether the previous writer completed before retrying to avoid duplicate or conflicting edits.
- Keep recoverable local snapshots under `%LOCALAPPDATA%/Codex/checkpoints/appJorge/`. Each snapshot includes modified source/doc files, a Git patch, and a manifest with hashes and the base commit. A snapshot is not a Git commit and must not be applied blindly over newer edits.
- These local snapshots protect against lost conversation context and provide a copy of pending edits. They do not protect against disk loss. Remote backup/publication requires a separate deliberate action.
- No automatic quota reset, credit purchase, paid build, Git push, or store publication is part of this protocol.

## Resume prompt

> Read docs/CONTINUITY.md and docs/PRODUCT_READINESS.md. Verify the current Git state and recover the referenced OpenCode session if needed. Preserve pre-existing changes. Codex directs and reviews; OpenCode with opencode/big-pickle is the sole implementation writer. Continue from the next unfinished bounded unit and checkpoint before ending.

## Historical runtime incident — 2026-09-16 (RESOLVED)

User reported seven runtime errors. On emulator-5554, com.appjorge.mobile (PID 22405 at diagnosis) logged seven `Cannot find native module 'ExpoSharing'` failures, each followed by an Expo Router missing-default-export warning. Checked route files do export defaults. Installed app last updated 2026-09-04; current dependencies include expo-sharing. Working diagnosis: stale native development client.

RESOLVED via fresh bounded verification (2026-09-16/17): a new APK built from this repo (contains expo-sharing) installed on emulator-5554 preserving data; logcat then showed zero ExpoSharing errors and zero false route-export warnings, and the user confirmed the app starts normally. The stale Sep-4 dev client was the root cause, not the source. The OpenCode native-rebuild task `ses_f547ca787ffeV3FCLOpXtb25p0` below is superseded by that verified install; do not re-open this incident. Remaining device-wide QA now applies only to the four workflow changes from the current review (month param one-shot, holiday retry/year coverage, calendar holidays focus/race, suppliers stale guard).

Historical native-rebuild task: `ses_f547ca787ffeV3FCLOpXtb25p0` was dispatched to rebuild locally, install preserving app data, and verify fresh runtime logs; it is superseded by the 2026-09-16 debug-APK install and the clean logcat verification recorded above. No source fix was authorized by that task, and the incident no longer blocks roadmap slice 2 or this review's work.

## Cuaderno Model A private APK (2026-09-21)

- `npm run apk:release` succeeded at 2026-09-21 10:38:58 +02:00 (started 10:38:36). Build log: `C:\Users\erhtu\AppData\Local\Temp\appJorge-apk-release-20260921.log`.
- APK: `C:\Users\erhtu\Downloads\appJorge-cuaderno-A-2026-09-21.apk` (113,317,104 bytes), SHA-256 `01C4953CA16C61745FAA366EE42D152D0BE15C35CCEA700FCDB77BA157994DDE`. Source and copied APK hashes match.
- `apksigner` verified APK Signature Scheme v2 with the existing Android Debug certificate. Package metadata: `com.appjorge.mobile`, version `0.1.0` / code `1`. This is a private debug-signed APK, not a production build. Runtime behavior of the new Model A summary cards was not tested.

- Model A APK delivery: uploaded the verified Downloads artifact to WeTransfer: https://we.tl/t-OyhRittJEoXVsxTX (expires 2026-09-24). Transfer completion UI confirmed appJorge-cuaderno-A-2026-09-21.apk, 108.1 MB. This supersedes the earlier Cuaderno APK for testing the summary cards.
