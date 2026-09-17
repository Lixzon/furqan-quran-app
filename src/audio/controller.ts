import { store } from '../store';
import { patch, type PlayerState } from '../store/slices/playerSlice';
import { push } from '../store/slices/toastSlice';
import { markListened } from '../store/slices/progressSlice';
import { audioStreamUrl, reciterById } from '../lib/constants';
import { isAudioDownloaded, getDownloadedAudioUrl, getRangedAudioUrl } from '../services/audioStore';
import { getSurahMetaList } from '../lib/dataClient';
import { buildAyahFractions, buildExpandedQueue, clampIndex, shuffleIndices } from '../lib/queue';
import type { Playlist, SurahMeta } from '../types';

const PLAYER_PREFS = 'furqan:player';

interface PlayerPrefs {
  volume: number;
  muted: boolean;
}

class PlayerController {
  private el: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private cumulative: number[] | null = null;
  private metaCache = new Map<number, SurahMeta>();
  private pendingStartAyah: number | null = null;
  private sleepTimerId: number | null = null;
  private loadToken = 0;
  private fallbackToken = 0;

  /* ------------------------------------------------ element --------- */
  private ensureEl(): HTMLAudioElement {
    if (!this.el) {
      const el = new Audio();
      el.preload = 'auto';
      this.wire(el);
      this.el = el;
    }
    return this.el;
  }

  private wire(el: HTMLAudioElement): void {
    el.addEventListener('timeupdate', () => this.onTime());
    el.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    el.addEventListener('durationchange', () => {
      if (Number.isFinite(el.duration)) {
        store.dispatch(patch({ duration: el.duration }));
      }
    });
    el.addEventListener('play', () => store.dispatch(patch({ isPlaying: true, buffering: false })));
    el.addEventListener('playing', () => store.dispatch(patch({ isPlaying: true, buffering: false })));
    el.addEventListener('pause', () => store.dispatch(patch({ isPlaying: false, buffering: false })));
    el.addEventListener('waiting', () => store.dispatch(patch({ buffering: true })));
    el.addEventListener('canplay', () => store.dispatch(patch({ buffering: false })));
    el.addEventListener('ended', () => this.onEnded());
    el.addEventListener('error', () => this.onError());
  }

  /* ------------------------------------------- meta / data ---------- */
  private async surahMeta(n: number): Promise<SurahMeta> {
    const cached = this.metaCache.get(n);
    if (cached) return cached;
    const all = await getSurahMetaList();
    const meta = all.find((m) => m.number === n);
    if (meta) this.metaCache.set(n, meta);
    return meta ?? { number: n, name: '', englishName: `Surah ${n}`, englishNameTranslation: '', revelationType: 'Meccan', numberOfAyahs: 0 };
  }

  private async resolveAyahCount(surah: number, provided?: number): Promise<number> {
    if (provided && provided > 0) return provided;
    const meta = await this.surahMeta(surah);
    return meta.numberOfAyahs || 0;
  }

  /* ------------------------------------------- helpers --------------- */
  private patch(p: Partial<PlayerState>): void {
    store.dispatch(patch(p));
  }

  private getState() {
    return store.getState().player;
  }

  private revokeUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private async loadSurah(surah: number, reciter: string, ayahCount: number, startAyahIndex: number | null): Promise<void> {
    const loadToken = ++this.loadToken;
    const el = this.ensureEl();
    el.pause();
    this.revokeUrl();

    const downloaded = await isAudioDownloaded(reciter, surah);
    if (loadToken !== this.loadToken) return;
    let src: string;
    if (downloaded) {
      const url = await getDownloadedAudioUrl(reciter, surah);
      if (url) {
        src = url;
        this.objectUrl = url;
      } else {
        src = audioStreamUrl(reciter, surah);
      }
    } else {
      src = audioStreamUrl(reciter, surah);
    }
    if (loadToken !== this.loadToken) {
      if (this.objectUrl && downloaded) this.revokeUrl();
      return;
    }

    this.cumulative = null;
    this.pendingStartAyah = startAyahIndex;
    this.patch({
      surah,
      ayahCount,
      ayah: startAyahIndex ?? 0,
      currentTime: 0,
      duration: 0,
      usingDownload: downloaded,
      buffering: true,
      error: null,
      isPlaying: false,
    });
    this.fallbackToken = 0;

    try {
      el.src = src;
      el.load();
    } catch {
      this.onError();
    }
  }

  private async playElement(): Promise<void> {
    const el = this.ensureEl();
    try {
      await el.play();
      this.patch({ isPlaying: true });
    } catch {
      // Autoplay may be blocked (e.g. no user gesture yet). Surface once.
      this.patch({ isPlaying: false, buffering: false });
    }
  }

