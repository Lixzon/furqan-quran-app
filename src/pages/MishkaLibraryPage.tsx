import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/common';

const COLLECTIONS: { title: string; description: string; to: string; icon: IconName; label: string }[] = [
  { title: 'Stories & archives', description: 'Short introductions, source-linked stories, and reviewed archive notes.', to: '/mishka/archives', icon: 'book', label: 'Explore archive' },
  { title: 'Du’as & sayings', description: 'Browse supplications and reflections, and keep the ones you value close.', to: '/quotes?view=duas', icon: 'quote', label: 'Browse collection' },
  { title: 'Favorites', description: 'Return to the duas, sayings, stories, and Quran items you have saved.', to: '/mishka/favorites?section=favorites', icon: 'heart', label: 'View favorites' },
];

export default function MishkaLibraryPage() {
  return (
    <div className="page-enter">
      <PageHeader title="Mishka Library" subtitle="A home for reflections, supplications, and source-linked stories." />
      <div className="grid gap-3 sm:grid-cols-2">
        {COLLECTIONS.map((collection) => (
          <Link
            key={collection.title}
            to={collection.to}
            className="group rounded-3xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-card"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon name={collection.icon} size={21} />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-ink">{collection.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-mut">{collection.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  {collection.label}<Icon name="chevronRight" size={14} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
