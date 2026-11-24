import React, { useState } from 'react';
import { BRAND } from '../lib/brand.ts';

interface CatMarkProps {
  className?: string;
  /** Enables natural idle blinking from the sprite sheet. */
  idle?: boolean;
  /** Shows the closed-eye flattened-ear purring expression and gentle wiggle. */
  purring?: boolean;
  /** Normalized gaze vector (-1 to 1) for tracking pupils. */
  gaze?: { x: number; y: number };
  /** Max pupil offset in pixels for larger sizes (default 1.5). */
  gazeRangePx?: number;
  /** Track pointer directly on hover when external `gaze` is not supplied. */
  trackPointer?: boolean;
}

/**
 * The canonical CatPad mascot logo — the animated sprite sheet used in the
 * navbar, with transparent background, crisp black outline, blinking frames,
 * pointer-tracking pupils, and a happy closed-eye purring expression.
 */
export const CatMark: React.FC<CatMarkProps> = ({
  className = 'h-9 w-9',
  idle = true,
  purring = false,
  gaze,
  gazeRangePx = 1.5,
  trackPointer = false,
}) => {
  const [localGaze, setLocalGaze] = useState({ x: 0, y: 0 });
  const activeGaze = gaze ?? localGaze;

  return (
    <span
      onPointerMove={
        trackPointer
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setLocalGaze({
                x: Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2)),
                y: Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2)),
              });
            }
          : undefined
      }
      onPointerLeave={trackPointer ? () => setLocalGaze({ x: 0, y: 0 }) : undefined}
      className={`relative inline-block shrink-0 select-none ${
        purring ? 'cat-sprite-purring' : ''
      } ${className}`}
      style={
        {
          '--cat-gaze-x': activeGaze.x,
          '--cat-gaze-y': activeGaze.y,
          '--cat-gaze-range': `${gazeRangePx}px`,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      <span
        className={`cat-logo-sprite absolute inset-0 select-none ${
          !idle || purring ? '!animate-none' : ''
        }`}
        style={{
          backgroundImage: `url(${BRAND.assets.catSprite})`,
          ...(purring
            ? { backgroundPosition: '66.667% 66.667%' }
            : !idle
              ? { backgroundPosition: '0% 0%' }
              : {}),
        }}
      />
      {!purring && (
        <span className={`cat-logo-pupils absolute inset-0 ${!idle ? '!animate-none' : ''}`}>
          <span className="cat-logo-pupil" style={{ left: '36.05%', top: '53.71%' }} />
          <span className="cat-logo-pupil" style={{ left: '63.55%', top: '53.71%' }} />
        </span>
      )}
    </span>
  );
};
