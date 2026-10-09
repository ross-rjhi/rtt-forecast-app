// Turns query-string parameters into validated filters. Only parameters listed in an
// allow-list are accepted, so users can never choose arbitrary columns or SQL.

export class ValidationError extends Error {
  status = 400;
}

const CODE_RE = /^[A-Z0-9_]{1,12}$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

// "RR8,RYJ" -> ['RR8', 'RYJ']
export function parseCodes(name, value) {
  const codes = String(value).split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (codes.length === 0 || codes.length > 50 || !codes.every((c) => CODE_RE.test(c))) {
    throw new ValidationError(`${name} must be a comma-separated list of up to 50 codes`);
  }
  return codes;
}

// "2026-07" -> "2026-07-01" (periods are stored as the first day of the month)
export function parseMonth(name, value) {
  if (!MONTH_RE.test(value)) {
    throw new ValidationError(`${name} must be a month in the form YYYY-MM`);
  }
  return `${value}-01`;
}

// Free-text search, e.g. "leeds"
export function parseSearch(name, value) {
  const text = String(value).trim();
  if (text.length < 1 || text.length > 100) {
    throw new ValidationError(`${name} must be 1 to 100 characters`);
  }
  return text;
}

export function parsePositiveInt(name, value, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new ValidationError(`${name} must be a whole number from 1 to ${max}`);
  }
  return n;
}

// Applies the allowed filters in `spec` to a Knex query. `spec` maps each query
// parameter to { column, parse, op } where op is 'in' (list), 'contains' (case-insensitive
// text search across `columns`) or a comparison.
export function applyFilters(query, params, spec) {
  for (const [name, value] of Object.entries(params)) {
    const filter = spec[name];
    if (Array.isArray(value)) {
      throw new ValidationError(`${name} was given more than once`);
    }
    const parsed = filter.parse(name, value);
    if (filter.op === 'in') {
      query.whereIn(filter.column, parsed);
    } else if (filter.op === 'contains') {
      // Escape LIKE wildcards so "100%" matches literally. SQLite's LIKE ignores case.
      const pattern = `%${parsed.replace(/[\\%_]/g, '\\$&')}%`;
      query.where((q) => {
        for (const column of filter.columns) q.orWhereRaw(`?? LIKE ? ESCAPE '\\'`, [column, pattern]);
      });
    } else {
      query.where(filter.column, filter.op, parsed);
    }
  }
  return query;
}

// Rejects any parameter that isn't in the allow-list, so typos fail loudly
// rather than silently returning unfiltered data.
export function rejectUnknown(params, allowed) {
  const unknown = Object.keys(params).filter((k) => !allowed.includes(k));
  if (unknown.length) {
    throw new ValidationError(`Unknown parameter(s): ${unknown.join(', ')}. Allowed: ${allowed.join(', ')}`);
  }
}
