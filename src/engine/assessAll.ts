import type { RuleInput, RuleResult, RuleCheck } from './types';
import { assess } from './assess';
import type { OverlaySnapshot, OverlayFinding } from '../overlay/types';
import { evaluateOverlays } from '../overlay/overlayRules';

export type OverallVerdict = 'LIKELY EXEMPT' | 'NOT EXEMPT';

export interface CombinedResult {
  verdict: OverallVerdict;
  reasons: string[];
  checks: RuleCheck[];
  details: {
    structure: RuleResult;
    overlays: OverlayFinding;
  };
}

export function assessAll(input: RuleInput, overlay: OverlaySnapshot): CombinedResult {
  const structure = assess(input);
  const overlayFinding = evaluateOverlays(overlay);

  const overlayIssues = overlayFinding.reasons;
  const ok = structure.verdict === 'LIKELY EXEMPT' && overlayFinding.ok;
  const reasons = overlayFinding.ok
    ? [...structure.reasons]
    : [...structure.reasons, ...overlayIssues];

  const checks: RuleCheck[] = [
    ...structure.checks,
    ...(
      overlayIssues.length === 0
        ? [{
            id: 'overlay-scope',
            ok: true,
            message: 'Overlay checks satisfied',
            clause: 'SEPP Exempt Development 2008 Part 2—General restrictions',
            citation: 'Zone/BAL/Flood constraints',
          }]
        : overlayIssues.map((reason, index) => ({
            id: `overlay-${index + 1}`,
            ok: false,
            message: reason,
            clause: 'SEPP Exempt Development 2008 Part 2—General restrictions',
            citation: 'Zone/BAL/Flood constraints',
          }))
    ),
  ];

  return {
    verdict: ok ? 'LIKELY EXEMPT' : 'NOT EXEMPT',
    reasons,
    checks,
    details: { structure, overlays: overlayFinding },
  };
}
