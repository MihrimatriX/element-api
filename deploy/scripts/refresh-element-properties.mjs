/**
 * Rebuilds catalog-service element-properties.json (atomic mass, electronegativity, density,
 * melting/boiling point, electron configuration, discovery year) from the PubChem periodic table.
 * Refuses to write unless PubChem returns exactly 118 elements.
 *
 * Run: node deploy/scripts/refresh-element-properties.mjs
 */
import { writeFile } from 'node:fs/promises';

const EXPECTED_ELEMENT_COUNT = 118;
/** PubChem column name -> field name in element-properties.json (numeric columns only). */
const NUMERIC_FIELDS = {
  AtomicMass: 'atomicMass',
  Electronegativity: 'electronegativity',
  Density: 'density',
  MeltingPoint: 'meltingPoint',
  BoilingPoint: 'boilingPoint',
};

const response = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`PubChem HTTP ${response.status}`);
const { Table: table } = await response.json();
// PubChem sends columns and cell arrays separately; zip them into one object per element.
const rows = table.Row.map((row) => Object.fromEntries(table.Columns.Column.map((key, i) => [key, row.Cell[i]])));
if (rows.length !== EXPECTED_ELEMENT_COUNT) throw new Error('Expected 118 elements; inspect upstream data before updating.');

/** Converts one PubChem cell to a number, null for an empty cell; throws on anything non-numeric. */
function numericValue(row, column) {
  const value = row[column] == null || row[column] === '' ? null : Number(row[column]);
  if (value !== null && !Number.isFinite(value)) throw new Error(`Unexpected ${column} for ${row.Symbol}`);
  return value;
}

const elements = Object.fromEntries(
  rows.map((row) => {
    const values = Object.fromEntries(Object.entries(NUMERIC_FIELDS).map(([column, name]) => [name, numericValue(row, column)]));
    const yearDiscovered = /^\d+$/.test(row.YearDiscovered) ? Number(row.YearDiscovered) : null;
    return [row.Symbol, { ...values, electronConfiguration: row.ElectronConfiguration || null, yearDiscovered }];
  }),
);

await writeFile(
  new URL('../../catalog-service/Element.Services.Element.Infrastructure/Data/element-properties.json', import.meta.url),
  JSON.stringify({ sourceUrl: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/', retrievedAt: new Date().toISOString().slice(0, 10), elements }, null, 2) + '\n',
);
console.log('Updated 118 scientific element records from PubChem.');
