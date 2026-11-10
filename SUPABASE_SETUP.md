# Furqan <-> Mishkah pairing sync

Furqan and Mishkah share one private pairing instead of user accounts. There is no Google sign-in in either app.

## What gets synced

- `furqan.progression` - Furqan reading streak, published by Furqan.
- `quran.daily-highlight:<date>` - the verse of the day both apps show.
- `furqan.memorized:<surah>:<ayah>` - memorization state per ayah.
- `mishkah.engagement` - Mishkah's engagement snapshot.

Mishkah reads the streak and today's verse from these records, and Furqan also displays the paired verse record on Home. The daily verse uses a UTC date key so both apps show the same ayah across time zones. Qur'an references inside Mishkah open the full surah in Furqan.

## Configure the project

1. Create one Supabase project for the LIXZON apps.
2. Apply these migrations with the Supabase CLI or SQL editor, in order:
   - `supabase/migrations/20261109130000_lixzon_pair_sync.sql`
   - `supabase/migrations/20261109210200_lixzon_revoke_pair.sql`
   - `supabase/migrations/20261110120000_lixzon_user_backups.sql`
   The earlier `20261108150000_lixzon_sync_records.sql` migration belongs to the old authenticated-record sync path and is not required for pairing. If it is already installed, leave it in place; the pairing migration uses separate tables and RPCs.
3. Use the Supabase **publishable** key (or legacy anon key). Never ship a `service_role` key in a client app.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Enable Supabase Auth's Email provider and configure the email template to include the one-time token as `{{ .Token }}`. Both apps verify the code in-app; no magic-link redirect URL is required. The backup table is protected by row-level security and each authenticated account can access only its own rows.

For the deployed Furqan web app, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider's build environment (Vercel: Project Settings -> Environment Variables for Production), then redeploy. Use the same project URL and publishable/anon key as Mishkah. Without them, the deployed build remains local-only.

Pairing itself does not require Auth: it uses the code-hash functions and the pair tables have no client-facing row access. Email Auth is required for cloud backup.

## Email cloud backup

Sign in from Settings using a one-time email code. Furqan backs up its Quran reading progress, bookmarks, memorized ayahs, likes, playlists, theme, and settings. Mishkah keeps its own separate backup under the same email account, including preferences, prayer/checklist and dhikr progress, and reading streak. Pairing and email backup are independent.

On a new device with an existing backup, explicitly restore it or replace the cloud copy with the device's data. After creating the first backup or restoring, saved changes back up automatically. Pairing codes, authentication tokens, audio downloads, and Quran text caches are not included. Each app's cloud backup is limited to 1 MB; Furqan's existing file export/import remains available for larger backups.

## Pair the apps

1. Open Furqan -> Settings -> **Pair Mishkah** -> **Create pairing code**.
2. Copy the 20-character code.
3. Open Mishkah -> Profile or Settings -> **Pair with Furqan**, paste the code, and sync.

Furqan refreshes the shared records when its progress changes and every 15 seconds while a code is saved. Mishkah refreshes Furqan's records on launch, when the app returns to the foreground, and every minute. **Sync now** pushes immediately.

Treat the pairing code like a password: anyone with it can read and write that pairing's records. **Disconnect this device** removes only its local code; other devices remain paired. **Revoke pairing everywhere** invalidates the shared code and deletes cloud records while preserving each device's local data. Pair again with a new code to create a fresh sync space.

Any number of trusted app installations can use the same code. Each new code creates an isolated sync space, so different codes do not mix data.

## Security notes

- Pairing codes are stored as SHA-256 hashes; the plain code never leaves the client except in the RPC call.
- Record names and payload sizes are validated in the database, and only the fixed set of record keys above is accepted.
- Sync functions run with `security definer` and are the only exposed surface; the tables are not readable or writable by client roles directly.
- Data is user-owned progress, not a server-verified religious or activity record.
