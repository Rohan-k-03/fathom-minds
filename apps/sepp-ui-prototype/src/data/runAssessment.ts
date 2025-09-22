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
    } catch {
      // adapter is optional; we fall back below
    }
    return null;
  },
};

/** Normalise engine output into { ok, result: { checks[] , verdict } } */
export async function runAssessment(
  property: Partial<OverlaySnapshot> & Record<string, unknown>,
  proposal: Record<string, unknown>,
  deps: RunAssessmentDeps = defaultDeps,
): Promise<RunAssessmentResult> {
  try {
    const assessAll = await deps.loadAssessAll();

    // Map proposal into the engine's RuleInput shape
    const input: RuleInput = {
      type: (proposal.kind ?? proposal.type ?? 'shed') as RuleInput['type'],
      length: Number(proposal.length_m) || 0,
      width: Number(proposal.width_m) || 0,
      height: Number(proposal.height_m) || 0,
      setback: Number(proposal.nearest_boundary_m) || 0,
    };

    let overlay = await deps.loadOverlaySnapshotForSample(property);

    // Safe fallback so the prototype keeps working until the adapter/rules land
    if (!overlay) {
      overlay = {
        zone: (property?.zone ?? 'UNKNOWN') as OverlaySnapshot['zone'],
        floodControlLot: Boolean(property?.floodControlLot) || false,
        bal: (property?.bal ?? 'BAL-12.5') as OverlaySnapshot['bal'],
        floodCategory: (property?.floodCategory ?? 'UNKNOWN') as OverlaySnapshot['floodCategory'],
      };
    }

    const engineOutput = await assessAll(input, overlay);
    const overlayDetails = engineOutput?.details?.overlays ?? null;
    const overlaySnapshot = overlayDetails?.snapshot ?? overlay ?? null;

    // -------- Normalise checks for the UI --------
    let checks: NormalisedCheck[] = [];

    const structureChecks = engineOutput?.details?.structure?.checks ?? engineOutput?.checks;
    if (Array.isArray(structureChecks) && structureChecks.length) {
      checks = structureChecks.map((c, i) => ({
        id: c.id || `rule_${i + 1}`,
        ok: !!c.ok,
        message: c.message || 'Check',
        clause: c.clause || null,
        citation: c.citation || null,
      }));
    } else if (Array.isArray(engineOutput?.reasons)) {
      checks = engineOutput.reasons.map((r, i) => ({
        id: `rule_${i + 1}`,
        ok: /\bsatisfied\b/i.test(r),
        message: r,
        clause: null,
        citation: null,
      }));
    } else if (Array.isArray(engineOutput)) {
      checks = engineOutput.map((c, i) =>
        typeof c === 'string'
          ? { id: `rule_${i + 1}`, ok: /\bsatisfied\b/i.test(c), message: c, clause: null, citation: null }
          : typeof c === 'boolean'
          ? { id: `rule_${i + 1}`, ok: c, message: c ? 'Pass' : 'Fail', clause: null, citation: null }
          : {
              id: c.id || `rule_${i + 1}`,
              ok: !!(c.ok ?? c.pass ?? c.valid),
              message: c.message || c.title || 'Check',
              clause: c.clause || null,
              citation: c.citation || null,
            }
      );
    }

    if (overlayDetails && Array.isArray(overlayDetails.reasons) && overlayDetails.reasons.length) {
      overlayDetails.reasons.forEach((reason, idx) => {
        checks.push({
          id: `overlay_${idx + 1}`,
          ok: false,
          message: reason,
          clause: 'SEPP Exempt Development 2008 Part 2 general exclusions',
          citation: 'Overlay gating (zone, flood, bushfire)',
        });
      });
    }

    return {
      ok: true,
      result: {
        checks,
        verdict: engineOutput?.verdict,
        overlay: overlaySnapshot,
        overlays: overlayDetails ?? undefined,
      },
    };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || String(e) };
  }
}

export const __test__ = { defaultDeps };
