import { useEffect } from 'react';
import { APP_VERSION } from '../version';
import './AboutPanel.css';

export interface AboutPanelProps {
  onClose: () => void;
}

export function AboutPanel({ onClose }: AboutPanelProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="about-panel-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-panel-title"
    >
      <div className="about-panel" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="about-panel-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="about-panel-logo" aria-hidden>
          <svg width="48" height="58" viewBox="0 0 48 58" fill="none">
            <rect
              x="3"
              y="3"
              width="42"
              height="52"
              rx="6"
              stroke="currentColor"
              strokeWidth="2.4"
            />
            <line
              x1="3"
              y1="22"
              x2="45"
              y2="22"
              stroke="currentColor"
              strokeWidth="2.4"
            />
            <line
              x1="38.5"
              y1="11"
              x2="38.5"
              y2="16"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <line
              x1="38.5"
              y1="32"
              x2="38.5"
              y2="40"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <circle cx="14" cy="36" r="3.5" fill="var(--accent)" />
          </svg>
        </div>

        <h1 id="about-panel-title" className="about-panel-title">
          fridge<span className="about-panel-title-dot">.</span>
        </h1>

        <p className="about-panel-version" aria-label={`Version ${APP_VERSION}`}>
          v{APP_VERSION}
        </p>

        <p className="about-panel-description">
          A small desktop app that matches the ingredients you have to recipes
          worth making. Search by ingredients, filter by diet, save what you
          love, and step into a focused cook mode when it&apos;s time to make
          it.
        </p>

        <div className="about-panel-credits">
          <p>
            Developed with <span className="about-panel-heart">❤︎</span> by Nico
            Crisafulli
            <br />
            alongside Claude AI 🤖
          </p>
          <p className="about-panel-location">Oakland & Alameda, CA</p>
          <p className="about-panel-copyright">
            © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
