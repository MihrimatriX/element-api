/**
 * Curated Commons replacements + intentional nulls for misleading atlas photos.
 * Policy (content-and-games-plan): gas tube / mineral / product / solution must not
 * be labeled as a pure element specimen photo. Prefer null over a lie.
 *
 * Run: node deploy/scripts/fix-element-photos.mjs
 * Then: node deploy/scripts/refresh-atlas.mjs --fetch --only=S,Ga,Fe,Cu,Au,Hg,Bi,W,As,Se,Be,V,Mo,Cd,Sc,Y,Zr,Nb,Ru,Hf,Ta,Re,Os,Hg,Bi
 */
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const root = new URL('../../', import.meta.url);
const selectionsPath = new URL('deploy/data/atlas-photo-selections.json', root);
const manifestPath = new URL('deploy/data/atlas-media.json', root);
const publicDir = new URL('web-app/public/media/atlas/', root);

const clean = (value) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .trim();

async function commonsInfo(file) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    titles: `File:${file}`,
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '640',
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(u, {
      headers: { 'User-Agent': 'ElementAPI/1.0 (educational atlas photo fix)' },
      signal: AbortSignal.timeout(25000),
    });
    const text = await r.text();
    if (text.startsWith('{')) {
      const page = JSON.parse(text).query.pages[0];
      const info = page.imageinfo?.[0];
      if (!info) throw new Error(`No imageinfo for ${file}`);
      return info;
    }
    await new Promise((res) => setTimeout(res, 8000 * (attempt + 1)));
  }
  throw new Error(`Commons rate-limited for ${file}`);
}

async function downloadPhoto(symbol, file, caption, creator, attributionUrl) {
  const info = await commonsInfo(file);
  const meta = info.extmetadata;
  const license = clean(meta?.LicenseShortName?.value);
  if (!/CC BY|CC0|Public domain|FAL|Free Art License/i.test(license)) {
    throw new Error(`Bad license ${license} for ${file}`);
  }
  const remote = info.thumburl ?? info.url;
  const img = await fetch(remote, {
    headers: { 'User-Agent': 'ElementAPI/1.0 (educational atlas photo fix)' },
    signal: AbortSignal.timeout(30000),
  });
  const mime = img.headers.get('content-type');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    throw new Error(`Bad mime ${mime} for ${file}`);
  }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${symbol.toLowerCase()}.${ext}`;
  const buf = Buffer.from(await img.arrayBuffer());
  await writeFile(new URL(filename, publicDir), buf);
  return {
    url: `/media/atlas/${filename}`,
    caption,
    source_url:
      attributionUrl ??
      `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
    creator: creator ?? clean(meta?.Artist?.value),
    license,
    license_url: clean(meta?.LicenseUrl?.value) || null,
    retrieved_at: new Date().toISOString().slice(0, 10),
  };
}

