import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSound } from '../context/SoundContext.tsx';
import { BRAND } from '../lib/brand.ts';

interface HeroBowlArtworkProps {
  inBowlSol: number;
  sentSol: number;
  shelterLabel?: string;
}

interface SpriteFrame {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

/** Exact non-overlapping crop rectangles & coin centers inside the 1231x1277 4x4 sprite sheet. */
const COIN_SHEET_W = 1231;
const COIN_SHEET_H = 1277;

const COIN_FRAMES: SpriteFrame[] = [
  { id: 0, x: 96, y: 39, w: 144, h: 151, cx: 166, cy: 116 },
  { id: 1, x: 390, y: 0, w: 147, h: 223, cx: 465, cy: 130 },
  { id: 2, x: 701, y: 0, w: 154, h: 257, cx: 784, cy: 161 },
  { id: 3, x: 1003, y: 46, w: 157, h: 254, cx: 1087, cy: 205 },
  { id: 4, x: 86, y: 298, w: 159, h: 285, cx: 174, cy: 475 },
  { id: 5, x: 392, y: 325, w: 146, h: 271, cx: 469, cy: 499 },
  { id: 6, x: 703, y: 452, w: 156, h: 146, cx: 775, cy: 532 },
  { id: 7, x: 1007, y: 423, w: 158, h: 147, cx: 1080, cy: 501 },
  { id: 8, x: 99, y: 697, w: 146, h: 152, cx: 169, cy: 776 },
  { id: 9, x: 392, y: 710, w: 175, h: 143, cx: 480, cy: 785 },
  { id: 10, x: 699, y: 720, w: 175, h: 136, cx: 786, cy: 792 },
  { id: 11, x: 1008, y: 731, w: 173, h: 126, cx: 1094, cy: 799 },
  { id: 12, x: 95, y: 1032, w: 154, h: 117, cx: 172, cy: 1094 },
  { id: 13, x: 400, y: 1033, w: 151, h: 118, cx: 475, cy: 1095 },
  { id: 14, x: 703, y: 1033, w: 156, h: 118, cx: 779, cy: 1095 },
  { id: 15, x: 1015, y: 1034, w: 152, h: 120, cx: 1088, cy: 1098 },
];

interface PileCoin {
  frameId: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  rotate: number;
  opacity?: number;
}

/**
 * Natural dome-shaped coin mound layered bottom-to-top from the sprite sheet.
 * Crisp overlapping coins with warm gold under-layer and soft ceramic wall bounce.
 */
const BOWL_COIN_PILE: PileCoin[] = [
  // Layer 1: Dense warm under-layer filling crevices beneath the top dome
  { frameId: 12, x: 136, y: 184, sx: 0.62, sy: 0.60, rotate: -18 },
  { frameId: 14, x: 188, y: 174, sx: 0.64, sy: 0.62, rotate: -8 },
  { frameId: 13, x: 238, y: 168, sx: 0.66, sy: 0.64, rotate: 4 },
  { frameId: 15, x: 288, y: 168, sx: 0.66, sy: 0.64, rotate: -6 },
  { frameId: 12, x: 336, y: 174, sx: 0.64, sy: 0.62, rotate: 12 },
  { frameId: 15, x: 382, y: 185, sx: 0.60, sy: 0.58, rotate: 20 },
  { frameId: 14, x: 260, y: 186, sx: 0.68, sy: 0.64, rotate: -2 },

  // Layer 2: Outer side-wall leaners & upper mound flanks
  { frameId: 0, x: 142, y: 178, sx: 0.56, sy: 0.45, rotate: -34 },
  { frameId: 0, x: 194, y: 156, sx: 0.62, sy: 0.50, rotate: -17 },
  { frameId: 0, x: 318, y: 156, sx: 0.62, sy: 0.50, rotate: 16 },
  { frameId: 0, x: 374, y: 175, sx: 0.58, sy: 0.46, rotate: 35 },

  // Layer 3: Apex central dome coin overlapping the back flanks
  { frameId: 0, x: 256, y: 148, sx: 0.65, sy: 0.54, rotate: -2 },

  // Layer 4: Prominent front row nestled cleanly inside the curved white rim
  { frameId: 0, x: 182, y: 192, sx: 0.65, sy: 0.56, rotate: -10 },
  { frameId: 0, x: 250, y: 196, sx: 0.72, sy: 0.65, rotate: 2 },
  { frameId: 0, x: 326, y: 191, sx: 0.68, sy: 0.61, rotate: 18 },
];

interface DroppingCoin {
  id: number;
  x: number;
  y: number;
  scale: number;
  startedAt: number;
  impacted: boolean;
}

const DROP_DURATION_MS = 880;

/** Crisp, gentle two-tone metallic clink synthesized via Web Audio API. */
const playCoinClink = () => {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const now = ctx.currentTime;

    const partials = [
      { freq: 2240, gain: 0.045, dur: 0.24 },
      { freq: 3560, gain: 0.028, dur: 0.16 },
    ];

    partials.forEach((p, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(p.freq, now);
      osc.frequency.exponentialRampToValueAtTime(p.freq * 0.985, now + p.dur);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.dur + 0.02);
      if (idx === 0) {
        osc.onended = () => {
          ctx.close().catch(() => undefined);
        };
      }
    });
  } catch {
    /* audio optional */
  }
};

