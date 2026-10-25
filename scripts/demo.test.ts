import test from 'node:test';
import assert from 'node:assert/strict';
import { demoSnapshot, demoApi } from '../src/demo';
import { makeModel, sourceUrl } from '../src/model';

test('synthetic fixture is valid, balanced and independent of production', () => {
  const m = makeModel(demoSnapshot);
  assert.equal(m.issues.length, 0);
  assert.equal(m.operations.length, 3);
  const p = { from: '2026-06-01', to: '2026-06-30', branch: '', currency: 'ETB' };
  for (const e of m.entities) assert.equal(m.ledger(e, {...p, currency: e.currency}).difference, 0);
  assert.equal(m.entities.find(e => e.kind === 'bank')?.sheetBalance, 1200);
  for (const e of m.entities) {
    assert.match(e.id, /^DEMO-/);
    assert.match(sourceUrl(e.source), /^#demo-row-/);
  }
});

test('demo API never contacts a network, returns copies, rejects live configuration', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Network forbidden in demo test'); };
  try {
    assert.equal((await demoApi('me')).user.id, 'demo');
    const a = await demoApi('master-snapshot');
    a.snapshot.title = 'changed locally';
    assert.equal((await demoApi('sync')).snapshot.title, 'Synthetic Public Demo');
    await assert.rejects(demoApi('connector', {url: 'https://example.invalid'}));
    await assert.rejects(demoApi('receipts/anything'));
  } finally { globalThis.fetch = originalFetch; }
});
