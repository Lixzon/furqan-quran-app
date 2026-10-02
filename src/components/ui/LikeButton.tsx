import { Icon } from './Icon';

/**
 * Heart toggle used by every likeable thing in the app (surah, ayah, dua,
 * quote). Filled and scaled when liked, so the tap reads as an event rather
 * than a silent state change.
 */
export function LikeButton({
  liked,
  onToggle,
  label,
  size = 20,
  className = 'h-11 w-11',
}: {
  liked: boolean;
  onToggle: () => void;
  /** Accessible name; the liked state is announced via aria-pressed. */
  label: string;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`pressable flex shrink-0 items-center justify-center rounded-full transition-colors ${
        liked ? 'text-danger' : 'text-mut hover:text-ink'
      } ${className}`}
    >
      <Icon
        name="heart"
        size={size}
        className={liked ? 'heart-pop heart-filled' : 'heart-outline'}
      />
    </button>
  );
}
