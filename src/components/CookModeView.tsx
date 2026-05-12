import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { UnifiedRecipe } from '../types';
import { extractStepIngredients } from '../utils/stepIngredients';
import { detectTimer } from '../utils/stepTimers';
import {
  convertMetricMeasureToImperial,
  convertRecipeStepTextToImperial,
} from '../utils/imperialMeasures';
import { requestWakeLock } from '../utils/wakeLock';
import StepTimer from './StepTimer';
import './CookModeView.css';

const TIMERS_LS_KEY = 'fridge.cookMode.timersEnabled';

function readTimersEnabled(): boolean {
  try {
    return localStorage.getItem(TIMERS_LS_KEY) !== 'false';
  } catch {
    return true;
  }
}

function writeTimersEnabled(v: boolean): void {
  try {
    localStorage.setItem(TIMERS_LS_KEY, v ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

function CloseIcon(): React.ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}

function ClockIcon({ enabled }: { enabled: boolean }): React.ReactElement {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: enabled ? 1 : 0.5 }}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      {!enabled ? <line x1="4" y1="20" x2="20" y2="4" /> : null}
    </svg>
  );
}

/** Solid silhouette icons — flat pictogram style */
function ForkUtensil(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden>
      <path d="M6 2h2v9H6V2zm5 0h2v9h-2V2zm5 0h2v9h-2V2zM10 11h8v2h-3v17h-2v-17h-3v-2z" />
    </svg>
  );
}

function SpoonUtensil(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden>
      <ellipse cx="12" cy="9.5" rx="6.2" ry="7.8" />
      <rect x="9.25" y="16" width="5.5" height="15" rx="2.75" />
    </svg>
  );
}

function KnifeUtensil(): React.ReactElement {
  return (
    <svg viewBox="0 0 24 32" fill="currentColor" aria-hidden>
      <rect x="11" y="2" width="2" height="17" />
      <rect x="8.25" y="18.5" width="7.5" height="11.5" rx="2" />
    </svg>
  );
}

type BurstKind = 'fork' | 'spoon' | 'knife';

const CELEBRATION_BURST: Array<{
  kind: BurstKind;
  dx: string;
  dy: string;
  rot: string;
  delay: string;
  accent: 'warm' | 'gold';
}> = [
  /* Confetti: spread horizontally, drift downward (positive dy) */
  { kind: 'fork', dx: '-195px', dy: '155px', rot: '212deg', delay: '0s', accent: 'warm' },
  { kind: 'spoon', dx: '205px', dy: '168px', rot: '-156deg', delay: '0.04s', accent: 'gold' },
  { kind: 'knife', dx: '-115px', dy: '220px', rot: '94deg', delay: '0.02s', accent: 'warm' },
  { kind: 'fork', dx: '125px', dy: '235px', rot: '-78deg', delay: '0.06s', accent: 'gold' },
  { kind: 'spoon', dx: '-28px', dy: '260px', rot: '168deg', delay: '0.08s', accent: 'warm' },
  { kind: 'knife', dx: '42px', dy: '248px', rot: '-102deg', delay: '0.1s', accent: 'gold' },
  { kind: 'fork', dx: '-165px', dy: '195px', rot: '-134deg', delay: '0.03s', accent: 'gold' },
  { kind: 'spoon', dx: '168px', dy: '208px', rot: '122deg', delay: '0.12s', accent: 'warm' },
  { kind: 'knife', dx: '-225px', dy: '128px', rot: '-56deg', delay: '0.05s', accent: 'gold' },
  { kind: 'fork', dx: '218px', dy: '142px', rot: '88deg', delay: '0.14s', accent: 'warm' },
  { kind: 'spoon', dx: '-78px', dy: '228px', rot: '-188deg', delay: '0.07s', accent: 'gold' },
  { kind: 'knife', dx: '88px', dy: '218px', rot: '56deg', delay: '0.09s', accent: 'warm' },
  { kind: 'fork', dx: '-52px', dy: '185px', rot: '142deg', delay: '0.11s', accent: 'gold' },
  { kind: 'spoon', dx: '58px', dy: '192px', rot: '-62deg', delay: '0.13s', accent: 'warm' },
  { kind: 'knife', dx: '-148px', dy: '275px', rot: '-118deg', delay: '0.15s', accent: 'warm' },
  { kind: 'fork', dx: '142px', dy: '268px', rot: '34deg', delay: '0.16s', accent: 'gold' },
  { kind: 'spoon', dx: '-202px', dy: '118px', rot: '76deg', delay: '0.06s', accent: 'warm' },
  { kind: 'knife', dx: '192px', dy: '105px', rot: '-148deg', delay: '0.17s', accent: 'gold' },
  { kind: 'fork', dx: '-95px', dy: '142px', rot: '198deg', delay: '0.11s', accent: 'warm' },
  { kind: 'spoon', dx: '175px', dy: '252px', rot: '-72deg', delay: '0.13s', accent: 'gold' },
  { kind: 'knife', dx: '12px', dy: '290px', rot: '108deg', delay: '0.09s', accent: 'warm' },
  { kind: 'fork', dx: '-210px', dy: '178px', rot: '-92deg', delay: '0.15s', accent: 'gold' },
  { kind: 'spoon', dx: '95px', dy: '155px', rot: '156deg', delay: '0.08s', accent: 'warm' },
];