// Replacements: better named specimens (verified Commons categories / titles).
const REPLACE = {
  S: {
    file: 'Sulfur-sample.jpg',
    caption: 'Kükürt · saf numune',
    fallback: ['Sulphur and 1cm3 cube.jpg', 'Sulfur chunk.jpg'],
  },
  Ga: {
    file: 'Gallium1_melted_and_unmelted.jpg',
    caption: 'Galyum · erimiş ve katı numune',
    fallback: [
      'Gallium crystals.jpg',
      'Solidified drop of high-purity gallium.jpg',
    ],
  },
  Fe: {
    file: 'Iron electrolytic and 1cm3 cube.jpg',
    caption: 'Demir · elektrolitik numune ve 1 cm³ küp',
  },
  Cu: {
    file: 'Copper-crystal.jpg',
    caption: 'Bakır · kristal numune',
    fallback: ['NatCopper.jpg', 'Copper sample.jpg'],
  },
  Au: {
    file: 'Gold-crystals.jpg',
    caption: 'Altın · kristal numune',
  },
  Bi: {
    file: 'Bismuth crystal with 1cm3 cube.jpg',
    caption: 'Bizmut · kristal numune ve 1 cm³ küp',
    fallback: ['Bismuth-2.jpg'],
  },
  W: {
    file: 'Wolfram evaporation filaments and 1cm3 cube.jpg',
    caption: 'Tungsten · filament ve 1 cm³ küp',
    fallback: ['Tungsten rod.jpg'],
  },
  As: {
    file: 'Arsenic-1.jpg',
    caption: 'Arsenik · numune',
    fallback: ['Arsenic.jpg'],
  },
  Se: {
    file: 'Selenium black.jpg',
    caption: 'Selenyum · siyah allotrop',
    fallback: ['Se-black.jpg', 'Selenium.jpg'],
  },
  Be: {
    file: 'Beryllium-2.jpg',
    caption: 'Berilyum · metal numunesi',
    fallback: ['Beryllium chunk.jpg'],
  },
  V: {
    file: 'Vanadium crystal bar and 1cm3 cube.jpg',
    caption: 'Vanadyum · kristal çubuk ve 1 cm³ küp',
    fallback: ['Vanadium-crystal bar.jpg'],
  },
  Mo: {
    file: 'Molybdenum crystaline fragment and 1cm3 cube.jpg',
    caption: 'Molibden · kristal parça ve 1 cm³ küp',
    fallback: ['Molybdenum.jpg'],
  },
  Cd: {
    file: 'Cadmium-crystal bar and 1cm3 cube.jpg',
    caption: 'Kadmiyum · kristal çubuk ve 1 cm³ küp',
    fallback: ['Cadmium.jpg'],
  },
  Sc: {
    file: 'Scandium sublimed dendritic and 1cm3 cube.jpg',
    caption: 'Skandiyum · süblime dendrit ve 1 cm³ küp',
    fallback: ['Scandium.jpg'],
  },
  Y: {
    file: 'Yttrium sublimed dendritic and 1cm3 cube.jpg',
    caption: 'İtriyum · süblime dendrit ve 1 cm³ küp',
    fallback: ['Yttrium.jpg'],
  },
  Zr: {
    file: 'Zirconium crystal bar and 1cm3 cube.jpg',
    caption: 'Zirkonyum · kristal çubuk ve 1 cm³ küp',
    fallback: ['Zirconium.jpg'],
  },
  Nb: {
    file: 'Niobium crystals and 1cm3 cube.jpg',
    caption: 'Niyobyum · kristaller ve 1 cm³ küp',
    fallback: ['Niobium.jpg'],
  },
  Ru: {
    file: 'Ruthenium crystals.jpg',
    caption: 'Rutenyum · kristal numune',
    fallback: ['Ruthenium powder pressed melted.jpg'],
  },
  Hf: {
    file: 'Hafnium crystal bar and 1cm3 cube.jpg',
    caption: 'Hafniyum · kristal çubuk ve 1 cm³ küp',
    fallback: ['Hafnium.jpg'],
  },
  Ta: {
    file: 'Tantalum single crystal and 1cm3 cube.jpg',
    caption: 'Tantal · tek kristal ve 1 cm³ küp',
    fallback: ['Tantalum.jpg'],
  },
  Re: {
    file: 'Rhenium single crystal bar and 1cm3 cube.jpg',
    caption: 'Renyum · tek kristal çubuk ve 1 cm³ küp',
    fallback: ['Rhenium.jpg'],
  },
  Os: {
    file: 'Osmium crystals.jpg',
    caption: 'Osmiyum · kristal numune',
    fallback: ['Osmium-2.jpg'],
  },
  I: {
    file: 'Iodine-sample.jpg',
    caption: 'İyot · kristal numune',
    fallback: ['Sample of iodine.jpg', 'Iodine crystals.jpg'],
  },
  Br: {
    file: 'Bromine vial.jpg',
    caption: 'Brom · sıvı numune',
    fallback: ['Bromine.jpg', 'Bromine_ampoule.jpg'],
  },
  Lu: {
    file: 'Lutetium sublimed dendritic and 1cm3 cube.jpg',
    caption: 'Lütesyum · süblime dendrit ve 1 cm³ küp',
    fallback: ['Lutetium.jpg'],
  },
  Tm: {
    file: 'Thulium sublimed dendritic and 1cm3 cube.jpg',
    caption: 'Tulyum · süblime dendrit ve 1 cm³ küp',
    fallback: ['Thulium.jpg'],
  },
  Dy: {
    file: 'Ultrapure dysprosium dendrites.jpg',
    caption: 'Disprozyum · ultrapure dendritler',
    fallback: ['Dysprosium-2.jpg', 'Dysprosium (66 Dy).jpg'],
  },
  Rb: {
    file: 'RbMetal.JPG',
    caption: 'Rubidyum · metal numunesi',
    fallback: ['Rubidium.jpg', 'Rubidium amp.jpg'],
  },
  Sr: {
    file: 'Strontium.jpg',
    caption: 'Stronsiyum · argon altında saf metal',
  },
  Hg: {
    file: 'Pouring liquid mercury bionerd.jpg',
    caption: 'Cıva · sıvı metal numunesi',
    fallback: ['Mercury pour.jpg'],
  },
  U: {
    file: 'Ames Process uranium biscuit.jpg',
    caption: 'Uranyum · Ames süreci metal bisküvisi',
    fallback: ['Uranium metal grain.jpg'],
  },
};

