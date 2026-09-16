import { readFileSync, writeFileSync } from 'node:fs';

const site = new URL(process.env.VITE_PUBLIC_SITE_URL || 'http://127.0.0.1:5080');
if (!['http:', 'https:'].includes(site.protocol)) throw Error('Public site must be an HTTP(S) origin.');
for (const name of ['index.html', 'robots.txt', 'sitemap.xml']) {
  const path = new URL(`../dist/${name}`, import.meta.url);
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll('__SITE_URL__', site.origin));
}
console.log(`Static metadata: ${site.origin}`);
