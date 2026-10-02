import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import { totalLikedItems } from '../store/slices/likesSlice';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';

export default function LibraryPage() {
  const navigate = useNavigate();
  const bookmarks = useAppSelector((s) => s.bookmarks.items.length);
  const playlists = useAppSelector((s) => s.playlists.playlists.length);
  const likes = useAppSelector((s) => totalLikedItems(s.likes));
  const downloaded = useAppSelector((s) => s.progress.lastRead);

  const cards = [
    { title: 'Playlists', subtitle: `${playlists} saved collections`, icon: 'list' as const, action: () => navigate('/playlists') },
    { title: 'Bookmarks', subtitle: `${bookmarks} saved ayahs`, icon: 'book' as const, action: () => navigate('/favorites?tab=ayah') },
    { title: 'Favorites', subtitle: `${likes} items liked`, icon: 'heart' as const, action: () => navigate('/favorites') },
    { title: 'Progress', subtitle: `${Object.keys(downloaded).length} recent stops`, icon: 'progress' as const, action: () => navigate('/progress') },
  ];

  return (
    <div className="page-enter">
      <PageHeader title="Library" subtitle="Your saved reading, favorites and playlists." />

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={card.action}
            className="pressable rounded-2xl border border-line bg-surface p-4 text-left"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/12 text-accent">
              <Icon name={card.icon} size={20} />
            </div>
            <div className="text-base font-semibold text-ink">{card.title}</div>
            <div className="mt-1 text-sm text-mut">{card.subtitle}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-ink">Quick access</div>
          <button type="button" onClick={() => navigate('/downloads')} className="text-xs font-medium text-accent">
            Downloads
          </button>
        </div>
        <div className="space-y-2 text-sm text-mut">
          <button type="button" onClick={() => navigate('/playlists')} className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2 text-left pressable">
            <span>Saved playlists</span>
            <Icon name="forward" size={15} />
          </button>
          <button type="button" onClick={() => navigate('/favorites?tab=ayah')} className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2 text-left pressable">
            <span>Bookmarked ayahs</span>
            <Icon name="forward" size={15} />
          </button>
          <button type="button" onClick={() => navigate('/favorites?tab=surah')} className="flex w-full items-center justify-between rounded-xl bg-surface2 px-3 py-2 text-left pressable">
            <span>Liked surahs</span>
            <Icon name="forward" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
