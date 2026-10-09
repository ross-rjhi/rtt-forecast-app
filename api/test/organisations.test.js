import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { useTestApi } from './fixture.js';

describe('GET /api/organisations', () => {
  const api = useTestApi();
  const get = (query = '') => api(`/api/organisations${query}`);
  const codes = (body) => body.data.map((r) => r.org_code);

  test('returns all organisations A-Z by name', async () => {
    const { status, body } = await get();
    assert.equal(status, 200);
    assert.equal(body.total, 3);
    assert.deepEqual(codes(body), ['A01', 'A02', 'A03']);
    assert.deepEqual(body.data[0], {
      org_code: 'A01',
      org_name: 'Alpha Health',
      parent_code: 'P01',
      parent_name: 'North Partnership',
    });
  });

  test('q searches name and code, ignoring case', async () => {
    assert.deepEqual(codes((await get('?q=beta')).body), ['A02']);
    assert.deepEqual(codes((await get('?q=a03')).body), ['A03']);
    assert.deepEqual(codes((await get('?q=health')).body), ['A01', 'A02']);
  });

  test('q treats % and _ literally', async () => {
    assert.deepEqual(codes((await get('?q=100%25_')).body), ['A03']); // "100%_"
    assert.deepEqual(codes((await get('?q=%25')).body), ['A03']); // "%"
    assert.equal((await get('?q=_')).body.total, 1);
  });

  test('filters by parent group', async () => {
    assert.deepEqual(codes((await get('?parent=P01')).body), ['A01', 'A02']);
    assert.deepEqual(codes((await get('?parent=P01&q=beta')).body), ['A02']);
  });

  test('rejects unknown parameters and invalid values', async () => {
    for (const query of ['?page=1', '?q=', `?q=${'x'.repeat(101)}`, '?parent=P;1']) {
      const { status } = await get(query);
      assert.equal(status, 400, query);
    }
  });
});
