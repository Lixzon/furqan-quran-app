export interface AmbientSoundHandle {
  setVolume: (volume: number) => void;
  stop: () => void;
}

/** Locally generated, filtered noise bed; no network request or sound asset. */
export async function startAmbientSound(initialVolume: number): Promise<AmbientSoundHandle | null> {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const frameCount = context.sampleRate * 4;
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < frameCount; i++) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    channel[i] = brown * 3.5;
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 720;
  const gain = context.createGain();
  gain.gain.value = Math.min(0.5, Math.max(0, initialVolume));
  source.connect(lowpass).connect(gain).connect(context.destination);
  source.start();
  await context.resume();

  return {
    setVolume(volume) {
      gain.gain.setTargetAtTime(Math.min(0.5, Math.max(0, volume)), context.currentTime, 0.15);
    },
    stop() {
      source.stop();
      void context.close();
    },
  };
}
