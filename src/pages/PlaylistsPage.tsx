import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { player } from '../audio/controller';
import { createPlaylist, deletePlaylist, setActive } from '../store/slices/playlistSlice';
import { push } from '../store/slices/toastSlice';
import { useQuran } from '../data/QuranProvider';
import { PageHeader, EmptyState } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { reciterById, MAX_PLAYLIST_ITEMS } from '../lib/constants';
import type { Playlist } from '../types';

export default function PlaylistsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { playlists, activeId } = useAppSelector((s) => s.playlists);
  const playerState = useAppSelector((s) => s.player);
  const quran = useQuran();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Playlist | null>(null);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const action = dispatch(createPlaylist(name));
    const id = (action.payload as Playlist).id;
    setNewName('');
    setCreateOpen(false);
    navigate(`/playlist/${id}`);
  };

  const start = (pl: Playlist) => {
    dispatch(setActive(pl.id));
    if (pl.items.length === 0) {
      dispatch(push('This playlist is empty — add some surahs first.', 'error'));
      navigate(`/playlist/${pl.id}`);
      return;
    }
    player.startPlaylist(pl);
    dispatch(push(`Playing “${pl.name}”`, 'success'));
  };

  const previewNames = (pl: Playlist) => {
    if (!quran.surahs) return '';
    const names = pl.items
      .slice(0, 3)
      .map((it) => quran.surahs?.find((s) => s.number === it.surah)?.englishName)
      .filter(Boolean);
    if (names.length === 0) return 'No surahs yet';
    return names.join(' · ') + (pl.items.length > 3 ? ` +${pl.items.length - 3}` : '');
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Playlists"
        subtitle="Build custom surah queues — each surah plays as many times as you set."
        right={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-onaccent pressable"
          >
            <Icon name="plus" size={16} />
            New
          </button>
        }
      />

      {playlists.length === 0 ? (
        <EmptyState
          icon="list"
          title="No playlists yet"
          message="Create a playlist (e.g. “Morning”, “Ruqyah”, “Night”) and fill it with up to 10 surahs in any order."
          action={
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent"
            >
              Create playlist
            </button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {playlists.map((pl) => {
            const isActive = playerState.playlistId === pl.id;
            const playingHere = isActive && playerState.isPlaying;
            const reciter = reciterById(pl.reciter);
            return (
              <div
                key={pl.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/playlist/${pl.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/playlist/${pl.id}`);
                }}
                className="pressable flex w-full items-center gap-3 rounded-2xl border border-transparent bg-surface p-3 text-left"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                  {playingHere ? (
                    <span className="eq text-accent">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <Icon name="list" size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-ink">{pl.name}</span>
                    {activeId === pl.id && !playingHere && (
                      <span className="rounded-full bg-accent/12 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        active
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-mut">{previewNames(pl)}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-mut">
                    <span>
                      {pl.items.length}/{MAX_PLAYLIST_ITEMS} surahs
                    </span>
                    <span>·</span>
                    <span className="truncate">{reciter.label}</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${pl.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(pl);
                  }}
                  className="pressable rounded-full p-2 text-mut hover:bg-surface2 hover:text-danger"
                >
                  <Icon name="trash" size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`Play ${pl.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    start(pl);
                  }}
                  className="pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-onaccent shadow"
                >
                  <Icon name={playingHere ? 'pause' : 'play'} size={19} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New playlist">
        <input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          placeholder="e.g. Morning, Ruqyah, Night…"
          className="w-full rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={handleCreate}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </Modal>

      {/* delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete playlist?">
        <p className="text-sm text-mut">
          “{confirmDelete?.name}” and its saved queue will be removed. Your downloads are kept.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="rounded-full px-4 py-2 text-sm font-medium text-mut hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmDelete) dispatch(deletePlaylist(confirmDelete.id));
              setConfirmDelete(null);
            }}
            className="rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
