import { useRef, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import {
  addItem,
  moveItem,
  removeItem,
  renamePlaylist,
  setActive,
  setItemRepeat,
  setItemSurah,
  setPlaylistReciter,
} from '../store/slices/playlistSlice';
import { push } from '../store/slices/toastSlice';
import { useQuran } from '../data/QuranProvider';
import { SurahPicker } from '../components/surah/SurahPicker';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/common';
import { RECITERS, MAX_PLAYLIST_ITEMS } from '../lib/constants';
import { surahNumberToArabic } from '../lib/utils';
import type { PlaylistItem } from '../types';

interface PickerState {
  target: 'add' | 'replace';
  itemId?: string;
}

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const playlist = useAppSelector((s) => s.playlists.playlists.find((p) => p.id === id));
  const playerState = useAppSelector((s) => s.player);
  const quran = useQuran();

  const [picker, setPicker] = useState<PickerState | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const dragIndex = useRef<number | null>(null);
  const justDragged = useRef(false);

  if (!playlist) {
    return (
      <div className="page-enter">
        <EmptyState
          icon="list"
          title="Playlist not found"
          message="It may have been deleted."
          action={
            <button
              type="button"
              onClick={() => navigate('/playlists')}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
            >
              Back to playlists
            </button>
          }
        />
      </div>
    );
  }

  const inList = new Set(playlist.items.map((it) => it.surah));
  const playingHere = playerState.playlistId === playlist.id;

  const start = () => {
    dispatch(setActive(playlist.id));
    if (playlist.items.length === 0) {
      dispatch(push('Add a surah to play this playlist.', 'error'));
      return;
    }
    player.startPlaylist(playlist);
    dispatch(push(`Playing “${playlist.name}”`, 'success'));
    navigate('/player');
  };

  const handlePick = (surah: number) => {
    if (!picker) return;
    if (picker.target === 'add') {
      if (inList.has(surah)) {
        dispatch(push('That surah is already in this playlist.', 'error'));
        setPicker(null);
        return;
      }
      if (playlist.items.length >= MAX_PLAYLIST_ITEMS) {
        dispatch(push(`Playlists hold up to ${MAX_PLAYLIST_ITEMS} surahs.`, 'error'));
        setPicker(null);
        return;
      }
      dispatch(addItem({ playlistId: playlist.id, surah }));
    } else if (picker.itemId) {
      if (playlist.items.some((it) => it.id !== picker.itemId && it.surah === surah)) {
        dispatch(push('That surah is already in this playlist.', 'error'));
        setPicker(null);
        return;
      }
      dispatch(setItemSurah({ playlistId: playlist.id, itemId: picker.itemId, surah }));
    }
    setPicker(null);
  };

  const move = (from: number, to: number) => {
    const len = playlist.items.length;
    if (from < 0 || from >= len || to < 0 || to >= len || from === to) return;
    dispatch(moveItem({ playlistId: playlist.id, from, to }));
  };

  return (
    <div className="page-enter">
      {/* header */}
      <button
        type="button"
        onClick={() => navigate('/playlists')}
        className="pressable mb-3 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-mut hover:bg-surface2 hover:text-ink"
      >
        <Icon name="back" size={18} />
        Playlists
      </button>

      <div className="relative overflow-hidden rounded-3xl bg-surface p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/10" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">Playlist</div>
            <h1 className="mt-1 text-2xl font-bold text-ink">{playlist.name}</h1>
            <div className="mt-1 text-sm text-mut">
              {playlist.items.length}/{MAX_PLAYLIST_ITEMS} slots ·{' '}
              {playlist.items.reduce((s, it) => s + it.repeat, 0)} total plays per pass
            </div>
          </div>
          <button
            type="button"
            aria-label="Rename playlist"
            onClick={() => {
              setRenameVal(playlist.name);
              setRenameOpen(true);
            }}
            className="pressable rounded-full p-2 text-mut hover:bg-surface2 hover:text-ink"
          >
            <Icon name="edit" size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-mut">Reciter</label>
          <select
            value={playlist.reciter}
            onChange={(e) => dispatch(setPlaylistReciter({ id: playlist.id, reciter: e.target.value }))}
            className="max-w-[16rem] rounded-full border border-line bg-surface2 px-3 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={start}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-onaccent pressable"
          >
            <Icon name={playingHere && playerState.isPlaying ? 'pause' : 'play'} size={18} />
            {playingHere && playerState.isPlaying ? 'Pause' : 'Play playlist'}
          </button>
        </div>
      </div>

      {/* items */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Queue order</h2>
          <span className="text-xs text-mut">tap a surah to change it · drag to reorder</span>
        </div>

        {playlist.items.length === 0 ? (
          <EmptyState
            icon="plus"
            title="Empty playlist"
            message={`Add up to ${MAX_PLAYLIST_ITEMS} surahs in any order. Each one can repeat a set number of times before the next begins.`}
            action={
              <button
                type="button"
                onClick={() => setPicker({ target: 'add' })}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
              >
                Add first surah
              </button>
            }
          />
        ) : (
          <div className="space-y-2">
            {playlist.items.map((item, idx) => (
              <SlotRow
                key={item.id}
                item={item}
                index={idx}
                total={playlist.items.length}
                isCurrent={
                  playingHere && playerState.queue[playerState.order[playerState.pos]] === item.surah
                }
                metaName={quran.surahById(item.surah)?.englishName ?? `Surah ${item.surah}`}
                metaAr={quran.surahById(item.surah)?.name ?? ''}
                onPick={() => setPicker({ target: 'replace', itemId: item.id })}
                onRemove={() => dispatch(removeItem({ playlistId: playlist.id, itemId: item.id }))}
                onRepeat={(r) =>
                  dispatch(setItemRepeat({ playlistId: playlist.id, itemId: item.id, repeat: r }))
                }
                onMove={(dir) => move(idx, idx + dir)}
                dragHandlers={{
                  onDragStart: () => {
                    dragIndex.current = idx;
                  },
                  onDragOver: (e) => {
                    e.preventDefault();
                  },
                  onDrop: () => {
                    const from = dragIndex.current;
                    dragIndex.current = null;
                    justDragged.current = true;
                    window.setTimeout(() => {
                      justDragged.current = false;
                    }, 60);
                    if (from !== null && from !== idx) move(from, idx);
                  },
                  onDragEnd: () => {
                    dragIndex.current = null;
                  },
                }}
                suppressClick={() => justDragged.current}
              />
            ))}
          </div>
        )}
      </div>

      {playlist.items.length < MAX_PLAYLIST_ITEMS && (
        <button
          type="button"
          onClick={() => setPicker({ target: 'add' })}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line2 py-3 text-sm font-medium text-mut pressable hover:border-accent hover:text-accent"
        >
          <Icon name="plus" size={18} />
          Add surah ({playlist.items.length}/{MAX_PLAYLIST_ITEMS})
        </button>
      )}

      <div className="mt-6 rounded-2xl bg-surface2/60 p-4 text-xs leading-relaxed text-mut">
        <div className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
          <Icon name="info" size={14} className="text-accent" />
          How repeats work
        </div>
        Set each surah to play e.g. ×3. Furqan will recite it 3 times, then move to the next in this
        queue. Turn on <b>repeat all</b> in the player to loop the whole playlist, or <b>shuffle</b> to
        randomise the order.
      </div>

      {/* surah picker */}
      <SurahPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={handlePick}
        disabled={picker?.target === 'add' ? inList : undefined}
        title={picker?.target === 'replace' ? 'Replace with…' : 'Add a surah'}
      />

      {/* rename modal */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename playlist">
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => setRenameVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              dispatch(renamePlaylist({ id: playlist.id, name: renameVal }));
              setRenameOpen(false);
            }
          }}
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-ink focus:border-accent focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRenameOpen(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!renameVal.trim()}
            onClick={() => {
              dispatch(renamePlaylist({ id: playlist.id, name: renameVal }));
              setRenameOpen(false);
            }}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ============================ slot row ============================ */
function SlotRow({
  item,
  index,
  total,
  isCurrent,
  metaName,
  metaAr,
  onPick,
  onRemove,
  onRepeat,
  onMove,
  dragHandlers,
  suppressClick,
}: {
  item: PlaylistItem;
  index: number;
  total: number;
  isCurrent: boolean;
  metaName: string;
  metaAr: string;
  onPick: () => void;
  onRemove: () => void;
  onRepeat: (r: number) => void;
  onMove: (dir: -1 | 1) => void;
  dragHandlers: {
    onDragStart: () => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: () => void;
    onDragEnd: () => void;
  };
  suppressClick: () => boolean;
}) {
  const repeat = Math.max(1, item.repeat);
  return (
    <div
      draggable
      onDragStart={dragHandlers.onDragStart}
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      onDragEnd={dragHandlers.onDragEnd}
      onClick={() => {
        if (!suppressClick()) onPick();
      }}
      className={`flex items-stretch gap-2 rounded-2xl border bg-surface p-2.5 ${
        isCurrent ? 'border-accent/50 bg-accent/6' : 'border-transparent'
      } cursor-grab active:cursor-grabbing`}
    >
      <div className="flex flex-col items-center justify-center gap-0.5 px-1 text-mut">
        <Icon name="grip" size={16} className="opacity-60" />
      </div>

      <div className="flex items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold ${
            isCurrent ? 'bg-accent text-onaccent' : 'bg-accent/12 text-accent'
          }`}
        >
          {index + 1}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-semibold text-ink">{metaName}</span>
          <span className="truncate text-xs text-mut" style={{ direction: 'rtl' }}>
            {metaAr}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[11px] text-mut">
            Slot {surahNumberToArabic(index + 1)} of {total}
          </span>
          <span className="mx-1 text-mut/50">·</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Decrease repeat"
              onClick={(e) => {
                e.stopPropagation();
                onRepeat(repeat - 1);
              }}
              disabled={repeat <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-surface2 text-mut pressable disabled:opacity-35"
            >
              <Icon name="prev" size={10} />
            </button>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="min-w-[2.4rem] rounded-md bg-surface2 px-1 py-0.5 text-center text-[11px] font-semibold text-ink"
              title="Repeat count"
            >
              ×{repeat}
            </button>
            <button
              type="button"
              aria-label="Increase repeat"
              onClick={(e) => {
                e.stopPropagation();
                onRepeat(repeat + 1);
              }}
              disabled={repeat >= 50}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-surface2 text-mut pressable disabled:opacity-35"
            >
              <Icon name="forward" size={10} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between py-0.5">
        <button
          type="button"
          aria-label="Move up"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            onMove(-1);
          }}
          className="pressable rounded-md p-1 text-mut hover:text-ink disabled:opacity-30"
        >
          <Icon name="chevronDown" size={15} className="rotate-180" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={(e) => {
            e.stopPropagation();
            onMove(1);
          }}
          className="pressable rounded-md p-1 text-mut hover:text-ink disabled:opacity-30"
        >
          <Icon name="chevronDown" size={15} />
        </button>
      </div>

      <button
        type="button"
        aria-label="Remove slot"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="pressable self-center rounded-full p-1.5 text-mut hover:bg-surface2 hover:text-danger"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
