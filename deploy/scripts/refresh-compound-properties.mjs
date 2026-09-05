// Refresh the checked-in scientific snapshot; the running API needs no external request.
import { readFile, writeFile } from 'node:fs/promises';
const dataDir = new URL('../../compound-service/Element.Services.Compound.Infrastructure/Data/', import.meta.url);
const rows = JSON.parse(await readFile(new URL('compounds.json', dataDir), 'utf8'));
const target = new URL('compound-properties.json', dataDir);
let properties = {};
try { properties = JSON.parse(await readFile(target, 'utf8')); } catch { /* first refresh */ }
let failures = 0;
for (const row of rows.filter((row) => row.kind === 'compound')) {
  if (properties[row.slug] && !process.argv.includes('--force')) continue;
  const knownCid = { fe2o3: 518696, fe3o4: 16211978 }[row.slug];
  const lookup = knownCid ? `cid/${knownCid}` : `name/${encodeURIComponent(row.name)}`;
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/${lookup}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`;
  try {
    let response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (response.status === 404) response = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(row.formula)}/property/MolecularFormula,MolecularWeight,IUPACName,InChIKey/JSON`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const p = (await response.json()).PropertyTable.Properties[0];
    properties[row.slug] = {
      molecularFormula: p.MolecularFormula, molecularWeight: Number(p.MolecularWeight),
      molecularWeightUnit: 'g/mol', iupacName: p.IUPACName, inchiKey: p.InChIKey,
      pubChemId: p.CID, sourceUrl: `https://pubchem.ncbi.nlm.nih.gov/compound/${p.CID}`,
      retrievedAt: new Date().toISOString().slice(0, 10),
    };
    await writeFile(target, JSON.stringify(properties, null, 2) + '\n');
    console.log(`Updated ${row.slug}`);
  } catch (error) { failures++; console.error(`${row.slug}: ${error.message}`); }
  await new Promise((resolve) => setTimeout(resolve, 300));
}
console.log(`${Object.keys(properties).length} compound records; ${failures} failures.`);
if (failures) process.exitCode = 1;
