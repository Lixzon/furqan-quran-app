import type { PlaylistItem } from '../types';

/** Flatten playlist items into a queue of surah numbers,
 *  folding each item's repeat count into repeated entries. */
export function buildExpandedQueue(items: PlaylistItem[]): number[] {
  const out: number[] = [];
  for (const it of items) {
    const r = Math.min(99, Math.max(1, Math.round(it.repeat) || 1));
    for (let i = 0; i < r; i++) out.push(it.surah);
  }
  return out;
}

export function shuffleIndices(len: number): number[] {
  const arr = Array.from({ length: len }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.min(len - 1, Math.max(0, i));
}

/** Cumulative text-length weights → normalised ayah boundaries (0..1 each). */
export function buildAyahFractions(lengths: number[]): number[] {
  const total = lengths.reduce((s, n) => s + Math.max(1, n), 0);
  let acc = 0;
  return lengths.map((n) => {
    acc += Math.max(1, n);
    return acc / total;
  });
}
