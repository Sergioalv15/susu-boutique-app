# Implement the Cuaderno design

The user selected **Cuaderno** on 2026-09-21 and authorized a plan handed to an economical implementation agent. Deliver its warm, editorial visual identity throughout the existing Expo app while preserving every audited workflow and all real data. The main coordinator directs and reviews; GPT-5.6 Luna with high reasoning is the implementation model for this change.

## References and baseline

- Approved visual reference: `work/designs/capturas/02-cuaderno.png`.
- Interactive reference: `work/designs/appjorge-modelos.html`, the `cuaderno` variation. It is a prototype, not production code or a complete functional specification.
- Authoritative repository: `C:\dev\appJorge`; never use the older Desktop copy.
- Existing baseline: 167 tests in 32 files and typecheck passed after the audit fixes. The earlier private APK passed Android emulator launch/navigation checks.
- The tree contains extensive pre-existing, uncommitted feature and audit work. Preserve it, including staged credential removals. Do not reset, stash, commit, push, rotate keys, change signing, or rewrite history in this redesign.

## Visual contract

| Element | Light appearance | Dark appearance |
| --- | --- | --- |
| Main surface | `#FAF5EB` | `#27231C` |
| Main text | `#382E24` | `#F5ECDC` |
| Secondary text | `#77624F` | `#C7B69E` |
| Separators | `#E2D6C3` | `#4E4436` |
| Subtle emphasis | `#F0E4D2` | `#3B3024` |
| Accent / primary action | `#85492F` | `#E9B896` |
| Text on primary action | `#FFF9EF` | `#382315` |

- Use serif typography selectively for the business identity, month/year headings and primary financial totals. Use the existing native sans-serif font for labels, fields, navigation and supporting values. Reuse a suitable bundled font if present; otherwise use platform serif families without a network dependency. Account for Android/iOS font differences explicitly.
- Suggested hierarchy: page heading 30–34 dp, primary total 30–34 dp, section heading 17–18 dp, body/control text 15–16 dp, supporting text 12–13 dp. Respect font scaling; allow labels and amounts to reflow.
- Use an 8 dp spacing rhythm with 4/8/12/16/24/32 dp steps. Screen gutters should be about 20–24 dp and reduce gracefully on narrow screens.
- Prefer thin ledger separators and whitespace over enclosing every value in a card. Primary buttons have restrained corners, about 4–6 dp. Forms may use 6–8 dp corners. Avoid gradients, glow, decorative shadows, emoji actions and repeated all-caps labels.
- Keep financial figures aligned and consistently formatted in Spanish with euros. Preserve meaningful negative/error states; do not apply arbitrary colors to every amount.
- Use a consistent existing vector icon family with visible labels. Tap targets should be approximately 44–48 dp. Do not import web SVG/HTML styles into React Native.
- The selected dark proposal is the visual acceptance anchor. Provide a coherent light variant and preserve the existing appearance preference behavior.

## Screen and navigation contract

### Inicio

Use the actual business identity, today's localized date and the current month. Put net profit first, followed by ledger rows for sales, gross profit and additional expenses. Provide one dominant **Registrar el día** action and a quieter **Registrar inversión** action. Keep latest record, available investment balance and useful monthly/history access discoverable without repeating large cards. Use real hook/service values, never the prototype's example numbers or dates.

### Calendario

Use a compact month header and seven-column grid with readable dates, selected-day styling, record indicators and holiday indicators. Remove oversized empty cells. Keep previous/next month, today, monthly/biweekly switching and the existing biweekly workflows. Show the actual action date beside the day/investment actions. Preserve the one-shot annual-to-calendar month parameter and subsequent manual navigation.

### Registrar día / Registrar inversión

Use the same typography, fields, spacing and primary action throughout. Keep all existing daily fields, calculated values, validation, notes and persistence behavior. Keep the investment date and optional supplier flow, plus the existing single-close/deep-link fallback. Ensure the keyboard and safe area cannot hide the save action. Show pending/error states without losing user input.

### Balance / annual summary

Keep year selection and every monthly summary. Replace oversized repeated cards with compact ledger sections or rows with accessible detail disclosure. A month still opens its calendar; dataphone details and existing financial breakdowns remain reachable. Avoid nested press targets that navigate accidentally. Retain focus refresh and latest-request protection.

### Más and secondary tools

