# Supabase setup for Susu’s Boutique

Supabase is intentionally disconnected while the new sales and stock app is developed locally. The previous setup migration was run successfully in the SQL Editor, but it describes the old finance-tracker data model.

## Security and data boundaries

- The existing migration [`20261104120000_susu_boutique_shared_data.sql`](../supabase/migrations/20261104120000_susu_boutique_shared_data.sql) contains the old daily-record, investment, and supplier tables. It was already applied once; do not rerun it.
- Its `businesses` and `business_members` membership pattern may be reusable, but the online schema still needs new tables and Row Level Security policies for categories, price groups, sales, and stock movements.
- When online auth is reintroduced, native sessions should use Expo SecureStore and web sessions browser local storage.
- The client may use a publishable key. Never put a `service_role` or secret key in an `EXPO_PUBLIC_*` variable or in the app.
- For now, all development records use the isolated local database `susu-boutique.db`; the previous `appjorge.db` file is left untouched.
- Existing Modas Nicolas SQLite records are **not imported**. They remain in the old local database and are not shown as Susu’s Boutique data. Do not restore an old SQLite backup into the new business.
- Supabase-backed records will require an internet connection; offline editing and conflict resolution are not implemented.
- Backup/restore controls are hidden while the new data model is being developed. Cloud export/restore remains a separate follow-up.

## Before going live

The app currently uses local SQLite. To move the new model online later, create a migration for its catalog, sales, and stock tables with membership-based RLS, use Supabase Storage for the representative photos, add matching repositories, restore auth in `AppProviders`, and configure the project URL and publishable key. Web hosting and mobile release configuration are separate deployment steps.

The Expo display name is now Susu’s Boutique, but the slug, URL scheme, Android/iOS identifiers and EAS project ID still belong to the previous app. Before a production mobile release, decide whether this should replace that app or have separate store listings and identifiers.
