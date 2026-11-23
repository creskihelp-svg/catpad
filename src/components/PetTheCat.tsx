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

const REACTIONS = ['purrs', 'blinks slowly', 'headbutts you', 'says mrrp', 'kneads the blanket', 'flicks a whisker'];

const STORAGE_KEY = 'catpad_pets';

/** A short, soft purr: brownish noise through a low-pass, wobbling at ~26Hz. */
const playPurr = () => {
  try {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

/**
 * The cat from the sticker, alive. It breathes, blinks and follows your cursor;
 * pet it and it squishes, leans into your hand, screws its eyes shut, purrs
 * (with sound when the site isn't muted) and sends hearts back.
 */
export const PetTheCat: React.FC = () => {
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
      const stored = Number(localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(stored) && stored > 0) setPets(stored);
    } catch {
      /* storage unavailable — count stays per session */
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
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });

    setReaction(REACTIONS[Math.floor(Math.random() * REACTIONS.length)]);
    setReactionKey((key) => key + 1);
    setPurring(true);
    timers.current.push(window.setTimeout(() => setPurring(false), 1450));

    // The purr starts just after the eyes close, like the real sequence.
    if (!muted) timers.current.push(window.setTimeout(playPurr, 170));

    const batch: FloatingHeart[] = Array.from({ length: 3 }, () => ({
      id: nextHeartId.current++,
      left: 16 + Math.random() * 68,
      size: 12 + Math.random() * 10,
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

  /** Eyes follow the pointer, clamped so the pupils stay inside the iris. */
  const trackPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setLook({ x: Math.max(-2.6, Math.min(2.6, dx * 2.6)), y: Math.max(-1.7, Math.min(1.7, dy * 1.7)) });
  };

  const label = purring ? 'purring' : pets === 0 ? 'waiting for scratches' : reaction ? `it ${reaction}` : 'happy cat';

  return (
    <section
      id="pet-the-cat"
      className="scroll-mt-20 border-b border-line bg-surface"
      aria-labelledby="pet-the-cat-title"
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 justify-items-center gap-6 px-5 py-10 text-center sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:justify-items-start sm:gap-10 sm:py-12 sm:text-left lg:px-8">
        <div className="order-2 sm:order-1">
          <SectionLabel>02 / Cat on duty</SectionLabel>
          <h2
            id="pet-the-cat-title"
            className="mt-2 text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl"
          >
            Pet the cat.
          </h2>
          <p className="mx-auto mt-1.5 max-w-[22rem] text-sm leading-relaxed text-muted sm:mx-0">
            Meet Kage. Scratch behind the ears — Kage purrs and sends hearts back.
          </p>
          <p className="mt-3 flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:hidden">
            <span className="text-ink">{pets.toLocaleString('en-US')}</span> {pets === 1 ? 'pet' : 'pets'} · {label}
            {purring && <PurrWave />}
          </p>
        </div>

        {/* The cat */}
        <div className="relative order-1 flex w-full flex-col items-center sm:order-2 sm:w-auto">
          <div className="pointer-events-none absolute inset-x-0 bottom-full flex justify-center" aria-hidden="true">
            {hearts.map((heart) => (
              <span
                key={heart.id}
                className="heart-rise absolute bottom-0"
                style={{ left: `${heart.left}%`, animationDelay: `${heart.delay}ms` }}
              >
                <Heart
                  className="text-ink"
                  style={{ width: heart.size, height: heart.size, transform: `rotate(${heart.rotate}deg)` }}
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
            aria-label="Pet the cat"
            className="group relative mx-auto flex h-28 w-28 cursor-pointer items-center justify-center rounded-full bg-ink transition duration-300 hover:scale-[1.03] active:scale-95 sm:h-36 sm:w-36 lg:h-40 lg:w-40"
          >
            <span
              key={reactionKey}
              className={`block ${purring ? 'cat-react cat-purring' : ''}`}
              style={
                {
                  '--cat-look-x': look.x,
                  '--cat-look-y': look.y,
                } as React.CSSProperties
              }
            >
              <CatMark className="h-[4.875rem] w-[4.875rem] select-none sm:h-[6.25rem] sm:w-[6.25rem] lg:h-28 lg:w-28" />
            </span>
          </button>

          <div className="mt-2.5 flex w-full flex-wrap items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            <span className="flex items-center gap-1.5">
              <PawPrint className="h-3 w-3" aria-hidden="true" />
              {purring ? 'purr' : 'tap to pet'}
              {purring && <PurrWave />}
            </span>

            <span className="h-3 w-px bg-line-strong" aria-hidden="true" />

            <button
              type="button"
              onClick={toggleMuted}
              aria-pressed={!muted}
              aria-label={muted ? 'Turn the purr sound on' : 'Turn the purr sound off'}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-page px-2 py-[3px] transition hover:border-line-strong hover:text-ink"
            >
              {muted ? <VolumeX className="h-3 w-3" aria-hidden="true" /> : <Volume2 className="h-3 w-3" aria-hidden="true" />}
              {muted ? 'sound off' : 'sound on'}
            </button>
          </div>
        </div>

        {/* Receipt */}
        <div className="order-3 hidden flex-col items-end gap-1 text-right sm:flex">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
            {pets === 1 ? 'Pet given' : 'Pets given'}
          </span>
          <span className="font-mono text-4xl leading-none text-ink tabular-nums" aria-live="polite">
            {pets.toLocaleString('en-US')}
          </span>
          <span className="mt-1 flex items-center gap-2 font-mono text-[11px] lowercase tracking-[0.08em] text-muted">
            {label}
            {purring && <PurrWave />}
          </span>
        </div>
      </div>
    </section>
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
