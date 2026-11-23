import React from 'react';

interface CatMarkProps {
  className?: string;
  /** Adds the idle loops: breathing and ear twitches. */
  idle?: boolean;
}

/**
 * The CatPad cat — the flat sticker artwork (white head, gold-ringed eyes,
 * whiskers) drawn as vectors so each part can move on its own:
 * the ears are separate shapes, so they can flatten back; the head group holds
 * the face, so it can bow; the eyes close on their own.
 */
export const CatMark: React.FC<CatMarkProps> = ({ className = '', idle = true }) => (
  <svg
    viewBox="28 6 152 160"
    className={`cat-mark ${className}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g className={idle ? 'cat-body-idle' : undefined}>
      <g className="cat-jitter">
        {/* ears, behind the head so their bases stay hidden */}
        <g className="cat-ear cat-ear-l">
          <path d="M57 94L53 27C52.6 20 60 17 64.5 22.5L93 63Z" fill="#FFFFFF" />
        </g>
        <g className="cat-ear cat-ear-r">
          <path d="M109 61L137 21C140.5 14.5 148 17.5 148 25L151 86Z" fill="#FFFFFF" />
        </g>

        {/* head + face */}
        <g className="cat-head-group">
          <path
            d="M46 76C40 92 38 104 42 116C48 140 72 154 100 154C130 154 160 138 166 116C170 100 166 86 158 76C146 62 128 58 110 62C96 66 82 62 68 66C58 68 50 70 46 76Z"
            fill="#FFFFFF"
          />

          <g className={idle ? 'cat-eyes' : undefined}>
            <circle cx="80" cy="101" r="17" fill="#F5C542" stroke="#0A0A0A" strokeWidth="6.5" />
            <circle cx="124" cy="94" r="17" fill="#F5C542" stroke="#0A0A0A" strokeWidth="6.5" />
            <g className="cat-pupil">
              <circle cx="80" cy="101" r="8.6" fill="#0A0A0A" />
              <circle cx="124" cy="94" r="8.6" fill="#0A0A0A" />
            </g>
          </g>

          <path
            d="M40 122C46 120 53 118 62 116M42 134C48 132 55 130 64 129M144 103C151 101 157 100 166 99M142 115C149 113 155 112 164 111"
            stroke="#0A0A0A"
            strokeWidth="4.6"
            strokeLinecap="round"
          />
        </g>
      </g>
    </g>
  </svg>
);
