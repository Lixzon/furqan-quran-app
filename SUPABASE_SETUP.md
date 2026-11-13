# Manāra Supabase setup

Manāra uses one Supabase client for optional account-based cloud backup. Quran
reading progress, bookmarks, memorization, streaks, fasting records, and daily
reflections share the app's local store; cloud backups serialize that same
state into one Manāra backup per account.

## Configure the app

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
   for local development.
2. Set the same variables in the production host's build environment, then
   redeploy. Use a Supabase publishable key (or legacy anon key); never expose a
   `service_role` key in a client app.
3. Apply the migrations in `supabase/migrations` in timestamp order. The
   historical pairing migrations are no-ops; the final Manāra migration
   removes the retired sync tables and functions and migrates existing Furqan
   cloud backups into the Manāra backup row.
4. Enable Supabase Auth's Email provider and configure the email template to
   include the one-time token as `{{ .Token }}`. The app verifies the code
   in-app; no magic-link redirect URL is required.

The backup table uses row-level security so authenticated accounts can access
only their own rows. If the Vite environment variables are not configured,
local progress and file export/import continue to work; cloud backup is
unavailable.

## Cloud backup

Sign in from Settings using a one-time email code. Backups include reading
progress, bookmarks, memorization, likes, playlists, theme, settings, fasting
records, and daily reflections. Authentication tokens and downloaded media are
not included.

On a new device with an existing backup, explicitly restore it or replace the
cloud copy with the data on this device. Saved changes are backed up
automatically after the first backup or restore. Backups are limited to 1 MB;
file export/import remains available for larger archives.
