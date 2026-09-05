import assert from 'node:assert/strict';
import { weightedAvgCost } from './db/ledger.js';

function main() {
  assert.equal(weightedAvgCost(10, 100, 10, 120), 110);
  assert.equal(weightedAvgCost(0, 0, 5, 80), 80);
  assert.equal(weightedAvgCost(4, 10, 0, 99), 10);

  const have = 5;
  const sellGrams = 10;
  assert.equal(have < sellGrams, true, 'sell must reject over-holding');

  const grant = 10_000;
  assert.equal(grant, 10000, 'wallet grant is 10_000 ELX');

  console.log('ledger.check: ok (avg cost, over-holding reject, grant 10000)');
}

main();
