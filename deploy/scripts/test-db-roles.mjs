/**
 * Database isolation check for the local stack: every service role logs in to its own database with its
 * own password, a wrong password is refused, and every other service database turns the role away.
 *
 * Needs the local stack (Postgres published on the host). Reads docker/.env when it exists.
 * Run: node deploy/scripts/test-db-roles.mjs
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// The pg driver is borrowed from order-service so this script needs no package.json of its own.
const require = createRequire(new URL('../../order-service/package.json', import.meta.url));
const { Client } = require('pg');

const envText = await readFile(new URL('../../docker/.env', import.meta.url), 'utf8').catch(() => '');
const settings = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_0-9]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]),
);
const port = Number(settings.POSTGRES_HOST_PORT || 5432);
// name -> database. The role is element_<name>, its secret DB_PASSWORD_<NAME> (docker-compose.yml defaults otherwise).
const services = {
  identity: 'element_identity_db',
  catalog: 'element_market_db',
  compound: 'element_compound_db',
  order: 'element_order_db',
  wallet: 'element_wallet_db',
  inventory: 'element_inventory_db',
  shipment: 'element_shipment_db',
};

/** Resolves with null when the login works, otherwise with the PostgreSQL error code. */
async function login(name, database, password) {
  const client = new Client({ host: '127.0.0.1', port, user: `element_${name}`, password, database });
  try {
    await client.connect();
    return null;
  } catch (error) {
    return error.code ?? error.message;
  } finally {
    await client.end().catch(() => {});
  }
}

for (const [name, database] of Object.entries(services)) {
  const password = settings[`DB_PASSWORD_${name.toUpperCase()}`] || `dev-${name}-db-pass`;
  assert.equal(await login(name, database, password), null, `element_${name}: its own database refused the login`);
  assert.equal(await login(name, database, password + 'x'), '28P01', `element_${name}: a wrong password was accepted`);
  for (const other of Object.values(services).filter((candidate) => candidate !== database)) {
    // 42501 = insufficient_privilege: the role exists and the password is right, the database says no.
    assert.equal(await login(name, other, password), '42501', `element_${name} could connect to ${other}`);
  }
  console.log(`PASS element_${name}: logs in to ${database} only`);
}
