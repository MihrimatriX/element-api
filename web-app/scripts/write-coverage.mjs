import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const elements = read('../catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json');
const compounds = read('../compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json');
const populated = value => value != null && (typeof value === 'object' ? Object.values(value).some(populated) : value !== '');
const all = [...elements, ...compounds];
const directory = fileURLToPath(new URL('src/data/', root));
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('src/data/coverage.json', root), JSON.stringify({
  unavailableElementSections: Object.keys(elements[0]).filter(key => !elements.some(record => populated(record[key]))),
  elements: elements.length, compounds: compounds.length,
  editorial: all.filter(r => r.editorial?.summary).length,
  photos: elements.filter(r => r.media?.photo).length,
  structures: compounds.filter(r => r.media?.structure).length,
  retrievedAt: [...new Set(all.map(r => r.provenance.retrieved_at))].sort().join(' / '),
}, null, 2) + '\n');
