// Builds data/app.sqlite: a small, made-up example dataset so the template runs straight away.
// Replace this with your app's real import (in Node, or a Python ETL) when you start a new app.
//
//   npm run seed          (from the repo root, or from api/)
//
// The data: 12 organisations in 3 parent groups, 4 categories plus an "All categories" total,
// and 24 months. Each row has a total, the number within target, and three ordered bands.
// It's generated from a fixed seed, so every run gives the same numbers.

import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH ?? fileURLToPath(new URL('../../data/app.sqlite', import.meta.url));

const PARENTS = [
  ['P01', 'North Partnership'],
  ['P02', 'Central Partnership'],
  ['P03', 'South Partnership'],
];
const ORGANISATIONS = [
  ['A01', 'Ashdown Health Services', 'P01'],
  ['A02', 'Brookfield Care Group', 'P01'],
  ['A03', 'Carrow Valley Health', 'P01'],
  ['A04', 'Dunmore Community Care', 'P01'],
  ['A05', 'Elmstead Health Partners', 'P02'],
  ['A06', 'Fairhaven Care Services', 'P02'],
  ['A07', 'Greystone Health', 'P02'],
  ['A08', 'Hollins Bay Care', 'P02'],
  ['A09', 'Ivybridge Health Group', 'P03'],
  ['A10', 'Juniper Vale Care', 'P03'],
  ['A11', 'Kestrel Point Health', 'P03'],
  ['A12', 'Larkspur Community Health', 'P03'],
];
const CATEGORIES = [
  ['ALL', 'All categories'],
  ['MED', 'Medicine'],
  ['SUR', 'Surgery'],
  ['DIA', 'Diagnostics'],
  ['COM', 'Community'],
];
const MONTHS = 24;
const LAST_PERIOD = { year: 2026, month: 7 }; // Jul 2026

// A small seeded random number generator (mulberry32), so the data is the same every run.
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// "2024-08-01" ... "2026-07-01", oldest first
function periods() {
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(LAST_PERIOD.year, LAST_PERIOD.month - 1 - (MONTHS - 1 - i), 1));
    return d.toISOString().slice(0, 10);
  });
}

export function seed(path = DB_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  rmSync(path, { force: true });
  const db = new Database(path);
  db.exec(`
    CREATE TABLE organisations (org_code TEXT PRIMARY KEY, org_name TEXT, parent_code TEXT, parent_name TEXT);
    CREATE TABLE categories (category_code TEXT PRIMARY KEY, category_name TEXT);
    CREATE TABLE monthly_summary (
      period TEXT, org_code TEXT, category_code TEXT,
      total INTEGER, within_target INTEGER, pct_within_target REAL,
      band_1 INTEGER, band_2 INTEGER, band_3 INTEGER,
      PRIMARY KEY (period, org_code, category_code));
  `);

  const parentName = Object.fromEntries(PARENTS);
  const insertOrg = db.prepare('INSERT INTO organisations VALUES (?, ?, ?, ?)');
  const insertCategory = db.prepare('INSERT INTO categories VALUES (?, ?)');
  const insertRow = db.prepare('INSERT INTO monthly_summary VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const rand = random(20260701);
  const write = db.transaction(() => {
    for (const [code, name, parent] of ORGANISATIONS) insertOrg.run(code, name, parent, parentName[parent]);
    for (const [code, name] of CATEGORIES) insertCategory.run(code, name);

    for (const [org] of ORGANISATIONS) {
      // Each organisation and category gets its own size, starting level and trend.
      const series = CATEGORIES.slice(1).map(() => ({
        size: 400 + rand() * 2600,
        share: 0.55 + rand() * 0.3, // starting share within target
        trend: (rand() - 0.45) * 0.006, // change in share per month
        growth: (rand() - 0.4) * 0.01,
      }));
      periods().forEach((period, m) => {
        const sum = { total: 0, band_1: 0, band_2: 0, band_3: 0 };
        CATEGORIES.slice(1).forEach(([category], c) => {
          const s = series[c];
          const total = Math.round(s.size * (1 + s.growth) ** m * (0.97 + rand() * 0.06));
          const share = Math.min(0.97, Math.max(0.3, s.share + s.trend * m + (rand() - 0.5) * 0.03));
          const band_1 = Math.round(total * share);
          const band_3 = Math.round((total - band_1) * (0.08 + rand() * 0.12));
          const band_2 = total - band_1 - band_3;
          insertRow.run(period, org, category, total, band_1, band_1 / total, band_1, band_2, band_3);
          sum.total += total;
          sum.band_1 += band_1;
          sum.band_2 += band_2;
          sum.band_3 += band_3;
        });
        insertRow.run(period, org, 'ALL', sum.total, sum.band_1, sum.band_1 / sum.total, sum.band_1, sum.band_2, sum.band_3);
      });
    }
  });
  write();
  db.close();
  return path;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = seed();
  console.log(`Example data written to ${path}`);
}
