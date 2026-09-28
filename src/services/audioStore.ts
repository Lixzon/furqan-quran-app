import { deleteStoredAudio, getStoredAudio, isAudioDownloaded, isUsableAudio, putStoredAudio, type StoredAudio } from '../db/database';
import { audioFetchUrl } from '../lib/constants';

const RANGE_SIZE = 4 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 45_000;

async function readBytes(response: Response): Promise<Uint8Array> {
  return new Uint8Array(await response.arrayBuffer());
}

/** Turn low-level fetch failures into messages a reader can act on. */
export function describeDownloadError(error: unknown, surah: number): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error(`The download for Surah ${surah} timed out. Check your connection and try again.`);
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new Error(`You appear to be offline, so Surah ${surah} could not be downloaded.`);
  }
  if (error instanceof TypeError) {
    return new Error(`Could not reach the recitation server for Surah ${surah}. Please try again.`);
  }
  return error instanceof Error ? error : new Error(`Could not download Surah ${surah}.`);
}

/** fetch() has no built-in timeout, so every byte request is bounded. */
async function fetchChunk(url: string, rangeHeader: string, surah: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      cache: 'no-store',
      headers: { Range: rangeHeader },
      signal: controller.signal,
    });
  } catch (error) {
    throw describeDownloadError(error, surah);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAudioBlob(url: string, surah: number, onProgress?: (fraction: number) => void): Promise<Blob> {
  const first = await fetchChunk(url, `bytes=0-${RANGE_SIZE - 1}`, surah);
  if (!first.ok) throw new Error(`Download failed (HTTP ${first.status}) for Surah ${surah}.`);

  // A proxy, captive portal or error page can answer with HTML; fail loudly
  // rather than storing an unplayable "recitation".
  const contentType = (first.headers.get('content-type') ?? '').toLowerCase();
  if (/^(text\/|application\/(json|xhtml|xml))/.test(contentType)) {
    throw new Error(`The recitation server returned ${contentType} instead of audio for Surah ${surah}.`);
  }

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

      const next = await fetchChunk(
        url,
        `bytes=${received}-${Math.min(total - 1, received + RANGE_SIZE - 1)}`,
        surah,
      );
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
  // Always fetch same-origin: the CDN omits Access-Control-Allow-Origin, so a
  // direct cross-origin fetch cannot be read by the browser.
  const blob = await fetchAudioBlob(audioFetchUrl(reciter, surah), surah, onProgress);
  const rec: StoredAudio = {
    key: `${reciter}|${surah}`,
    reciter,
    surah,
    blob,
    size: blob.size,
    storedAt: Date.now(),
  };
  try {
    await putStoredAudio(rec);
  } catch {
    throw new Error('There was not enough storage to save this recitation. Free up space and try again.');
  }
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
  const blob = await fetchAudioBlob(audioFetchUrl(reciter, surah), surah);
  return URL.createObjectURL(blob);
}

export { deleteStoredAudio, isAudioDownloaded };
