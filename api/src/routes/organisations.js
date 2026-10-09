import { Router } from 'express';
import { applyFilters, parseCodes, parseSearch, rejectUnknown } from '../filters.js';

const ORGANISATION_FILTERS = {
  q: { columns: ['org_name', 'org_code'], parse: parseSearch, op: 'contains' },
  parent: { column: 'parent_code', parse: parseCodes, op: 'in' },
};

export function organisationsRouter(db) {
  const router = Router();

  // GET /api/organisations?q=ash&parent=P01
  // Organisations for a picker, A-Z. A short list, so there's no paging.
  router.get('/', async (req, res) => {
    rejectUnknown(req.query, Object.keys(ORGANISATION_FILTERS));

    const rows = await applyFilters(db('organisations'), req.query, ORGANISATION_FILTERS)
      .select('org_code', 'org_name', 'parent_code', 'parent_name')
      .orderBy('org_name');

    res.json({ data: rows, total: rows.length });
  });

  return router;
}
