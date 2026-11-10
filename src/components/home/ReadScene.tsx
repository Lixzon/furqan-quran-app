export type ReadSceneType = 'clouds' | 'quran' | 'arch' | 'night' | 'mosque';

const PHOTO_FILES = [
  'ocean.jpg',
  'sky.jpg',
  'skyline.jpg',
  'snow.jpg',
  'mountain-starry.jpg',
  'mountain-valley.jpg',
  'alpine-range.jpg',
  'forest-sunrise.jpg',
  'lakeshore.jpg',
] as const;

const SCENE_START_INDEX: Record<ReadSceneType, number> = {
  clouds: 7,
  quran: 0,
  arch: 5,
  night: 4,
  mosque: 2,
};

export function ReadScene({ scene, variant = 0 }: { scene: ReadSceneType; variant?: number }) {
  const photoIndex = (SCENE_START_INDEX[scene] + variant) % PHOTO_FILES.length;

  return (
    <img
      aria-hidden="true"
      alt=""
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      src={`${import.meta.env.BASE_URL}share-backgrounds/${PHOTO_FILES[photoIndex]}`}
    />
  );
}
