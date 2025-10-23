import type { RuleInput, RuleResult, RuleCheck } from './types';

const roundToTenth = (value: number) => Math.round(value * 10) / 10;
const calcArea = ({ length, width }: RuleInput) => length * width;

export function assess(input: RuleInput): RuleResult {
  const checks: RuleCheck[] = [];

  const totalArea = calcArea(input);
  const areaOk = totalArea <= 20;
  checks.push({
    id: 'structure-area',
    ok: areaOk,
    message: areaOk
      ? 'Area (≤ 20 m²) satisfied'
      : `Area ${roundToTenth(totalArea)} m² exceeds 20 m²`,
    clause: 'SEPP Exempt Development 2008 cl. 2.18(1)(a)',
    citation: 'Subdivision 7 — Development ancillary to dwelling houses (Outbuildings)',
  });

  const heightOk = input.height <= 3;
  checks.push({
    id: 'structure-height',
    ok: heightOk,
    message: heightOk
      ? 'Height (≤ 3.0 m) satisfied'
      : `Height ${roundToTenth(input.height)} m exceeds 3.0 m`,
    clause: 'SEPP Exempt Development 2008 cl. 2.18(1)(c)',
    citation: 'Subdivision 7 — Development ancillary to dwelling houses (Outbuildings)',
  });

  const setbackOk = input.setback >= 0.5;
  checks.push({
    id: 'structure-setback',
    ok: setbackOk,
    message: setbackOk
      ? 'Nearest boundary distance (≥ 0.5 m) satisfied'
      : `Nearest boundary distance ${roundToTenth(input.setback)} m is under 0.5 m`,
    clause: 'SEPP Exempt Development 2008 cl. 2.18(1)(f)',
    citation: 'Subdivision 7 — Development ancillary to dwelling houses (Outbuildings)',
  });

  const failures = checks.filter((c) => !c.ok).map((c) => c.message);

  const verdict = failures.length === 0 ? 'LIKELY EXEMPT' : 'NOT EXEMPT';

  return {
    verdict,
    reasons: failures.length === 0
      ? checks.map((c) => c.message)
      : failures,
    checks,
  };
}

export const _internal = { area: calcArea, roundToTenth, r1: roundToTenth };
