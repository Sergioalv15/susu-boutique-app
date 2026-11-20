# Owner-managed account access
Feature: let owners activate access for existing Supabase Auth accounts from app Settings.
Risk: item 2 (authorization and privileged membership writes).

## Specs
- S1: “Me gustaria agregar en lugar de el boton cerrar sesion una hamburguesa con un desplegable. Dentro del desplegable que existan ajustes y cerrar sesion. Ajustes debe llevarte a una pagina para poder, como owner, dar de alta correos y elegir el rol. Para poder hacer el proceso de activar una cuenta desde el frontend”
- S2: Selected flow: “Habilitar cuenta existente” — “Solo se asigna el rol a un usuario que ya existe en Supabase Auth; no se envía invitación.”

## Tasks
- T1 — S1–S2 — Add owner-authorized RPC to activate an existing Auth account by email and role, with isolated SQL regression tests — done (3 new PGlite tests and 4 existing tests pass; typecheck passes) — inline — commit: pending.
- T2 — S1–S2 — Replace the app header sign-out button with an accessible menu; add owner-only Settings form wired to the RPC and verify the feature — in_progress — inline — commit: pending.
- T3 — S1–S2 — Complete one independent security review of the membership RPC — blocked (verifier launch failed before probes; waiting for an explicit user request for a new bounded attempt) — independent verifier — commit: n/a.

## Log
- L1: Me gustaria agregar en lugar de el boton cerrar sesion una hamburguesa con un desplegable. Dentro del desplegable que existan ajustes y cerrar sesion. Ajustes debe llevarte a una pagina para poder, como owner, dar de alta correos y elegir el rol. Para poder hacer el proceso de activar una cuenta desde el frontend
- L2: Selected existing-account activation: only assign a role to an account that already exists in Supabase Auth; do not send an invitation.
- L3: Read-only exploration: current roles are `owner` and `staff`; the app has no public signup or invitation-management endpoint, and `business_members` currently has a self-read policy with no client membership-write grant. Use a server-enforced owner authorization path; never expose privileged credentials in the client.
- L4: Test-first evidence: `npm test -- src/features/store/infrastructure/SupabaseStoreAccess.test.ts` ran against the existing isolated PGlite harness and observed 3 expected RED failures: the membership RPC is missing; 4 prior tests passed. No hosted Supabase state was accessed.
- L5: Added `public.add_business_member_by_email(text,text)` in `supabase/migrations/20261115100000_owner_manage_business_members.sql`. It requires owner role before looking up an existing Auth user, accepts only owner/staff, rejects missing/duplicate accounts without writes, and grants execution only to authenticated users. The focused PGlite suite is GREEN (7/7) and `npm run typecheck` passed; no hosted Supabase state was accessed.
- L6: Independent verifier setup failed before any verifier probes because the launch request omitted the required `Risk: item 2` declaration; verifier ran zero tests and no review occurred. Do not retry automatically. The focused tests and suite must be run inline; a fresh bounded verifier attempt requires a separate explicit user request after setup is corrected.
- L7: A worker launch for the small header wiring was rejected before starting because prose followed the required `## Allowed edit surfaces` block. No child ran or edited files; the parent completed the two header wiring edits inline and did not relaunch.
