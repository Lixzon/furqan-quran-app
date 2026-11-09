# Furqan <-> Mishkah pairing sync

Furqan and Mishkah share one private pairing instead of user accounts. There is no Google sign-in in either app.

## What gets synced

- `furqan.progression` - Furqan reading streak, published by Furqan.
- `quran.daily-highlight:<date>` - the verse of the day both apps show.
- `furqan.memorized:<surah>:<ayah>` - memorization state per ayah.
- `mishkah.engagement` - Mishkah's engagement snapshot.

Mishkah reads the streak and today's verse from these records, so both apps show the same numbers and the same ayah. Qur'an references inside Mishkah open the full surah in Furqan.

## Configure the project

1. Create one Supabase project for the LIXZON apps.
2. Apply `supabase/migrations/20261109130000_lixzon_pair_sync.sql` with the Supabase CLI or SQL editor.
   The earlier `20261108150000_lixzon_sync_records.sql` migration belongs to the old authenticated-record sync path and is not required for pairing. If it is already installed, leave it in place; the pairing migration uses separate tables and RPCs.
3. Use the Supabase **publishable** key (or legacy anon key). Never ship a `service_role` key in a client app.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

For the deployed Furqan web app, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider's build environment (Vercel: Project Settings -> Environment Variables for Production), then redeploy. Use the same project URL and publishable/anon key as Mishkah. Without them, the deployed build remains local-only.

No Authentication provider needs to be enabled: pairing uses the code-hash functions in the second migration, and the pair tables have no client-facing row access.

## Pair the apps

1. Open Furqan -> Settings -> **Pair Mishkah** -> **Create pairing code**.
2. Copy the 20-character code.
3. Open Mishkah -> Profile or Settings -> **Pair with Furqan**, paste the code, and sync.

Furqan refreshes the shared records when its progress changes and every 15 seconds while a code is saved. Mishkah refreshes Furqan's records on launch, when the app returns to the foreground, and every minute. **Sync now** pushes immediately.

Treat the pairing code like a password: anyone with it can read and write that pairing's records. **Unpair** removes it from the local device only.

## Security notes

- Pairing codes are stored as SHA-256 hashes; the plain code never leaves the client except in the RPC call.
- Record names and payload sizes are validated in the database, and only the fixed set of record keys above is accepted.
- Sync functions run with `security definer` and are the only exposed surface; the tables are not readable or writable by client roles directly.
- Data is user-owned progress, not a server-verified religious or activity record.