// Null these: misleading as "pure element specimen" (solution / mineral / display toy / foil).
const NULL_OUT = {
  Pm: 'solution vial, not a metal specimen',
  Tc: 'gold-foil powder mount, not a readable specimen',
  S_mineral_kept_if_replaced: null,
};

async function tryDownload(symbol, spec) {
  const files = [spec.file, ...(spec.fallback ?? [])];
  let lastErr;
  for (const file of files) {
    try {
      console.log(`  try ${symbol} ← ${file}`);
      const photo = await downloadPhoto(symbol, file, spec.caption);
      console.log(`  ok ${symbol} ${photo.url} (${photo.license})`);
      return { file, photo };
    } catch (e) {
      lastErr = e;
      console.warn(`  fail ${file}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

async function main() {
  const selections = JSON.parse(await readFile(selectionsPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const report = { replaced: [], nulled: [], failed: [], kept: [] };

  // Null Pm / Tc first
  for (const [sym, reason] of Object.entries({
    Pm: 'Pm-147 solution looks like other actinide solutions; not a metal specimen',
    Tc: 'tiny gold-foil powder mount; unreadable as element specimen',
  })) {
    if (manifest[sym]?.photo) {
      const url = manifest[sym].photo.url;
      const name = url.split('/').pop();
      try {
        await unlink(new URL(name, publicDir));
      } catch {
        /* already gone */
      }
      manifest[sym].photo = null;
      delete selections[sym];
      report.nulled.push({ sym, reason, was: url });
      console.log(`nulled ${sym}: ${reason}`);
    }
  }

  for (const [sym, spec] of Object.entries(REPLACE)) {
    try {
      const { file, photo } = await tryDownload(sym, spec);
      // remove old extension sibling if changed
      const old = manifest[sym]?.photo?.url;
      if (old && old !== photo.url) {
        try {
          await unlink(new URL(old.split('/').pop(), publicDir));
        } catch {
          /* ok */
        }
      }
      manifest[sym] ??= { photo: null, structure: null, wikipedia: null };
      manifest[sym].photo = photo;
      selections[sym] = {
        file,
        caption: spec.caption,
        ...(photo.source_url.includes('images-of-elements')
          ? { attribution_url: photo.source_url, creator: photo.creator }
          : {}),
      };
      report.replaced.push({ sym, file, url: photo.url, license: photo.license });
      await new Promise((r) => setTimeout(r, 2500));
    } catch (e) {
      report.failed.push({ sym, error: e.message });
      console.warn(`FAILED ${sym}: ${e.message}`);
    }
  }

  await writeFile(selectionsPath, JSON.stringify(selections, null, 2) + '\n');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    new URL('artifacts/local/photo-fix-report.json', root),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    `\nDone. replaced=${report.replaced.length} nulled=${report.nulled.length} failed=${report.failed.length}`,
  );
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
