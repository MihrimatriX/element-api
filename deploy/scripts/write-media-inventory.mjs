/**
 * Regenerates docs/ELEMENT-MEDIA-INVENTORY.md: one row per element saying whether it has a real
 * specimen photo (with licence/source) or only the schematic fallback, and its review status.
 * Fails if a photo path looks unsafe or the referenced file is missing/empty.
 *
 * Run: node deploy/scripts/write-media-inventory.mjs
 */
import { readFile, writeFile, stat } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const elements = JSON.parse(await readFile(new URL('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json', root), 'utf8'));
const selections = JSON.parse(await readFile(new URL('deploy/data/atlas-photo-selections.json', root), 'utf8'));
/** Only plain lowercase file names under /media/atlas are accepted (no traversal, no other folders). */
const SAFE_PHOTO_PATH = /^\/media\/atlas\/[a-z]+\.(jpg|png|webp)$/;

/** Turkish review status shown in the last column. */
function reviewStatus(symbol, photo) {
  if (selections[symbol]) return 'İlk pakette görsel ve kaynak kontrolü yapıldı';
  if (photo) return 'Önceki kayıt; dosyası mevcut, yeniden görsel inceleme bekliyor';
  return 'Fotoğraf adayı araştırılacak';
}

const rows = [];
let photos = 0;
for (const element of elements) {
  const photo = element.media.photo;
  if (photo) {
    if (!SAFE_PHOTO_PATH.test(photo.url)) throw Error(`Unsafe photo path: ${element.symbol}`);
    const file = await stat(new URL('web-app/public' + photo.url, root));
    if (!file.size) throw Error(`Empty photo: ${element.symbol}`);
    photos++;
  }
  const presentation = photo ? 'Fotoğraf' : 'Şema';
  const licence = photo ? `[${photo.license}](${photo.source_url})` : '—';
  rows.push(`| ${element.symbol} | ${element.names.tr} | ${presentation} | ${licence} | ${reviewStatus(element.symbol, photo)} |`);
}

const missing = elements.length - photos;
const report = [
  '# Element görsel envanteri',
  '',
  'Kaynak: bilimsel element JSON ve atlas-photo-selections.json. Bu rapor node deploy/scripts/write-media-inventory.mjs ile yeniden üretilir.',
  '',
  `${elements.length} element; **${photos} fotoğraf**, **${missing} fotoğraf eksiği**. Şema, gerçek numune fotoğrafı sayısına dahil edilmez. Dosya kontrolü bütün fotoğraflara; bu turdaki görsel/kaynak incelemesi yalnız seçim listesindeki ${Object.keys(selections).length} elemente uygulanmıştır.`,
  '',
  '| Sembol | Element | Sunum | Lisans / kaynak | İnceleme durumu |',
  '|---|---|---|---|---|',
  ...rows,
  '',
].join('\n');
await writeFile(new URL('docs/ELEMENT-MEDIA-INVENTORY.md', root), report);
console.log(`Media inventory: ${photos}/${elements.length} photos, ${missing} remaining.`);
