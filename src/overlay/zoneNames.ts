export const ZONE_CODE_TO_LABEL: Record<string, string> = {
  R1: 'General Residential',
  R2: 'Low Density Residential',
  R3: 'Medium Density Residential',
  R5: 'Large Lot Residential',
  B1: 'Neighbourhood Centre',
  B2: 'Local Centre',
  B4: 'Mixed Use',
  RE1: 'Public Recreation',
  RE2: 'Private Recreation',
  SP2: 'Infrastructure',
  E2: 'Environmental Conservation',
  E3: 'Environmental Management',
  E4: 'Environmental Living',

  UNKNOWN: 'Unknown zone',
};
export function getZoneFriendlyName(code?: string): string {
  const k = String(code ?? '').trim().toUpperCase();
  if (!k) return 'Unknown zone';

  const label = ZONE_CODE_TO_LABEL[k];
  return label ? label : 'Unknown zone';
}
