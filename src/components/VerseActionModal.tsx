import { Modal } from './ui/Modal';
import { Icon } from './ui/Icon';
import { player } from '../audio/controller';
import type { AyahBookmark } from '../store/slices/bookmarksSlice';

export function VerseActionModal({
  open,
  onClose,
  surahNumber,
  surahName,
  ayahNumber,
  arabic,
  translation,
  transliteration,
  reciter,
  bookmark,
  isBookmarked,
  onToggleBookmark,
}: {
  open: boolean;
  onClose: () => void;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string;
  transliteration?: string;
  reciter: string;
  bookmark: Omit<AyahBookmark, 'note' | 'createdAt'>;
  isBookmarked: boolean;
  onToggleBookmark: (bookmark: Omit<AyahBookmark, 'note' | 'createdAt'>) => void;
}) {
  const playArabic = (withTranslation: boolean) => {
    const speakTranslation = () => {
      if (!('speechSynthesis' in window)) return;
      const synthesis = window.speechSynthesis;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translation);
      utterance.lang = 'en-US';
      synthesis.speak(utterance);
    };

    player.playSingleSurah(surahNumber, {
      reciter,
      startAyahIndex: ayahNumber - 1,
      stopAfterAyahIndex: ayahNumber - 1,
      onAyahEnded: withTranslation ? speakTranslation : undefined,
    });
  };

  const playFromHere = () => {
    player.playSingleSurah(surahNumber, {
      reciter,
      startAyahIndex: ayahNumber - 1,
      stopAfterSurah: true,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${surahName} · Ayah ${ayahNumber}`}
      size="md"
      variant="frosted"
      preserveBackground
      overlayClassName="bg-black/60 backdrop-blur-md anim-fade"
    >
      <div className="py-2">
        <p lang="ar" dir="rtl" className="ar-uthmani text-right text-3xl leading-loose text-ink">{arabic}</p>
        {transliteration && <p className="mt-4 text-sm italic leading-relaxed text-mut">{transliteration}</p>}
        <p className="mt-4 text-base leading-relaxed text-ink2">{translation}</p>

        <div className="mt-6 grid grid-cols-2 gap-2 border-t border-line pt-4">
          <ActionButton icon="play" label="Play Arabic once" onClick={() => playArabic(false)} />
          <ActionButton icon="play" label="Play Arabic + English" onClick={() => playArabic(true)} />
          <ActionButton icon="forward" label="Play continuously from here" onClick={playFromHere} />
          <ActionButton
            icon={isBookmarked ? 'check' : 'pin'}
            label={isBookmarked ? 'Saved to Library' : 'Save to Library'}
            pressed={isBookmarked}
            onClick={() => onToggleBookmark(bookmark)}
          />
        </div>
      </div>
    </Modal>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  pressed = false,
}: {
  icon: 'play' | 'forward' | 'pin' | 'check';
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={icon === 'check' ? pressed : undefined}
      onClick={onClick}
      className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${pressed ? 'border-accent/40 bg-accent/10 text-accent' : 'border-line bg-surface2 text-ink hover:border-accent/40 hover:text-accent'}`}
    >
      <Icon name={icon} size={17} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}