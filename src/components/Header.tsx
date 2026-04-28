import React from 'react';
import { APP_VERSION } from '../version';
import './Header.css';

export interface HeaderProps {
  onSaved?: () => void;
  onHistory?: () => void;
  onSettings?: () => void;
}

export default function Header({
  onSaved,
  onHistory,
  onSettings,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="app-header-title-row">
          <p className="app-header-title">
            fridge<span className="app-header-title-dot">.</span>
          </p>
          <span className="app-header-version" title={`Version ${APP_VERSION}`}>
            v{APP_VERSION}
          </span>
        </div>
        <p className="app-header-subtitle">cook what you have</p>
      </div>
      <div className="app-header-actions">
        <button
          type="button"
          className="app-header-btn"
          onClick={onSaved}
        >
          Saved
        </button>
        <button
          type="button"
          className="app-header-btn"
          onClick={onHistory}
        >
          History
        </button>
        <button
          type="button"
          className="app-header-btn app-header-btn--icon"
          aria-label="Settings"
          onClick={onSettings}
        >
          ⚙
        </button>
      </div>
    </header>
  );
}
