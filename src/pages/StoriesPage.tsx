import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/common';
import { ShareCardModal } from '../components/share/ShareCardModal';
import { LikeButton } from '../components/ui/LikeButton';
import { useAppDispatch, useAppSelector } from '../store';
import { isStoryLiked, toggleLikedStory } from '../store/slices/likesSlice';
import { quranRefLabel, searchStories, STORIES, STORY_SECTIONS, type Story, type StorySectionId } from '../../Mishkah/src/domain/stories';
import type { TextCardContent } from '../lib/shareCard';
import { useSectionSwitcher } from '../shared/SectionSwitcher';

function isStorySection(value: string | null): value is StorySectionId {
  return STORY_SECTIONS.some((section) => section.id === value);
}

export default function StoriesPage() {
  const dispatch = useAppDispatch();
  const { requestSwitch } = useSectionSwitcher();
  const likes = useAppSelector((state) => state.likes);
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareContent, setShareContent] = useState<TextCardContent | null>(null);
  const sectionParam = searchParams.get('section');
  const selectedId = searchParams.get('story');
  const linkedStory = selectedId ? STORIES.find((story) => story.id === selectedId) ?? null : null;
  const section = isStorySection(sectionParam) ? sectionParam : linkedStory?.section ?? 'prophets';
  const query = searchParams.get('q') ?? '';
  const selected = linkedStory;
  const stories = useMemo(() => searchStories(query, section), [query, section]);
  const sectionMeta = STORY_SECTIONS.find((item) => item.id === section);

  const setParam = (key: 'section' | 'q' | 'story', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'section') next.delete('story');
    setSearchParams(next, { replace: true });
  };

  const openStory = (story: Story) => setParam('story', story.id);
  const shareStory = (story: Story) => {
    const shareUrl = new URL(
      `${import.meta.env.BASE_URL}stories?story=${encodeURIComponent(story.id)}`,
      window.location.origin,
    ).toString();
    setShareContent({
      kind: 'story',
      title: story.title,
      body: story.subtitle,
      description: story.short,
      source: story.quranRefs.map(quranRefLabel).join(' · ') || story.era,
      shareUrl,
    });
  };

  return (
    <div className="page-enter">
      <PageHeader
        title="Stories & archives"
        subtitle="A short introduction here; open the full account and its sources when you have time."
        right={
          <div className="hidden rounded-2xl border border-line bg-surface px-3 py-2 text-right sm:block">
            <div className="text-sm font-bold text-ink">A considered archive</div>
            <div className="text-[11px] text-mut">Sources stay close to the story</div>
          </div>
        }
      />

      <section className="mb-4 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#0f4e45] via-[#154d50] to-[#263c53] p-5 text-white shadow-card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl text-amber-100">
            ۞
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">Read with care</p>
            <h2 className="mt-1 text-lg font-semibold">The source is always one tap away.</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/80">
              Share a concise introduction and a link to the complete story, rather than forwarding a long excerpt without its context.
            </p>
          </div>
        </div>
      </section>

      <div className="thin-scroll -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Story collections">
        {STORY_SECTIONS.map((item) => {
          const active = item.id === section;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setParam('section', item.id)}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
                active ? 'border-accent bg-accent text-onaccent' : 'border-line bg-surface text-mut hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {sectionMeta ? <p className="mb-3 text-xs leading-relaxed text-mut">{sectionMeta.description}</p> : null}

      <label className="relative mb-4 block">
        <span className="sr-only">Search stories</span>
        <Icon name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut" />
        <input
          value={query}
          onChange={(event) => setParam('q', event.target.value)}
          placeholder="Search a prophet, companion, or theme"
          className="w-full rounded-2xl border border-line bg-surface py-3 pl-10 pr-4 text-sm text-ink placeholder:text-mut focus:border-accent focus:outline-none"
        />
      </label>

      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-mut">
        <span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
        {section === 'prophets' && !query ? <span>Adam to Muhammad ﷺ</span> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {stories.map((story) => (
          <article key={story.id} className="group rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xs font-bold text-accent">
                {story.section === 'prophets' || story.section === 'companions' ? story.order : '۞'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{story.era ?? sectionMeta?.label}</p>
                <button type="button" onClick={() => openStory(story)} className="mt-1 text-left text-base font-semibold text-ink hover:text-accent">
                  {story.title}
                </button>
                {story.arabicName ? <p lang="ar" dir="rtl" className="mt-0.5 text-sm text-mut">{story.arabicName}</p> : null}
                <p className="mt-1 text-xs leading-relaxed text-mut">{story.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => shareStory(story)}
                aria-label={`Share ${story.title} summary`}
                title="Share story summary"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-mut hover:bg-accent/10 hover:text-accent"
              >
                <Icon name="share" size={17} />
              </button>
              <LikeButton
                liked={isStoryLiked(likes, story.id)}
                label={isStoryLiked(likes, story.id) ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`}
                onToggle={() => dispatch(toggleLikedStory(story.id))}
              />
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink2">{story.short}</p>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="min-w-0 truncate text-[11px] text-mut">
                {story.quranRefs.slice(0, 2).map(quranRefLabel).join(' · ') || 'Source-linked reading'}
              </span>
              <button type="button" onClick={() => openStory(story)} className="shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15">
                Read story
              </button>
            </div>
          </article>
        ))}
      </div>

      {stories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <h2 className="text-sm font-semibold text-ink">No stories found</h2>
          <p className="mt-1 text-xs text-mut">Try a shorter search or choose another collection.</p>
        </div>
      ) : null}

      <Modal
        open={selected !== null}
        onClose={() => setParam('story', '')}
        title={selected?.title ?? 'Story'}
        size="lg"
        variant="frosted"
      >
        {selected ? (
          <StoryDetail
            story={selected}
            liked={isStoryLiked(likes, selected.id)}
            onToggleLike={() => dispatch(toggleLikedStory(selected.id))}
            onShare={() => shareStory(selected)}
            onOpenQuran={(surah, ayah) => requestSwitch(
              'furqan',
              `/surah/${surah}?ayah=${ayah}`,
              'Do you want to switch to Furqan to read this passage?',
            )}
          />
        ) : null}
      </Modal>

      {shareContent ? (
        <ShareCardModal open onClose={() => setShareContent(null)} content={shareContent} />
      ) : null}
    </div>
  );
}

function StoryDetail({
  story,
  liked,
  onToggleLike,
  onShare,
  onOpenQuran,
}: {
  story: Story;
  liked: boolean;
  onToggleLike: () => void;
  onShare: () => void;
  onOpenQuran: (surah: number, ayah: number) => void;
}) {
  const [longRead, setLongRead] = useState(false);
  const { requestSwitch } = useSectionSwitcher();

  return (
    <div className="max-h-[75dvh] overflow-y-auto py-1">
      <p className="text-xs leading-relaxed text-mut">{story.subtitle}</p>
      <div className="my-4 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={!longRead} onClick={() => setLongRead(false)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${!longRead ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut'}`}>
          Short introduction
        </button>
        <button type="button" aria-pressed={longRead} onClick={() => setLongRead(true)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${longRead ? 'bg-accent text-onaccent' : 'bg-surface2 text-mut'}`}>
          Full story
        </button>
        <LikeButton
          liked={liked}
          label={liked ? `Remove ${story.title} from favorites` : `Add ${story.title} to favorites`}
          onToggle={onToggleLike}
          className="h-9 w-9"
          size={17}
        />
        <button type="button" onClick={onShare} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface2 px-3 py-2 text-xs font-semibold text-ink">
          <Icon name="share" size={15} /> Share summary
        </button>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-ink2">
        {!longRead ? <p>{story.short}</p> : story.long.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>

      {story.quranRefs.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Read in the Quran</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {story.quranRefs.map((reference) => (
              <button
                key={`${reference.surah}:${reference.from}`}
                type="button"
                onClick={() => onOpenQuran(reference.surah, reference.from)}
                className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/15"
              >
                {quranRefLabel(reference)} ↗
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {story.id === 'isa' ? (
        <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Related Mishka archive</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink2">
            Read the archive introduction to Maryam’s devotion and trust, with its source in Surah Maryam.
          </p>
          <button
            type="button"
            onClick={() => requestSwitch(
              'mishka',
              '/mishka/archives?item=maryam-devotion',
              'Do you want to switch to Mishka to view the Maryam archive?',
            )}
            className="mt-3 rounded-full bg-accent/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/15"
          >
            Open Maryam archive ↗
          </button>
        </section>
      ) : null}
      {story.hadithRefs?.length ? (
        <section className="mt-3 rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">Hadith references</h3>
          <ul className="mt-2 space-y-1 text-xs text-mut">
            {story.hadithRefs.map((reference) => <li key={reference}>· {reference}</li>)}
          </ul>
        </section>
      ) : null}
      <p className="mt-4 text-[11px] leading-relaxed text-mut">
        The share card contains an introduction and summary; the full reading stays available here with its source references.
      </p>
    </div>
  );
}
