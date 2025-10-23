import type { CombinedResult } from '../../../../src/engine/assessAll';
import type { RuleInput } from '../../../../src/engine/types';
import type { OverlaySnapshot } from '../../../../src/overlay/types';

export type AssessAllFn = (input: RuleInput, overlay: OverlaySnapshot) => CombinedResult;

export interface RunAssessmentDeps {
  loadAssessAll(): Promise<AssessAllFn>;
  loadOverlaySnapshotForSample(property: unknown): Promise<OverlaySnapshot | null>;
}

export interface NormalisedCheck {
  id: string;
  ok: boolean;
  message: string;
  clause: string | null;
  citation: string | null;
}

export interface RunAssessmentSuccess {
  ok: true;
  result: {
    checks: NormalisedCheck[];
    verdict: CombinedResult['verdict'] | undefined;
    overlay: OverlaySnapshot | null;
    overlays?: CombinedResult['details']['overlays'];
  };
}

export interface RunAssessmentFailure {
  ok: false;
  message: string;
}

export type RunAssessmentResult = RunAssessmentSuccess | RunAssessmentFailure;

const defaultDeps: RunAssessmentDeps = {
  async loadAssessAll() {
    const engineMod = await import('../../../../src/engine/assessAll');
    const assessAll = engineMod.assessAll as AssessAllFn | undefined;
    if (typeof assessAll !== 'function') {
      throw new Error('Rules engine not found (src/engine/assessAll).');
    }
    return assessAll;
  },
  async loadOverlaySnapshotForSample(property: unknown) {
    try {
      const overlayMod = await import('../../../../src/overlay/adapter');
      const fn = overlayMod.getOverlaySnapshotForSample as
        | ((sample: unknown) => OverlaySnapshot | Promise<OverlaySnapshot>)
        | undefined;
      if (typeof fn === 'function') {
        return await fn(property);
      }
    } catch {}
    return null;
  },
};

const toRuleInput = (proposal: Record<string, unknown>): RuleInput => ({
  type: (proposal.kind ?? proposal.type ?? 'shed') as RuleInput['type'],
  length: Number(proposal.length_m) || 0,
  width: Number(proposal.width_m) || 0,
  height: Number(proposal.height_m) || 0,
  setback: Number(proposal.nearest_boundary_m) || 0,
});

const fallbackOverlay = (property: Partial<OverlaySnapshot> & Record<string, unknown>): OverlaySnapshot => ({
  zone: (property?.zone ?? 'UNKNOWN') as OverlaySnapshot['zone'],
  floodControlLot: Boolean(property?.floodControlLot) || false,
  bal: (property?.bal ?? 'BAL-12.5') as OverlaySnapshot['bal'],
  floodCategory: (property?.floodCategory ?? 'UNKNOWN') as OverlaySnapshot['floodCategory'],
});

const resolveOverlay = async (
  property: Partial<OverlaySnapshot> & Record<string, unknown>,
  deps: RunAssessmentDeps,
): Promise<OverlaySnapshot> => {
  const snapshot = await deps.loadOverlaySnapshotForSample(property);
  return snapshot ?? fallbackOverlay(property);
};

const normaliseChecks = (
  engineOutput: CombinedResult,
  overlayDetails: CombinedResult['details']['overlays'] | undefined,
): NormalisedCheck[] => {
  const output = engineOutput as any;
  const rawChecks = Array.isArray(output?.details?.structure?.checks)
    ? output.details.structure.checks
    : output.checks;
  let checks: NormalisedCheck[] = [];

  if (Array.isArray(rawChecks) && rawChecks.length) {
    checks = rawChecks.map((c, index) => ({
      id: c.id || `rule_${index + 1}`,
      ok: !!c.ok,
      message: c.message || 'Check',
      clause: c.clause || null,
      citation: c.citation || null,
    }));
  } else if (Array.isArray(engineOutput.reasons)) {
    checks = engineOutput.reasons.map((reason, index) => ({
      id: `rule_${index + 1}`,
      ok: /\bsatisfied\b/i.test(reason),
      message: reason,
      clause: null,
      citation: null,
    }));
  } else {
    const maybeArray = engineOutput as unknown;
    if (Array.isArray(maybeArray)) {
      checks = maybeArray.map((item: any, index) => {
        if (typeof item === 'string') {
          return {
            id: `rule_${index + 1}`,
            ok: /\bsatisfied\b/i.test(item),
            message: item,
            clause: null,
            citation: null,
          };
        }
        if (typeof item === 'boolean') {
          return {
            id: `rule_${index + 1}`,
            ok: item,
            message: item ? 'Pass' : 'Fail',
            clause: null,
            citation: null,
          };
        }
        return {
          id: item.id || `rule_${index + 1}`,
          ok: !!(item.ok ?? item.pass ?? item.valid),
          message: item.message || item.title || 'Check',
          clause: item.clause || null,
          citation: item.citation || null,
        };
      });
    }
  }

  const overlayReasons = overlayDetails?.reasons ?? [];
  if (overlayReasons.length) {
    overlayReasons.forEach((reason, index) => {
      checks.push({
        id: `overlay_${index + 1}`,
        ok: false,
        message: reason,
        clause: 'SEPP Exempt Development 2008 Part 2 general exclusions',
        citation: 'Overlay gating (zone, flood, bushfire)',
      });
    });
  }

  return checks;
};

export async function runAssessment(
  property: Partial<OverlaySnapshot> & Record<string, unknown>,
  proposal: Record<string, unknown>,
  deps: RunAssessmentDeps = defaultDeps,
): Promise<RunAssessmentResult> {
  try {
    const assessAll = await deps.loadAssessAll();
    const input = toRuleInput(proposal);
    const overlay = await resolveOverlay(property, deps);
    const engineOutput = await assessAll(input, overlay);
    const overlayDetails = engineOutput.details.overlays;
    const checks = normaliseChecks(engineOutput, overlayDetails);
    const overlaySnapshot = overlayDetails?.snapshot ?? overlay ?? null;

    return {
      ok: true,
      result: {
        checks,
        verdict: engineOutput.verdict,
        overlay: overlaySnapshot,
        overlays: overlayDetails,
      },
    };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || String(e) };
  }
}

export const __test__ = { defaultDeps };
