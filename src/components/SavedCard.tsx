import React from 'react';
import './SavedCard.css';

export interface SavedCardProps {
  count: number;
  onViewAll: () => void;
}

export default function SavedCard({ count, onViewAll }: SavedCardProps) {
  return (
    <section className="saved-card">
      <div className="saved-card-header">
        <p className="saved-card-kicker">— saved —</p>
        <button type="button" className="saved-card-view-all" onClick={onViewAll}>
          view all →
        </button>
      </div>
      <div className="saved-card-body">
        <span className="saved-card-count">{count}</span>
        <span className="saved-card-word">recipes</span>
      </div>
    </section>
  );
}
