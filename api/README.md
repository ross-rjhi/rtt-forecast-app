# API — Node + Express + Knex

A read-only JSON API over `data/app.sqlite`, a made-up example dataset built by
[`scripts/seed.js`](scripts/seed.js). Swap in your app's own data (or a database connection) when you
start a new app.

## Run

```powershell
cd api
npm install          # once
npm run seed         # once: builds ../data/app.sqlite
npm run dev          # http://localhost:3000, restarts when you save a file
npm test             # runs against a small test database, not the real one
```

Settings (optional environment variables): `PORT` (default 3000) and `DB_PATH` (default `../data/app.sqlite`).

## The pattern

Every route accepts only the query parameters in its allow-list (see `src/filters.js`). Unknown or invalid
parameters get a `400` with a plain message, so users can never choose arbitrary columns or SQL. Knex builds
the query from the validated filters, and list routes return `{ data, total }` (plus `page` and `page_size`
when paged).

## Endpoints

| Endpoint | Parameters | Returns |
|---|---|---|
| `GET /api/health` | | `{ "status": "ok" }` |
| `GET /api/organisations` | `q` (search name or code), `parent` (parent code(s)) | Organisations A–Z, for a picker |
| `GET /api/categories` | `org` (only categories that organisation has data for) | `ALL` first, then A–Z |
| `GET /api/summary` | `org`, `category`, `from`, `to` (YYYY-MM), `page`, `page_size` (≤ 500) | Monthly figures, newest first, paged |

Codes can be given as a comma-separated list (e.g. `org=A01,A02`) and are case-insensitive.
