import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { useTestApi } from './fixture.js';

describe('GET /api/categories', () => {
  const api = useTestApi();
  const get = (query = '') => api(`/api/categories${query}`);
  const codes = (body) => body.data.map((r) => r.category_code);

  test('lists all categories: the total first, then A-Z', async () => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.deepEqual(codes(body), ['ALL', 'MED', 'SUR']);
    assert.deepEqual(body.data[1], { category_code: 'MED', category_name: 'Medicine' });
  });

  test('with org, lists only categories that organisation has data for', async () => {
    assert.deepEqual(codes((await get('?org=a01')).body), ['ALL', 'MED']);
    assert.deepEqual(codes((await get('?org=A03')).body), []);
  });

  test('rejects unknown parameters, repeats and invalid codes', async () => {
    for (const query of ['?provider=A01', '?org=A01&org=A02', '?org=A;01']) {
      const { status } = await get(query);
      assert.equal(status, 400, query);
    }
  });
});
