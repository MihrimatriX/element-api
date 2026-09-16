import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));

test('atlas photos resolve to local files and preserve source attribution', async () => {
  const elements = await readJson('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json');
  const manifest = await readJson('deploy/data/atlas-media.json');
  for (const element of elements) {
    const photo = element.media.photo;
    assert.deepEqual(photo, manifest[element.symbol]?.photo ?? null, element.symbol);
    if (!photo) continue;
    assert.match(photo.url, /^\/media\/atlas\/[a-z]+\.(jpg|png|webp)$/);
    assert.ok(photo.caption && photo.creator && photo.license, element.symbol);
    assert.match(photo.source_url, /^https?:\/\//);
    const bytes = await readFile(new URL('web-app/public' + photo.url, root));
    assert.ok(bytes.length > 1000, `${element.symbol}: empty/invalid asset`);
  }
});

test('reviewed specimen selections survive the generated catalog', async () => {
  const selections = await readJson('deploy/data/atlas-photo-selections.json');
  const elements = await readJson('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json');
  for (const [symbol, selection] of Object.entries(selections)) {
    const photo = elements.find(element => element.symbol === symbol)?.media.photo;
    assert.ok(photo, `${symbol}: reviewed photo missing`);
    assert.equal(photo.caption, selection.caption);
    if (selection.attribution_url) assert.equal(photo.source_url, selection.attribution_url);
  }
});
