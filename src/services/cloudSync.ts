import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SharedSyncRecord {
  record_key: string;
  payload: Record<string, unknown>;
  updated_at: string;
}

export const CLOUD_SYNC_REQUEST_EVENT = 'lixzon:cloud-sync:request';
export const CLOUD_SYNC_PAIR_CHANGED_EVENT = 'lixzon:cloud-sync:pair-changed';
const PAIR_CODE_STORAGE_KEY = 'lixzon.sync.pair-code.v1';
const PAIR_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PAIR_CODE_LENGTH = 20;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

let client: SupabaseClient | null = null;


export function isSupabaseSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSavedPairCode(): string | null {
  try {
    return window.localStorage.getItem(PAIR_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function savePairCode(code: string | null): void {
  try {
    if (code) window.localStorage.setItem(PAIR_CODE_STORAGE_KEY, code);
    else window.localStorage.removeItem(PAIR_CODE_STORAGE_KEY);
  } catch {
    throw new Error('Could not save the pairing code in this browser.');
  }
}

function newPairCode(): string {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generation is unavailable in this browser.');
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(PAIR_CODE_LENGTH));
  return Array.from(bytes, (byte) => PAIR_CODE_ALPHABET[byte & 31]).join('');
}

function validatePairCode(value: string): string {
  const code = value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!new RegExp(`^[${PAIR_CODE_ALPHABET}]{${PAIR_CODE_LENGTH}}$`).test(code)) {
    throw new Error('Enter the complete 20-character pairing code.');
  }
  return code;
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

export async function createPairCode(): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Pairing sync is not configured for this build.');
  const code = newPairCode();
  const { error } = await supabase.rpc('create_lixzon_sync_pair', { p_code: code });
  if (error) throw new Error(`Could not create an app-pairing code: ${error.message}`);
  savePairCode(code);
  return code;
}

export async function joinPairCode(value: string): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Pairing sync is not configured for this build.');
  const code = validatePairCode(value);
  const { error } = await supabase.rpc('join_lixzon_sync_pair', { p_code: code });
  if (error) throw new Error(`Could not join that app pairing: ${error.message}`);
  savePairCode(code);
  return code;
}

export function forgetPairCode(): void {
  savePairCode(null);
}

export async function readPairedRecords(code: string): Promise<SharedSyncRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Pairing sync is not configured for this build.');
  const { data, error } = await supabase.rpc('read_lixzon_paired_records', { p_code: code });
  if (error) throw new Error(`Could not load paired app data: ${error.message}`);
  if (!Array.isArray(data)) throw new Error('The sync service returned invalid paired data.');
  return data.filter((row): row is SharedSyncRecord =>
    typeof row === 'object' &&
    row !== null &&
    typeof row.record_key === 'string' &&
    typeof row.updated_at === 'string' &&
    typeof row.payload === 'object' &&
    row.payload !== null &&
    !Array.isArray(row.payload),
  );
}

export async function upsertPairedRecords(
  code: string,
  records: Array<{ record_key: string; payload: Record<string, unknown> }>,
): Promise<void> {
  if (records.length === 0) return;
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Pairing sync is not configured for this build.');
  const { error } = await supabase.rpc('upsert_lixzon_paired_records', {
    p_code: code,
    p_records: records,
  });
  if (error) throw new Error(`Could not sync paired app data: ${error.message}`);
}