Provide clear access to suppliers, holidays, appearance and backup/export/restore. Apply the same visual language to their lists, forms, empty/error/loading states and confirmations. Keep all current drawer-only functions reachable when adding bottom navigation. Do not weaken the destructive restore confirmation or recovery flow.

### Navigation implementation and invariants

The read-only architecture check found a root Stack (`app/_layout.tsx`, `src/core/navigation/rootStackRoutes.ts`) around `app/(drawer)/_layout.tsx`. Keep that route group's directory name so the existing URLs remain stable; its navigator can become Expo Router Tabs without renaming its files.

| Visible tab | Existing/new group route | Responsibility |
| --- | --- | --- |
| Inicio | `index` | Home ledger and daily actions |
| Calendario | `calendar` | Monthly and biweekly records |
| Balance | `annual` | Annual/monthly financial summary; preserve `/annual` |
| Más | new `more` | Suppliers, holidays, appearance, backup and investment tools |

Keep `suppliers` reachable at `/suppliers` with a hidden tab entry (`href: null`) or an equally safe existing-route composition. Root detail routes (`day/[date]`, `investment/purchase`, `supplier/new`, `supplier/[id]`, `dataphone/[yearMonth]`) remain outside the tab navigator. The tab bar is intentionally absent while those stack details are open.

Move the existing theme/backup controls out of drawer-dependent presentation into More, preserving their confirmation and result handling. Retain the existing `InvestmentBalanceCard` / `useInvestmentBalance` functionality (including manual adjustments/history) behind a clear investment-balance entry from home and More; a dedicated root screen is preferable to dropping controls or crowding the home ledger. Do not invent a second annual-summary route named `balance`.

Theme entry points are `src/ui/theme.ts` and `src/core/theme/ThemeProvider.tsx`; no custom font files were found. Prefer native serif families. Icons/bottom-tab packages currently exist transitively: if a package becomes a direct import, declare its already-compatible installed version as a direct dependency rather than relying accidentally on hoisting. Avoid unrelated upgrades or native regeneration.

- Main destinations are **Inicio**, **Calendario**, **Balance** and **Más**.
- Preserve existing route URLs and query parameters, especially `/calendar?month=YYYY-MM`, `/day/[date]` and `/investment/purchase?date=YYYY-MM-DD`.
- Use the current router structure where possible. Detail forms retain one predictable back/close action; avoid duplicate headers, duplicate tab bars or two competing menus.
- The implementation should follow the mapped tab composition above. Report any actual router incompatibility before making a broader route migration.

## Domain boundaries

This is a presentation/navigation change. Do not modify database schemas, migrations, repositories, financial services, holiday synchronization, backup orchestration or the tested async guards merely to achieve the visual design.

- Daily allocation is derived from sales and margin; it is distinct from a purchase ledger entry.
- Dataphone sales are informational within total sales, not an additional revenue amount.
- Available investment balance is derived from allocations, adjustments and purchases, not an independent budget.
- Decimal percentage editing must remain lossless at the domain's supported precision.
- Do not copy prototype-only validation, state transitions or sample data into production.

## Ordered implementation units

Complete each unit coherently; keep evidence and any relevant tests with that behavior. These are review units, not authorization to create commits or PRs.

- [x] **1. Foundation and Inicio:** inspected the actual theme primitives; saved a source-only recovery checkpoint at `C:\dev\appJorge-design-backups\appJorge-source-20260921-083156.zip`; introduced the Cuaderno palette, spacing/typography tokens, shared ledger row and primary action; rebuilt Inicio around live monthly and investment data. `npm run typecheck` passed and the theme tests passed 4/4. Runtime screenshot inspection is included in the coordinator's Android QA pass.
- [x] **2. Navigation and calendar:** converted the existing `(drawer)` group to four bottom tabs while preserving route names and URLs; suppliers stays reachable through a hidden tab entry. Restyled monthly and biweekly layouts, kept month-param consumption/date selection/record and holiday markers intact, and moved monthly/biweekly switching into the visible screen header. Declared the already-installed compatible `@expo/vector-icons` 15.1.1 directly for tab icons. Focused navigation/calendar tests passed 54/54 across 9 files; scoped `git diff --check` passed.
- [x] **3. Forms and secondary screens:** restyled daily and investment forms with keyboard-aware scrolling and shared actions; refit annual summaries, supplier agenda/forms, holiday states and the More/appearance/backup surface. Added a root investment-balance screen with manual adjustments, purchases and the existing 100-item history. Kept restore confirmation/results, route URLs, validation and existing refresh behavior.
- [x] **4. Review and verification:** full tests and typecheck passed; independent review found no actionable regressions. Android QA covered home, calendar, daily form, annual summary, More and suppliers, including narrow layout, light/dark appearance, keyboard-visible Save, and read-only navigation checks. iOS runtime and native restore remain untested.

