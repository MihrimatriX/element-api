/**
 * Curated Commons replacements + intentional nulls for misleading atlas photos.
 * Policy (content-and-games-plan): gas tube / mineral / product / solution must not
 * be labeled as a pure element specimen photo. Prefer null over a lie.
 *
 * For every symbol in REPLACE it tries the preferred Commons file, then its fallbacks, and stores
 * the first openly licensed photo in web-app/public/media/atlas plus both atlas JSON files.
 * A summary is written to artifacts/local/photo-fix-report.json.
 *
 * Run: node deploy/scripts/fix-element-photos.mjs
 * Then re-apply the atlas layer: node deploy/scripts/refresh-atlas.mjs
 *   (add --fetch --only=<symbols> to re-download those photos through refresh-atlas as well)
 */
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { cleanMetadataText, imageExtension, OPEN_LICENSE_PATTERN, PHOTO_MIME_TYPES } from './refresh-atlas.mjs';

const root = new URL('../../', import.meta.url);
const selectionsPath = new URL('deploy/data/atlas-photo-selections.json', root);
const manifestPath = new URL('deploy/data/atlas-media.json', root);
const publicDir = new URL('web-app/public/media/atlas/', root);
const USER_AGENT = 'ElementAPI/1.0 (educational atlas photo fix)';
const COMMONS_ATTEMPTS = 5;
/** Commons answers rate-limited requests with an HTML page; back off 8 s, 16 s, 24 s, ... */
const COMMONS_BACKOFF_STEP_MS = 8000;
const PAUSE_AFTER_FAILED_FILE_MS = 2000;
const PAUSE_AFTER_REPLACED_SYMBOL_MS = 2500;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Returns Commons imageinfo (urls, licence metadata) for a file; retries while Commons is rate limiting. */
async function commonsInfo(file) {
  const infoUrl = new URL('https://commons.wikimedia.org/w/api.php');
  infoUrl.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    titles: `File:${file}`,
    iiprop: 'url|extmetadata|mime|size',
    iiurlwidth: '640',
  });
  for (let attempt = 0; attempt < COMMONS_ATTEMPTS; attempt++) {
    const response = await fetch(infoUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(25000),
    });
    const text = await response.text();
    if (text.startsWith('{')) {
      const page = JSON.parse(text).query.pages[0];
      const info = page.imageinfo?.[0];
      if (!info) throw new Error(`No imageinfo for ${file}`);
      return info;
    }
    await pause(COMMONS_BACKOFF_STEP_MS * (attempt + 1));
  }
  throw new Error(`Commons rate-limited for ${file}`);
}

/** Downloads one Commons file as <symbol>.<ext> and returns its manifest photo entry; throws when unusable. */
async function downloadPhoto(symbol, file, caption) {
  const info = await commonsInfo(file);
  const metadata = info.extmetadata;
  const license = cleanMetadataText(metadata?.LicenseShortName?.value);
  if (!OPEN_LICENSE_PATTERN.test(license)) {
    throw new Error(`Bad license ${license} for ${file}`);
  }
  const image = await fetch(info.thumburl ?? info.url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  const mime = image.headers.get('content-type');
  if (!PHOTO_MIME_TYPES.includes(mime)) {
    throw new Error(`Bad mime ${mime} for ${file}`);
  }
  const filename = `${symbol.toLowerCase()}.${imageExtension(mime)}`;
  await writeFile(new URL(filename, publicDir), Buffer.from(await image.arrayBuffer()));
  return {
    url: `/media/atlas/${filename}`,
    caption,
    source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
    creator: cleanMetadataText(metadata?.Artist?.value),
    license,
    license_url: cleanMetadataText(metadata?.LicenseUrl?.value) || null,
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
  Pm: 'Pm-147 solution looks like other actinide solutions; not a metal specimen',
  Tc: 'tiny gold-foil powder mount; unreadable as element specimen',
};

/** Deletes a photo file from web-app/public/media/atlas; a file that is already gone is fine. */
async function removeAtlasFile(photoUrl) {
  try {
    await unlink(new URL(photoUrl.split('/').pop(), publicDir));
  } catch {
    /* already gone */
  }
}

/** Tries the preferred file, then each fallback; returns the first that downloads, else rethrows the last error. */
async function tryDownload(symbol, spec) {
  const candidateFiles = [spec.file, ...(spec.fallback ?? [])];
  let lastError;
  for (const file of candidateFiles) {
    try {
      console.log(`  try ${symbol} ← ${file}`);
      const photo = await downloadPhoto(symbol, file, spec.caption);
      console.log(`  ok ${symbol} ${photo.url} (${photo.license})`);
      return { file, photo };
    } catch (error) {
      lastError = error;
      console.warn(`  fail ${file}: ${error.message}`);
      await pause(PAUSE_AFTER_FAILED_FILE_MS);
    }
  }
  throw lastError;
}

/** Removes the misleading photos, downloads the replacements and writes both atlas files plus a report. */
async function main() {
  const selections = JSON.parse(await readFile(selectionsPath, 'utf8'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  // `kept` stays empty; it is part of the report format.
  const report = { replaced: [], nulled: [], failed: [], kept: [] };

  for (const [symbol, reason] of Object.entries(NULL_OUT)) {
    const photoUrl = manifest[symbol]?.photo?.url;
    if (!manifest[symbol]?.photo) continue;
    await removeAtlasFile(photoUrl);
    manifest[symbol].photo = null;
    delete selections[symbol];
    report.nulled.push({ sym: symbol, reason, was: photoUrl });
    console.log(`nulled ${symbol}: ${reason}`);
  }

  for (const [symbol, spec] of Object.entries(REPLACE)) {
    try {
      const { file, photo } = await tryDownload(symbol, spec);
      // A new MIME type means a new extension, so the old file would be left behind.
      const previousUrl = manifest[symbol]?.photo?.url;
      if (previousUrl && previousUrl !== photo.url) await removeAtlasFile(previousUrl);
      manifest[symbol] ??= { photo: null, structure: null, wikipedia: null };
      manifest[symbol].photo = photo;
      selections[symbol] = { file, caption: spec.caption };
      report.replaced.push({ sym: symbol, file, url: photo.url, license: photo.license });
      await pause(PAUSE_AFTER_REPLACED_SYMBOL_MS);
    } catch (error) {
      report.failed.push({ sym: symbol, error: error.message });
      console.warn(`FAILED ${symbol}: ${error.message}`);
    }
  }

  await writeFile(selectionsPath, JSON.stringify(selections, null, 2) + '\n');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const reportDir = new URL('artifacts/local/', root);
  await mkdir(reportDir, { recursive: true });
  await writeFile(new URL('photo-fix-report.json', reportDir), JSON.stringify(report, null, 2) + '\n');
  console.log(
    `\nDone. replaced=${report.replaced.length} nulled=${report.nulled.length} failed=${report.failed.length}`,
  );
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