const CELEBRATION_FADE_VARIANTS = 11;

/** Pseudo-random fade curve per piece; changes each celebration via `generation`. */
function celebrationFadeVariant(index: number, generation: number): number {
  const x =
    Math.sin(generation * 12.9898 + index * 78.233 + 43.758) * 43758.5453123;
  const f = x - Math.floor(x);
  return Math.floor(f * CELEBRATION_FADE_VARIANTS);
}

function CelebrationBurst({
  celebrationGeneration,
}: {
  celebrationGeneration: number;
}): React.ReactElement {
  return (
    <div className="cook-mode-celebration-burst" aria-hidden>
      {CELEBRATION_BURST.map((p, i) => (
        <span
          key={i}
          className={`cook-mode-celebration-piece cook-mode-celebration-piece--${p.accent} cook-mode-celebration-fade-${celebrationFadeVariant(i, celebrationGeneration)}`}
          style={
            {
              '--burst-dx': p.dx,
              '--burst-dy': p.dy,
              '--burst-rot': p.rot,
              /** Initial upward velocity term for ballistic arc (parabola lands on Dy at u=1). */
              '--burst-upkick': `${105 + ((i * 19 + i * i * 3) % 78)}px`,
              '--burst-delay': p.delay,
            } as React.CSSProperties
          }
        >
          {p.kind === 'fork' ? (
            <ForkUtensil />
          ) : p.kind === 'spoon' ? (
            <SpoonUtensil />
          ) : (
            <KnifeUtensil />
          )}
        </span>
      ))}
    </div>
  );
}

export interface CookModeViewProps {
  recipe: UnifiedRecipe;
  onExit: () => void;
  onGoHome: () => void;
}

