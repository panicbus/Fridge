import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getFrequentIngredientSuggestions,
  recordIngredientUsage,
} from '../services/ingredientUsage';
import { getAllIngredients } from '../services/mealdb';
import './IngredientInput.css';

const COMMON_INGREDIENTS = [
  'chicken',
  'beef',
  'salmon',
  'pasta',
  'rice',
  'eggs',
  'garlic',
  'onion',
  'tomatoes',
  'potatoes',
  'cheese',
  'butter',
  'olive oil',
  'lemon',
  'spinach',
  'mushrooms',
  'broccoli',
  'carrots',
  'ginger',
  'soy sauce',
] as const;

export interface IngredientInputProps {
  onSearch: (ingredients: string[]) => void;
  loading: boolean;
}

export default function IngredientInput({
  onSearch,
  loading,
}: IngredientInputProps) {
  const [value, setValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [focused, setFocused] = useState(false);
  const [frequentRev, setFrequentRev] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await getAllIngredients();
      if (!cancelled) setAllIngredients(list.length ? list : [...COMMON_INGREDIENTS]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    const tagged = new Set(tags.map((t) => t.toLowerCase()));
    return allIngredients
      .filter(
        (name) =>
          name.includes(q) && !tagged.has(name),
      )
      .slice(0, 8);
  }, [value, allIngredients, tags]);

  const addTag = useCallback((raw: string) => {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    let added = false;
    setTags((prev) => {
      if (prev.some((p) => p.toLowerCase() === t)) return prev;
      added = true;
      recordIngredientUsage(t);
      return [...prev, raw.trim()];
    });
    if (added) setFrequentRev((n) => n + 1);
    setValue('');
    setActiveSuggestion(0);
  }, []);

  const removeTag = useCallback((index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setTags([]);
    setValue('');
  }, []);

  const onBlur = useCallback(() => {
    window.setTimeout(() => setFocused(false), 150);
  }, []);

  const showDropdown = focused && suggestions.length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      if (showDropdown && suggestions[activeSuggestion]) {
        e.preventDefault();
        addTag(suggestions[activeSuggestion]);
        return;
      }
      if (value.trim()) {
        e.preventDefault();
        addTag(value);
        return;
      }
      if (!value.trim() && tags.length > 0) {
        e.preventDefault();
        onSearch(tags);
        return;
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && suggestions[activeSuggestion]) {
        addTag(suggestions[activeSuggestion]);
      } else if (value.trim()) {
        addTag(value);
      } else if (!value.trim() && tags.length > 0) {
        onSearch(tags);
      }
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      if (value.trim()) addTag(value);
      return;
    }
    if (e.key === 'Backspace' && !value && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
      return;
    }
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault();
      setActiveSuggestion((i) =>
        Math.min(i + 1, suggestions.length - 1),
      );
      return;
    }
    if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, 0));
    }
  };

  useEffect(() => {
    setActiveSuggestion(0);
  }, [suggestions]);

  const quickPicks = useMemo(
    () => COMMON_INGREDIENTS.slice(0, 7),
    [],
  );

  const taggedLower = useMemo(
    () => new Set(tags.map((x) => x.toLowerCase())),
    [tags],
  );

  const frequentPicks = useMemo(
    () =>
      getFrequentIngredientSuggestions(taggedLower, 14, COMMON_INGREDIENTS),
    [taggedLower, frequentRev],
  );

  return (
    <div className="ingredient-input">
      <div
        className={`ingredient-input-box ${focused ? 'focused' : ''}`}
        onMouseDown={(ev) => {
          if ((ev.target as HTMLElement).closest('button')) return;
          ev.preventDefault();
          (ev.currentTarget.querySelector('.tag-input') as HTMLInputElement)?.focus();
        }}
      >
        {tags.map((tag, i) => (
          <span key={`${tag}-${i}`} className="tag">
            <span className="tag-star" aria-hidden>
              ✦
            </span>
            <span className="tag-label">{tag}</span>
            <button
              type="button"
              className="tag-remove"
              aria-label={`Remove ${tag}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => removeTag(i)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-input"
          value={value}
          placeholder={
            tags.length === 0 ? 'Type an ingredient...' : ''
          }
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={onBlur}
        />
        {showDropdown && (
          <ul className="suggestions-list" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === activeSuggestion}
                className={`suggestion-item ${i === activeSuggestion ? 'active' : ''}`}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  addTag(s);
                }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>

      {frequentPicks.length > 0 && (
        <div className="frequent-picks">
          <span className="frequent-picks-label">Often used</span>
          <div className="frequent-picks-chips">
            {frequentPicks.map((p) => (
              <button
                key={p}
                type="button"
                className="frequent-chip"
                onClick={() => addTag(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {tags.length > 0 ? (
        <div className="ingredient-actions">
          <button
            type="button"
            className="btn-search"
            disabled={loading}
            onClick={() => onSearch(tags)}
          >
            {loading ? (
              <span className="loading-dots" aria-label="Loading">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <>
                Find recipes <span className="btn-arrow">→</span>
              </>
            )}
          </button>
          <button type="button" className="btn-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      ) : (
        !value.trim() && (
          <div className="quick-picks">
            <span className="quick-picks-label">Try:</span>
            <div className="quick-picks-chips">
              {quickPicks.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="quick-chip"
                  onClick={() => addTag(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
