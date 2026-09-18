import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const readText = path => readFile(new URL(path, root), 'utf8');

const matches = (route, link) => {
  const r = route.split('/'), l = link.split('/');
  return r.length === l.length && r.every((seg, i) => seg.startsWith(':') || seg === l[i]);
};

test('el kitabi ic baglantilari gercek route aciyor', async () => {
  const guide = await readText('web-app/src/pages/Guide.tsx');
  const app = await readText('web-app/src/App.tsx');
  const routes = [...app.matchAll(/path="([^"]+)"/g)].map(m => m[1]);
  assert.ok(routes.includes('/developers'), 'developers route kayip');
  const links = [...guide.matchAll(/to(?:="|: ")([^"]+)"/g)].map(m => m[1]).filter(href => href.startsWith('/'));
  assert.ok(links.length > 5, 'rehber baglantisi bulunamadi');
  for (const href of links) {
    const path = href.split('?')[0];
    assert.ok(routes.some(route => matches(route, path)), `${href}: route karsiligi yok`);
  }
});

test('developers nav girisi ve openapi dosyasi duruyor', async () => {
  const shell = await readText('web-app/src/components/ProductShell.tsx');
  assert.ok(shell.includes('"/developers"'), 'Gelistiriciler nav girisi kayip');
  const openapi = JSON.parse(await readText('web-app/public/openapi.json'));
  assert.ok(openapi.openapi && Object.keys(openapi.paths).length > 0, 'openapi.json bos ya da bozuk');
});
