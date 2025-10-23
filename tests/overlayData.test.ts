import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const samplesPath = path.join(__dirname, '..', 'sample-data', 'properties.json');
const properties = JSON.parse(readFileSync(samplesPath, 'utf8')).properties;

describe('overlay enrichment', () => {
  it('sets overlay source and zone code for every property', () => {
    properties.forEach((property: any) => {
      expect(property.overlay_source).toMatch(/albury-open-data/);
      expect(typeof property.zone).toBe('string');
      expect(property.zone.length).toBeGreaterThan(0);
    });
  });

  it('populates at least one flood-controlled and heritage property', () => {
    const hasFlood = properties.some((p: any) => p.floodCategory && p.floodCategory !== 'NONE');
    const hasHeritage = properties.some((p: any) => p.prechecks?.heritage_item);
    expect(hasFlood).toBe(true);
    expect(hasHeritage).toBe(true);
  });
});