export const HeroBowlArtwork: React.FC<HeroBowlArtworkProps> = ({
  inBowlSol,
  sentSol,
  shelterLabel = 'Sent to shelters',
}) => {
  const { muted } = useSound();
  const [droppingCoins, setDroppingCoins] = useState<DroppingCoin[]>([]);
  const [nowMs, setNowMs] = useState(0);
  const [bounceKey, setBounceKey] = useState(0);

  const nextId = useRef(1);
  const lastHoverDropAt = useRef(0);
  const rafRef = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // Drive smooth 16-frame sprite playback while any coin is dropping
  useEffect(() => {
    if (droppingCoins.length === 0) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    let active = true;
    const tick = () => {
      if (!active) return;
      const t = performance.now();
      setNowMs(t);
      setDroppingCoins((prev) => {
        const alive = prev.filter((c) => t - c.startedAt < DROP_DURATION_MS);
        return alive.length === prev.length ? prev : alive;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      active = false;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [droppingCoins.length > 0]);

  const dropCoin = useCallback(
    (source: 'hover' | 'click') => {
      const wallNow = Date.now();
      if (source === 'hover' && wallNow - lastHoverDropAt.current < 480) return;
      if (source === 'hover') lastHoverDropAt.current = wallNow;

      const id = nextId.current++;
      const x = 190 + Math.random() * 140;
      const y = 160 + Math.random() * 22;
      const scale = 0.64 + Math.random() * 0.08;
      const startedAt = performance.now();

      setNowMs(startedAt);
      setDroppingCoins((prev) => [
        ...prev.slice(-6),
        { id, x, y, scale, startedAt, impacted: false },
      ]);

      const impactTimer = window.setTimeout(() => {
        setDroppingCoins((prev) =>
          prev.map((c) => (c.id === id ? { ...c, impacted: true } : c))
        );
        setBounceKey((k) => k + 1);
        if (!muted) playCoinClink();
      }, 340);

      timers.current.push(impactTimer);
    },
    [muted]
  );

  return (
    <div className="relative mx-auto flex w-full max-w-[560px] select-none items-center justify-center pt-6 lg:pt-2">
      {/* Subtle grey paw print watermark behind the lower-left rim */}
      <svg
        viewBox="0 0 120 120"
        className="pointer-events-none absolute left-0 top-1/2 h-24 w-24 -translate-y-4 -rotate-12 text-[#111111]/[0.08]"
        fill="currentColor"
        aria-hidden="true"
      >
        <ellipse cx="60" cy="76" rx="25" ry="20" />
        <ellipse cx="32" cy="46" rx="9.5" ry="12.5" transform="rotate(-18 32 46)" />
        <ellipse cx="52" cy="34" rx="9.5" ry="12.5" transform="rotate(-5 52 34)" />
        <ellipse cx="73" cy="35" rx="9.5" ry="12.5" transform="rotate(8 73 35)" />
        <ellipse cx="90" cy="50" rx="8.5" ry="11.5" transform="rotate(24 90 50)" />
      </svg>

      {/* Three bold ink accent dashes on the upper right */}
      <svg
        viewBox="0 0 64 64"
        className="pointer-events-none absolute right-2 top-24 h-12 w-12 text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 22L28 10" />
        <path d="M16 34L44 26" />
        <path d="M16 46L34 48" />
      </svg>

      {/* Floating glass card: In the bowl */}
      <div className="coin-float pointer-events-none absolute left-8 top-6 z-20 rounded-xl border border-white/20 bg-[#2C2E2B]/80 px-4 py-2.5 text-left text-white shadow-[0_14px_34px_rgba(17,17,17,0.18)] backdrop-blur-md sm:left-14">
        <span className="block text-[10px] font-medium tracking-wide text-white/75">
          In the bowl
        </span>
        <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums sm:text-base">
          {inBowlSol.toFixed(3)} SOL
        </span>
      </div>

      {/* Floating glass card: Sent to shelters */}
      <div
        className="coin-float pointer-events-none absolute right-2 top-0 z-20 rounded-xl border border-white/20 bg-[#2C2E2B]/80 px-4 py-2.5 text-left text-white shadow-[0_14px_34px_rgba(17,17,17,0.18)] backdrop-blur-md sm:right-6"
        style={{ animationDelay: '1.2s' }}
      >
        <span className="block max-w-[140px] truncate text-[10px] font-medium tracking-wide text-white/75">
          {shelterLabel}
        </span>
        <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums sm:text-base">
          {sentSol.toFixed(3)} SOL
        </span>
      </div>

      {/* Interactive Ceramic Bowl stage — hover or click drops a sprite coin into the bowl */}
      <div
        role="button"
        tabIndex={0}
        onMouseEnter={() => dropCoin('hover')}
        onClick={() => dropCoin('click')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dropCoin('click');
          }
        }}
        aria-label="Interactive shelter bowl. Hover or click to drop a CatPad coin into the bowl."
        className="group relative z-10 w-full max-w-[495px] cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        <svg
          viewBox="0 0 520 390"
          className="w-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="table-ambient-blur" x="-40%" y="-60%" width="180%" height="220%">
              <feGaussianBlur stdDeviation="20" />
            </filter>

            <filter id="table-contact-blur" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur stdDeviation="5.5" />
            </filter>

            <filter id="table-crisp-blur" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>

            <filter id="rim-soft-blur" x="-15%" y="-15%" width="130%" height="130%">
              <feGaussianBlur stdDeviation="4.5" />
            </filter>

            <filter id="coin-pile-ao-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="7" />
            </filter>

            {/* Clips strictly to the sage ceramic body for clean internal 3D light lobes */}
            <clipPath id="bowl-body-clip">
              <path d="M78 154 C78 194 159 221 260 221 C361 221 442 194 442 154 C441 241 400 289 361 306 C329 317 295 320 260 320 C225 320 191 317 159 306 C120 289 79 241 78 154 Z" />
            </clipPath>

            {/* Clips strictly to the stepped cylindrical foot ring */}
            <clipPath id="bowl-foot-clip">
              <path d="M167 302 C193 313 226 317 260 317 C294 317 327 313 353 302 L348 321 C348 329 308 333 260 333 C212 333 172 329 172 321 Z" />
            </clipPath>

            {/* Soft warm-taupe tabletop ambient shadow (matches cream background naturally) */}
            <radialGradient id="floor-shadow-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#655E51" stopOpacity="0.32" />
              <stop offset="52%" stopColor="#857E70" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#857E70" stopOpacity="0" />
            </radialGradient>

            {/* 3D cylindrical studio eucalyptus-sage glaze: key light left-front, core terminator right, cream Fresnel bounce */}
            <linearGradient id="bowl-sage-body" x1="78" y1="185" x2="442" y2="248" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7C8E77" />
              <stop offset="14%" stopColor="#99AC93" />
              <stop offset="28%" stopColor="#8FA28A" />
              <stop offset="50%" stopColor="#71846D" />
              <stop offset="76%" stopColor="#4D5E4A" />
              <stop offset="91%" stopColor="#465643" />
              <stop offset="100%" stopColor="#6D7F69" />
            </linearGradient>

            {/* 3D studio softbox highlight lobe on upper-left curved ceramic belly */}
            <radialGradient id="bowl-studio-softbox" cx="27%" cy="32%" r="44%">
              <stop offset="0%" stopColor="#E6EFE2" stopOpacity="0.34" />
              <stop offset="42%" stopColor="#BFD0BA" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#BFD0BA" stopOpacity="0" />
            </radialGradient>

            {/* Under-belly curvature shadow rolling down toward the stepped foot ring */}
            <linearGradient id="bowl-sage-ao" x1="260" y1="188" x2="260" y2="320" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2F3B2D" stopOpacity="0" />
              <stop offset="55%" stopColor="#2F3B2D" stopOpacity="0.06" />
              <stop offset="82%" stopColor="#2A3528" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#212B1F" stopOpacity="0.44" />
            </linearGradient>

            {/* Separate 3D cylindrical gradient for the stepped pedestal foot ring */}
            <linearGradient id="foot-sage-grad" x1="168" y1="316" x2="352" y2="318" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#778973" />
              <stop offset="22%" stopColor="#8B9E86" />
              <stop offset="54%" stopColor="#61735D" />
              <stop offset="84%" stopColor="#3E4E3B" />
              <stop offset="100%" stopColor="#5D6F59" />
            </linearGradient>

            {/* Curved 3D luminance across pinstripe and glazed lettering */}
            <linearGradient id="bowl-glaze-print" x1="82" y1="220" x2="438" y2="220" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#DDDAD0" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#F8F7F0" stopOpacity="0.98" />
              <stop offset="58%" stopColor="#F3F1E8" stopOpacity="0.96" />
              <stop offset="86%" stopColor="#CECBC0" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#DAD7CC" stopOpacity="0.86" />
            </linearGradient>

            {/* 3D concave inner ceramic wall: deep curved shadow left-back, bright overhead-lit alabaster right-back */}
            <linearGradient id="bowl-inner-wall-studio" x1="90" y1="104" x2="430" y2="188" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#B8B4A8" />
              <stop offset="22%" stopColor="#D3D0C5" />
              <stop offset="52%" stopColor="#EAE8E0" />
              <stop offset="82%" stopColor="#F9F8F3" />
              <stop offset="100%" stopColor="#DEDBD1" />
            </linearGradient>

            {/* Vertical concave darkening + warm golden bounce from the coin mound */}
            <linearGradient id="bowl-inner-gold-bounce" x1="260" y1="88" x2="260" y2="196" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9C978B" stopOpacity="0.2" />
              <stop offset="22%" stopColor="#FFFFFF" stopOpacity="0.06" />
              <stop offset="62%" stopColor="#EAE6DA" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#D6AD55" stopOpacity="0.34" />
            </linearGradient>

            {/* Front inner cavity edge shadow so the front lip physically overhangs the coin pile */}
            <linearGradient id="bowl-front-inner-lip-shadow" x1="260" y1="194" x2="260" y2="225" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4E3B18" stopOpacity="0" />
              <stop offset="65%" stopColor="#4E3B18" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3B2D12" stopOpacity="0.42" />
            </linearGradient>

            {/* Rounded ceramic torus lip shading */}
            <linearGradient id="bowl-cream-rim" x1="78" y1="148" x2="442" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E4E1D7" />
              <stop offset="24%" stopColor="#FFFFFF" />
              <stop offset="55%" stopColor="#F6F5EE" />
              <stop offset="84%" stopColor="#DFDCD2" />
              <stop offset="100%" stopColor="#CFCBC0" />
            </linearGradient>

            {/* Warm golden-amber coin bed beneath the sprite pile */}
            <radialGradient id="coin-bed-shadow" cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="#6D470B" stopOpacity="0.94" />
              <stop offset="72%" stopColor="#946214" stopOpacity="0.84" />
              <stop offset="100%" stopColor="#B88224" stopOpacity="0.58" />
            </radialGradient>

            {/* Soft rim vignette inside cavity so outer coins nestle naturally against ceramic */}
            <radialGradient id="bowl-cavity-vignette" cx="50%" cy="46%" r="54%">
              <stop offset="70%" stopColor="#736345" stopOpacity="0" />
              <stop offset="92%" stopColor="#736345" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#5D4F35" stopOpacity="0.34" />
            </radialGradient>

            {/* Inner bowl clip following the inner wall curve with domed headroom at center */}
            <clipPath id="bowl-inner-clip">
              <path d="M 90 156 C 90 104 430 104 430 156 C 430 207 355 223 260 223 C 165 223 90 207 90 156 Z" />
            </clipPath>

            {/* Curved baseline for label matching the upper horizontal stripe */}
            <path id="bowl-label-arc" d="M 186 232 Q 260 245 334 232" />

            {/* Reusable cropped sprite symbols for all 16 frames of the coin sheet */}
            {COIN_FRAMES.map((frame) => (
              <symbol
                key={frame.id}
                id={`coin-sprite-${frame.id}`}
                viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
              >
                <image
                  href={BRAND.assets.coinSprite}
                  width={COIN_SHEET_W}
                  height={COIN_SHEET_H}
                />
              </symbol>
            ))}
          </defs>

          {/* Layered 3D tabletop shadow: sweeping left-downward key shadow + foot contact shadow */}
          <ellipse
            cx="226"
            cy="326"
            rx="178"
            ry="29"
            fill="url(#floor-shadow-grad)"
            filter="url(#table-ambient-blur)"
          />
          <ellipse
            cx="254"
            cy="327"
            rx="108"
            ry="13"
            fill="#5D564A"
            fillOpacity="0.28"
            filter="url(#table-contact-blur)"
          />
          <ellipse
            cx="260"
            cy="328"
            rx="88"
            ry="7.5"
            fill="#474137"
            fillOpacity="0.34"
            filter="url(#table-crisp-blur)"
          />

          {/* Main ceramic bowl group with cushioned bounce when a coin lands */}
          <g
            key={bounceKey}
            className={bounceKey > 0 ? 'bowl-cushioned-bounce' : undefined}
          >
            {/* Outer white glazed torus rim & deep 3D concave interior cavity */}
            <ellipse cx="260" cy="151" rx="183" ry="66" fill="url(#bowl-cream-rim)" />
            <ellipse cx="260" cy="153" rx="173" ry="59" fill="url(#bowl-inner-wall-studio)" />
            <ellipse cx="260" cy="153" rx="173" ry="59" fill="url(#bowl-inner-gold-bounce)" />

            {/* Back lip specular crest + soft upper inner lip bevel */}
            <path
              d="M84 146 C96 102 172 86.5 260 86.5 C348 86.5 424 102 436 146"
              stroke="#FFFFFF"
              strokeOpacity="0.72"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M90 150 C98 109 172 93.5 260 93.5 C348 93.5 422 109 430 150"
              stroke="#9D988C"
              strokeOpacity="0.24"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Natural dome coin pile inside the bowl — crisp sprite sheet coins nestled deep inside */}
            <g clipPath="url(#bowl-inner-clip)">
              {/* Deep interior rear cast shadow behind the coin dome */}
              <ellipse
                cx="256"
                cy="168"
                rx="148"
                ry="34"
                fill="#7A5616"
                fillOpacity="0.26"
                filter="url(#coin-pile-ao-blur)"
              />
              <ellipse cx="260" cy="186" rx="156" ry="38" fill="url(#coin-bed-shadow)" />

              {BOWL_COIN_PILE.map((coin, index) => {
                const f = COIN_FRAMES[coin.frameId];
                return (
                  <g
                    key={index}
                    transform={`translate(${coin.x} ${coin.y}) rotate(${coin.rotate}) scale(${coin.sx} ${coin.sy})`}
                    opacity={coin.opacity ?? 1}
                  >
                    <use
                      href={`#coin-sprite-${f.id}`}
                      x={-(f.cx - f.x)}
                      y={-(f.cy - f.y)}
                      width={f.w}
                      height={f.h}
                    />
                  </g>
                );
              })}

              {/* Soft inner cavity edge tint & front lip shadow uniting coins inside the ceramic wall */}
              <ellipse cx="260" cy="170" rx="170" ry="56" fill="url(#bowl-cavity-vignette)" pointerEvents="none" />
              <ellipse cx="260" cy="212" rx="166" ry="20" fill="url(#bowl-front-inner-lip-shadow)" pointerEvents="none" />
            </g>

            {/* Impact shimmer rings when dropped coins land */}
            {droppingCoins.map(
              (coin) =>
                coin.impacted && (
                  <ellipse
                    key={`ring-${coin.id}`}
                    cx={coin.x}
                    cy={coin.y}
                    rx="30"
                    ry="15"
                    stroke="#FFFBE0"
                    strokeWidth="2.8"
                    className="coin-impact-ring"
                  />
                )
            )}

            {/* Stepped 3D pedestal ceramic foot ring tucked beneath the curved belly */}
            <g clipPath="url(#bowl-foot-clip)">
              <rect x="166" y="300" width="188" height="36" fill="url(#foot-sage-grad)" />
              {/* Belly overhang shadow cast onto upper foot ring */}
              <path
                d="M167 303 C194 314 226 318 260 318 C294 318 326 314 353 303 L352 311 C325 321 293 324 260 324 C227 324 195 321 168 311 Z"
                fill="#222D20"
                fillOpacity="0.46"
              />
              {/* Crisp bottom glaze bevel resting on tabletop */}
              <path
                d="M172 321 C172 329 212 332 260 332 C308 332 348 329 348 321"
                stroke="#20291E"
                strokeOpacity="0.34"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Front sage-green matte ceramic belly with full 3D spherical studio lighting */}
            <g clipPath="url(#bowl-body-clip)">
              <rect x="76" y="150" width="368" height="175" fill="url(#bowl-sage-body)" />
              <ellipse cx="176" cy="214" rx="126" ry="72" fill="url(#bowl-studio-softbox)" />
              <rect x="76" y="150" width="368" height="175" fill="url(#bowl-sage-ao)" />

              {/* Left studio key highlight + right cream tabletop Fresnel bounce along silhouette */}
              <path
                d="M100 186 C106 238 134 282 174 304"
                stroke="#FFFFFF"
                strokeOpacity="0.2"
                strokeWidth="18"
                strokeLinecap="round"
                filter="url(#rim-soft-blur)"
              />
              <path
                d="M437 166 C434 234 402 280 356 303"
                stroke="#DDE7D8"
                strokeOpacity="0.16"
                strokeWidth="7"
                strokeLinecap="round"
                filter="url(#rim-soft-blur)"
              />

              {/* Subtle 3D under-lip contact shadow right beneath the protruding white rim */}
              <path
                d="M78 159 C78 199 159 226 260 226 C361 226 442 199 442 159"
                stroke="#283526"
                strokeOpacity="0.3"
                strokeWidth="4.4"
                strokeLinecap="round"
              />

              {/* High horizontal cream pinstripe curved across 3D cylinder luminance */}
              <path
                d="M82 184 C121 214 166 229 208 234"
                stroke="#354333"
                strokeOpacity="0.22"
                strokeWidth="2.8"
                strokeLinecap="round"
                transform="translate(0 0.9)"
              />
              <path
                d="M312 234 C354 229 399 214 438 184"
                stroke="#354333"
                strokeOpacity="0.22"
                strokeWidth="2.8"
                strokeLinecap="round"
                transform="translate(0 0.9)"
              />
              <path
                d="M82 184 C121 214 166 229 208 234"
                stroke="url(#bowl-glaze-print)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M312 234 C354 229 399 214 438 184"
                stroke="url(#bowl-glaze-print)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Curved ceramic lettering following the 3D cylinder contour */}
              <text
                fill="#2E3B2C"
                fillOpacity="0.26"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="800"
                fontSize="22"
                letterSpacing="0.06em"
                transform="translate(0 0.9)"
              >
                <textPath href="#bowl-label-arc" startOffset="50%" textAnchor="middle">
                  CATPAD
                </textPath>
              </text>
              <text
                fill="url(#bowl-glaze-print)"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="800"
                fontSize="22"
                letterSpacing="0.06em"
              >
                <textPath href="#bowl-label-arc" startOffset="50%" textAnchor="middle">
                  CATPAD
                </textPath>
              </text>
            </g>

            {/* Sculpted rounded white ceramic rim lip wrapping cleanly over the front edge */}
            <path
              d="M80 153 C80 192 160 218 260 218 C360 218 440 192 440 153"
              stroke="url(#bowl-cream-rim)"
              strokeWidth="8.6"
              strokeLinecap="round"
            />
            <path
              d="M84 152 C84 189 162 214 260 214 C358 214 436 189 436 152"
              stroke="#FFFFFF"
              strokeOpacity="0.72"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M82 156 C82 195 161 221.5 260 221.5 C359 221.5 438 195 438 156"
              stroke="#C5C0B5"
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>

          {/* Animated 16-frame sprite falling coins spawned on hover or click */}
          {droppingCoins.map((coin) => {
            const elapsed = Math.max(0, nowMs - coin.startedAt);
            const progress = Math.min(1, elapsed / DROP_DURATION_MS);
            const frameIdx = Math.min(15, Math.floor(progress * 16));
            const f = COIN_FRAMES[frameIdx];

            const fallProgress = Math.min(1, progress / 0.38);
            const offsetY = -175 * (1 - fallProgress * fallProgress);
            const fadeOpacity =
              progress < 0.08
                ? progress / 0.08
                : progress > 0.86
                  ? Math.max(0, 1 - (progress - 0.86) / 0.14)
                  : 1;

            return (
              <g
                key={coin.id}
                transform={`translate(${coin.x} ${coin.y + offsetY}) scale(${coin.scale})`}
                opacity={fadeOpacity}
                pointerEvents="none"
              >
                <use
                  href={`#coin-sprite-${f.id}`}
                  x={-(f.cx - f.x)}
                  y={-(f.cy - f.y)}
                  width={f.w}
                  height={f.h}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
