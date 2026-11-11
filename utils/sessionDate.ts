/**
 * Calendar-date helpers for game sessions.
 * Avoids the classic UTC-midnight off-by-one when parsing YYYY-MM-DD.
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Today's date as YYYY-MM-DD in the device local timezone. */
export function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Convert a YYYY-MM-DD calendar date to a storage ISO string at local noon
 * so timezone shifts do not change the calendar day.
 */
export function toStoredSessionDate(yyyyMmDd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd.trim());
  if (!match) {
    // Fallback: try to salvage a prefix or use local today
    const parsed = parseSessionDate(yyyyMmDd);
    return new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      12,
      0,
      0
    ).toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

/**
 * Parse a stored session date as a local calendar date.
 * Uses the YYYY-MM-DD prefix so existing UTC-midnight ISO values display correctly.
 */
export function parseSessionDate(stored: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(stored.trim());
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(stored);
}

export function formatSessionDate(
  stored: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return parseSessionDate(stored).toLocaleDateString(
    'en-US',
    options ?? {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}
