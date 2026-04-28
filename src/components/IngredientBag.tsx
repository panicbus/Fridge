import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getAllIngredients,
  mergeIngredientAutocompleteLists,
} from '../services/mealdb';
import './IngredientBag.css';

export interface IngredientBagProps {
  ingredients: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  onSearch: () => void;
  loading: boolean;
}

export default function IngredientBag({
  ingredients,
  onAdd,
  onRemove,
  onSearch,
  loading,
}: IngredientBagProps) {
  const [value, setValue] = useState('');
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [focused, setFocused] = useState(false);
  const apiIngredientsRef = useRef<string[]>([]);
  const apiLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void getAllIngredients().then((api) => {
      if (cancelled) return;
      apiIngredientsRef.current = api;
      apiLoadedRef.current = true;
      setAllIngredients(mergeIngredientAutocompleteLists(api));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiLoadedRef.current) return;
    setAllIngredients(
      mergeIngredientAutocompleteLists(apiIngredientsRef.current),
    );
  }, [ingredients.length]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    const tagged = new Set(ingredients.map((t) => t.toLowerCase()));
    return allIngredients
      .filter((name) => name.includes(q) && !tagged.has(name))
      .slice(0, 8);
  }, [value, allIngredients, ingredients]);

  const showDropdown = focused && suggestions.length > 0;

  const addTag = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      const lower = t.toLowerCase();
      if (ingredients.some((p) => p.toLowerCase() === lower)) return;
      onAdd(t);
      setValue('');
      setActiveSuggestion(0);
      setAllIngredients(
        mergeIngredientAutocompleteLists(apiIngredientsRef.current),
      );
    },
    [ingredients, onAdd],
  );

  const onBlur = useCallback(() => {
    window.setTimeout(() => setFocused(false), 150);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        if (!value.trim() && ingredients.length > 0) {
          e.preventDefault();
          onSearch();
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
        } else if (!value.trim() && ingredients.length > 0) {
          onSearch();
        }
        return;
      }
      if (e.key === ',') {
        e.preventDefault();
        if (value.trim()) addTag(value);
        return;
      }
      if (e.key === 'Backspace' && !value && ingredients.length > 0) {
        e.preventDefault();
        onRemove(ingredients[ingredients.length - 1]);
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
    },
    [
      activeSuggestion,
      addTag,
      ingredients,
      onRemove,
      onSearch,
      showDropdown,
      suggestions,
      value,
    ],
  );

  useEffect(() => {
    setActiveSuggestion(0);
  }, [suggestions]);

  const count = ingredients.length;
  const countLabel =
    count === 1 ? '1 ingredient' : `${count} ingredients`;

  return (
    <div className="ingredient-bag-wrap">
      <div className="ingredient-bag">
        <div className="ingredient-bag-tags-row">
          {ingredients.map((tag) => (
            <span key={tag} className="ingredient-bag-tag">
              <span>{tag}</span>
              <button
                type="button"
                className="ingredient-bag-tag-remove"
                aria-label={`Remove ${tag}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onRemove(tag)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="ingredient-bag-input"
            value={value}
            placeholder={
              ingredients.length === 0 ? 'Type an ingredient...' : 'add another...'
            }
            onChange={(ev) => setValue(ev.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={onBlur}
          />
        </div>
        <div className="ingredient-bag-footer">
          <span className="ingredient-bag-count">{countLabel}</span>
          <button
            type="button"
            className="ingredient-bag-search"
            disabled={count === 0 || loading}
            onClick={() => onSearch()}
          >
            {loading ? (
              <span className="ingredient-bag-loading" aria-label="Loading">
                <span />
                <span />
                <span />
              </span>
            ) : (
              <>
                Find recipes <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </div>
      {showDropdown && (
        <ul className="ingredient-bag-suggestions" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeSuggestion}
              className={`ingredient-bag-suggestion ${
                i === activeSuggestion ? 'ingredient-bag-suggestion--active' : ''
              }`}
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
  );
}
