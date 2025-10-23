import { loadPropertiesFromJson } from '../../../../src/lib/propertyLoader';
import curatedSamples from '../../../../sample-data/properties.json';

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

export type DatasetKey = 'curated' | 'full';

export interface LoadPropertiesOptions {
  dataset?: DatasetKey;
}

const curatedDataset = curatedSamples as unknown as Parameters<typeof loadPropertiesFromJson>[0];

async function loadDataset(dataset: DatasetKey): Promise<Parameters<typeof loadPropertiesFromJson>[0]> {
  if (dataset === 'full') {
    try {
      const module = await import('../../../../sample-data/properties-full.json');
      return module.default as Parameters<typeof loadPropertiesFromJson>[0];
    } catch (error) {
      throw new Error(`Full inventory unavailable. ${(error as Error).message}`);
    }
  }
  return curatedDataset;
}

export async function loadProperties(options: LoadPropertiesOptions = {}): Promise<LoadPropertiesResult> {
  const dataset = options.dataset ?? 'curated';
  try {
    const input = await loadDataset(dataset);
    const properties = loadPropertiesFromJson(input);
    return { ok: true, data: { properties } };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
