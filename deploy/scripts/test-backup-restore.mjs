// Local PostgreSQL recovery rehearsal. Never restores over application databases.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const require = createRequire(new URL('../../order-service/package.json', import.meta.url));
const { Client } = require('pg');
const exec = promisify(execFile);
const root = new URL('../../', import.meta.url);
const settings = Object.fromEntries((await readFile(new URL('docker/.env', root), 'utf8')).split(/\r?\n/).filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('=')).map(l => {
  const at = l.indexOf('='); return [l.slice(0, at).trim(), l.slice(at + 1).trim().replace(/^(['"])(.*)\1$/, '$2')];
}));
const connection = { host: '127.0.0.1', port: Number(settings.POSTGRES_HOST_PORT || 5432), user: settings.POSTGRES_USER || 'postgres', password: settings.POSTGRES_PASSWORD || 'mysecretpassword' };
const container = 'element-postgres';
const run = randomUUID().replaceAll('-', '').slice(0, 16);
const quote = value => '"' + value.replaceAll('"', '""') + '"';
const databases = ['element_identity_db', 'element_market_db', 'element_order_db', 'element_shipment_db', 'element_compound_db'];
async function docker(...args) { return exec('docker', ['exec', container, ...args], { timeout: 120000, maxBuffer: 1024 * 1024 }); }
async function fingerprint(client) {
  const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const result = [];
  for (const { tablename } of tables) {
    const { rows: [row] } = await client.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(h, '' ORDER BY h), '')) AS digest FROM (SELECT md5(row_to_json(t)::text) AS h FROM public.${quote(tablename)} t) s`);
    result.push({ table: tablename, ...row });
  }
  assert.ok(result.length > 0, 'Database has no public tables');
  return result;
}
const admin = new Client({ ...connection, database: 'postgres' });
await admin.connect();
const report = [];
try {
  for (const [index, database] of databases.entries()) {
    const restored = `element_restore_${run}_${index}`;
    const dump = `/tmp/${restored}.dump`;
    const source = new Client({ ...connection, database });
    const target = new Client({ ...connection, database: restored });
    let created = false;
    try {
      await source.connect();
      await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const { rows: [{ snapshot }] } = await source.query('SELECT pg_export_snapshot() AS snapshot');
      const expected = await fingerprint(source);
      await docker('pg_dump', '-U', connection.user, '-d', database, '-Fc', '--no-owner', '--no-privileges', `--snapshot=${snapshot}`, '-f', dump);
      await source.query('COMMIT');
      await admin.query(`CREATE DATABASE ${quote(restored)}`); created = true;
      await docker('pg_restore', '-U', connection.user, '-d', restored, '--exit-on-error', '--no-owner', '--no-privileges', dump);
      await target.connect();
      assert.deepEqual(await fingerprint(target), expected, `${database}: restored content differs from the backup snapshot`);
      report.push({ database, tables: expected.length, rows: expected.reduce((sum, t) => sum + Number(t.count), 0), passed: true });
      console.log(`PASS ${database}: ${expected.length} tables restored with matching row counts and content fingerprints`);
    } finally {
      await target.end(); await source.end();
      if (created) await admin.query(`DROP DATABASE ${quote(restored)}`);
      await docker('rm', '-f', dump);
    }
  }
} finally { await admin.end(); }
await mkdir(new URL('artifacts/local/', root), { recursive: true });
await writeFile(new URL('artifacts/local/backup-restore-report.json', root), JSON.stringify({ checkedAt: new Date().toISOString(), scope: 'Local logical PostgreSQL restore; no offsite/encryption/Redis/RabbitMQ/DataProtection claim', results: report }, null, 2));
console.log(`${report.length}/${databases.length} database restore checks passed; temporary databases and dumps removed.`);
