import { deleteStoredAudio, getStoredAudio, isAudioDownloaded, isUsableAudio, putStoredAudio, type StoredAudio } from '../db/database';
import { resolveAudioSourceUrl } from '../lib/audioTiming';

const RANGE_SIZE = 4 * 1024 * 1024;

async function readBytes(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchAudioBlob(url: string, surah: number, onProgress?: (fraction: number) => void): Promise<Blob> {
  const first = await fetch(url, {
    cache: 'no-store',
    headers: { Range: `bytes=0-${RANGE_SIZE - 1}` },
  });
  if (!first.ok) throw new Error(`Download failed (HTTP ${first.status}) for Surah ${surah}.`);

  const range = first.headers.get('content-range');
  const match = range?.match(/^bytes \d+-\d+\/(\d+)$/);
  const chunks: Uint8Array[] = [];
  let received = 0;

  if (first.status === 206 && match) {
    const total = Number(match[1]);
    let bytes = await readBytes(first);
    while (bytes.length > 0) {
      chunks.push(bytes);
      received += bytes.length;
      onProgress?.(Math.min(1, received / total));
      if (received >= total) break;

      const next = await fetch(url, {
        cache: 'no-store',
        headers: { Range: `bytes=${received}-${Math.min(total - 1, received + RANGE_SIZE - 1)}` },
      });
      if (!next.ok || next.status !== 206) {
        throw new Error(`Download failed (HTTP ${next.status}) for Surah ${surah}.`);
      }
      bytes = await readBytes(next);
    }
    if (received !== total) {
      throw new Error(`Download incomplete for Surah ${surah} (${received} of ${total} bytes). Please retry.`);
    }
  } else {
    chunks.push(await readBytes(first));
  }

  return new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
}

/** Fetch remote audio bytes with progress and persist to IndexedDB.
 *  Returns size in bytes. Throws on failure. */
export async function downloadSurahAudio(
  reciter: string,
  surah: number,
  onProgress?: (fraction: number) => void,
): Promise<number> {
  const url = await resolveAudioSourceUrl(reciter, surah);
  const blob = await fetchAudioBlob(url, surah, onProgress);
  const rec: StoredAudio = {
    key: `${reciter}|${surah}`,
    reciter,
    surah,
    blob,
    size: blob.size,
    storedAt: Date.now(),
  };
  await putStoredAudio(rec);
  onProgress?.(1);
  return blob.size;
}

/** Get a playable object URL for a downloaded surah (must be revoked later). */
export async function getDownloadedAudioUrl(reciter: string, surah: number): Promise<string | null> {
  const stored = await getStoredAudio(reciter, surah);
  if (!stored || !isUsableAudio(stored)) return null;
  return URL.createObjectURL(stored.blob);
}

/** Fetch a playable remote blob when the CDN rejects a normal full-file request. */
export async function getRangedAudioUrl(reciter: string, surah: number): Promise<string> {
  const url = await resolveAudioSourceUrl(reciter, surah);
  const blob = await fetchAudioBlob(url, surah);
  return URL.createObjectURL(blob);
}

export { deleteStoredAudio, isAudioDownloaded };
