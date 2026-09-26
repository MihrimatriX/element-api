import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('deploy/data/atlas-media.json', root), 'utf8'),
);
const elements = JSON.parse(
  await readFile(
    new URL(
      'catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json',
      root,
    ),
    'utf8',
  ),
);
const selections = JSON.parse(
  await readFile(new URL('deploy/data/atlas-photo-selections.json', root), 'utf8'),
);

const elementPhotos = Object.entries(manifest).filter(
  ([k, v]) => /^[A-Z][a-z]?$/.test(k) && v.photo,
);

assert.equal(elementPhotos.length, 75, 'expected 75 curated element photos');

// Misleading photos must stay null (better empty than wrong).
for (const sym of ['Pm', 'Tc', 'H']) {
  assert.equal(manifest[sym]?.photo ?? null, null, `${sym} photo must be null`);
  const el = elements.find((e) => e.symbol === sym);
  assert.equal(el?.media?.photo ?? null, null, `${sym} catalog photo must be null`);
}

// Key specimens present and files on disk.
for (const sym of [
  'Fe',
  'Cu',
  'Au',
  'S',
  'Ga',
  'Be',
  'W',
  'Bi',
  'As',
  'Na',
  'C',
  'O',
  'Hg',
  'Lu',
  'Tm',
  'Dy',
  'Rb',
  'Sr',
  'U',
]) {
  const photo = manifest[sym]?.photo;
  assert.ok(photo?.url, `${sym} missing photo`);
  assert.match(photo.url, new RegExp(`/media/atlas/${sym.toLowerCase()}\\.`));
  await access(new URL(`web-app/public${photo.url}`, root), constants.R_OK);
  const cat = elements.find((e) => e.symbol === sym)?.media?.photo?.url;
  assert.equal(cat, photo.url, `${sym} catalog out of sync`);
}

// Sulfur must not be the old mineral matrix pageimage.
assert.equal(selections.S?.file, 'Sulfur-sample.jpg');
assert.match(manifest.S.photo.source_url, /Sulfur-sample/i);

// Gallium must be crystals (not silicon-lookalike cracked bar PNG).
assert.match(selections.Ga?.file ?? '', /Gallium crystals/i);
assert.match(manifest.Ga.photo.url, /\.jpg$/);

// Mercury is liquid metal pour (not null / not a planet or spacecraft).
assert.match(selections.Hg?.file ?? '', /mercury bionerd/i);

console.log('element-photos ok:', elementPhotos.length, 'photos; Pm/Tc/H null');
