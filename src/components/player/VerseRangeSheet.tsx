import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Icon } from '../ui/Icon';
import { useAppSelector } from '../../store';
import { useQuran } from '../../data/QuranProvider';
import { player } from '../../audio/controller';
import { rangeDeepLink } from '../../lib/deepLink';
import { copyText } from '../../lib/share';

/**
 * Fast surah / from-ayah / to-ayah picker for the memorisation loop.
 * Kept state-local so opening it never touches global state until the reader
 * actually starts the loop.
 */
export function VerseRangeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const playerState = useAppSelector((s) => s.player);
  const quran = useQuran();
  const activeRange = playerState.range;
  const activeSurah = playerState.surah;

  const initialSurah = activeSurah ?? 1;
  const [surah, setSurah] = useState(initialSurah);
  const [from, setFrom] = useState((activeRange?.start ?? playerState.ayah ?? 0) + 1);
  const [to, setTo] = useState(
    (activeRange?.end ?? playerState.ayah ?? 0) + 1,
  );
  const [note, setNote] = useState<string | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpen.current = false;
      return;
    }
    // Seed the fields once per opening; playback keeps patching `ayah`, which
    // must not overwrite what the reader is typing.
    if (wasOpen.current) return;
    wasOpen.current = true;
    const baseSurah = activeSurah ?? 1;
    const baseIndex = activeSurah !== null ? (playerState.ayah ?? 0) : 0;
    setSurah(baseSurah);
    setFrom((activeRange?.start ?? baseIndex) + 1);
    setTo((activeRange?.end ?? baseIndex) + 1);
    setNote(null);
  }, [open, activeSurah, activeRange?.start, activeRange?.end, playerState.ayah]);

  const count = quran.surahById(surah)?.numberOfAyahs ?? 7;

  const clamp = (value: number) => Math.min(count, Math.max(1, Math.round(value) || 1));

  const updateFrom = (value: number) => {
    const next = clamp(value);
    setFrom(next);
    if (next > to) setTo(next);
  };

  const updateTo = (value: number) => {
    const next = clamp(value);
    setTo(next);
    if (next < from) setFrom(next);
  };

  const loopLink = useMemo(() => rangeDeepLink(surah, from, to), [surah, from, to]);

  const start = () => {
    void player.playRange(surah, from - 1, to - 1, { reciter: playerState.reciter });
    onClose();
  };

  const copyLink = async () => {
    const copied = await copyText(loopLink);
    setNote(copied ? 'Loop link copied.' : 'Could not copy the link.');
  };

  return (
    <Modal open={open} onClose={onClose} title="Hifz range loop" size="md" variant="frosted">
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-mut">
          Pick a surah and the first and last ayah. Furqan repeats only that window,
          seamlessly, until you stop — audio is streamed from one buffer, so long
          sessions stay light on battery.
        </p>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-mut">Surah</span>
          <select
            value={surah}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSurah(next);
              setFrom(1);
              setTo(1);
            }}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {(quran.surahs ?? []).map((meta) => (
              <option key={meta.number} value={meta.number}>
                {meta.number}. {meta.englishName} · {meta.numberOfAyahs} ayat
              </option>
            ))}
            {quran.surahs === null && <option value={surah}>Surah {surah}</option>}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Stepper label="From ayah" value={from} min={1} max={to} onChange={updateFrom} />
          <Stepper label="To ayah" value={to} min={from} max={count} onChange={updateTo} />
        </div>

        <div className="rounded-xl bg-surface2 px-3 py-2.5 text-[11px] leading-relaxed text-mut">
          Looping <b className="text-ink">{quran.surahById(surah)?.englishName ?? `Surah ${surah}`}</b> ·{' '}
          {from === to ? `ayah ${from}` : `ayat ${from}–${to}`} · {to - from + 1} verse
          {to - from + 1 === 1 ? '' : 's'} per pass.
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-onaccent pressable"
          >
            <Icon name="play" size={16} />
            Start loop
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink pressable"
          >
            <Icon name="share" size={16} />
            Copy loop link
          </button>
        </div>

        {activeRange && activeSurah !== null && (
          <button
            type="button"
            onClick={() => {
              player.clearVerseRange();
              onClose();
            }}
            className="w-full rounded-full px-4 py-2 text-xs font-medium text-danger hover:bg-danger/10"
          >
            Stop looping {quran.surahById(activeSurah)?.englishName ?? `Surah ${activeSurah}`}
          </button>
        )}

        {note && <p className="text-center text-[11px] text-accent">{note}</p>}
        <p className="text-center text-[10px] tracking-[0.18em] text-mut">BY LIXZON</p>
      </div>
    </Modal>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium text-mut">{label}</span>
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="h-9 w-9 shrink-0 rounded-lg text-lg font-semibold text-mut transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-30"
        >
          −
        </button>
        <input
          type="number"
          aria-label={label}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-center text-base font-semibold tabular-nums text-ink focus:outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 shrink-0 rounded-lg text-lg font-semibold text-mut transition-colors hover:bg-surface2 hover:text-ink disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