The sole implementation agent owns UI changes for these units and updates this checklist as work completes. It sends concise checkpoints after each unit and stops for coordinator review if a material architecture change or domain edit becomes necessary.

## Acceptance checklist

- [x] Cuaderno's approved serif/ledger hierarchy, warm surfaces and restrained action styling are recognizable in the Android app.
- [x] The tested empty-data screens fit narrow phone widths without horizontal clipping; larger real-world totals and labels were not represented in the empty emulator database.
- [x] Main navigation, route/date transitions and detail back behavior passed independent review and Android read-only checks.
- [x] Calendar actions, supplier access/refresh, holiday markers and annual-to-calendar navigation remain covered by focused/full tests and review.
- [x] Fractional margins, restore safety and async freshness fixes remain intact; the existing test suite passes. Native restore itself was not exercised.
- [x] No credentials, prototype sample data or remote font dependencies were added.
- [x] Android screenshots and validation evidence are recorded; untested iOS, native restore and populated/large-data rendering are explicitly listed as limits.
- [x] `docs/CONTINUITY.md` records completion, remaining validation limits and recovery information.

## Implementation progress — 2026-09-21

- Unit 1 is implemented and typechecked. The dark/light palette matches the approved Cuaderno tokens; platform-native serif families are selected as Georgia on iOS and the Android system serif without bundled or remote fonts. Inicio shows real monthly totals, configured business identity and localized date, daily actions, latest-record navigation, available investment balance and annual-summary access.
- Unit 1 verification: `npm run typecheck` passed; `npx vitest run src/ui/theme.test.ts` passed 4/4. Root will inspect the Android screen in its later screenshot pass.
- Unit 2 is implemented: the existing `(drawer)` route group hosts Inicio, Calendario, Balance and Más tabs, while `/suppliers` remains a hidden reachable route. Monthly and biweekly calendars use the Cuaderno theme and retain month params, selection, record/holiday markers and actual-date action links. Focused tests passed 54/54 across 9 files; scoped `git diff --check` passed.
- Unit 3 is implemented: forms scroll above the keyboard, summary/supplier/holiday screens use ledger styling, and Más exposes suppliers, investment balance/history, holidays, appearance and backup/restore. Restore confirmation and result alerts retain their existing text and behavior.
- Final verification: `npm test` passed 168 tests across 32 files; `npm run typecheck` passed; scoped `git diff --check` passed. The independent code review found no actionable regressions.
- Android QA on `emulator-5554` covered home, calendar, daily form, annual summary, More and suppliers; dark/light appearance, narrow width (360dp), keyboard-visible Save, and read-only navigation. The tested database was empty. `logcat` had no fatal, AndroidRuntime or ReactNativeJS exceptions. Screenshots are in `C:\dev\appJorge\work\designs\cuaderno-native`; the earlier `daily-form-keyboard-save-visible.png` is invalid evidence because Save is not visible there. Use `final-daily-save-ime.png` and `narrow-daily-save-ime.png` for the keyboard criterion.
- Final coordinator-authorized build: `npm run apk:release` succeeded. Artifact: `C:\dev\appJorge\android\app\build\outputs\apk\release\app-release.apk`, 113,314,588 bytes, SHA-256 `9D6F7A72998C0A4D086625A2C616A2571512560189281D25C9EE94B695C24B16`. `apksigner verify --verbose --print-certs` passed APK Signature Scheme v2 with the existing Android Debug certificate. The installed and delivered APK has the same hash.
- Delivery: [Download the Cuaderno APK](https://we.tl/t-vX0Xpw4dTeOxHoo5) (WeTransfer link expires 2026-09-24). This is a private debug-signed APK, not a production/store build.
- Remaining validation limits: no iOS runtime check, no populated/large-real-data visual pass, and no native restore operation. No real business data was entered or changed during QA.

## Delivery

The reviewed Cuaderno implementation and Android evidence are complete for the tested scope. The private APK and screenshots are linked above; the APK is debug-signed and should not be represented as a production build.
