import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { removeBookmark, setBookmarkNote } from '../store/slices/bookmarksSlice';
import { PageHeader, EmptyState } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';

export default function BookmarksPage() {
  const bookmarks = useAppSelector((state) => state.bookmarks.items);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const editing = bookmarks.find((item) => item.id === editingId);

  return (
    <div className="page-enter">
      <PageHeader title="Bookmarks" subtitle="Saved ayahs and personal notes, available offline." />
      {bookmarks.length === 0 ? (
        <EmptyState
          icon="pin"
          title="No saved ayahs yet"
          message="Use an ayah’s actions in the Reader to save it here."
          action={<button type="button" onClick={() => navigate('/')} className="min-h-12 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent">Browse surahs</button>}
        />
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <article key={bookmark.id} className="rounded-2xl border border-line bg-surface p-4">
              <button type="button" onClick={() => navigate(`/surah/${bookmark.surah}?ayah=${bookmark.ayah}`)} className="block w-full rounded-lg text-left">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{bookmark.surahName} · Āyah {bookmark.ayah}</span>
                  <Icon name="forward" size={16} className="shrink-0 text-mut" />
                </div>
                <p lang="ar" dir="rtl" className="ar-uthmani mt-3 text-right text-2xl leading-loose text-ink">{bookmark.arabic}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink2">{bookmark.translation}</p>
                {bookmark.note && <p className="mt-3 rounded-lg border-l-2 border-accent bg-accent/8 px-3 py-2 text-sm leading-relaxed text-ink">{bookmark.note}</p>}
              </button>
              <div className="mt-3 flex justify-end gap-1 border-t border-line pt-2">
                <button type="button" aria-label={bookmark.note ? 'Edit note' : 'Add note'} title={bookmark.note ? 'Edit note' : 'Add note'} onClick={() => { setEditingId(bookmark.id); setNote(bookmark.note); }} className="flex h-12 min-w-12 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium text-mut hover:bg-surface2 hover:text-ink">
                  <Icon name="edit" size={17} /> {bookmark.note ? 'Edit note' : 'Add note'}
                </button>
                <button type="button" aria-label={`Remove ${bookmark.surahName} ayah ${bookmark.ayah} bookmark`} title="Remove bookmark" onClick={() => dispatch(removeBookmark(bookmark.id))} className="flex h-12 w-12 items-center justify-center rounded-full text-mut hover:bg-danger/10 hover:text-danger">
                  <Icon name="close" size={18} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={editing !== undefined} onClose={() => setEditingId(null)} title="Bookmark note">
        <label htmlFor="bookmark-note" className="mb-2 block text-sm font-medium text-ink">Personal reflection</label>
        <textarea id="bookmark-note" value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={2000} className="w-full resize-y rounded-xl border border-line bg-surface2 p-3 text-sm leading-relaxed text-ink focus:border-accent focus:outline-none" placeholder="Add a note for this ayah…" />
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setEditingId(null)} className="min-h-12 rounded-full px-4 py-2 text-sm font-medium text-mut">Cancel</button>
          <button type="button" onClick={() => { if (editing) dispatch(setBookmarkNote({ id: editing.id, note: note.trim() })); setEditingId(null); }} className="min-h-12 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-onaccent">Save note</button>
        </div>
      </Modal>
    </div>
  );
}