  /** Loads whatever the queue currently points at and (optionally) plays. */
  private async loadCurrent(autoplay: boolean, startAyahIndex: number | null = null): Promise<void> {
    const s = this.getState();
    if (s.queue.length === 0 || s.order.length === 0) return;
    const surah = s.queue[s.order[s.pos]];
    if (surah === undefined) return;
    const count = await this.resolveAyahCount(surah, s.ayahCount);
    this.patch({ ayahCount: count });
    await this.loadSurah(surah, s.reciter, count, startAyahIndex);
    if (autoplay) await this.playElement();
  }

  private updateMediaSession(surahName: string, reciterLabel: string): void {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms) return;
    ms.metadata = new MediaMetadata({
      title: surahName,
      artist: reciterLabel,
      album: 'Furqan · Qur’an',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }

  private setupMediaSession(): void {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms || !('setActionHandler' in ms)) return;
    ms.setActionHandler('play', () => {
      void this.play();
    });
    ms.setActionHandler('pause', () => this.pause());
    ms.setActionHandler('previoustrack', () => this.previous());
    ms.setActionHandler('nexttrack', () => this.next());
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) this.seek(details.seekTime);
    });
    ms.setActionHandler('stop', () => this.stop());
  }

  /* ------------------------------------------- timing / highlight ---- */
  private onLoadedMetadata(): void {
    const el = this.ensureEl();
    const s = this.getState();
    const count = s.ayahCount || 0;
    if (this.pendingStartAyah !== null && Number.isFinite(el.duration) && el.duration > 0) {
      const target = this.ayahStartTime(this.pendingStartAyah, count, el.duration);
      try {
        el.currentTime = Math.max(0, Math.min(target, el.duration - 0.05));
      } catch {
        /* ignore seek errors */
      }
      this.pendingStartAyah = null;
    }
    this.patch({ duration: el.duration || 0 });
  }

  private ayahStartTime(ayahIndex: number, count: number, duration: number): number {
    if (this.cumulative && this.cumulative.length === count) {
      const frac = ayahIndex === 0 ? 0 : this.cumulative[ayahIndex - 1];
      return frac * duration;
    }
    return (ayahIndex / Math.max(1, count)) * duration;
  }

  private computeAyahIndex(time: number, duration: number, count: number): number {
    if (count <= 0 || duration <= 0) return 0;
    const p = Math.min(1, Math.max(0, time / duration));
    if (this.cumulative && this.cumulative.length === count) {
      let lo = 0;
      let hi = count - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (this.cumulative[mid] < p) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }
    return Math.min(count - 1, Math.floor(p * count));
  }

  private onTime(): void {
    const el = this.ensureEl();
    const s = this.getState();
    if (s.surah === null) return;
    const t = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    const idx = this.computeAyahIndex(t, d, s.ayahCount);
    const toPatch: Partial<PlayerState> = { currentTime: t };
    if (Math.abs(d - s.duration) > 0.05) toPatch.duration = d;
    if (idx !== s.ayah) toPatch.ayah = idx;
    if (s.isPlaying !== !el.paused) toPatch.isPlaying = !el.paused;
    if (Object.keys(toPatch).length > 0) this.patch(toPatch);

    // position state for lock-screen seek scrubbing
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (ms && 'setPositionState' in ms && Number.isFinite(d) && d > 0) {
      try {
        ms.setPositionState({ duration: d, playbackRate: el.playbackRate, position: t });
      } catch {
        /* not supported */
      }
    }
  }

  /* ------------------------------------------- queue advancement ----- */
  private onError(): void {
    const s = this.getState();
    if (s.surah === null) {
      this.patch({ buffering: false });
      return;
    }
    if (!s.usingDownload && this.fallbackToken !== this.loadToken) {
      const token = this.loadToken;
      this.fallbackToken = token;
      this.patch({ buffering: true, error: null });
      void getRangedAudioUrl(s.reciter, s.surah)
        .then((url) => {
          if (token !== this.loadToken) {
            URL.revokeObjectURL(url);
            return;
          }
          this.revokeUrl();
          this.objectUrl = url;
          const el = this.ensureEl();
          el.src = url;
          el.load();
          void this.playElement();
        })
        .catch(() => {
          if (token === this.loadToken) this.patch({ buffering: false, isPlaying: false, error: 'Unable to play this recitation. Check your connection, or download the surah for offline listening.' });
        });
      return;
    }
    this.patch({
      buffering: false,
      isPlaying: false,
      error: 'Unable to play this recitation. Check your connection, or download the surah for offline listening.',
    });
  }

  private onEnded(): void {
    const s = this.getState();
    if (s.surah !== null) store.dispatch(markListened(s.surah));

    if (s.stopAfterSurah) {
      this.patch({ isPlaying: false, stopAfterSurah: false, ayah: s.ayahCount ? s.ayahCount - 1 : s.ayah });
      return;
    }
    if (s.loopSurah) {
      void this.loadCurrent(true);
      return;
    }
    const np = s.pos + 1;
    if (np >= s.order.length) {
      if (s.repeat === 'all') {
        this.jumpTo(0);
      } else {
        this.patch({ isPlaying: false, ayah: s.ayahCount ? s.ayahCount - 1 : s.ayah });
      }
      return;
    }
    this.jumpTo(np);
  }

  private jumpTo(index: number): void {
    const s = this.getState();
    if (s.queue.length === 0) return;
    const target = clampIndex(index, s.order.length);
    this.patch({ pos: target, ayah: null });
    void this.loadCurrent(true);
  }

  /* ------------------------------------------- public API ------------ */
  startPlaylist(playlist: Playlist, fromIndex = 0): void {
    const s = this.getState();
    const queue = buildExpandedQueue(playlist.items);
    if (queue.length === 0) {
      store.dispatch(push('This playlist is empty — add some surahs first.', 'error'));
      return;
    }
    const order = Array.from({ length: queue.length }, (_, i) => i);
    const pos = clampIndex(fromIndex, queue.length);
    this.patch({
      playlistId: playlist.id,
      queueName: playlist.name,
      queue,
      order,
      pos,
      mode: 'order',
      reciter: playlist.reciter || s.reciter,
      loopSurah: false,
      isPlaying: false,
    });
    void this.loadCurrent(true).then(() => {
      void this.surahMeta(queue[order[pos]] ?? 0).then((m) => {
        this.updateMediaSession(m.englishName, reciterLabel(playlist.reciter || s.reciter));
      });
    });
  }

  playSingleSurah(surah: number, opts: { reciter?: string; startAyahIndex?: number | null } = {}): void {
    const s = this.getState();
    const reciter = opts.reciter ?? s.reciter;
    this.patch({
      playlistId: null,
      queueName: null,
      queue: [surah],
      order: [0],
      pos: 0,
      mode: 'order',
      reciter,
      loopSurah: false,
      isPlaying: false,
    });
    void this.loadCurrent(true, opts.startAyahIndex ?? null);
    void this.surahMeta(surah).then((m) => {
      this.updateMediaSession(m.englishName, reciterLabel(reciter));
    });
  }

  /** Attach text-length weights for more accurate ayah highlighting. */
  setWeights(textLengths: number[]): void {
    this.cumulative = textLengths.length > 0 ? buildAyahFractions(textLengths) : null;
  }

  async play(): Promise<void> {
    const s = this.getState();
    if (s.surah === null) return;
    const el = this.ensureEl();
    // Restart if we reached the very end while paused.
    if (Number.isFinite(el.duration) && el.duration > 0 && el.currentTime >= el.duration - 0.4) {
      el.currentTime = 0;
    }
    await this.playElement();
  }

  pause(): void {
    const el = this.ensureEl();
    el.pause();
    this.patch({ isPlaying: false });
  }

  togglePlay(): void {
    if (this.getState().isPlaying) this.pause();
    else void this.play();
  }

  next(): void {
    const s = this.getState();
    if (s.queue.length === 0) return;
    if (s.loopSurah) this.patch({ loopSurah: false });
    const np = s.pos + 1;
    if (np >= s.order.length) {
      this.jumpTo(0);
      return;
    }
    this.patch({ pos: np, ayah: null });
    void this.loadCurrent(true);
  }

  previous(): void {
    const s = this.getState();
    const el = this.ensureEl();
    if (s.queue.length === 0) return;
    // If >3s in, restart the current surah; otherwise go to the previous entry.
    if (el.currentTime > 3) {
      el.currentTime = 0;
      this.patch({ currentTime: 0, ayah: 0 });
      return;
    }
    const np = s.pos > 0 ? s.pos - 1 : s.order.length - 1;
    this.patch({ pos: np, ayah: null });
    void this.loadCurrent(true);
  }

  stop(): void {
    const el = this.ensureEl();
    el.pause();
    el.currentTime = 0;
    this.patch({ isPlaying: false, currentTime: 0, ayah: 0 });
  }

  seek(time: number): void {
    const el = this.ensureEl();
    const s = this.getState();
    if (!s.surah) return;
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    const clamped = Math.max(0, Math.min(time, d > 0 ? d : time));
    try {
      el.currentTime = clamped;
    } catch {
      /* ignore */
    }
    this.patch({ currentTime: clamped });
  }

  seekToAyah(index: number): void {
    const s = this.getState();
    if (!s.surah) return;
    const count = s.ayahCount || 1;
    const clamped = clampIndex(index, count);
    const el = this.ensureEl();
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    const target = d > 0 ? this.ayahStartTime(clamped, count, d) : 0;
    if (d > 0) {
      try {
        el.currentTime = target;
      } catch {
        /* ignore */
      }
    }
    this.patch({ ayah: clamped, currentTime: target });
  }

  /** Jump straight to a queue position (as shown on the Now-Playing queue). */
  goToQueueIndex(index: number): void {
    const s = this.getState();
    if (index < 0 || index >= s.order.length) return;
    this.patch({ pos: index, ayah: null });
    void this.loadCurrent(true);
  }

  setVolume(v: number): void {
    const vol = Math.min(1, Math.max(0, v));
    const el = this.ensureEl();
    el.volume = vol;
    el.muted = vol === 0 ? el.muted : false;
    this.patch({ volume: vol, muted: vol === 0 });
    this.savePrefs();
  }

  setMuted(m: boolean): void {
    const el = this.ensureEl();
    el.muted = m;
    this.patch({ muted: m });
    this.savePrefs();
  }

  toggleMute(): void {
    const s = this.getState();
    this.setMuted(!s.muted);
  }

  setRepeat(mode: PlayerState['repeat']): void {
    this.patch({ repeat: mode });
  }

  setLoopSurah(v: boolean): void {
    this.patch({ loopSurah: v });
  }

  setMode(mode: 'order' | 'shuffle'): void {
    const s = this.getState();
    if (s.queue.length === 0) {
      this.patch({ mode });
      return;
    }
    if (mode === 'shuffle') {
      const order = shuffleIndices(s.queue.length);
      // keep continuity on the current surah if playing
      let pos = 0;
      if (s.surah !== null) {
        const found = order.findIndex((i) => s.queue[i] === s.surah);
        if (found >= 0) pos = found;
      }
      this.patch({ mode, order, pos });
    } else {
      const identity = Array.from({ length: s.queue.length }, (_, i) => i);
      let pos = 0;
      if (s.surah !== null) {
        const found = identity.findIndex((i) => s.queue[i] === s.surah);
        if (found >= 0) pos = found;
      }
      this.patch({ mode, order: identity, pos });
    }
  }

  setReciter(reciter: string, opts: { autoplay?: boolean } = {}): void {
    const s = this.getState();
    if (s.reciter === reciter) return;
    this.patch({ reciter });
    if (s.surah !== null) {
      const wasPlaying = opts.autoplay ?? s.isPlaying;
      void this.loadCurrent(wasPlaying);
    }
  }

  /* ------------------------------------------- sleep timer ------------ */
  setSleepTimer(minutes: number | null): void {
    if (this.sleepTimerId !== null) {
      window.clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    if (!minutes || minutes <= 0) {
      this.patch({ sleepTimer: null });
      return;
    }
    const endsAt = Date.now() + minutes * 60_000;
    this.patch({ sleepTimer: { minutes, endsAt } });
    this.sleepTimerId = window.setTimeout(() => {
      this.sleepTimerId = null;
      this.patch({ sleepTimer: null });
      this.pause();
      store.dispatch(push('Sleep timer finished — playback paused.', 'info'));
    }, minutes * 60_000);
  }

  cancelSleepTimer(): void {
    this.setSleepTimer(null);
  }

  setStopAfterSurah(v: boolean): void {
    this.patch({ stopAfterSurah: v });
    if (v) store.dispatch(push('Will stop when the current surah finishes.', 'info'));
  }

  /* ------------------------------------------- misc ------------------- */
  private savePrefs(): void {
    const s = this.getState();
    const prefs: PlayerPrefs = { volume: s.volume, muted: s.muted };
    try {
      localStorage.setItem(PLAYER_PREFS, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }

  initialize(): void {
    this.setupMediaSession();
    let prefs: PlayerPrefs = { volume: 1, muted: false };
    try {
      const raw = localStorage.getItem(PLAYER_PREFS);
      if (raw) prefs = { ...prefs, ...(JSON.parse(raw) as PlayerPrefs) };
    } catch {
      /* ignore */
    }
    this.patch({ volume: prefs.volume, muted: prefs.muted });
    const el = this.ensureEl();
    el.volume = prefs.volume;
    el.muted = prefs.muted;
  }

  get isActive(): boolean {
    return this.getState().surah !== null;
  }
}

function reciterLabel(reciterId: string): string {
  return reciterById(reciterId).label;
}

export const player = new PlayerController();
