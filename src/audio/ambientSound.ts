export interface AmbientSoundTrack {
  id: string;
  label: string;
  src: string;
  creator: string;
  sourceUrl: string;
}

export const AMBIENT_SOUND_TRACKS: AmbientSoundTrack[] = [
  {
    id: 'rain',
    label: 'Rain in a rainforest',
    src: '/audio/nature/rain.mp3',
    creator: 'INNORECORDS',
    sourceUrl: 'https://freesound.org/people/INNORECORDS/sounds/457447',
  },
  {
    id: 'birds',
    label: 'Birds in spring',
    src: '/audio/nature/birds.mp3',
    creator: 'BurghRecords',
    sourceUrl: 'https://freesound.org/people/BurghRecords/sounds/463903',
  },
  {
    id: 'stream',
    label: 'Flowing stream',
    src: '/audio/nature/stream.mp3',
    creator: 'jackthemurray',
    sourceUrl: 'https://freesound.org/people/jackthemurray/sounds/433589',
  },
  {
    id: 'waves',
    label: 'Waves on the shore',
    src: '/audio/nature/waves.mp3',
    creator: 'Alex_hears_things',
    sourceUrl: 'https://freesound.org/people/Alex_hears_things/sounds/352356',
  },
  {
    id: 'bees',
    label: 'Bees foraging',
    src: '/audio/nature/bees.mp3',
    creator: 'felix.blume',
    sourceUrl: 'https://freesound.org/people/felix.blume/sounds/568220',
  },
  {
    id: 'wind',
    label: 'Wind through trees',
    src: '/audio/nature/wind.mp3',
    creator: 'Yoyodaman234',
    sourceUrl: 'https://freesound.org/people/Yoyodaman234/sounds/335889',
  },
  {
    id: 'waterfall',
    label: 'Jungle waterfall',
    src: '/audio/nature/waterfall.mp3',
    creator: 'Archos',
    sourceUrl: 'https://freesound.org/people/Archos/sounds/468241',
  },
];

export interface AmbientSoundHandle {
  setVolume: (volume: number) => void;
  shuffleNext: () => void;
  stop: () => void;
}

function clampVolume(volume: number): number {
  return Math.min(0.5, Math.max(0, volume));
}

function shuffleTracks(excludeId: string | null): AmbientSoundTrack[] {
  const tracks = [...AMBIENT_SOUND_TRACKS];
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }
  if (excludeId && tracks.length > 1 && tracks[0].id === excludeId) {
    [tracks[0], tracks[1]] = [tracks[1], tracks[0]];
  }
  return tracks;
}

/** Play real, locally bundled field recordings in a shuffled, non-repeating cycle. */
export function startAmbientSound(
  volume: number,
  onTrackChange: (track: AmbientSoundTrack) => void,
  onError: (error: Error) => void,
): AmbientSoundHandle | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;

  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = clampVolume(volume);
  let queue: AmbientSoundTrack[] = [];
  let currentId: string | null = null;
  let stopped = false;
  let trackFailed = false;

  const reportError = (error: Error) => {
    if (stopped || trackFailed) return;
    trackFailed = true;
    onError(error);
  };

  const playNext = () => {
    if (stopped) return;
    if (queue.length === 0) queue = shuffleTracks(currentId);
    const next = queue.shift();
    if (!next) {
      onError(new Error('No ambient recordings are available.'));
      return;
    }

    currentId = next.id;
    trackFailed = false;
    audio.src = next.src;
    onTrackChange(next);
    void audio.play().catch((error: unknown) => {
      reportError(error instanceof Error ? error : new Error('The nature recording could not be played.'));
    });
  };

  audio.addEventListener('ended', playNext);
  audio.addEventListener('error', () => reportError(new Error('A nature recording could not be loaded.')));
  playNext();

  return {
    setVolume(nextVolume) {
      if (!stopped) audio.volume = clampVolume(nextVolume);
    },
    shuffleNext() {
      if (stopped) return;
      playNext();
    },
    stop() {
      if (stopped) return;
      stopped = true;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
  };
}
