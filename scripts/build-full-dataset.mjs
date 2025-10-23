#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH = resolve('sample-data', 'properties (2).json');
const OUTPUT_PATH = resolve('sample-data', 'properties-full.json');

const MAX_PROPERTIES = 4000;

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toBool(value) {
  return value === true;
}

function toStringOrUndefined(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function normaliseProperty(entry) {
  const zoneRaw = typeof entry.zone === 'string' && entry.zone.trim().length
    ? entry.zone.trim()
    : 'UNKNOWN';
  const zoneParts = zoneRaw.split(/\s+/);
  const zone = zoneParts[0] || 'UNKNOWN';
  const zoneLabel = zoneParts.length > 1 ? zoneParts.slice(1).join(' ') : undefined;

  const setbacksRaw = entry.setbacks_m && typeof entry.setbacks_m === 'object'
    ? entry.setbacks_m
    : {};

  const cornerLot = toBool(entry.corner_lot);
  const setbacks = {
    front: toNumber(setbacksRaw.front),
    left: toNumber(setbacksRaw.left),
    right: toNumber(setbacksRaw.right),
    rear: toNumber(setbacksRaw.rear),
  };

  if (cornerLot) {
    setbacks.secondary_front = toNumber(
      setbacksRaw.secondary_front !== undefined ? setbacksRaw.secondary_front : setbacksRaw.front
    );
  }

  const prechecksRaw = entry.prechecks && typeof entry.prechecks === 'object' ? entry.prechecks : {};
  const prechecks = {
    heritage_item: toBool(prechecksRaw.heritage_item),
    heritage_conservation_area: toBool(prechecksRaw.heritage_conservation_area),
    environmentally_sensitive: toBool(prechecksRaw.environmentally_sensitive),
    critical_habitat: toBool(prechecksRaw.critical_habitat),
    asbestos_management_area: toBool(prechecksRaw.asbestos_management_area),
  };

  const servicesRaw = entry.services && typeof entry.services === 'object' ? entry.services : {};
  const services = {
    near_easement: toBool(servicesRaw.near_easement),
    above_sewer_main: toBool(servicesRaw.above_sewer_main),
    distance_to_dwelling_m: toNumber(servicesRaw.distance_to_dwelling_m),
  };

  const property = {
    id: String(entry.id ?? '').trim(),
    label: String(entry.label ?? '').trim() || 'Unnamed property',
    zone,
    lot_size_m2: toNumber(entry.lot_size_m2),
    frontage_m: toNumber(entry.frontage_m),
    corner_lot: cornerLot,
    setbacks_m: setbacks,
    bal: typeof entry.bal === 'string' && entry.bal.trim().length ? entry.bal.trim() : 'BAL-LOW',
    floodCategory:
      typeof entry.floodCategory === 'string' && entry.floodCategory.trim().length
        ? entry.floodCategory.trim()
        : 'UNKNOWN',
    floodControlLot: toBool(entry.floodControlLot),
    prechecks,
    services,
    overlay_source:
      typeof entry.overlay_source === 'string' && entry.overlay_source.trim().length
        ? entry.overlay_source.trim()
        : 'pending-portal',
    notes:
      typeof entry.notes === 'string' && entry.notes.trim().length
        ? entry.notes.trim()
        : 'Portal export',
    foreshore_proximity: toBool(entry.foreshore_proximity),
  };

  const parcelId = toStringOrUndefined(entry.parcel_id);
  if (parcelId) property.parcel_id = parcelId;

  const address = toStringOrUndefined(entry.address);
  if (address) property.address = address;

  const locality = toStringOrUndefined(entry.locality);
  if (locality) property.locality = locality;

  const latitude =
    typeof entry.latitude === 'number' && Number.isFinite(entry.latitude)
      ? entry.latitude
      : undefined;
  const longitude =
    typeof entry.longitude === 'number' && Number.isFinite(entry.longitude)
      ? entry.longitude
      : undefined;
  if (latitude !== undefined) property.latitude = latitude;
  if (longitude !== undefined) property.longitude = longitude;

  if (zoneLabel) property.zone_label = zoneLabel;

  return property;
}

try {
  const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf8'));
  if (!source || !Array.isArray(source.properties)) {
    throw new Error('Source file is missing the expected { properties: [...] } shape.');
  }

  const slice = source.properties.slice(0, MAX_PROPERTIES);
  const normalised = slice.map(normaliseProperty).filter((item) => {
    return (
      typeof item.id === 'string' &&
      /^[A-Z]+-[0-9]{3}$/.test(item.id) &&
      typeof item.label === 'string' &&
      item.label.length >= 3
    );
  });

  if (!normalised.length) {
    throw new Error('Normalisation produced an empty dataset.');
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify({ properties: normalised }, null, 2));
  console.log(`Wrote ${normalised.length} properties to ${OUTPUT_PATH}`);
} catch (error) {
  console.error('Failed to build full dataset:', error);
  process.exit(1);
}
