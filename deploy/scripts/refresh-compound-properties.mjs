/**
 * Refreshes compound-properties.json (formula, weight, IUPAC name, InChIKey, PubChem CID) for every
 * "compound" product in compounds.json. The result is a checked-in snapshot, so the running API
 * never needs an external request.
 *
 *   node deploy/scripts/refresh-compound-properties.mjs           only rows that have no record yet
 *   node deploy/scripts/refresh-compound-properties.mjs --force   re-fetch every row
 *
 * Exits with code 1 when any row failed (the other rows are still saved).
 */
import { readFile, writeFile } from 'node:fs/promises';

const dataDir = new URL('../../compound-service/Element.Services.Compound.Infrastructure/Data/', import.meta.url);
const rows = JSON.parse(await readFile(new URL('compounds.json', dataDir), 'utf8'));
const target = new URL('compound-properties.json', dataDir);
const PROPERTY_PATH = 'property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON';
const REQUEST_TIMEOUT_MS = 15000;
const PAUSE_BETWEEN_ROWS_MS = 300;
/** A name search is ambiguous for these slugs (several iron oxides), so they use a fixed PubChem CID. */
const KNOWN_CIDS = { fe2o3: 518696, fe3o4: 16211978 };

let properties = {};
try {
  properties = JSON.parse(await readFile(target, 'utf8'));
} catch {
  /* first refresh: no snapshot yet */
}

let failures = 0;
for (const row of rows.filter((candidate) => candidate.kind === 'compound')) {
  if (properties[row.slug] && !process.argv.includes('--force')) continue;

  const knownCid = KNOWN_CIDS[row.slug];
  const lookup = knownCid ? `cid/${knownCid}` : `name/${encodeURIComponent(row.name)}`;
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${lookup}/${PROPERTY_PATH}`;
  try {
    let response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    // Unknown name: retry with the formula, which PubChem also accepts as a name.
    if (response.status === 404) {
      const formulaUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(row.formula)}/${PROPERTY_PATH}`;
      response = await fetch(formulaUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const pubchem = (await response.json()).PropertyTable.Properties[0];
    properties[row.slug] = {
      molecularFormula: pubchem.MolecularFormula,
      molecularWeight: Number(pubchem.MolecularWeight),
      molecularWeightUnit: 'g/mol',
      iupacName: pubchem.IUPACName,
      inchiKey: pubchem.InChIKey,
      pubChemId: pubchem.CID,
      sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${pubchem.CID}`,
      retrievedAt: new Date().toISOString().slice(0, 10),
    };
    // Saved after every row so an interrupted run keeps its progress.
    await writeFile(target, JSON.stringify(properties, null, 2) + '\n');
    console.log(`Updated ${row.slug}`);
  } catch (error) {
    failures++;
    console.error(`${row.slug}: ${error.message}`);
  }
  await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_ROWS_MS));
}
console.log(`${Object.keys(properties).length} compound records; ${failures} failures.`);
if (failures) process.exitCode = 1;
