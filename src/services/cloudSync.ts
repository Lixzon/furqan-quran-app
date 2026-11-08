import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export interface SharedSyncRecord {
  record_key: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

export const CLOUD_SYNC_REQUEST_EVENT = 'lixzon:cloud-sync:request';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

export function isSupabaseSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseSyncConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    });
  }
  return client;
}

export async function startGoogleCloudSignIn(redirectTo?: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase sync is not configured for this build.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo ?? `${window.location.origin}${window.location.pathname}` },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function stopCloudSignIn(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`Supabase sign-out failed: ${error.message}`);
}

export async function readCloudUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Could not verify the signed-in account: ${error.message}`);
  return data.session?.user ?? null;
}

export async function readSharedRecords(): Promise<SharedSyncRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase sync is not configured for this build.');
  const user = await readCloudUser();
  if (!user) throw new Error('Sign in before loading LIXZON progress.');
  const { data, error } = await supabase
    .from('lixzon_sync_records')
    .select('record_key,payload,updated_at')
    .eq('user_id', user.id);
  if (error) throw new Error(`Could not load shared progress: ${error.message}`);
  return (data ?? []) as SharedSyncRecord[];
}

export async function upsertSharedRecords(
  records: Array<{ record_key: string; payload: Record<string, unknown> }>,
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase sync is not configured for this build.');
  const user = await readCloudUser();
  if (!user) throw new Error('Sign in before syncing LIXZON progress.');
  if (records.length === 0) return;
  const { error } = await supabase.from('lixzon_sync_records').upsert(
    records.map((record) => ({
      user_id: user.id,
      record_key: record.record_key,
      payload: record.payload,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'user_id,record_key' },
  );
  if (error) throw new Error(`Could not sync progress: ${error.message}`);
}

export async function subscribeToSharedRecords(
  onRecord: (record: SharedSyncRecord) => void,
): Promise<() => Promise<void>> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase sync is not configured for this build.');
  const user = await readCloudUser();
  if (!user) throw new Error('Sign in before subscribing to LIXZON progress.');
  if (channel) {
    await supabase.removeChannel(channel);
    channel = null;
  }
  channel = supabase
    .channel(`lixzon-sync:${user.id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lixzon_sync_records',
        filter: `user_id=eq.${user.id}`,
      },
      (change) => {
        const row = change.new as Partial<SharedSyncRecord>;
        if (
          typeof row.record_key === 'string' &&
          typeof row.updated_at === 'string' &&
          typeof row.payload === 'object' &&
          row.payload !== null &&
          !Array.isArray(row.payload)
        ) {
          onRecord({
            record_key: row.record_key,
            updated_at: row.updated_at,
            payload: row.payload as Record<string, unknown>,
          });
        }
      },
    )
    .subscribe((status, error) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('LIXZON sync realtime subscription failed.', error);
      }
    });
  const subscription = channel;
  return async () => {
    if (channel !== subscription) return;
    await supabase.removeChannel(subscription);
    channel = null;
  };
}

export function subscribeToCloudAuth(
  listener: (userId: string | null, email: string | null) => void,
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session?.user.id ?? null, session?.user.email ?? null);
  });
  return () => data.subscription.unsubscribe();
}
