/**
 * Assert public env local HTTP ports / project names stay unique.
 * Run: node deploy/tests/public-env-matrix.test.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const matrix = [
  { name: 'dev', port: 8080, file: 'docker/.env.public.dev.example' },
  { name: 'test', port: 8081, file: 'docker/.env.public.test.example' },
  { name: 'prod', port: 8082, file: 'docker/.env.public.prod.example' },
]

const ports = matrix.map((m) => m.port)
assert.equal(new Set(ports).size, ports.length, `HTTP ports collide: ${ports.join(', ')}`)

const projects = matrix.map((m) => `element-${m.name}`)
assert.equal(new Set(projects).size, projects.length, 'compose project names collide')

for (const row of matrix) {
  const text = readFileSync(join(root, row.file), 'utf8')
  assert.match(text, new RegExp(`ELEMENT_ENV=${row.name}`))
  assert.match(text, new RegExp(`CADDY_HTTP_PORT=${row.port}`))
  assert.match(text, /CADDY_SITE=http:\/\/:80/)
  assert.match(text, /VITE_API_BASE_URL=\/api\/v1/)
  assert.match(text, /TRUSTED_PROXY_CIDRS=10\.0\.0\.0\/8,172\.16\.0\.0\/12,192\.168\.0\.0\/16/)
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !/=/.test(line)) continue
    assert.doesNotMatch(line, /ChangeMe/i, `${row.file} assignment must not use ChangeMe: ${line}`)
    assert.doesNotMatch(line, /element-internal-dev-key/, `${row.file} must not ship element-internal-dev-key: ${line}`)
  }
  const key = text.match(/^INTERNAL_API_KEY=(.+)$/m)?.[1]?.trim()
  assert.ok(key && key.length >= 32, `${row.file} INTERNAL_API_KEY must be >=32 chars (got ${key?.length ?? 0})`)
}

const present = readFileSync(join(root, 'deploy/scripts/present-public.ps1'), 'utf8')
assert.match(present, /Assert-ServerProdEnv/)
assert.match(present, /CADDY_SITE is missing/)
for (const port of ports) {
  assert.match(present, new RegExp(String(port)), `present-public.ps1 missing port ${port}`)
}

console.log('public-env-matrix: ok')
