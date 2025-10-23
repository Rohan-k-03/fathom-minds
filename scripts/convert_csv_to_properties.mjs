#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_PATH = path.resolve(ROOT, 'Property_Boundaries.csv');
const JSON_PATH = path.resolve(ROOT, 'sample-data', 'properties.json');
const BACKUP_PATH = path.resolve(ROOT, 'sample-data', 'properties.backup.json');

function readFileSafe(p) {
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''); // strip BOM
}

function parseCSV(text) {
  // Simple CSV parser with quote support
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 1 && cols[0].trim() === '') continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] === undefined ? '' : cols[idx];
    });
    rows.push(obj);
  }
  return { headers, rows };
}

function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(v) {
  if (v === null || v === undefined) return NaN;
  const s = String(v).trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function areaToM2(value, units) {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  const u = String(units || '').toLowerCase();
  // normalize units: handle common encodings
  if (u.includes('h') && !u.includes('m')) return n * 10000; // ha, h²
  return n; // assume already m²
}

// Generate sequential IDs that always match ^[A-Z]+-[0-9]{3}$
// Strategy: use a base prefix (e.g., "ALB"), then extend with base-26 letters once 999 is exceeded.
// Example sequence: ALB-001 .. ALB-999, ALBA-001 .. ALBA-999, ALBB-001 .. ALBZ-999, ALBAA-001, ...
function makeSequentialIdAssigner(prefixBase = 'ALB') {
  let index = 0; // 0-based index across the full list
  function suffixFor(i) {
    // Compute a base-26 suffix string for block number (0 => '', 1 => 'A', 26 => 'Z', 27 => 'AA', ...)
    let n = i;
    if (n <= 0) return '';
    let s = '';
    while (n > 0) {
      n--; // 0-index within alphabet
      s = String.fromCharCode('A'.charCodeAt(0) + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }
  return {
    next() {
      const block = Math.floor(index / 999); // 0 for first 999, 1 for next 999, ...
      const within = (index % 999) + 1; // 1..999
      const id = `${prefixBase}${suffixFor(block)}-${String(within).padStart(3, '0')}`;
      index += 1;
      return id;
    },
    reset() { index = 0; },
  };
}

function normalizeLabel(row) {
  const s = (row.short_address || '').trim();
  if (s) return s;
  const parts = [row.address_number, row.street_name, row.street_suffix, row.suburb, 'NSW', row.post_code]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean);
  return parts.join(' ') || 'Untitled property';
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Base JSON not found at ${JSON_PATH}`);
    process.exit(1);
  }

  const csvText = readFileSafe(CSV_PATH);
  const parsed = parseCSV(csvText);
  if (!parsed.rows || parsed.rows.length === 0) {
    console.error('No rows parsed from CSV');
    process.exit(1);
  }

  const base = JSON.parse(readFileSafe(JSON_PATH));
  const baseProps = Array.isArray(base.properties) ? base.properties : [];

  const idAssign = makeSequentialIdAssigner('ALB');

  const defaults = {
    zone: 'R1 General Residential',
    frontage_m: 15,
    corner_lot: false,
    setbacks_m: { front: 6, left: 1, right: 1, rear: 4 },
  };

  const newProps = parsed.rows.map((row) => {
    const label = normalizeLabel(row);
    const lot_m2 = areaToM2(row.area_total, row.area_units);
    if (!(lot_m2 > 0)) return null; // skip invalid/empty area rows to satisfy schema
    return {
      id: '', // placeholder; assigned after merge so IDs are contiguous
      label,
      zone: defaults.zone,
      lot_size_m2: lot_m2,
      frontage_m: defaults.frontage_m,
      corner_lot: defaults.corner_lot,
      setbacks_m: { ...defaults.setbacks_m },
      // Provide overlay defaults to satisfy overlay gates in the rules engine
      bal: 'BAL-12.5',
      floodCategory: 'NONE',
      floodControlLot: false,
      notes: (row.title ? String(row.title).trim() : undefined),
    };
  }).filter(Boolean);

  // Merge, dedupe by id just in case
  const merged = [...baseProps, ...newProps];
  const byId = new Map();
  for (const p of merged) {
    if (p && p.id) byId.set(p.id, p);
  }
  let finalList = Array.from(byId.values());

  // Ensure required overlay fields exist on all records (defaults if missing)
  finalList = finalList.map((p) => ({
    ...p,
    lot_size_m2: (Number(p.lot_size_m2) > 0) ? Number(p.lot_size_m2) : 1,
    frontage_m: (Number(p.frontage_m) > 0) ? Number(p.frontage_m) : 1,
    setbacks_m: {
      front: Math.max(0, Number(p?.setbacks_m?.front ?? 0)),
      left: Math.max(0, Number(p?.setbacks_m?.left ?? 0)),
      right: Math.max(0, Number(p?.setbacks_m?.right ?? 0)),
      rear: Math.max(0, Number(p?.setbacks_m?.rear ?? 0)),
      ...(p?.corner_lot ? { secondary_front: Math.max(0, Number(p?.setbacks_m?.secondary_front ?? 0)) } : {}),
    },
    bal: p.bal ?? 'BAL-12.5',
    floodCategory: p.floodCategory ?? 'NONE',
    floodControlLot: p.floodControlLot ?? false,
  }));

  // Reassign IDs sequentially to guarantee schema pattern ^[A-Z]+-[0-9]{3}$ and avoid >999 digit overflows
  idAssign.reset();
  finalList = finalList.map((p) => ({ ...p, id: idAssign.next() }));

  // Backup original
  try {
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(JSON_PATH, BACKUP_PATH);
    }
  } catch {}

  const out = { properties: finalList };
  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2));

  console.log(`Converted ${newProps.length} rows from CSV.`);
  console.log(`Total properties now: ${finalList.length}.`);
  console.log(`Backup saved to: ${BACKUP_PATH}`);
}

main();
