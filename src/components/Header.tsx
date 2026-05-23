import { useStore } from '../hooks/useStore';
import { savedRecipesStore } from '../services/savedRecipes';
import { APP_VERSION } from '../version';
import './Header.css';

export interface HeaderProps {
  onSaved?: () => void;
  onHistory?: () => void;
  onOpenAbout?: () => void;
}

export default function Header({
  onSaved,
  onHistory,
  onOpenAbout,
}: HeaderProps) {
  const savedRows = useStore(savedRecipesStore);
  const savedCount = savedRows.length;

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="header-wordmark">
          <svg
            className="header-logo"
            width="28"
            height="34"
            viewBox="0 0 48 58"
            fill="none"
            aria-hidden={true}
          >
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
          <div className="header-wordmark-text">
            <div className="header-title-row">
              <div className="header-title">
                fridge<span className="header-title-dot">.</span>
              </div>
              <span className="header-version" title={`Version ${APP_VERSION}`}>
                v{APP_VERSION}
              </span>
            </div>
            <div className="header-subtitle">cook what you have</div>
          </div>
        </div>
      </div>
      <div className="app-header-actions">
        <button type="button" className="app-header-btn" onClick={onSaved}>
          {savedCount > 0 ? (
            <>
              Saved ·{' '}
              <span className="app-header-btn-count">{savedCount}</span>
            </>
          ) : (
            'Saved'
          )}
        </button>
        <button type="button" className="app-header-btn" onClick={onHistory}>
          History
        </button>
        <button
          type="button"
          className="app-header-btn app-header-btn--icon"
          title="About Fridge"
          aria-label="About Fridge"
          onClick={onOpenAbout}
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
