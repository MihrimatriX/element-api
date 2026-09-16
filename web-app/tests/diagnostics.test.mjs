import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosticEvents, setDiagnostics, track } from '../src/services/diagnostics.ts';

test('Diagnostics are opt-in, bounded, exclude arbitrary strings and erase on opt-out', () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  track('lab_started'); assert.equal(diagnosticEvents().length, 0);
  assert.equal(setDiagnostics(true), true);
  track('record_opened', 'https://example.com?token=private');
  assert.equal(diagnosticEvents()[0].item, undefined);
  for (let i = 0; i < 240; i++) track('record_opened', `element-${i}`);
  assert.equal(diagnosticEvents().length, 200);
  setDiagnostics(false); assert.equal(diagnosticEvents().length, 0);
  globalThis.localStorage = { getItem() { throw Error('disabled'); } };
  assert.doesNotThrow(() => track('client_error'));
  assert.equal(setDiagnostics(true), false);
});
