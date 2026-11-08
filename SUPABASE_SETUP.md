# LIXZON shared progress setup

Furqan and Mishkah use the same Supabase project and Google identity to share account-scoped progress. The canonical schema is in [`supabase/migrations/20261108150000_lixzon_sync_records.sql`](./supabase/migrations/20261108150000_lixzon_sync_records.sql).

## Configure the project

1. Create a Supabase project and apply the migration above with the Supabase CLI or SQL editor.
2. In Authentication → Providers, enable Google. Configure the web OAuth client and add the iOS/Android Google client IDs used by Mishkah. The Google provider and Supabase redirect allow-list must include the production app origins and the local development origin.
3. Use a Supabase **publishable** key (or legacy anon key) in each app. Never use a `service_role` key in a client app.
4. Copy `.env.example` to `.env.local` in Furqan and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. In Mishkah, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the build environment. The two values must refer to the same Supabase project.
6. Configure Mishkah's existing Google OAuth client IDs in the Supabase Google provider. Native Google ID-token sign-in is exchanged for a Supabase user session; the Supabase project must accept the client ID that minted that token.

The migration revokes anonymous access, enables row-level security, limits clients to their own records, validates record names and payload sizes, and adds the table to Realtime. Do not disable RLS. Realtime and cross-device sync remain unavailable until the external project, Google provider, redirect URLs, and environment values are configured.

## Shared records

- `furqan.progression`: Furqan reading streak and memorization summary.
- `furqan.memorized:<surah>:<ayah>`: one user's ayah memorization state.
- `mishkah.engagement`: Mishkah streak/unlock snapshot.
- `quran.daily-highlight:<date>`: deterministic daily verse selection shared by both apps.

Client data is user-owned progress, not a server-verified religious or activity record. The apps retain local data when offline and queue Mishkah updates until sync can succeed.