export default function CookModeView({
  recipe,
  onExit,
  onGoHome,
}: CookModeViewProps) {
  const steps = recipe.instructions;
  const [currentStep, setCurrentStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [celebrationGeneration, setCelebrationGeneration] = useState(0);
  const [timersEnabled, setTimersEnabled] = useState(readTimersEnabled);

  const finishCelebration = useCallback(() => {
    setCelebrationGeneration((g) => g + 1);
    setFinished(true);
  }, []);

  useEffect(() => {
    if (steps.length !== 0) return;
    finishCelebration();
  }, [steps.length, finishCelebration]);

  useEffect(() => {
    let release: (() => void) | null = null;
    void requestWakeLock().then((r) => {
      release = r;
    });
    return () => {
      if (release) release();
    };
  }, []);

  const advance = useCallback(() => {
    if (steps.length === 0) {
      finishCelebration();
      return;
    }
    setCurrentStep((s) => {
      const last = steps.length - 1;
      if (s >= last) {
        queueMicrotask(() => finishCelebration());
        return s;
      }
      return s + 1;
    });
  }, [finishCelebration, steps.length]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (finished) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          onExit();
        }
        return;
      }
      if (
        e.key === 'ArrowRight' ||
        e.key === ' ' ||
        e.key === 'Enter'
      ) {
        e.preventDefault();
        advance();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advance, finished, goBack, onExit]);

  const stepText = steps[currentStep] ?? '';
  const stepTextDisplay = useMemo(
    () => convertRecipeStepTextToImperial(stepText),
    [stepText],
  );
  const stepIngredients = useMemo(
    () => extractStepIngredients(stepText, recipe.ingredients),
    [recipe.ingredients, stepText],
  );

  const detectedTimer = useMemo(() => detectTimer(stepText), [stepText]);

  const textFitWrapRef = useRef<HTMLDivElement>(null);
  const stepTextRef = useRef<HTMLParagraphElement>(null);

  const fitStepTextFont = useCallback(() => {
    const wrap = textFitWrapRef.current;
    const el = stepTextRef.current;
    if (!wrap || !el) return;

    el.style.removeProperty('font-size');

    if (!stepTextDisplay.trim()) {
      return;
    }

    const cap = wrap.clientHeight;
    if (cap < 8) return;

    let maxPx = parseFloat(getComputedStyle(el).fontSize);
    if (!Number.isFinite(maxPx) || maxPx < 12) {
      maxPx = 48;
    }
    maxPx = Math.min(maxPx, 56);

    el.style.fontSize = `${maxPx}px`;
    if (el.scrollHeight <= cap) {
      return;
    }

    let low = 13;
    let high = maxPx;
    for (let i = 0; i < 16; i++) {
      const mid = (low + high) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollHeight <= cap) low = mid;
      else high = mid;
    }
    el.style.fontSize = `${Math.max(13, low)}px`;
  }, [stepTextDisplay]);

  useLayoutEffect(() => {
    fitStepTextFont();
  }, [
    fitStepTextFont,
    currentStep,
    stepIngredients.length,
    timersEnabled,
    detectedTimer?.seconds,
    detectedTimer?.label,
  ]);

  useEffect(() => {
    void document.fonts.ready.then(() => fitStepTextFont());
  }, [fitStepTextFont]);

  useEffect(() => {
    const wrap = textFitWrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => fitStepTextFont());
    ro.observe(wrap);
    const root = wrap.closest('.cook-mode-root');
    if (root) ro.observe(root);
    window.addEventListener('resize', fitStepTextFont);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fitStepTextFont);
    };
  }, [fitStepTextFont]);

  const toggleTimers = useCallback(() => {
    setTimersEnabled((v) => {
      const next = !v;
      writeTimersEnabled(next);
      return next;
    });
  }, []);

  if (finished) {
    return (
      <div className="cook-mode-root cook-mode-finished">
        <div className="cook-mode-celebration">
          <CelebrationBurst celebrationGeneration={celebrationGeneration} />
          <h1 className="cook-mode-celebration-heading">Bon Appétit</h1>
          <p className="cook-mode-celebration-recipe">{recipe.title}</p>
          <div className="cook-mode-celebration-actions">
            <button
              type="button"
              className="cook-mode-celebration-cta"
              onClick={onExit}
            >
              Back to recipe
            </button>
            <button
              type="button"
              className="cook-mode-celebration-cta-home"
              onClick={onGoHome}
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cook-mode-root">
      <header className="cook-mode-header">
        <div className="cook-mode-title" title={recipe.title}>
          {recipe.title}
        </div>
        <div className="cook-mode-controls">
          <button
            type="button"
            className="cook-mode-toggle-timers"
            data-enabled={timersEnabled ? 'true' : 'false'}
            onClick={toggleTimers}
            aria-label={
              timersEnabled ? 'Disable step timers' : 'Enable step timers'
            }
            title={timersEnabled ? 'Step timers on' : 'Step timers off'}
          >
            <ClockIcon enabled={timersEnabled} />
          </button>
          <button
            type="button"
            className="cook-mode-exit"
            onClick={onExit}
            aria-label="Exit cook mode"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      <main
        className="cook-mode-stage"
        onClick={advance}
        role="button"
        tabIndex={0}
        aria-label="Tap to advance to next step"
      >
        <div className="cook-mode-step-number">
          Step {steps.length === 0 ? 0 : currentStep + 1}{' '}
          <span className="cook-mode-step-total">of {steps.length}</span>
        </div>

        <div className="cook-mode-step-column">
          <div
            ref={textFitWrapRef}
            className="cook-mode-step-text-fit"
          >
            <p ref={stepTextRef} className="cook-mode-step-text">
              {stepTextDisplay}
            </p>
          </div>

          {stepIngredients.length > 0 ? (
            <div className="cook-mode-ingredients">
              <div className="cook-mode-ingredients-label">For this step:</div>
              <ul className="cook-mode-ingredients-list">
                {stepIngredients.map((ing) => (
                  <li key={ing.name}>
                    <span className="ing-measure">
                    {convertMetricMeasureToImperial(ing.measure)}
                  </span>
                    {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detectedTimer && timersEnabled ? (
            <div
              className="cook-mode-timer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <StepTimer
                initialSeconds={detectedTimer.seconds}
                label={detectedTimer.label}
              />
            </div>
          ) : null}
        </div>
      </main>

      <footer className="cook-mode-footer">
        <div className="cook-mode-progress" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={`cook-mode-dot ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}
            />
          ))}
        </div>

        <div className="cook-mode-nav">
          <button
            type="button"
            className="cook-mode-nav-btn cook-mode-nav-prev"
            onClick={(e) => {
              e.stopPropagation();
              goBack();
            }}
            disabled={currentStep === 0}
            aria-label="Previous step"
          >
            ← Previous
          </button>
          <button
            type="button"
            className="cook-mode-nav-btn cook-mode-nav-next"
            onClick={(e) => {
              e.stopPropagation();
              advance();
            }}
          >
            {currentStep >= steps.length - 1
              ? "I'm done →"
              : 'Next →'}
          </button>
        </div>
      </footer>
    </div>
  );
}
