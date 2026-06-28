import type { DocumentKind } from './types';

interface Signal {
  kind: DocumentKind;
  patterns: RegExp[];
  filenameHints: RegExp[];
}

const SIGNALS: Signal[] = [
  {
    kind: 'ssa-statement',
    patterns: [
      /Social Security Administration/i,
      /Your Social Security Statement/i,
      /Personalized Monthly Retirement Benefit Estimates/i,
      /If you stop working and start receiving benefits/i,
    ],
    filenameHints: [/^ssa/i, /social[-_ ]?security/i, /your.?social.?security.?statement/i],
  },
  {
    kind: 'form-1040',
    patterns: [
      /Form\s*1040/i,
      /U\.?S\.?\s*Individual\s*Income\s*Tax\s*Return/i,
      /Adjusted gross income/i,
      /Department of the Treasury\s*Internal Revenue Service/i,
    ],
    filenameHints: [/1040/i, /form.?1040/i, /tax.?return/i],
  },
  {
    kind: '401k-statement',
    patterns: [
      /401\s*\(?\s*k\s*\)?/i,
      /403\s*\(?\s*b\s*\)?/i,
      /Employer\s*Match/i,
      /Year[- ]to[- ]Date Contributions/i,
      /Defined Contribution/i,
    ],
    filenameHints: [/401[-_ ]?k/i, /403[-_ ]?b/i, /retirement.?(plan|account)/i],
  },
  {
    kind: 'brokerage-statement',
    patterns: [
      /Brokerage Statement/i,
      /Individual Retirement Account/i,
      /Roth IRA/i,
      /Traditional IRA/i,
      /Cost Basis/i,
      /Account Summary/i,
    ],
    filenameHints: [/brokerage/i, /ira/i, /portfolio/i, /investment.?statement/i],
  },
];

/** Heuristic classifier with simple scoring. Higher = more confident. */
export function detectDocumentKind(text: string, filename: string): {
  kind: DocumentKind;
  confidence: number;
} {
  const scores = new Map<DocumentKind, number>();
  for (const sig of SIGNALS) {
    let score = 0;
    for (const re of sig.filenameHints) if (re.test(filename)) score += 2;
    for (const re of sig.patterns) if (re.test(text)) score += 1;
    scores.set(sig.kind, score);
  }
  let bestKind: DocumentKind = 'unknown';
  let bestScore = 0;
  for (const [kind, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestKind = kind;
    }
  }
  // Confidence: rough mapping. >= 3 strong, 2 medium, 1 weak.
  const confidence = bestScore === 0 ? 0 : Math.min(1, bestScore / 4);
  return { kind: bestKind, confidence };
}
