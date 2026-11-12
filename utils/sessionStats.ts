import { SPORTS_CONFIG } from '@/constants/sports';
import { Session } from '@/types';

export type SessionStatSummaryItem = {
  key: string;
  shortLabel: string;
};

/** Abbreviate a custom_* stat key from the user-entered name (not "CUS"). */
export function abbreviateCustomStatKey(key: string): string {
  if (!key.startsWith('custom_')) {
    return key.toUpperCase().slice(0, 3);
  }

  const name = key.replace(/^custom_/, '').replace(/_\d+$/, '');
  const words = name.split('_').filter(Boolean);
  if (words.length === 0) return 'CUS';

  if (words.length >= 2) {
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 4);
  }

  return words[0].slice(0, 3).toUpperCase();
}

/**
 * Build a compact list of stats for cards.
 * Prefers non-zero values (so custom stats aren't dropped by a long default list).
 */
export function getSessionStatSummary(
  session: Session,
  limit: number
): SessionStatSummaryItem[] {
  const config = SPORTS_CONFIG[session.sport];
  const known = config.stats.map((stat) => ({
    key: stat.key,
    shortLabel: stat.shortLabel,
  }));

  const custom = Object.keys(session.stats)
    .filter((key) => !config.stats.some((s) => s.key === key))
    .map((key) => ({
      key,
      shortLabel: abbreviateCustomStatKey(key),
    }));

  const ordered = [...known, ...custom];
  const nonZero = ordered.filter((s) => (session.stats[s.key] || 0) !== 0);
  return (nonZero.length > 0 ? nonZero : ordered).slice(0, limit);
}
