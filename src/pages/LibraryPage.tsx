import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../store';
import { totalLikedItems } from '../store/slices/likesSlice';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import FavoritesPage from './FavoritesPage';
import PlaylistsPage from './PlaylistsPage';
import DownloadsPage from './DownloadsPage';
import MemorizedAyahsPage from './MemorizedAyahsPage';

type LibrarySection = 'favorites' | 'playlists' | 'downloads' | 'memorized';

const SECTIONS: Array<{ id: LibrarySection; label: string; icon: 'heart' | 'list' | 'download' | 'book' }> = [
  { id: 'favorites', label: 'Favorites', icon: 'heart' },
  { id: 'playlists', label: 'Playlists', icon: 'list' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'memorized', label: 'Memorized', icon: 'book' },
];

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const likes = useAppSelector((state) => state.likes);
  const bookmarks = useAppSelector((state) => state.bookmarks.items.length);
  const memorizedCount = useAppSelector((state) => state.memorized.items.filter((item) => item.memorized).length);
  const sectionParam = searchParams.get('section');
  const section: LibrarySection = SECTIONS.some((item) => item.id === sectionParam)
    ? (sectionParam as LibrarySection)
    : 'favorites';
  const favoriteCount = totalLikedItems(likes) + bookmarks;

  const selectSection = (next: LibrarySection) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'favorites') params.delete('section');
    else params.set('section', next);
    if (next !== 'favorites') {
      params.delete('tab');
      params.delete('q');
    }
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="page-enter">
      <PageHeader title="Library" subtitle="A thoughtful home for what you save, revisit, and want to learn." />

      <section className="relative mb-5 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#102f3a] via-[#14564f] to-[#267665] p-5 text-white shadow-card">
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-3 -top-7 h-32 w-32 rounded-full border border-white/10" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
            <Icon name="book" size={14} />
            Your Manāra collection
          </div>
          <h2 className="mt-2 max-w-xl text-xl font-semibold leading-snug">Keep the words and passages you want to return to close.</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/75">
            Quran bookmarks, favourites, reflections, and offline listening—together in one calm reading space.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium">
              {favoriteCount} saved favourites
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium">
              {bookmarks} Quran bookmarks
            </span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium">
              {memorizedCount} memorized ayahs
            </span>
          </div>
        </div>
      </section>

      <section className="mb-5" aria-labelledby="guidance-collections">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h2 id="guidance-collections" className="text-sm font-semibold text-ink">Explore the collection</h2>
            <p className="mt-0.5 text-[11px] text-mut">Short reads, clear sources, and complete context.</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <CollectionLink
            to="/quotes?view=sayings"
            eyebrow="WORDS TO KEEP"
            title="Sayings & Hadith"
            detail="Reflect on a teaching and its source."
            icon="quote"
            tone="gold"
          />
          <CollectionLink
            to="/quotes?view=duas"
            eyebrow="DU’AS FOR THE DAY"
            title="Supplications"
            detail="Browse by moment and intention."
            icon="sparkle"
            tone="green"
          />
          <CollectionLink
            to="/stories"
            eyebrow="THE ARCHIVE"
            title="Stories & history"
            detail="A brief introduction, then read the full account."
            icon="book"
            tone="blue"
          />
        </div>
      </section>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1 sm:grid-cols-4" role="tablist" aria-label="Library sections">
        {SECTIONS.map((item) => {
          const active = section === item.id;
          const label = item.id === 'favorites' && favoriteCount > 0
            ? `${item.label} · ${favoriteCount}`
            : item.id === 'memorized' && memorizedCount > 0
              ? `${item.label} · ${memorizedCount}`
              : item.label;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectSection(item.id)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors ${active ? 'bg-accent text-onaccent' : 'text-mut hover:bg-surface2 hover:text-ink'}`}
            >
              <Icon name={item.icon} size={15} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={SECTIONS.find((item) => item.id === section)?.label}>
        {section === 'favorites' && <FavoritesPage embedded />}
        {section === 'playlists' && <PlaylistsPage />}
        {section === 'downloads' && <DownloadsPage />}
        {section === 'memorized' && <MemorizedAyahsPage />}
      </div>
    </div>
  );
}

function CollectionLink({
  to,
  eyebrow,
  title,
  detail,
  icon,
  tone,
}: {
  to: string;
  eyebrow: string;
  title: string;
  detail: string;
  icon: 'quote' | 'sparkle' | 'book';
  tone: 'gold' | 'green' | 'blue';
}) {
  const toneClass = {
    gold: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    blue: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  }[tone];

  return (
    <Link to={to} className="group rounded-2xl border border-line bg-surface p-3.5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon name={icon} size={17} />
        </span>
        <Icon name="forward" size={16} className="mt-1 text-mut transition group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-mut">{detail}</p>
    </Link>
  );
}
