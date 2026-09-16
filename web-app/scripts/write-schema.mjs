import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

// Describe the full records in this versioned snapshot. Projected API responses may omit fields.
function schema(values) {
  const groups = new Map();
  for (const value of values) {
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(value);
  }
  if (groups.size === 1 && groups.has('null')) return { description: 'No populated value in this snapshot. Null means unavailable, not zero.' };
  const variants = [...groups].map(([type, rows]) => {
    if (type === 'object') {
      const keys = [...new Set(rows.flatMap(Object.keys))];
      return { type, properties: Object.fromEntries(keys.map(key => [key, schema(rows.filter(row => key in row).map(row => row[key]))])), required: keys.filter(key => rows.every(row => key in row)), additionalProperties: false };
    }
    if (type === 'array') return { type, items: rows.flat().length ? schema(rows.flat()) : {} };
    return { type };
  });
  return variants.length === 1 ? variants[0] : { anyOf: variants };
}
const output = new URL('../public/schema/', import.meta.url);
mkdirSync(output, { recursive: true });
for (const [kind, path] of [['elements', '../../catalog-service/Element.Services.Element.Infrastructure/Data/'], ['compounds', '../../compound-service/Element.Services.Compound.Infrastructure/Data/']]) {
  const records = JSON.parse(readFileSync(new URL(`${path}scientific-${kind}.json`, import.meta.url), 'utf8'));
  writeFileSync(new URL(`${kind}.schema.json`, output), JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#', title: `ElementAPI v2 full ${kind} snapshot`,
    description: 'Schema for unprojected full records in the bundled snapshot. Summary/fields/include projections do not necessarily satisfy required fields. Entirely null fields intentionally do not assert an unverified type.',
    ...schema(records),
  }, null, 2) + '\n');
}
