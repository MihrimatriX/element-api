import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/services/elementData.ts'), 'utf8');
const match = src.match(/const rawElements = "([^"]+)"/);
if (!match) throw new Error('rawElements not found in elementData.ts');

const symbols = match[1].split('|').map((row) => row.split(',')[1].toLowerCase());
if (symbols.length !== 118) throw new Error(`expected 118 symbols, got ${symbols.length}`);

const pages = ['/', '/periodic', '/compounds', '/market', '/shop', '/docs', '/lab', '/hakkinda', '/nasil', '/sozluk', '/login', '/register'];
const compounds = JSON.parse(readFileSync(join(root, '../compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json'), 'utf8'));
const locs = [
  ...compounds.map(c => `  <url><loc>__SITE_URL__/compound/${c.slug}</loc></url>`),
  ...pages.map((p) => `  <url><loc>__SITE_URL__${p}</loc></url>`),
  ...symbols.map((s) => `  <url><loc>__SITE_URL__/element/${s}</loc></url>`)
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${locs.join('\n')}
</urlset>
`;

writeFileSync(join(root, 'public/sitemap.xml'), xml);
console.log(`sitemap.xml: ${locs.length} URLs (${symbols.length} elements)`);
