export type StructureType = 'shed' | 'patio';

export interface RuleInput {
  type: StructureType;
  length: number;
  width: number;
  height: number;
  setback: number;
}

export type Verdict = 'LIKELY EXEMPT' | 'NOT EXEMPT';

export interface RuleCheck {
  id: string;
  ok: boolean;
  message: string;
  clause: string;
  citation?: string;
}

export interface RuleResult {
  verdict: Verdict;
  reasons: string[];
  checks: RuleCheck[];
}
