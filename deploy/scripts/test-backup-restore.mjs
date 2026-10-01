/**
 * Local PostgreSQL recovery rehearsal: for every application database it takes a pg_dump from a
 * consistent snapshot, restores it into a temporary database and checks that every table has the
 * same row count and content fingerprint. Never restores over application databases; temporary
 * databases and dump files are always removed.
 *
 * Needs the local stack (container element-postgres) and docker/.env.
 * Run: node deploy/scripts/test-backup-restore.mjs   (report: artifacts/local/backup-restore-report.json)
 */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// The pg driver is borrowed from order-service so this script needs no package.json of its own.
const require = createRequire(new URL('../../order-service/package.json', import.meta.url));
const { Client } = require('pg');
const exec = promisify(execFile);
const root = new URL('../../', import.meta.url);

const envText = await readFile(new URL('docker/.env', root), 'utf8');
const settings = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const separatorIndex = line.indexOf('=');
      const value = line.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      return [line.slice(0, separatorIndex).trim(), value];
    }),
);
const connection = {
  host: '127.0.0.1',
  port: Number(settings.POSTGRES_HOST_PORT || 5432),
  user: settings.POSTGRES_USER || 'postgres',
  password: settings.POSTGRES_PASSWORD || 'mysecretpassword',
};
const container = 'element-postgres';
/** Unique suffix so parallel or leftover rehearsals never collide. */
const runId = randomUUID().replaceAll('-', '').slice(0, 16);
/** Quotes an SQL identifier (table or database name). */
const quote = (value) => '"' + value.replaceAll('"', '""') + '"';
const databases = ['element_identity_db', 'element_market_db', 'element_order_db', 'element_shipment_db', 'element_compound_db'];

/** Runs a command inside the Postgres container (pg_dump / pg_restore / rm). */
async function dockerExec(...args) {
  return exec('docker', ['exec', container, ...args], { timeout: 120000, maxBuffer: 1024 * 1024 });
}

/** Row count + MD5 of all rows for every public table, so two databases can be compared exactly. */
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
    const restored = `element_restore_${runId}_${index}`;
    const dump = `/tmp/${restored}.dump`;
    const source = new Client({ ...connection, database });
    const target = new Client({ ...connection, database: restored });
    let created = false;
    try {
      // Fingerprint and dump from the same exported snapshot, so concurrent writes cannot skew the comparison.
      await source.connect();
      await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const { rows: [{ snapshot }] } = await source.query('SELECT pg_export_snapshot() AS snapshot');
      const expected = await fingerprint(source);
      await dockerExec('pg_dump', '-U', connection.user, '-d', database, '-Fc', '--no-owner', '--no-privileges', `--snapshot=${snapshot}`, '-f', dump);
      await source.query('COMMIT');

      await admin.query(`CREATE DATABASE ${quote(restored)}`);
      created = true;
      await dockerExec('pg_restore', '-U', connection.user, '-d', restored, '--exit-on-error', '--no-owner', '--no-privileges', dump);
      await target.connect();
      assert.deepEqual(await fingerprint(target), expected, `${database}: restored content differs from the backup snapshot`);

      const rowCount = expected.reduce((sum, table) => sum + Number(table.count), 0);
      report.push({ database, tables: expected.length, rows: rowCount, passed: true });
      console.log(`PASS ${database}: ${expected.length} tables restored with matching row counts and content fingerprints`);
    } finally {
      await target.end();
      await source.end();
      if (created) await admin.query(`DROP DATABASE ${quote(restored)}`);
      await dockerExec('rm', '-f', dump);
    }
  }
} finally {
  await admin.end();
}

await mkdir(new URL('artifacts/local/', root), { recursive: true });
const reportBody = {
  checkedAt: new Date().toISOString(),
  scope: 'Local logical PostgreSQL restore; no offsite/encryption/Redis/RabbitMQ/DataProtection claim',
  results: report,
};
await writeFile(new URL('artifacts/local/backup-restore-report.json', root), JSON.stringify(reportBody, null, 2));
console.log(`${report.length}/${databases.length} database restore checks passed; temporary databases and dumps removed.`);
