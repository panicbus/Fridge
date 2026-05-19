import { useCallback, useEffect, useRef, useState } from 'react';
import './DropdownMenu.css';

export interface DropdownMenuOption {
  value: string;
  label: string;
}

export interface DropdownMenuProps {
  ariaLabel: string;
  value: string;
  options: DropdownMenuOption[];
  onChange: (value: string) => void;
  className?: string;
  /** Layout presets for trigger width */
  variant?: 'default' | 'compact' | 'pantry-sort';
}

export default function DropdownMenu({
  ariaLabel,
  value,
  options,
  onChange,
  className = '',
  variant = 'default',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected =
    options.find((o) => o.value === value) ?? options[0] ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const pick = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );

  const variantClass =
    variant === 'compact'
      ? 'dropdown-menu--compact'
      : variant === 'pantry-sort'
        ? 'dropdown-menu--pantry-sort'
        : '';

  return (
    <div
      ref={rootRef}
      className={`dropdown-menu ${variantClass} ${className}`.trim()}
    >
      <button
        type="button"
        className="dropdown-menu-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggle}
      >
        <span className="dropdown-menu-trigger-label">
          {selected?.label ?? ''}
        </span>
        <svg
          className={`dropdown-menu-chevron ${open ? 'dropdown-menu-chevron--open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M2.5 4.5 6 8 9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul className="dropdown-menu-panel" role="listbox">
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`dropdown-menu-option ${
                opt.value === value ? 'dropdown-menu-option--selected' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(opt.value);
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
