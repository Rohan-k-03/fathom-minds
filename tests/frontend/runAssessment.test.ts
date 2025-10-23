import { describe, it, expect, vi } from 'vitest';
import type { OverlaySnapshot } from '../../src/overlay/types';
import { runAssessment } from '../../apps/sepp-ui-prototype/src/data/runAssessment';

const baseProperty = {
  zone: 'R1',
  bal: 'BAL-12.5',
  floodControlLot: false,
  floodCategory: 'NONE',
} satisfies OverlaySnapshot;

const baseProposal = {
  kind: 'shed',
  length_m: 3,
  width_m: 3,
  height_m: 2.4,
  nearest_boundary_m: 1,
};

describe('runAssessment (frontend data layer)', () => {
  it('maps input and normalises result from engine', async () => {
    const assessAllMock = vi.fn().mockResolvedValue({
      verdict: 'LIKELY EXEMPT',
      checks: [
        {
          id: 'rule_1',
          ok: true,
          message: 'ok',
          clause: 'clause',
          citation: 'citation',
        },
      ],
      details: {
        overlays: {
          ok: true,
          reasons: [],
          snapshot: { zone: 'R1', bal: 'BAL-LOW', floodControlLot: false },
        },
      },
    });

    const deps = {
      loadAssessAll: async () => assessAllMock,
      loadOverlaySnapshotForSample: async () => ({
        zone: 'R1',
        bal: 'BAL-LOW',
        floodControlLot: false,
        floodCategory: 'NONE',
      } satisfies OverlaySnapshot),
    };

    const result = await runAssessment(baseProperty, baseProposal, deps);

    expect(assessAllMock).toHaveBeenCalledWith(
      expect.objectContaining({ length: 3, width: 3, height: 2.4, setback: 1 }),
      expect.objectContaining({ zone: 'R1', bal: 'BAL-LOW' })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success result');
    expect(result.result.verdict).toBe('LIKELY EXEMPT');
    expect(result.result.checks[0]?.clause).toBe('clause');
  });

  it('falls back to property overlay when adapter unavailable', async () => {
    const assessAllMock = vi.fn().mockResolvedValue({
      verdict: 'NOT EXEMPT',
      reasons: ['reason'],
      details: { overlays: { reasons: ['overlay fail'] } },
    });

    const deps = {
      loadAssessAll: async () => assessAllMock,
      loadOverlaySnapshotForSample: async () => null,
    };

    const result = await runAssessment(baseProperty, baseProposal, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('Expected success result');
    expect(assessAllMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ zone: baseProperty.zone, bal: baseProperty.bal })
    );
    expect(result.result.overlay?.zone).toBe(baseProperty.zone);
  });

  it('returns error message when engine cannot be loaded', async () => {
    const deps = {
      loadAssessAll: async () => {
        throw new Error('engine missing');
      },
      loadOverlaySnapshotForSample: async () => null,
    };

    const result = await runAssessment(baseProperty, baseProposal, deps);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure result');
    expect(result.message).toBe('engine missing');
  });
});
