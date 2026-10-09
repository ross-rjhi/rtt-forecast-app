import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before } from 'node:test';
import Database from 'better-sqlite3';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db.js';

// A tiny database with the same tables as data/app.sqlite: 3 organisations (2 in one parent
// group), 2 months, the all-categories total (ALL) plus one category (MED). SUR is listed as
// a category but has no data.
function buildFixture(path) {
  const sqlite = new Database(path);
  sqlite.exec(`
    CREATE TABLE organisations (org_code TEXT PRIMARY KEY, org_name TEXT, parent_code TEXT, parent_name TEXT);
    CREATE TABLE categories (category_code TEXT PRIMARY KEY, category_name TEXT);
    CREATE TABLE monthly_summary (
      period TEXT, org_code TEXT, category_code TEXT,
      total INTEGER, within_target INTEGER, pct_within_target REAL,
      band_1 INTEGER, band_2 INTEGER, band_3 INTEGER);
    INSERT INTO organisations VALUES
      ('A01', 'Alpha Health', 'P01', 'North Partnership'),
      ('A02', 'Beta Health', 'P01', 'North Partnership'),
      ('A03', 'Gamma 100%_Care', 'P02', 'South Partnership');
    INSERT INTO categories VALUES ('ALL', 'All categories'), ('MED', 'Medicine'), ('SUR', 'Surgery');
  `);
  const insert = sqlite.prepare('INSERT INTO monthly_summary VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const period of ['2026-06-01', '2026-07-01']) {
    for (const org of ['A01', 'A02']) {
      insert.run(period, org, 'ALL', 1000, 650, 0.65, 650, 300, 50);
      insert.run(period, org, 'MED', 200, 100, 0.5, 100, 80, 20);
    }
  }
  sqlite.close();
}

// Call inside a describe(): starts the API on a random port against a fresh fixture
// database and returns a get(path) helper.
export function useTestApi() {
  let dir, db, server, baseUrl;

  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'rjhi-api-test-'));
    buildFixture(join(dir, 'test.sqlite'));
    db = createDb(join(dir, 'test.sqlite'));
    server = createApp(db).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    server.close();
    await db.destroy();
    rmSync(dir, { recursive: true, force: true });
  });

  return async (path) => {
    const res = await fetch(`${baseUrl}${path}`);
    return { status: res.status, body: await res.json() };
  };
}
