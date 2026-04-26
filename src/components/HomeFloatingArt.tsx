import React from 'react';
import './HomeFloatingArt.css';

const FLOATING_ITEMS = [
  { e: '🥕', l: 8, t: 12, s: 52, d: 0, dur: 9 },
  { e: '🧄', l: 72, t: 18, s: 44, d: 0.6, dur: 11 },
  { e: '🍋', l: 18, t: 62, s: 48, d: 1.1, dur: 10 },
  { e: '🥚', l: 58, t: 58, s: 40, d: 0.3, dur: 12 },
  { e: '🧅', l: 42, t: 28, s: 46, d: 1.5, dur: 8 },
  { e: '🫙', l: 82, t: 42, s: 38, d: 0.9, dur: 10 },
  { e: '🥦', l: 28, t: 38, s: 50, d: 0.2, dur: 11 },
  { e: '🍅', l: 64, t: 22, s: 54, d: 1.2, dur: 9 },
] as const;

export default function HomeFloatingArt() {
  return (
    <div className="home-art" aria-hidden>
      {FLOATING_ITEMS.map((item, i) => (
        <span
          key={i}
          className="art-float"
          style={{
            left: `${item.l}%`,
            top: `${item.t}%`,
            fontSize: `${item.s}px`,
            animationDelay: `${item.d}s`,
            animationDuration: `${item.dur}s`,
          }}
        >
          {item.e}
        </span>
      ))}
    </div>
  );
}
