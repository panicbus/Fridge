const MAX_SECONDS = 4 * 3600;

export interface DetectedTimer {
  seconds: number;
  label: string;
  matchIndex: number;
}

type Parser = (m: RegExpExecArray) => number | null;

const patterns: { re: RegExp; parse: Parser }[] = [
  {
    re: /(\d+)\s*-\s*(\d+)\s*(minute|minutes|min|mins)\b/i,
    parse: (m) => Math.min(parseInt(m[1], 10), parseInt(m[2], 10)) * 60,
  },
  {
    re: /(\d+)\s*-\s*(\d+)\s*(hour|hours|hr|hrs)\b/i,
    parse: (m) =>
      Math.min(parseInt(m[1], 10), parseInt(m[2], 10)) * 3600,
  },
  {
    re: /(\d+)\s*(minute|minutes|min|mins)\b/i,
    parse: (m) => parseInt(m[1], 10) * 60,
  },
  {
    re: /(\d+)\s*(hour|hours|hr|hrs)\b/i,
    parse: (m) => parseInt(m[1], 10) * 3600,
  },
  {
    re: /(\d+)\s*(second|seconds|sec|secs)\b/i,
    parse: (m) => parseInt(m[1], 10),
  },
];

export function detectTimer(stepText: string): DetectedTimer | null {
  interface Cand {
    seconds: number;
    label: string;
    matchIndex: number;
    priority: number;
  }

  const candidates: Cand[] = [];

  patterns.forEach(({ re, parse }, priority) => {
    re.lastIndex = 0;
    const m = re.exec(stepText);
    if (!m || m.index === undefined) return;
    const seconds = parse(m);
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return;
    if (seconds > MAX_SECONDS) return;
    candidates.push({
      seconds,
      label: m[0].trim(),
      matchIndex: m.index,
      priority,
    });
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.matchIndex !== b.matchIndex) return a.matchIndex - b.matchIndex;
    return a.priority - b.priority;
  });

  const best = candidates[0];
  return {
    seconds: best.seconds,
    label: best.label,
    matchIndex: best.matchIndex,
  };
}
