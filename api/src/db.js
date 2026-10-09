import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import knex from 'knex';

// The SQLite file built by scripts/seed.js (swap in your app's own data or database).
const DEFAULT_DB_PATH = fileURLToPath(new URL('../../data/app.sqlite', import.meta.url));

// The API only ever reads, so open the database read-only.
export function createDb(filename = process.env.DB_PATH ?? DEFAULT_DB_PATH) {
  if (!existsSync(filename)) {
    throw new Error(`Database not found at ${filename} - run "npm run seed" first`);
  }
  return knex({
    client: 'better-sqlite3',
    connection: { filename, options: { readonly: true } },
    useNullAsDefault: true,
  });
}
