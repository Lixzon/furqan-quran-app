import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import { setDefaultReciter } from '../store/slices/settingsSlice';
import { setPlaylistReciter } from '../store/slices/playlistSlice';
import { push } from '../store/slices/toastSlice';
import { useQuran } from '../data/QuranProvider';
import { RECITERS } from '../lib/constants';
import { formatTime, surahNumberToArabic } from '../lib/utils';
import { downloadSurahAudio } from '../services/audioStore';
import { useIsDownloaded, useStorageStats } from '../services/useDownloads';
import { formatBytes } from '../lib/utils';
import { Icon } from '../components/ui/Icon';
import { Slider, IconButton } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/common';

const SLEEP_OPTIONS = [10, 20, 30, 45, 60];

export default function NowPlayingPage() {
  const p = useAppSelector((s) => s.player);
  const quran = useQuran();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [queueOpen, setQueueOpen] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const storage = useStorageStats();

  const meta = p.surah ? quran.surahById(p.surah) : undefined;
  const downloaded = useIsDownloaded(p.reciter, p.surah ?? -1);

  // ticking clock for the sleep-timer countdown
  useEffect(() => {
    if (!p.sleepTimer) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [p.sleepTimer]);

  const queueEntries = useMemo(() => {
    return p.order.map((queueIdx, pos) => ({
      pos,
      surah: p.queue[queueIdx],
    }));
  }, [p.order, p.queue]);

  const sleepRemaining = p.sleepTimer ? Math.max(0, Math.ceil((p.sleepTimer.endsAt - now) / 1000)) : 0;

  if (!p.surah || !meta) {
    return (
      <div className="page-enter">
        <EmptyState
          icon="music"
          title="Nothing playing"
          message="Open a surah and press play, or start one of your playlists."
          action={
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
            >
              Browse the Qur’an
            </button>
          }
        />
      </div>
    );
  }

  const progress = p.duration > 0 ? (p.currentTime / p.duration) * 100 : 0;
  void progress;

  const downloadCurrent = async () => {
    if (!p.surah) return;
    setDlProgress(0);
    try {
      const size = await downloadSurahAudio(p.reciter, p.surah, setDlProgress);
      dispatch(push(`Downloaded ${meta.englishName} (${formatBytes(size)}). Ready offline.`, 'success'));
    } catch (e) {
      dispatch(push(e instanceof Error ? e.message : 'Download failed.', 'error'));
    } finally {
      setDlProgress(null);
    }
  };

  const changeReciter = (id: string) => {
    if (id === p.reciter) return;
    dispatch(setDefaultReciter(id));
    if (p.playlistId) dispatch(setPlaylistReciter({ id: p.playlistId, reciter: id }));
    player.setReciter(id, { autoplay: p.isPlaying });
  };

  return (
    <div className="page-enter mx-auto max-w-lg">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Close player"
          title="Close player"
          onClick={() => navigate(-1)}
          className="pressable rounded-full p-2 text-mut hover:bg-surface2 hover:text-ink"
        >
          <Icon name="close" size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate(`/surah/${p.surah}`)}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-xs font-semibold text-accent hover:bg-surface2"
        >
          <Icon name="book" size={15} /> View text
        </button>
      </div>
      {/* artwork */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accentstrong p-6 text-onaccent shadow-card">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-black/10" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
              {p.playlistId ? 'Playlist · queue' : 'Surah'}
            </span>
            {downloaded ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold">
                <Icon name="check" size={12} /> Downloaded
              </span>
            ) : (
              <button
                type="button"
                onClick={downloadCurrent}
                disabled={dlProgress !== null}
                className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-semibold pressable disabled:opacity-60"
              >
                <Icon name="download" size={12} />
                {dlProgress !== null ? `${Math.round(dlProgress * 100)}%` : 'Download'}
              </button>
            )}
          </div>
          <div className="mt-5 text-center">
            <div className="text-xs font-medium uppercase tracking-[0.2em] opacity-80">
              Sūrah {surahNumberToArabic(p.surah)}
            </div>
            <h1 className="mt-1 text-3xl font-bold">{meta.englishName}</h1>
            <div className="mt-2 text-xl opacity-90" style={{ direction: 'rtl' }}>
              {meta.name}
            </div>
          </div>
        </div>
      </div>

      {/* reciter chips */}
      <div className="thin-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        {RECITERS.map((r) => {
          const active = r.id === p.reciter;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => changeReciter(r.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-accent text-onaccent' : 'bg-surface text-mut hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* progress */}
      <div className="mt-5">
        <Slider
          min={0}
          max={p.duration || 0}
          step={0.5}
          value={p.currentTime}
          onChange={(v) => player.seek(v)}
          ariaLabel="Seek"
        />
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-mut">
          <span>{formatTime(p.currentTime)}</span>
          <span>{p.buffering ? 'buffering…' : formatTime(p.duration)}</span>
        </div>
      </div>

      {p.error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
          <Icon name="warning" size={14} />
          {p.error}
        </div>
      )}

      {/* controls */}
      <div className="mt-2 flex items-center justify-between">
        <IconButton
          icon="shuffle"
          label="Shuffle"
          active={p.mode === 'shuffle'}
          onClick={() => player.setMode(p.mode === 'shuffle' ? 'order' : 'shuffle')}
        />
        <div className="flex items-center gap-3">
          <IconButton icon="prev" label="Previous" onClick={() => player.previous()} size={26} />
          <button
            type="button"
            aria-label={p.isPlaying ? 'Pause' : 'Play'}
            onClick={() => player.togglePlay()}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-onaccent shadow-card pressable"
          >
            <Icon name={p.isPlaying ? 'pause' : 'play'} size={30} />
          </button>
          <IconButton icon="next" label="Next" onClick={() => player.next()} size={26} />
        </div>
        <IconButton
          icon={p.loopSurah ? 'repeatOne' : 'repeat'}
          label={p.loopSurah ? 'Repeat current surah (on)' : 'Repeat current surah'}
          active={p.loopSurah || p.repeat === 'all'}
          onClick={() => {
            if (p.loopSurah) {
              player.setLoopSurah(false);
              // revert to queue-level repeat
              player.setRepeat(p.repeat === 'all' ? 'off' : 'all');
            } else {
              player.setLoopSurah(true);
            }
          }}
        />
      </div>

      {/* secondary row: repeat all + queue + volume */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => {
            player.setLoopSurah(false);
            player.setRepeat(p.repeat === 'all' ? 'off' : 'all');
          }}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            p.repeat === 'all' && !p.loopSurah ? 'bg-accent/15 text-accent' : 'text-mut hover:text-ink'
          }`}
        >
          <Icon name="repeat" size={14} />
          {p.repeat === 'all' ? 'Repeat playlist' : 'Repeat off'}
        </button>
        <button
          type="button"
          onClick={() => setQueueOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-mut hover:text-ink"
        >
          <Icon name="list" size={14} />
          Queue ({queueEntries.length})
        </button>
      </div>

      {/* sleep timer */}
      <SleepTimerBlock
        sleepTimer={p.sleepTimer}
        stopAfterSurah={p.stopAfterSurah}
        remaining={sleepRemaining}
        onSet={(m) => {
          player.setStopAfterSurah(false);
          player.setSleepTimer(m);
        }}
        onToggleStopAfter={() => {
          player.setSleepTimer(null);
          player.setStopAfterSurah(!p.stopAfterSurah);
        }}
        onCancel={() => {
          player.setStopAfterSurah(false);
          player.setSleepTimer(null);
        }}
      />

      {/* volume */}
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          aria-label="Mute"
          onClick={() => player.toggleMute()}
          className="text-mut"
        >
          <Icon name={p.muted || p.volume === 0 ? 'mute' : 'volume'} size={20} />
        </button>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={p.muted ? 0 : p.volume}
          onChange={(v) => {
            if (p.muted) player.setMuted(false);
            player.setVolume(v);
          }}
          ariaLabel="Volume"
        />
      </div>

      <div className="mt-4 text-center text-[11px] text-mut">
        {storage.count > 0
          ? `${storage.count} offline audio file${storage.count === 1 ? '' : 's'} · ${formatBytes(storage.bytes)} used`
          : 'No offline downloads yet — download surahs to listen without internet.'}
      </div>

      {/* queue modal */}
      <Modal open={queueOpen} onClose={() => setQueueOpen(false)} title={`Queue · ${p.queueName ?? 'Surah'}`}>
        <div className="thin-scroll max-h-[55vh] space-y-1 overflow-y-auto pr-1">
          {queueEntries.map((e, i) => {
            const m = quran.surahById(e.surah);
            const current = i === p.pos;
            return (
              <button
                key={`${e.pos}-${e.surah}`}
                type="button"
                onClick={() => {
                  player.goToQueueIndex(e.pos);
                  setQueueOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                  current ? 'bg-accent/12' : 'hover:bg-surface2'
                }`}
              >
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-mut">
                  {e.pos + 1}
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/12 text-xs font-semibold text-accent">
                  {surahNumberToArabic(e.surah)}
                </span>
                <span className={`min-w-0 flex-1 truncate text-sm ${current ? 'font-semibold text-accent' : 'text-ink'}`}>
                  {m?.englishName ?? `Surah ${e.surah}`}
                </span>
                {current && p.isPlaying && (
                  <span className="eq shrink-0 text-accent">
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

/* ============================ sleep timer ============================ */
function SleepTimerBlock({
  sleepTimer,
  stopAfterSurah,
  remaining,
  onSet,
  onToggleStopAfter,
  onCancel,
}: {
  sleepTimer: { minutes: number; endsAt: number } | null;
  stopAfterSurah: boolean;
  remaining: number;
  onSet: (minutes: number | null) => void;
  onToggleStopAfter: () => void;
  onCancel: () => void;
}) {
  const label = stopAfterSurah
    ? 'Stop at end of surah'
    : sleepTimer
      ? `Sleep in ${formatTime(remaining)}`
      : null;

  return (
    <div className="mt-4 rounded-2xl bg-surface p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ink">
        <Icon name="timer" size={16} className="text-accent" />
        Sleep timer
        {label && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
            <Icon name="clock" size={12} />
            {label}
          </span>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {SLEEP_OPTIONS.map((m) => {
          const on = sleepTimer?.minutes === m && !stopAfterSurah;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSet(on ? null : m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                on ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut hover:text-ink'
              }`}
            >
              {m}m
            </button>
          );
        })}
        <button
          type="button"
          onClick={onToggleStopAfter}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            stopAfterSurah ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut hover:text-ink'
          }`}
        >
          End of surah
        </button>
        {(sleepTimer || stopAfterSurah) && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-3 py-1 text-xs font-medium text-danger hover:bg-danger/10"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
