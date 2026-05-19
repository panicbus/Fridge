import { useCallback, useEffect, useRef, useState } from 'react';
import './StepTimer.css';

export interface StepTimerProps {
  initialSeconds: number;
  label: string;
  enabled?: boolean;
  onComplete?: () => void;
}

let notificationPrimed = false;

async function primeNotifications(): Promise<void> {
  if (notificationPrimed) return;
  notificationPrimed = true;
  try {
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

function playChime(): void {
  try {
    const WebkitAudioContext = (
      window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
    const Ctor = window.AudioContext ?? WebkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.2);
    playTone(660, now + 0.22, 0.25);
  } catch {
    /* audio unavailable */
  }
}

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function StepTimer({
  initialSeconds,
  label,
  enabled = true,
  onComplete,
}: StepTimerProps) {
  const [state, setState] = useState<'idle' | 'running' | 'paused' | 'done'>(
    'idle',
  );
  const [remaining, setRemaining] = useState(initialSeconds);
  const targetEndRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setRemaining(initialSeconds);
    setState('idle');
    targetEndRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [initialSeconds, label]);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const end = targetEndRef.current;
    if (end == null) return;
    const next = Math.max(0, Math.round((end - Date.now()) / 1000));
    setRemaining(next);
    if (next <= 0) {
      clearTick();
      targetEndRef.current = null;
      setState('done');
      playChime();
      try {
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          new Notification('Timer done', {
            body: `${label} timer is up`,
            icon: '/favicon.svg',
          });
        }
      } catch {
        /* ignore */
      }
      onCompleteRef.current?.();
    }
  }, [clearTick, label]);

  useEffect(() => {
    if (state !== 'running') return;
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state, tick]);

  const start = useCallback(async () => {
    await primeNotifications();
    const secs = state === 'paused' ? remaining : initialSeconds;
    targetEndRef.current = Date.now() + secs * 1000;
    setRemaining(secs);
    setState('running');
    queueMicrotask(() => tick());
  }, [initialSeconds, remaining, state, tick]);

  const pause = useCallback(() => {
    const end = targetEndRef.current;
    if (end != null) {
      setRemaining(Math.max(0, Math.round((end - Date.now()) / 1000)));
      targetEndRef.current = null;
    }
    clearTick();
    setState('paused');
  }, [clearTick]);

  const onPillClick = useCallback(() => {
    if (state === 'idle') void start();
    else if (state === 'running') pause();
    else if (state === 'paused') void start();
    else if (state === 'done') {
      setState('idle');
      setRemaining(initialSeconds);
      targetEndRef.current = null;
    }
  }, [initialSeconds, pause, start, state]);

  if (!enabled) return null;

  let labelText = '';
  if (state === 'idle') labelText = `Start ${label} timer`;
  else if (state === 'running' || state === 'paused')
    labelText = formatMmSs(remaining);
  else labelText = 'Done — tap to dismiss';

  return (
    <button
      type="button"
      className={`step-timer ${state}`}
      onClick={(e) => {
        e.stopPropagation();
        onPillClick();
      }}
    >
      <span className="step-timer-icon" aria-hidden>
        {state === 'idle' ? '▷' : null}
        {state === 'running' ? '❚❚' : null}
        {state === 'paused' ? '▷' : null}
        {state === 'done' ? '✓' : null}
      </span>
      <span>{labelText}</span>
    </button>
  );
}
