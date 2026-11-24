import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, PawPrint, Volume2, VolumeX } from 'lucide-react';
import { CatMark } from './Cat.tsx';
import { SectionLabel } from './ui/Primitives.tsx';
import { useSound } from '../context/SoundContext.tsx';

interface FloatingHeart {
  id: number;
  left: number;
  size: number;
  delay: number;
  rotate: number;
}

interface PetTheCatProps {
  embedded?: boolean;
}

const REACTIONS = [
  'purrs',
  'blinks slowly',
  'headbutts you',
  'says mrrp',
  'kneads the blanket',
  'flicks a whisker',
];

export const PET_STORAGE_KEY = 'catpad_pets';

/** A short, soft purr: brownish noise through a low-pass, wobbling at ~26Hz. */
const playPurr = () => {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const duration = 1.1;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 420;

    const body = ctx.createGain();
    body.gain.value = 0.0001;
    body.gain.setValueAtTime(0.0001, ctx.currentTime);
    body.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.12);
    body.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = 26;
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 0.07;
    tremolo.connect(tremoloGain).connect(body.gain);

    source.connect(lowpass).connect(body).connect(ctx.destination);
    source.start();
    tremolo.start();
    source.stop(ctx.currentTime + duration + 0.05);
    tremolo.stop(ctx.currentTime + duration + 0.05);
    source.onended = () => {
      ctx.close().catch(() => undefined);
    };
  } catch {
    /* audio is a bonus, never a blocker */
  }
};

export const PetTheCat: React.FC<PetTheCatProps> = ({ embedded = false }) => {
  const { muted, toggleMuted } = useSound();
  const [pets, setPets] = useState(0);
  const [reaction, setReaction] = useState<string | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [purring, setPurring] = useState(false);
  const [reactionKey, setReactionKey] = useState(0);

  const nextHeartId = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(PET_STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) setPets(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const pet = useCallback(() => {
    setPets((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(PET_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      window.dispatchEvent(new CustomEvent('catpad:pet', { detail: next }));
      return next;
    });

    setReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]);
    setReactionKey((key) => key + 1);
    setPurring(true);
    timers.current.push(window.setTimeout(() => setPurring(false), 1450));

    if (!muted) timers.current.push(window.setTimeout(playPurr, 170));

    const batch: FloatingHeart[] = Array.from({ length: 3 }, () => ({
      id: nextHeartId.current++,
      left: 14 + Math.random() * 72,
      size: 13 + Math.random() * 10,
      delay: Math.random() * 170,
      rotate: -20 + Math.random() * 40,
    }));

    setHearts((prev) => [...prev, ...batch].slice(-18));

    timers.current.push(
      window.setTimeout(() => {
        setHearts((prev) => prev.filter((heart) => !batch.some((item) => item.id === heart.id)));
      }, 1600)
    );
  }, [muted]);

  const trackPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setLook({
      x: Math.max(-1, Math.min(1, dx)),
      y: Math.max(-1, Math.min(1, dy)),
    });
  };

  const label = purring
    ? 'purring'
    : pets === 0
      ? 'waiting for scratches'
      : reaction
        ? `it ${reaction}`
        : 'happy cat';

  return (
    <div
      id="pet-the-cat"
      className={embedded ? 'scroll-mt-20' : 'scroll-mt-20 border-b border-line bg-surface'}
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-md">
          <SectionLabel>02 / Cat on duty</SectionLabel>
          <h2
            id="pet-the-cat-title"
            className="mt-2 font-grotesk text-3xl font-bold tracking-[-0.03em] text-ink sm:text-4xl"
          >
            Pet the cat.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Meet Kage. Scratch behind the ears — Kage purrs and sends hearts back.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5 text-ink">
              <PawPrint className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-semibold tabular-nums">{pets.toLocaleString('en-US')}</span>{' '}
              {pets === 1 ? 'pet' : 'pets'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              {label}
              {purring && <PurrWave />}
            </span>
          </div>
        </div>

        {/* Interactive Kage stage */}
        <div className="flex flex-wrap items-center gap-5 sm:justify-end">
          <div className="relative flex flex-col items-center">
            <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center" aria-hidden="true">
              {hearts.map((heart) => (
                <span
                  key={heart.id}
                  className="heart-rise absolute bottom-0"
                  style={{ left: `${heart.left}%`, animationDelay: `${heart.delay}ms` }}
                >
                  <Heart
                    className="text-red-500"
                    style={{
                      width: heart.size,
                      height: heart.size,
                      transform: `rotate(${heart.rotate}deg)`,
                    }}
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={pet}
              onPointerMove={trackPointer}
              onPointerLeave={() => setLook({ x: 0, y: 0 })}
              aria-label="Pet Kage the cat"
              className="group relative flex h-24 w-28 cursor-pointer items-center justify-center rounded-2xl border border-line bg-white shadow-[0_6px_20px_-10px_rgba(17,17,17,0.12)] transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_28px_-10px_rgba(17,17,17,0.16)] active:scale-95"
            >
              <span
                key={reactionKey}
                className={`inline-flex items-center justify-center ${purring ? 'cat-react' : ''}`}
              >
                <CatMark
                  className="h-16 w-16"
                  idle
                  purring={purring}
                  gaze={look}
                  gazeRangePx={2.6}
                />
              </span>
            </button>

            <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span>{purring ? 'purr' : 'tap to pet'}</span>
              <button
                type="button"
                onClick={toggleMuted}
                aria-pressed={!muted}
                aria-label={muted ? 'Turn purr sound on' : 'Turn purr sound off'}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 transition hover:border-line-strong hover:text-ink"
              >
                {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Three little bars that dance while the purr runs. */
const PurrWave: React.FC = () => (
  <span className="inline-flex h-3 items-end gap-[2px]" aria-hidden="true">
    {[0, 1, 2].map((bar) => (
      <span
        key={bar}
        className="purr-bar w-[2px] rounded-full bg-ink"
        style={{ animationDelay: `${bar * 90}ms` }}
      />
    ))}
  </span>
);
