/** Start of local calendar day (midnight). */
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days between timestamp's day and now's day (now >= ts). */
function calendarDaysBefore(ts: number, nowMs: number): number {
  const tsDay = startOfLocalDay(new Date(ts));
  const nowDay = startOfLocalDay(new Date(nowMs));
  return Math.round((nowDay - tsDay) / 86400000);
}

function formatAbsolute(ts: number, nowMs: number): string {
  const d = new Date(ts);
  const now = new Date(nowMs);
  const opts: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };
  if (d.getFullYear() !== now.getFullYear()) {
    opts.year = 'numeric';
  }
  return new Intl.DateTimeFormat('en-US', opts).format(d);
}

/**
 * Compact relative time for lists (history, pantry meta).
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffSec / 3600);
  if (diffHr < 24) return `${diffHr}h ago`;

  const calDays = calendarDaysBefore(timestamp, now);
  if (calDays === 1) return 'yesterday';
  if (calDays >= 2 && calDays <= 7) return `${calDays} days ago`;
  if (calDays >= 8) return formatAbsolute(timestamp, now);

  return formatAbsolute(timestamp, now);
}
