import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { useTestApi } from './fixture.js';

describe('GET /api/summary', () => {
  const api = useTestApi();
  const get = (query = '') => api(`/api/summary${query}`);

  test('returns all rows, newest month first, with names joined', async () => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.equal(body.total, 8);
    assert.equal(body.data.length, 8);
    assert.deepEqual(body.data[0], {
      period: '2026-07-01',
      org_code: 'A01',
      org_name: 'Alpha Health',
      category_code: 'ALL',
      category_name: 'All categories',
      total: 1000,
      within_target: 650,
      pct_within_target: 0.65,
      band_1: 650,
      band_2: 300,
      band_3: 50,
    });
  });

  test('filters by organisation list, category and month range', async () => {
    const { body } = await get('?org=a01,A02&category=ALL&from=2026-07&to=2026-07');
    assert.equal(body.total, 2);
    assert.deepEqual(body.data.map((r) => r.org_code), ['A01', 'A02']);
    assert.ok(body.data.every((r) => r.category_code === 'ALL' && r.period === '2026-07-01'));
  });

  test('paginates, with total counting all matching rows', async () => {
    const { body } = await get('?page=2&page_size=3');
    assert.equal(body.total, 8);
    assert.equal(body.page, 2);
    assert.equal(body.page_size, 3);
    assert.equal(body.data.length, 3);
  });

  test('rejects unknown parameters', async () => {
    const { status, body } = await get('?org_code=A01');
    assert.equal(status, 400);
    assert.match(body.error, /Unknown parameter\(s\): org_code/);
  });

  test('rejects invalid values', async () => {
    for (const query of ['?from=2026-7', '?org=A01;DROP', '?page_size=501', '?page=0', '?org=A01&org=A02']) {
      const { status } = await get(query);
      assert.equal(status, 400, query);
    }
  });
});
