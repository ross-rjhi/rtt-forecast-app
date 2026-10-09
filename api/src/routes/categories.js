import { Router } from 'express';
import { parseCodes, rejectUnknown } from '../filters.js';

export function categoriesRouter(db) {
  const router = Router();

  // GET /api/categories?org=A01
  // Categories for a picker: ALL (all categories) first, then A-Z. With `org`, only those
  // where that organisation has data.
  router.get('/', async (req, res) => {
    rejectUnknown(req.query, ['org']);
    if (Array.isArray(req.query.org)) {
      return res.status(400).json({ error: 'org was given more than once' });
    }

    const query = db('categories as c')
      .select('c.category_code', 'c.category_name')
      .orderByRaw(`c.category_code = 'ALL' DESC, c.category_name`);

    if (req.query.org !== undefined) {
      const orgs = parseCodes('org', req.query.org);
      query.whereIn('c.category_code', db('monthly_summary').distinct('category_code').whereIn('org_code', orgs));
    }

    const rows = await query;
    res.json({ data: rows, total: rows.length });
  });

  return router;
}
