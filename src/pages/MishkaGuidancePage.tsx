import { Link, useSearchParams } from 'react-router-dom';
import { MORNING_ADHKAR } from '../../Mishkah/src/domain/adhkar';
import { PageHeader } from '../components/ui/common';
import { Icon } from '../components/ui/Icon';
import { useSectionSwitcher } from '../shared/SectionSwitcher';

const AYAT_AL_KURSI = MORNING_ADHKAR.find((item) => item.id === 'morning-ayat-kursi');

export default function MishkaGuidancePage() {
  const [searchParams] = useSearchParams();
  const { requestSwitch } = useSectionSwitcher();
  const showingAyat = searchParams.get('topic') === 'ayat-al-kursi';

  return (
    <div className="page-enter">
      <PageHeader title="Guidance" subtitle="Small practices and reminders for a steadier daily rhythm." />
      {showingAyat && AYAT_AL_KURSI ? (
        <section className="mb-4 rounded-3xl border border-accent/25 bg-accent/8 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Connected remembrance · Qur’an 2:255</p>
          <h2 className="mt-2 text-lg font-semibold text-ink">{AYAT_AL_KURSI.title}</h2>
          <p lang="ar" dir="rtl" className="ar-uthmani mt-4 text-right text-xl leading-[2.2] text-ink">{AYAT_AL_KURSI.arabic}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink2">{AYAT_AL_KURSI.meaning}</p>
          <p className="mt-2 text-xs text-mut">Reference: {AYAT_AL_KURSI.reference}</p>
          <button
            type="button"
            onClick={() => requestSwitch(
              'furqan',
              '/surah/2?ayah=255',
              'Do you want to switch to Furqan to read Ayat al-Kursi?',
            )}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-onaccent"
          >
            Read in Furqan<Icon name="forward" size={15} />
          </button>
        </section>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/quotes?view=duas" className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/35">
          <h2 className="font-semibold text-ink">Daily duas</h2>
          <p className="mt-1 text-sm leading-relaxed text-mut">Find supplications for worship, home, travel, and everyday moments.</p>
        </Link>
        <Link to="/mishkah" className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/35">
          <h2 className="font-semibold text-ink">Rafiq · app guide</h2>
          <p className="mt-1 text-sm leading-relaxed text-mut">Get offline help finding app features and read reviewed guidance answers.</p>
        </Link>
        <Link to="/stories" className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent/35 sm:col-span-2">
          <h2 className="font-semibold text-ink">Stories & reflections</h2>
          <p className="mt-1 text-sm leading-relaxed text-mut">Read concise, source-linked introductions and open the Quran passages they refer to.</p>
        </Link>
      </div>
    </div>
  );
}
