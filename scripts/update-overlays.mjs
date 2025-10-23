import fs from 'fs';
import path from 'path';
import { point, booleanIntersects, pointToLineDistance, lineString } from '@turf/turf';

const root = path.resolve('');
const dataRoot = path.join(root, 'Overlays datasets');
const file = (name) => path.join(dataRoot, name);

const zoningPath = file('Land zoning GeoJson.geojson');
const bushfirePath = file('Bushfire_prone_areas_-741885003515637296.geojson');
const floodDir = file('Flooding_geojson');
const floodFiles = {
  floodway: path.join(floodDir, 'floodway_designlevee.geojson'),
  floodStorage: path.join(floodDir, 'flood_storage_designlevee.geojson'),
  floodFringe: path.join(floodDir, 'flood_fringe_designlevee.geojson'),
  floodExtent: path.join(floodDir, 'fpa_1pc_plus50cm_designlevee.geojson'),
};
const heritagePath = file('Heritage Areas dataset.geojson');
const hydroLinePath = file('HydroLine_SPHERICAL_MERCATOR.json');
const lgaPath = file('LocalGovernmentArea_SPHERICAL_MERCATOR.json');
const propertiesPath = path.join(root, 'sample-data', 'properties.json');

function readGeoJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function getRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates;
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat();
  }
  return [];
}

function pointInRing(point, ring) {
  // ring: [ [lng, lat], ... ]
  const [lng, lat] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, geometry) {
  const rings = getRings(geometry);
  if (!rings.length) return false;
  const [outer, ...holes] = rings;
  if (!pointInRing(point, outer)) return false;
  for (const hole of holes) {
    if (pointInRing(point, hole)) return false;
  }
  return true;
}

function findFeature(point, featureCollection, selector = () => true) {
  if (!featureCollection?.features) return null;
  return featureCollection.features.find((feature) => {
    if (!selector(feature)) return false;
    return pointInPolygon(point, feature.geometry);
  }) || null;
}

const zoning = readGeoJSON(zoningPath);
const bushfire = readGeoJSON(bushfirePath);
const floodway = readGeoJSON(floodFiles.floodway);
const floodStorage = readGeoJSON(floodFiles.floodStorage);
const floodFringe = readGeoJSON(floodFiles.floodFringe);
const floodExtent = readGeoJSON(floodFiles.floodExtent);
const heritage = readGeoJSON(heritagePath);

function unwrapCollection(raw, key) {
  if (!raw) return null;
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) return raw;
  if (key && raw[key]) return unwrapCollection(raw[key]);
  const maybeKey = Object.keys(raw).find((k) => raw[k]?.type === 'FeatureCollection');
  if (maybeKey) return unwrapCollection(raw[maybeKey]);
  return null;
}

const hydroCollection = unwrapCollection(readGeoJSON(hydroLinePath));
const lgaCollection = unwrapCollection(readGeoJSON(lgaPath));

const alburyLga = lgaCollection?.features?.find((feature) => {
  const name = String(feature.properties?.lganame || feature.properties?.LGANAME || feature.properties?.name || '').toUpperCase();
  return name.includes('ALBURY');
});

function buildForeshoreSegments() {
  if (!hydroCollection?.features?.length || !alburyLga) return null;
  const relevant = hydroCollection.features.filter((feature) => booleanIntersects(feature, alburyLga));
  const coords = [];
  for (const feature of relevant) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === 'LineString') coords.push(geom.coordinates);
    else if (geom.type === 'MultiLineString') coords.push(...geom.coordinates);
  }
  if (!coords.length) return null;
  return coords;
}

const foreshoreSegments = buildForeshoreSegments();

const properties = JSON.parse(fs.readFileSync(propertiesPath, 'utf8'));

const updated = properties.properties.map((property) => {
  const coords = [property.longitude, property.latitude];

  const zoneFeature = findFeature(coords, zoning, (feature) => feature.properties?.LABEL);
  const rawZoneLabel = zoneFeature?.properties?.LABEL;
  const zoneCode = rawZoneLabel ? String(rawZoneLabel).split(' ')[0] : (property.zone ?? 'UNKNOWN');
  const zoneFriendly = zoneFeature?.properties?.LAY_CLASS ?? rawZoneLabel ?? null;

  const inBushfire = !!findFeature(coords, bushfire);
  const balRating = inBushfire ? 'BAL-29' : 'BAL-LOW';

  let floodCategory = 'NONE';
  let floodControlLot = false;

  if (findFeature(coords, floodway)) {
    floodCategory = 'FLOODWAY';
    floodControlLot = true;
  } else if (findFeature(coords, floodStorage)) {
    floodCategory = 'STORAGE';
    floodControlLot = true;
  } else if (findFeature(coords, floodFringe) || findFeature(coords, floodExtent)) {
    floodCategory = 'FLOOD_CONTROL';
    floodControlLot = true;
  }

  const heritageFeature = findFeature(coords, heritage);
  const inHeritage = Boolean(heritageFeature);

  let withinForeshore = false;
  if (foreshoreSegments) {
    try {
      const pt = point(coords);
      let minDistance = Infinity;
      for (const segment of foreshoreSegments) {
        const dist = pointToLineDistance(pt, lineString(segment), { units: 'meters' });
        if (dist < minDistance) minDistance = dist;
        if (minDistance <= 40) break;
      }
      const dist = minDistance;
      withinForeshore = Number.isFinite(dist) && dist <= 40;
    } catch (err) {
      console.warn('Failed foreshore distance calc for', property.id, err);
    }
  }

  return {
    ...property,
    zone: zoneCode,
    zone_label: zoneFriendly || property.zone_label || null,
    overlay_source: 'albury-open-data-2025-09',
    bal: balRating,
    floodCategory,
    floodControlLot,
    foreshore_proximity: withinForeshore,
    prechecks: {
      ...property.prechecks,
      heritage_item: inHeritage,
      heritage_conservation_area: inHeritage || property.prechecks?.heritage_conservation_area || false,
    },
  };
});

fs.writeFileSync(propertiesPath, JSON.stringify({ properties: updated }, null, 2));

console.log(`Updated ${updated.length} properties with overlay snapshots.`);
