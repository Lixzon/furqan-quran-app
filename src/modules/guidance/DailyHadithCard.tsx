import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDailyHadith, getHadithById } from './dailyHadith';
import { useAppDispatch, useAppSelector } from '../../store';
import { isHadithLiked, toggleLikedHadith } from '../../store/slices/likesSlice';
import { LikeButton } from '../../components/ui/LikeButton';
import { Icon } from '../../components/ui/Icon';
import { ShareCardModal } from '../../components/share/ShareCardModal';
import type { TextCardContent } from '../../lib/shareCard';
import { recordXpAction } from '../../store/slices/progressSlice';

export function DailyHadithCard() {
  const dispatch = useAppDispatch();
  const likes = useAppSelector((state) => state.likes);
  const [searchParams] = useSearchParams();
  const [shareContent, setShareContent] = useState<TextCardContent | null>(null);
  const hadith = getHadithById(searchParams.get('hadith')) ?? getDailyHadith();
  const liked = isHadithLiked(likes, hadith.id);

  return (
    <>
      <article className="rounded-2xl border border-line bg-surface p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">Hadith for today</p>
            <h2 className="mt-2 text-base font-semibold text-ink">{hadith.title}</h2>
          </div>
          <LikeButton
            liked={liked}
            label={liked ? 'Remove Hadith from favourites' : 'Add Hadith to favourites'}
            onToggle={() => dispatch(toggleLikedHadith(hadith.id))}
          />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink2">{hadith.summary}</p>
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-xs font-medium text-muted">{hadith.reference}</p>
          <button
            type="button"
            onClick={() => setShareContent({
              kind: 'hadith',
              title: hadith.title,
              body: hadith.summary,
              description: hadith.description,
              source: hadith.reference,
              shareUrl: new URL(`${import.meta.env.BASE_URL}journey?hadith=${encodeURIComponent(hadith.id)}`, window.location.origin).toString(),
            })}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-accent hover:bg-accent/10"
          >
            <Icon name="share" size={15} />
            Share
          </button>
        </div>
      </article>
      {shareContent ? (
        <ShareCardModal
          open
          onClose={() => setShareContent(null)}
          content={shareContent}
          onShared={() => dispatch(recordXpAction({ kind: 'share' }))}
        />
      ) : null}
    </>
  );
}
