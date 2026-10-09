import { store } from '../store';
import { patch, type PlayerState } from '../store/slices/playerSlice';
import { push } from '../store/slices/toastSlice';
import { markListened, rememberListened } from '../store/slices/progressSlice';
import { reciterById } from '../lib/constants';
import { getSurahTimingData, resolveAudioSourceUrl, type TimingSegment } from '../lib/audioTiming';
import { isAudioDownloaded, getDownloadedAudioUrl, getRangedAudioUrl } from '../services/audioStore';
import { getSurah, getSurahMetaList } from '../lib/dataClient';
import { buildAyahFractions, buildExpandedQueue, clampIndex, shuffleIndices } from '../lib/queue';
import type { Playlist, SurahMeta } from '../types';

const PLAYER_PREFS = 'furqan:player';

/** How often the highlight is re-resolved while playing. `timeupdate` is
 *  throttled to ~4 Hz on desktop and as low as 1 Hz on some mobile builds,
 *  which lets the highlight cross a verse boundary late. */
const TIMELINE_SAMPLE_MS = 200;

/** A timing table describes one exact rendition. If the loaded file differs in
 *  length by more than this, the table belongs to another edit and is dropped. */
const MAX_TIMING_DRIFT = 0.02;

/** Bounds for the user-adjustable highlight offset. */
const MAX_SYNC_OFFSET_MS = 5000;

interface PlayerPrefs {
  volume: number;
  muted: boolean;
  playbackRate: number;
}

class PlayerController {
  private el: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private cumulative: number[] | null = null;
  private metaCache = new Map<number, SurahMeta>();
  private pendingStartAyah: number | null = null;
  private sleepTimerId: number | null = null;
  private loadToken = 0;
  private playbackIntentToken = 0;
  private fallbackToken = 0;
  private realTiming: Array<{ start: number; end: number }> | null = null;
  private timelineTimer: number | null = null;
  /** Milliseconds added to the audio clock before resolving the ayah index.
   *  Negative values delay the highlight, positive values advance it. */
  private syncOffsetMs = 0;
  /** Character-length timelines per surah, so playback outside the reader
   *  (mini player, Now Playing, playlists) is not stuck on uniform division. */
  private weightsBySurah = new Map<number, number[]>();
  /** Lowest ayah index the highlight may show until the offset catches up.
   *  Set when the reader deliberately seeks, so the highlight cannot jump
   *  backwards to the previous ayah right after the jump. */
  private indexFloor: number | null = null;
  private stopAfterAyahIndex: number | null = null;
  private singleAyahEnded: (() => void) | null = null;

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
    el.addEventListener('play', () => {
      store.dispatch(patch({ isPlaying: true, buffering: false }));
      this.syncPlaybackState('playing');
      this.startTimelineSampler();
    });
    el.addEventListener('playing', () => {
      store.dispatch(patch({ isPlaying: true, buffering: false }));
      this.syncPlaybackState('playing');
      this.startTimelineSampler();
    });
    el.addEventListener('pause', () => {
      store.dispatch(patch({ isPlaying: false, buffering: false }));
      this.syncPlaybackState('paused');
      this.stopTimelineSampler();
    });
    el.addEventListener('waiting', () => store.dispatch(patch({ buffering: true })));
    el.addEventListener('canplay', () => store.dispatch(patch({ buffering: false })));
    el.addEventListener('ended', () => {
      this.stopTimelineSampler();
      this.onEnded();
    });
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
    this.realTiming = null;

    const timing = await getSurahTimingData(reciter, surah);
    if (loadToken !== this.loadToken) return;
    this.realTiming = timing?.timestamps ?? null;

    const downloaded = await isAudioDownloaded(reciter, surah);
    if (loadToken !== this.loadToken) return;
    let src: string;
    if (downloaded) {
      const url = await getDownloadedAudioUrl(reciter, surah);
      if (url) {
        src = url;
        this.objectUrl = url;
      } else {
        src = await resolveAudioSourceUrl(reciter, surah);
      }
    } else {
      src = await resolveAudioSourceUrl(reciter, surah);
    }
    if (loadToken !== this.loadToken) {
      if (this.objectUrl && downloaded) this.revokeUrl();
      return;
    }

