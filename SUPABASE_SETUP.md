# Furqan account sync setup

Furqan uses Supabase for its own account-scoped cloud sync. Furqan no longer connects accounts with Mishkah or sends its progress to Mishkah. The schema is in [`supabase/migrations/20261108150000_lixzon_sync_records.sql`](./supabase/migrations/20261108150000_lixzon_sync_records.sql).

## Configure the project

1. Create a Supabase project and apply the migration above with the Supabase CLI or SQL editor.
2. In Authentication → Providers, enable Google. Configure the web OAuth client and the production and local redirect URLs used by Furqan.
3. Use a Supabase **publishable** key (or legacy anon key) in Furqan. Never use a `service_role` key in a client app.
4. Copy `.env.example` to `.env.local` in Furqan and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The migration revokes anonymous access, enables row-level security, limits clients to their own records, validates record names and payload sizes, and adds the table to Realtime. Do not disable RLS. Furqan cloud sync remains unavailable until the external project, Google provider, redirect URLs, and environment values are configured.

## Furqan records

- `furqan.progression`: Furqan reading streak and memorization summary.
- `furqan.memorized:<surah>:<ayah>`: one user's ayah memorization state.

Client data is user-owned progress, not a server-verified religious or activity record. Furqan retains local data when offline and queues updates until sync can succeed.
