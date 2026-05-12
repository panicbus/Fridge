/**
 * Turn API instruction blobs into discrete steps: newline lists, inline numbering,
 * or single paragraphs split by sentence when needed.
 */

const SINGLE_LINE_EXPAND_MIN = 120;
const LONG_LINE_EXPAND_MIN = 280;
/** Merge fragments shorter than this with neighbors (abbreviations, clause splits). */
const MERGE_SHORT_UNDER = 38;
const FINAL_MIN_STEP_LEN = 10;

function stripLeadingStepNumber(s: string): string {
  return s.replace(/^\s*\d+[\.\)]\s*/, '').trim();
}

/** Split "…end. 2. Next…" and compact "…text 2. Next…" (capital letter after step). */
function splitInlineNumberedSteps(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  let parts = trimmed.split(/(?<=[.!?])\s+(?=\d+[\.\)]\s)/);
  if (parts.length <= 1) {
    parts = trimmed.split(/\s+(?=\d{1,2}[\.\)]\s+\p{Lu})/u);
  }

  const out = parts
    .map((p) => stripLeadingStepNumber(p))
    .map((p) => p.trim())
    .filter(Boolean);
  return out.length ? out : [stripLeadingStepNumber(trimmed)].filter(Boolean);
}

function splitSentences(text: string): string[] {
  try {
    const IntlAny = Intl as typeof Intl & {
      Segmenter?: new (
        locales?: string | string[],
        options?: { granularity: string },
      ) => {
        segment: (input: string) => Iterable<{
          segment: string;
          isSentenceLike: boolean;
        }>;
      };
    };
    const Segmenter = IntlAny.Segmenter;
    if (typeof Segmenter === 'function') {
      const seg = new Segmenter(undefined, { granularity: 'sentence' });
      const parts: string[] = [];
      for (const p of seg.segment(text)) {
        if (p.isSentenceLike) {
          const t = p.segment.trim();
          if (t) parts.push(t);
        }
      }
      if (parts.length > 1) return parts;
    }
  } catch {
    /* Segmenter unsupported or invalid locale */
  }

  return text
    .split(/(?<=[.!?])\s+(?=\p{Lu}|\d)/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function expandDenseParagraph(line: string): string[] {
  let pieces = splitInlineNumberedSteps(line);
  if (pieces.length <= 1) {
    pieces = splitSentences(line);
  }
  pieces = pieces.map(stripLeadingStepNumber).filter(Boolean);
  return pieces.length ? pieces : [stripLeadingStepNumber(line)].filter(Boolean);
}

function shouldExpandLine(line: string, totalLines: number): boolean {
  if (line.length >= LONG_LINE_EXPAND_MIN) return true;
  return totalLines === 1 && line.length >= SINGLE_LINE_EXPAND_MIN;
}

function mergeShortSteps(steps: string[], minLen: number): string[] {
  if (steps.length === 0) return [];
  const out: string[] = [steps[0]];
  for (let i = 1; i < steps.length; i++) {
    const cur = steps[i];
    const prev = out[out.length - 1];
    if (prev.length < minLen || cur.length < minLen) {
      out[out.length - 1] = `${prev} ${cur}`;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/**
 * Normalize raw instruction text from MealDB, Spoonacular, or similar into steps.
 */
export function normalizeInstructionSteps(raw: string): string[] {
  if (!raw?.trim()) return [];

  const lines = raw
    .split(/\r?\n/)
    .map((line) => stripLeadingStepNumber(line))
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const expanded: string[] = [];
  for (const line of lines) {
    if (shouldExpandLine(line, lines.length)) {
      expanded.push(...expandDenseParagraph(line));
    } else {
      expanded.push(line);
    }
  }

  let steps = expanded
    .map(stripLeadingStepNumber)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);

  steps = mergeShortSteps(steps, MERGE_SHORT_UNDER);
  steps = steps.filter((s) => s.length >= FINAL_MIN_STEP_LEN);

  return steps;
}
