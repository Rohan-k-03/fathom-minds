import { loadPropertiesFromJson } from '../../../../src/lib/propertyLoader';
import samples from '../../../../sample-data/properties.json';

type PropertyRecord = ReturnType<typeof loadPropertiesFromJson>[number];

export interface LoadPropertiesSuccess {
  ok: true;
  data: { properties: PropertyRecord[] };
}

export interface LoadPropertiesFailure {
  ok: false;
  message: string;
}

export type LoadPropertiesResult = LoadPropertiesSuccess | LoadPropertiesFailure;

export async function loadProperties(): Promise<LoadPropertiesResult> {
  try {
    // Normalize against the shared loader so the UI gets the same shape as the backend
    const properties = loadPropertiesFromJson(samples as unknown as Parameters<typeof loadPropertiesFromJson>[0]);
    return { ok: true, data: { properties } };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

