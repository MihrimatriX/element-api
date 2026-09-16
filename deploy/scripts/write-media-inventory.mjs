import { readFile, writeFile, stat } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const elements = JSON.parse(await readFile(new URL('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json', root), 'utf8'));
const selections = JSON.parse(await readFile(new URL('deploy/data/atlas-photo-selections.json', root), 'utf8'));
const rows = [];
let photos = 0;
for (const element of elements) {
  const photo = element.media.photo;
  if (photo) {
    if (!/^\/media\/atlas\/[a-z]+\.(jpg|png|webp)$/.test(photo.url)) throw Error(`Unsafe photo path: ${element.symbol}`);
    const file = await stat(new URL('web-app/public' + photo.url, root));
    if (!file.size) throw Error(`Empty photo: ${element.symbol}`);
    photos++;
  }
  rows.push(`| ${element.symbol} | ${element.names.tr} | ${photo ? 'Fotoğraf' : 'Şema'} | ${photo ? `[${photo.license}](${photo.source_url})` : '—'} | ${selections[element.symbol] ? 'İlk pakette görsel ve kaynak kontrolü yapıldı' : photo ? 'Önceki kayıt; dosyası mevcut, yeniden görsel inceleme bekliyor' : 'Fotoğraf adayı araştırılacak'} |`);
}
const report = `# Element görsel envanteri\n\nKaynak: bilimsel element JSON ve atlas-photo-selections.json. Bu rapor node deploy/scripts/write-media-inventory.mjs ile yeniden üretilir.\n\n${elements.length} element; **${photos} fotoğraf**, **${elements.length - photos} fotoğraf eksiği**. Şema, gerçek numune fotoğrafı sayısına dahil edilmez. Dosya kontrolü bütün fotoğraflara; bu turdaki görsel/kaynak incelemesi yalnız seçim listesindeki ${Object.keys(selections).length} elemente uygulanmıştır.\n\n| Sembol | Element | Sunum | Lisans / kaynak | İnceleme durumu |\n|---|---|---|---|---|\n${rows.join('\n')}\n`;
await writeFile(new URL('docs/ELEMENT-MEDIA-INVENTORY.md', root), report);
console.log(`Media inventory: ${photos}/${elements.length} photos, ${elements.length - photos} remaining.`);
