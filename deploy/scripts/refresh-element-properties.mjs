import { writeFile } from 'node:fs/promises';
const response = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`PubChem HTTP ${response.status}`);
const { Table: table } = await response.json();
const rows = table.Row.map((row) => Object.fromEntries(table.Columns.Column.map((key, i) => [key, row.Cell[i]])));
if (rows.length !== 118) throw new Error('Expected 118 elements; inspect upstream data before updating.');
const fields = { AtomicMass: 'atomicMass', Electronegativity: 'electronegativity', Density: 'density', MeltingPoint: 'meltingPoint', BoilingPoint: 'boilingPoint' };
const elements = Object.fromEntries(rows.map((row) => {
  const values = Object.fromEntries(Object.entries(fields).map(([key, name]) => {
    const value = row[key] == null || row[key] === '' ? null : Number(row[key]);
    if (value !== null && !Number.isFinite(value)) throw new Error(`Unexpected ${key} for ${row.Symbol}`);
    return [name, value];
  }));
  return [row.Symbol, { ...values, electronConfiguration: row.ElectronConfiguration || null, yearDiscovered: /^\d+$/.test(row.YearDiscovered) ? Number(row.YearDiscovered) : null }];
}));
await writeFile(new URL('../../catalog-service/Element.Services.Element.Infrastructure/Data/element-properties.json', import.meta.url),
  JSON.stringify({ sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/', retrievedAt: new Date().toISOString().slice(0, 10), elements }, null, 2) + '\n');
console.log('Updated 118 scientific element records from PubChem.');
