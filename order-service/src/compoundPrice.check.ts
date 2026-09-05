import assert from 'node:assert/strict';
import { compoundLineElx } from './compoundPrice.js';

function main() {
  assert.equal(compoundLineElx(100, 1, 10), 1000, 'elemental 10 g');
  assert.equal(compoundLineElx(75.25, 1.45, 10), 1091.125, 'AuCl3 10 g');
  assert.equal(compoundLineElx(100, 1.18, 50), 5900, 'steel 50 g');
  assert.equal(compoundLineElx(100, 0, 10), 0, 'bad mult');
  assert.equal(compoundLineElx(100, 1, 0), 0, 'bad grams');
  console.log('compoundPrice.check: ok (ask × priceMult × grams)');
}

main();
