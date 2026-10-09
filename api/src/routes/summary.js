import { Router } from 'express';
import { applyFilters, parseCodes, parseMonth, parsePositiveInt, rejectUnknown } from '../filters.js';

// The filters this route accepts. Anything else is rejected, so users can never choose
// arbitrary columns or SQL.
const SUMMARY_FILTERS = {
  org: { column: 's.org_code', parse: parseCodes, op: 'in' },
  category: { column: 's.category_code', parse: parseCodes, op: 'in' },
  from: { column: 's.period', parse: parseMonth, op: '>=' },
  to: { column: 's.period', parse: parseMonth, op: '<=' },
};
const PAGING = ['page', 'page_size'];
const MAX_PAGE_SIZE = 500;
const DEFAULT_PAGE_SIZE = 100;

export function summaryRouter(db) {
  const router = Router();

  // GET /api/summary?org=A01,A02&category=ALL&from=2025-08&to=2026-07&page=1&page_size=100
  // Figures per month, organisation and category, newest month first.
  router.get('/', async (req, res) => {
    const { page: pageParam, page_size: sizeParam, ...filters } = req.query;
    rejectUnknown(req.query, [...Object.keys(SUMMARY_FILTERS), ...PAGING]);
    const page = pageParam === undefined ? 1 : parsePositiveInt('page', pageParam, 100_000);
    const pageSize = sizeParam === undefined ? DEFAULT_PAGE_SIZE : parsePositiveInt('page_size', sizeParam, MAX_PAGE_SIZE);

    const base = applyFilters(db('monthly_summary as s'), filters, SUMMARY_FILTERS);

    const [{ total }] = await base.clone().count({ total: '*' });
    const rows = await base
      .clone()
      .join('organisations as o', 'o.org_code', 's.org_code')
      .join('categories as c', 'c.category_code', 's.category_code')
      .select(
        's.period',
        's.org_code',
        'o.org_name',
        's.category_code',
        'c.category_name',
        's.total',
        's.within_target',
        's.pct_within_target',
        's.band_1',
        's.band_2',
        's.band_3',
      )
      .orderBy([{ column: 's.period', order: 'desc' }, { column: 's.org_code' }, { column: 's.category_code' }])
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    res.json({ data: rows, total, page, page_size: pageSize });
  });

  return router;
}