    this.cumulative = null;
    this.indexFloor = null;
    const knownLengths = this.weightsBySurah.get(surah);
    if (knownLengths) this.applyWeights(knownLengths);
    else void this.hydrateWeights(surah);
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
    el.playbackRate = this.getState().playbackRate;
    this.fallbackToken = 0;

    try {
      el.src = src;
      el.load();
    } catch {
      this.onError();
    }
  }

  private async playElement(intentToken = this.playbackIntentToken): Promise<void> {
    const el = this.ensureEl();
    try {
      await el.play();
      if (intentToken !== this.playbackIntentToken) {
        el.pause();
        this.patch({ isPlaying: false, buffering: false });
        return;
      }
      this.patch({ isPlaying: true });
    } catch {
      // Autoplay may be blocked (e.g. no user gesture yet). Surface once.
      if (intentToken === this.playbackIntentToken) this.patch({ isPlaying: false, buffering: false });
    }
  }

  /** Loads whatever the queue currently points at and (optionally) plays. */
  private async loadCurrent(autoplay: boolean, startAyahIndex: number | null = null): Promise<void> {
    const intentToken = ++this.playbackIntentToken;
    const s = this.getState();
    if (s.queue.length === 0 || s.order.length === 0) return;
    const surah = s.queue[s.order[s.pos]];
    if (surah === undefined) return;
    const count = await this.resolveAyahCount(surah, s.ayahCount);
    if (intentToken !== this.playbackIntentToken) return;
    this.patch({ ayahCount: count });
    await this.loadSurah(surah, s.reciter, count, startAyahIndex);
    if (intentToken !== this.playbackIntentToken) return;
    if (autoplay) await this.playElement(intentToken);
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
    ms.setActionHandler('seekbackward', (details) => {
      this.seek(this.getState().currentTime - (details.seekOffset ?? 10));
    });
    ms.setActionHandler('seekforward', (details) => {
      this.seek(this.getState().currentTime + (details.seekOffset ?? 10));
    });
    ms.setActionHandler('stop', () => this.stop());
  }

  /** Reflect transport state to the OS (lock screen, notification shade, Bluetooth). */
  private syncPlaybackState(state: 'none' | 'paused' | 'playing'): void {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms) return;
    try {
      ms.playbackState = state;
    } catch {
      /* not supported on this platform */
    }
  }

  /* ------------------------------------------- timing / highlight ---- */
  private onLoadedMetadata(): void {
    const el = this.ensureEl();
    const s = this.getState();
    const count = s.ayahCount || 0;
    const duration = Number.isFinite(el.duration) ? el.duration : 0;

    // Drop timings that describe a different rendition (another edit, or a
    // downloaded copy) before they can skew the highlight.
    if (this.realTiming && !this.timingMatchesAudio(this.realTiming, duration)) {
      console.warn(
        `[player] ignoring ayah timings for surah ${s.surah}: they span ` +
          `${this.realTiming[this.realTiming.length - 1]?.end ?? 0}s but the audio is ${duration}s`,
      );
      this.realTiming = null;
    }

    if (this.pendingStartAyah !== null && duration > 0) {
      const target = this.ayahStartTime(this.pendingStartAyah, count, duration);
      try {
        el.currentTime = Math.max(0, Math.min(target, duration - 0.05));
      } catch {
        /* ignore seek errors */
      }
      this.pendingStartAyah = null;
    }
    this.indexFloor = null;
    this.patch({ duration: el.duration || 0 });
  }

  private timingMatchesAudio(timing: TimingSegment[], duration: number): boolean {
    if (timing.length === 0 || !(duration > 0)) return false;
    const span = timing[timing.length - 1]?.end ?? 0;
    if (!(span > 0)) return false;
    return Math.abs(span - duration) / duration <= MAX_TIMING_DRIFT;
  }

  private ayahStartTime(ayahIndex: number, count: number, duration: number): number {
    if (this.realTiming && this.realTiming.length >= count) {
      const segment = this.realTiming[ayahIndex];
      return segment ? segment.start : (ayahIndex / Math.max(1, count)) * duration;
    }
    if (this.cumulative && this.cumulative.length === count) {
      const frac = ayahIndex === 0 ? 0 : this.cumulative[ayahIndex - 1];
      return frac * duration;
    }
    return (ayahIndex / Math.max(1, count)) * duration;
  }

  private ayahEndTime(ayahIndex: number, count: number, duration: number): number {
    if (this.realTiming && this.realTiming.length >= count) {
      return this.realTiming[ayahIndex]?.end ?? duration;
    }
    return ayahIndex + 1 < count ? this.ayahStartTime(ayahIndex + 1, count, duration) : duration;
  }

  private computeAyahIndex(time: number, duration: number, count: number): number {
    if (count <= 0 || duration <= 0) return 0;
    if (this.realTiming && this.realTiming.length >= count) {
      for (let i = 0; i < count; i++) {
        const segment = this.realTiming[i];
        if (!segment) continue;
        if (time < segment.end) return i;
      }
      return Math.max(0, count - 1);
    }
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

  /**
   * Audio-clock position used to resolve the highlighted ayah, after the
   * reader's sync offset (negative = highlight follows later). Clamped so the
   * first ayah still matches while the offset plays out at the start.
   */
  private timelineTime(raw: number): number {
    if (this.syncOffsetMs === 0) return raw;
    return Math.max(0, raw + this.syncOffsetMs / 1000);
  }

  private startTimelineSampler(): void {
    if (this.timelineTimer !== null) return;
    this.timelineTimer = window.setInterval(() => this.onTime(), TIMELINE_SAMPLE_MS);
  }

  private stopTimelineSampler(): void {
    if (this.timelineTimer === null) return;
    window.clearInterval(this.timelineTimer);
    this.timelineTimer = null;
  }

  private onTime(): void {
    const el = this.ensureEl();
    const s = this.getState();
    if (s.surah === null) return;
    const t = Number.isFinite(el.currentTime) ? el.currentTime : 0;
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    let idx = this.computeAyahIndex(this.timelineTime(t), d, s.ayahCount);

    // After a deliberate seek the offset would briefly name the previous ayah;
    // hold the floor instead so the highlight never steps backwards.
    if (this.indexFloor !== null) {
      if (idx >= this.indexFloor) this.indexFloor = null;
      else idx = this.indexFloor;
    }

    if (this.stopAfterAyahIndex !== null && idx > this.stopAfterAyahIndex) {
      const target = this.stopAfterAyahIndex;
      const stopAt = this.ayahEndTime(target, s.ayahCount, d);
      const onEnded = this.singleAyahEnded;
      this.stopAfterAyahIndex = null;
      this.singleAyahEnded = null;
      this.indexFloor = null;
      el.pause();
      try {
        el.currentTime = stopAt;
      } catch {
        /* ignore */
      }
      this.patch({ ayah: target, currentTime: stopAt, isPlaying: false, buffering: false });
      this.stopTimelineSampler();
      onEnded?.();
      return;
    }

    const toPatch: Partial<PlayerState> = { currentTime: t };
    if (Math.abs(d - s.duration) > 0.05) toPatch.duration = d;
    if (idx !== s.ayah) toPatch.ayah = idx;
    if (s.isPlaying !== !el.paused) toPatch.isPlaying = !el.paused;
    if (Object.keys(toPatch).length > 0) this.patch(toPatch);
    if (idx !== s.ayah) {
      const surahName = this.metaCache.get(s.surah)?.englishName ?? `Surah ${s.surah}`;
      this.updateMediaSession(`${surahName} ${s.surah}:${idx + 1}`, reciterLabel(s.reciter));
      store.dispatch(
        rememberListened({
          surah: s.surah,
          ayah: idx + 1,
          name: this.metaCache.get(s.surah)?.englishName ?? `Surah ${s.surah}`,
        }),
      );
    }

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
    if (this.stopAfterAyahIndex !== null) {
      const target = this.stopAfterAyahIndex;
      const onAyahEnded = this.singleAyahEnded;
      this.stopAfterAyahIndex = null;
      this.singleAyahEnded = null;
      this.patch({ isPlaying: false, buffering: false, ayah: target });
      onAyahEnded?.();
      return;
    }
    if (s.surah !== null) store.dispatch(markListened(s.surah));

    if (s.stopAfterSurah) {
      this.patch({ isPlaying: false, stopAfterSurah: false, ayah: s.ayahCount ? s.ayahCount - 1 : s.ayah });
      return;
    }
    if (s.loopSurah || s.repeat === 'one') {
      void this.loadCurrent(true);
      return;
    }
    if (s.playlistId === null && s.queue.length === 1 && s.surah !== null) {
      if (s.surah < 114) this.playSingleSurah(s.surah + 1, { reciter: s.reciter });
      else this.patch({ isPlaying: false, ayah: s.ayahCount ? s.ayahCount - 1 : s.ayah });
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

  playSingleSurah(surah: number, opts: {
    reciter?: string;
    startAyahIndex?: number | null;
    stopAfterAyahIndex?: number | null;
    onAyahEnded?: () => void;
    stopAfterSurah?: boolean;
    recommended?: boolean;
  } = {}): void {
    const s = this.getState();
    const reciter = opts.reciter ?? s.reciter;
    this.stopAfterAyahIndex = opts.stopAfterAyahIndex ?? null;
    this.singleAyahEnded = opts.onAyahEnded ?? null;
    this.patch({
      playlistId: null,
      queueName: null,
      queue: [surah],
      order: [0],
      pos: 0,
      mode: 'order',
      repeat: 'off',
      reciter,
      loopSurah: false,
      stopAfterSurah: opts.stopAfterSurah ?? false,
      isPlaying: false,
    });
    void this.loadCurrent(true, opts.startAyahIndex ?? null);
    void this.surahMeta(surah).then((m) => {
      this.updateMediaSession(m.englishName, reciterLabel(reciter));
    });
  }

  /**
  * Plays a surah from a guidance recommendation. Listening is tracked
  * separately; only foreground reading minutes complete the daily goal.
   */
  playRecommendedRecitation(surah: number, opts: { reciter?: string; startAyahIndex?: number | null } = {}): void {
    this.playSingleSurah(surah, { ...opts, recommended: true });
  }

  /** Attach text-length weights for more accurate ayah highlighting. */
  setWeights(textLengths: number[]): void {
    const surah = this.getState().surah;
    if (surah !== null) this.weightsBySurah.set(surah, textLengths);
    this.applyWeights(textLengths);
  }

  private applyWeights(textLengths: number[]): void {
    this.cumulative = textLengths.length > 0 ? buildAyahFractions(textLengths) : null;
  }

  /**
   * Playback started outside the reader (mini player, Now Playing, playlist),
   * so nobody has registered ayah lengths yet. Without them the highlight falls
   * back to dividing the surah into equal slots, which for a surah with uneven
   * verses (Al-Baqara, Yaseen) is minutes out rather than seconds.
   */
  private async hydrateWeights(surah: number): Promise<void> {
    if (this.weightsBySurah.has(surah)) return;
    try {
      const data = await getSurah(surah);
      const lengths = data.ayahs.map((a) => a.ar.length);
      if (lengths.length === 0) return;
      this.weightsBySurah.set(surah, lengths);
      if (this.getState().surah === surah) this.applyWeights(lengths);
    } catch {
      /* keep the uniform fallback */
    }
  }

  /**
   * Milliseconds added to the audio clock before resolving the highlighted
   * ayah. Negative values delay the highlight and auto-scroll (the usual
   * correction when a verse lights up before you hear it).
   */
  setSyncOffset(ms: number): void {
    const clamped = Math.max(-MAX_SYNC_OFFSET_MS, Math.min(MAX_SYNC_OFFSET_MS, Math.round(ms) || 0));
    this.syncOffsetMs = clamped;
    this.onTime();
  }

  get syncOffset(): number {
    return this.syncOffsetMs;
  }

  async play(): Promise<void> {
    const s = this.getState();
    if (s.surah === null) return;
    const intentToken = ++this.playbackIntentToken;
    const el = this.ensureEl();
    // Restart if we reached the very end while paused.
    if (Number.isFinite(el.duration) && el.duration > 0 && el.currentTime >= el.duration - 0.4) {
      el.currentTime = 0;
    }
    await this.playElement(intentToken);
  }

  pause(): void {
    this.playbackIntentToken += 1;
    this.loadToken += 1;
    const el = this.ensureEl();
    el.pause();
    this.patch({ isPlaying: false, buffering: false });
  }

  togglePlay(): void {
    if (this.getState().isPlaying) this.pause();
    else void this.play();
  }

  next(): void {
    const s = this.getState();
    if (s.queue.length === 0) return;
    if (s.loopSurah) this.patch({ loopSurah: false });
    if (s.playlistId === null && s.queue.length === 1 && s.surah !== null) {
      if (s.surah < 114) this.playSingleSurah(s.surah + 1, { reciter: s.reciter });
      return;
    }
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
    if (s.queue.length === 0) return;
    if (s.loopSurah) this.patch({ loopSurah: false });
    if (s.playlistId === null && s.queue.length === 1 && s.surah !== null) {
      if (s.surah > 1) this.playSingleSurah(s.surah - 1, { reciter: s.reciter });
      return;
    }
    const np = s.pos > 0 ? s.pos - 1 : s.order.length - 1;
    this.patch({ pos: np, ayah: null });
    void this.loadCurrent(true);
  }

  stop(): void {
    this.playbackIntentToken += 1;
    this.loadToken += 1;
    const el = this.ensureEl();
    if (this.sleepTimerId !== null) {
      window.clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.stopTimelineSampler();
    this.indexFloor = null;
    el.pause();
    el.currentTime = 0;
    this.syncPlaybackState('none');
    this.revokeUrl();
    this.patch({
      isPlaying: false,
      surah: null,
      ayah: null,
      ayahCount: 0,
      playlistId: null,
      queueName: null,
      queue: [],
      order: [],
      pos: 0,
      currentTime: 0,
      duration: 0,
      usingDownload: false,
      buffering: false,
      error: null,
      sleepTimer: null,
      stopAfterSurah: false,
    });
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
    // The reader chose this position, so highlight what the audio actually
    // landed on rather than what the offset would have said.
    this.indexFloor = this.computeAyahIndex(clamped, d, s.ayahCount);
    this.patch({ currentTime: clamped, ayah: this.indexFloor });
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
    this.indexFloor = clamped;
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

  setPlaybackRate(rate: number): void {
    const playbackRate = Math.min(2, Math.max(0.5, rate));
    const el = this.ensureEl();
    el.playbackRate = playbackRate;
    this.patch({ playbackRate });
    this.savePrefs();
  }

  cyclePlaybackRate(): void {
    const rates = [0.5, 1, 1.5, 2];
    const current = this.getState().playbackRate;
    const next = rates[(rates.indexOf(current) + 1) % rates.length];
    this.setPlaybackRate(next);
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
    const prefs: PlayerPrefs = { volume: s.volume, muted: s.muted, playbackRate: s.playbackRate };
    try {
      localStorage.setItem(PLAYER_PREFS, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }

  initialize(): void {
    this.setupMediaSession();
    let prefs: PlayerPrefs = { volume: 1, muted: false, playbackRate: 1 };
    try {
      const raw = localStorage.getItem(PLAYER_PREFS);
      if (raw) prefs = { ...prefs, ...(JSON.parse(raw) as PlayerPrefs) };
    } catch {
      /* ignore */
    }
    const playbackRate = Number.isFinite(prefs.playbackRate) ? prefs.playbackRate : 1;
    this.patch({ volume: prefs.volume, muted: prefs.muted, playbackRate });
    const el = this.ensureEl();
    el.volume = prefs.volume;
    el.muted = prefs.muted;
    el.playbackRate = playbackRate;

    // Keep the highlight offset in step with the reader-facing setting.
    this.setSyncOffset(store.getState().settings.audioSyncOffsetMs);
    store.subscribe(() => {
      const next = store.getState().settings.audioSyncOffsetMs;
      if (next !== this.syncOffsetMs) this.setSyncOffset(next);
    });
  }

  get isActive(): boolean {
    return this.getState().surah !== null;
  }
}

function reciterLabel(reciterId: string): string {
  return reciterById(reciterId).label;
}

export const player = new PlayerController();
