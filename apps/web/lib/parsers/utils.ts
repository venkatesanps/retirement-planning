/**
 * Shared regex utilities used across parsers.
 */

/** Parse a string like "$3,100.00" or "3100" into a number. Returns NaN on failure. */
export function parseMoney(s: string | undefined): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Format a USD amount for display. */
export function fmtUSD(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtUSDperMo(n: number): string {
  return `${fmtUSD(n)}/mo`;
}

/** Find first match of regex; returns the named capture group `value` or first capture. */
export function findFirst(text: string, regex: RegExp): string | undefined {
  const m = text.match(regex);
  if (!m) return undefined;
  return m.groups?.value ?? m[1];
}

/** Squashes runs of whitespace to a single space; useful for fuzzy matching. */
export function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
