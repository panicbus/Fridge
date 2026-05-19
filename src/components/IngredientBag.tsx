import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import {
  getAllIngredients,
  mergeIngredientAutocompleteLists,
} from '../services/mealdb';
import {
  ingredientDedupeKey,
  ingredientsSameItem,
} from '../utils/ingredientDedupe';
import './IngredientBag.css';

type IngredientSuggestionRow =
  | { source: 'typed'; text: string }
  | { source: 'list'; text: string };

export interface IngredientBagProps {
  ingredients: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  /** Clears all tags (home screen); also clears draft input when invoked from IngredientBag. */
  onClear?: () => void;
  onSearch: () => void;
  loading: boolean;
}

export default function IngredientBag({
  ingredients,
  onAdd,
  onRemove,
  onClear,
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

  const suggestionRows = useMemo((): IngredientSuggestionRow[] => {
    const raw = value.trim();
    const q = raw.toLowerCase();
    if (q.length < 2) return [];

    const taggedKeys = new Set(ingredients.map((t) => ingredientDedupeKey(t)));

    const conflictsTagged = (candidate: string) =>
      taggedKeys.has(ingredientDedupeKey(candidate));

    const apiMatches = allIngredients
      .filter((name) => name.includes(q) && !conflictsTagged(name))
      .sort((a, b) => {
        const aExact = a.toLowerCase() === q ? 0 : 1;
        const bExact = b.toLowerCase() === q ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    const exactInCatalog = allIngredients.some((n) => n.toLowerCase() === q);

    const rows: IngredientSuggestionRow[] = [];

    if (!conflictsTagged(raw) && !exactInCatalog) {
      rows.push({ source: 'typed', text: raw });
    }

    for (const name of apiMatches) {
      rows.push({ source: 'list', text: name });
    }

    return rows.slice(0, 10);
  }, [value, allIngredients, ingredients]);

  const showDropdown = focused && suggestionRows.length > 0;

  const addTag = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      if (ingredients.some((p) => ingredientsSameItem(p, t))) return;
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
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Tab') {
        if (showDropdown && suggestionRows[activeSuggestion]) {
          e.preventDefault();
          addTag(suggestionRows[activeSuggestion].text);
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
        if (showDropdown && suggestionRows[activeSuggestion]) {
          addTag(suggestionRows[activeSuggestion].text);
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
          Math.min(i + 1, suggestionRows.length - 1),
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
      suggestionRows,
      value,
    ],
  );

  useEffect(() => {
    setActiveSuggestion(0);
  }, [suggestionRows]);

  const clearList = useCallback(() => {
    setValue('');
    setActiveSuggestion(0);
    setFocused(false);
    onClear?.();
  }, [onClear]);

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
          <div className="ingredient-bag-footer-left">
            {count > 0 ? (
              <>
                <span className="ingredient-bag-count">{countLabel}</span>
                {onClear ? (
                  <button
                    type="button"
                    className="ingredient-bag-clear"
                    onClick={clearList}
                  >
                    Clear list
                  </button>
                ) : null}
              </>
            ) : (
              <span className="ingredient-bag-footer-placeholder" aria-hidden />
            )}
          </div>
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
          {suggestionRows.map((row, i) => (
            <li
              key={`${row.source}-${row.text}-${i}`}
              role="option"
              aria-selected={i === activeSuggestion}
              aria-label={
                row.source === 'typed'
                  ? `Add ${row.text} as ingredient`
                  : row.text
              }
              className={`ingredient-bag-suggestion ${
                row.source === 'typed'
                  ? 'ingredient-bag-suggestion--typed'
                  : ''
              } ${
                i === activeSuggestion ? 'ingredient-bag-suggestion--active' : ''
              }`}
              onMouseDown={(ev) => {
                ev.preventDefault();
                addTag(row.text);
              }}
            >
              {row.source === 'typed' ? (
                <>
                  <span className="ingredient-bag-suggestion-typed-label">
                    Add
                  </span>
                  <span className="ingredient-bag-suggestion-typed-value">
                    {row.text}
                  </span>
                </>
              ) : (
                row.text
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
