/**
 * Applies the curated "atlas" layer (editorial text, media, external links) on top of the
 * checked-in scientific element and compound snapshots.
 *
 *   node deploy/scripts/refresh-atlas.mjs                      offline: re-apply curated content only
 *   node deploy/scripts/refresh-atlas.mjs --fetch              also fetch Wikipedia links, photos, structures
 *   node deploy/scripts/refresh-atlas.mjs --fetch --only=Fe,Au,water
 *   node deploy/scripts/refresh-atlas.mjs --fetch --structures-only
 *
 * The running API never calls these sources; it only serves the files written here.
 */
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { elementEditorial, compoundEditorial } from '../data/atlas-editorial.mjs';

const root = new URL('../../', import.meta.url);
const elementPath = new URL('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json', root);
const compoundPath = new URL('compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json', root);
const manifestPath = new URL('deploy/data/atlas-media.json', root);
const photoSelectionsPath = new URL('deploy/data/atlas-photo-selections.json', root);
const publicDir = new URL('web-app/public/media/atlas/', root);

const USER_AGENT = 'ElementAPI/1.0 (educational atlas)';
const REQUEST_TIMEOUT_MS = 20000;
const FETCH_ATTEMPTS = 3;
const SNAPSHOT_RENAME_ATTEMPTS = 5;
/** Wikipedia titles per API call; batching avoids one request per element page. */
const WIKIPEDIA_BATCH_SIZE = 5;
const PAUSE_BETWEEN_BATCHES_MS = 1200;
/** Above bismuth (Z=83) the page image is rarely a real specimen, so only curated photos are used. */
const MAX_ATOMIC_NUMBER_FOR_PAGE_IMAGE = 83;
/** File names that point to diagrams, portraits or lamps instead of an element sample. */
const NON_SPECIMEN_IMAGE_PATTERN = /portrait|diagram|electron|spectr|tube|lamp|discharge|atomic|symbol|bohr|icon/i;

/** Licences we accept for re-hosted photos (FAL is common on Alchemist-hp element samples). */
export const OPEN_LICENSE_PATTERN = /CC BY|CC0|Public domain|FAL|Free Art License/i;
/** Image MIME types we are willing to store under web-app/public/media/atlas. */
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const today = () => new Date().toISOString().slice(0, 10);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emptyManifestEntry = () => ({ photo: null, structure: null, wikipedia: null });

/** Strips HTML tags and the &amp; entity from Wikimedia metadata values. */
export const cleanMetadataText = (value) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();

/** Maps an allowed image MIME type to the file extension used on disk. */
export function imageExtension(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

/**
 * Writes a JSON snapshot only when its content changed, via a temp file + rename so a reader
 * never sees half a file. The rename is retried because Windows can briefly lock the target.
 */
async function writeSnapshot(path, records) {
  if (!path.href.startsWith(root.href)) throw Error('Snapshot outside project');
  const text = JSON.stringify(records, null, 2) + '\n';
  const currentText = await readFile(path, 'utf8').catch(() => null);
  if (currentText === text) return;

  const temporary = new URL(path.href + '.tmp');
  await writeFile(temporary, text);
  for (let attempt = 0; attempt < SNAPSHOT_RENAME_ATTEMPTS; attempt++) {
    try {
      await rename(temporary, path);
      return;
    } catch (error) {
      if (attempt === SNAPSHOT_RENAME_ATTEMPTS - 1) throw error;
      await pause(1000);
    }
  }
}

/** How long to wait before retrying a failed HTTP status (honours Retry-After on 429, min 10 s). */
function retryDelayMs(response) {
  if (response.status !== 429) return 1000;
  const retryAfterSeconds = Number(response.headers.get('retry-after') || 10);
  return Math.max(10000, retryAfterSeconds * 1000);
}

/** fetch() with a polite User-Agent, a timeout and up to three attempts; throws on the last failure. */
async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.delay = retryDelayMs(response);
        throw error;
      }
      return response;
    } catch (error) {
      if (attempt === FETCH_ATTEMPTS - 1) throw error;
      await pause(Math.min(30000, error.delay ?? 1000));
    }
  }
}

const fetchJson = async (url) => (await fetchWithRetry(url)).json();

/**
 * Parses a chemical formula such as "Ca(OH)2" into [{ symbol, count }] in first-seen order.
 * Supports nested parentheses with multipliers; throws on anything else (charges, hydrates, ...).
 */
export function composition(formula) {
  const unsupported = () => Error(`Unsupported formula ${formula}`);
  const addTo = (totals, symbol, count) => totals.set(symbol, (totals.get(symbol) ?? 0) + count);

  // Reads from `index` until the end of the text or a closing ')' and returns the totals plus where it stopped.
  const parseGroup = (text, index = 0) => {
    const totals = new Map();
    while (index < text.length && text[index] !== ')') {
      if (text[index] === '(') {
        const inner = parseGroup(text, index + 1);
        index = inner.index;
        if (text[index] !== ')') throw unsupported();
        index += 1;
        const digits = text.slice(index).match(/^\d+/);
        const multiplier = digits ? Number(digits[0]) : 1;
        index += digits ? digits[0].length : 0;
        for (const [symbol, count] of inner.totals) addTo(totals, symbol, count * multiplier);
      } else {
        const token = text.slice(index).match(/^([A-Z][a-z]?)(\d*)/);
        if (!token) throw unsupported();
        index += token[0].length;
        addTo(totals, token[1], Number(token[2] || 1));
      }
    }
    return { totals, index };
  };

  const { totals, index } = parseGroup(formula);
  if (index !== formula.length) throw unsupported();
  return [...totals].map(([symbol, count]) => ({ symbol, count }));
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Returns the Commons file to use as an element's specimen photo, or null.
 * A curated selection always wins (it may even have a non-English name, e.g. "Kobalt").
 * Otherwise the Wikipedia page image is accepted only when it names the element and does not
 * look like a portrait, diagram or discharge tube: no photo is better than a misleading one.
 */
function specimenPhotoFile(record, page, selection) {
  if (!record.symbol) return null;
  const sample = selection?.file ?? page.pageimage;
  if (!sample) return null;
  if (selection) return sample;
  const isLightElement = record.atomic_number <= MAX_ATOMIC_NUMBER_FOR_PAGE_IMAGE;
  if (!isLightElement) return null;
  if (!new RegExp(escapeRegExp(record.names.en), 'i').test(sample)) return null;
  if (NON_SPECIMEN_IMAGE_PATTERN.test(sample)) return null;
  return sample;
}

/**
 * Downloads an openly licensed Commons photo into web-app/public/media/atlas and returns its
 * manifest entry. Returns undefined when the licence or MIME type is not acceptable.
 */
async function downloadSpecimenPhoto(key, record, sample, selection) {
  const infoUrl = new URL('https://commons.wikimedia.org/w/api.php');
  infoUrl.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    titles: `File:${sample}`,
    iiprop: 'url|extmetadata',
    iiurlwidth: '640',
  });
  const info = (await fetchJson(infoUrl)).query.pages[0].imageinfo?.[0];
  const metadata = info?.extmetadata;
  if (!info || !metadata) return undefined;
  if (!OPEN_LICENSE_PATTERN.test(cleanMetadataText(metadata.LicenseShortName?.value))) return undefined;

  const image = await fetchWithRetry(info.thumburl ?? info.url);
  const mime = image.headers.get('content-type');
  if (!PHOTO_MIME_TYPES.includes(mime)) return undefined;

  const filename = `${key.toLowerCase()}.${imageExtension(mime)}`;
  await writeFile(new URL(filename, publicDir), Buffer.from(await image.arrayBuffer()));
  return {
    url: `/media/atlas/${filename}`,
    caption: selection?.caption ?? `${record.names.tr} · madde fotoğrafı`,
    source_url: selection?.attribution_url ?? info.descriptionurl,
    creator: selection?.creator ?? cleanMetadataText(metadata.Artist?.value),
    license: cleanMetadataText(metadata.LicenseShortName?.value),
    license_url: cleanMetadataText(metadata.LicenseUrl?.value) || null,
    retrieved_at: today(),
  };
}

/** Wikipedia query for up to WIKIPEDIA_BATCH_SIZE titles: resolves redirects, page image and the Turkish link. */
function wikipediaBatchUrl(titles) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'pageimages|langlinks',
    piprop: 'name',
    lllang: 'tr',
    lllimit: 'max',
    titles: titles.join('|'),
  });
  return url;
}

/** Follows the normalisation and redirect hops Wikipedia reported for a requested title. */
function resolvedTitle(query, requestedTitle) {
  let title = requestedTitle;
  for (const hop of [...(query.normalized ?? []), ...(query.redirects ?? [])]) {
    if (hop.from === title) title = hop.to;
  }
  return title;
}

/** Fetches Wikipedia links (and element photos) for the records, saving the manifest after each batch. */
async function refreshWikipediaAndPhotos(records, manifest, photoSelections) {
  for (let start = 0; start < records.length; start += WIKIPEDIA_BATCH_SIZE) {
    const batch = records.slice(start, start + WIKIPEDIA_BATCH_SIZE);
    const result = await fetchJson(wikipediaBatchUrl(batch.map((record) => record.names.en)));

    for (const record of batch) {
      const title = resolvedTitle(result.query, record.names.en);
      const page = result.query.pages.find((candidate) => candidate.title === title && !candidate.missing);
      const key = record.symbol ?? record.slug;
      manifest[key] ??= emptyManifestEntry();
      if (!page) continue;

      // Prefer the Turkish article; fall back to English.
      const turkishLink = page.langlinks?.find((link) => link.lang === 'tr');
      const language = turkishLink ? 'tr' : 'en';
      manifest[key].wikipedia = {
        url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(turkishLink?.title ?? page.title)}`,
        language,
      };

      const selection = photoSelections[key];
      const sample = specimenPhotoFile(record, page, selection);
      if (!sample) continue;
      try {
        const photo = await downloadSpecimenPhoto(key, record, sample, selection);
        if (photo) manifest[key].photo = photo;
      } catch (error) {
        console.warn(`Photo ${key}: ${error.message}; keeping previous image or schema fallback.`);
      }
    }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Wikipedia: ${Math.min(start + WIKIPEDIA_BATCH_SIZE, records.length)}/${records.length}`);
    await pause(PAUSE_BETWEEN_BATCHES_MS);
  }
}

/** Downloads the PubChem 2D structure PNG for every compound that does not have one yet. */
async function refreshStructures(compounds, manifest) {
  for (const compound of compounds) {
    const entry = (manifest[compound.slug] ??= emptyManifestEntry());
    if (entry.structure) continue;

    const cid = compound.identifiers.pubchem_cid;
    const image = await fetchWithRetry(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=500x500`);
    if (!image.headers.get('content-type')?.startsWith('image/png')) throw Error(`Invalid structure ${compound.slug}`);
    await writeFile(new URL(`${compound.slug}-structure.png`, publicDir), Buffer.from(await image.arrayBuffer()));
    entry.structure = {
      url: `/media/atlas/${compound.slug}-structure.png`,
      caption: `${compound.names.tr} · PubChem 2D yapı gösterimi`,
      source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      creator: 'PubChem / NCBI',
      license: 'PubChem generated structure depiction',
      license_url: 'https://pubchem.ncbi.nlm.nih.gov/docs/usage-guidelines',
      retrieved_at: today(),
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}

const bySymbol = (left, right) => left.symbol.localeCompare(right.symbol);

/**
 * Copies editorial text, media and links into one snapshot record. For compounds it also sets the
 * display formula and checks that it has the same atoms as PubChem's molecular formula.
 */
function applyAtlasLayer(record, manifest, knownEditorial) {
  const isElement = Boolean(record.symbol);
  const key = record.symbol ?? record.slug;
  const copy = isElement ? elementEditorial[key] : (compoundEditorial[key] ?? knownEditorial[key]);
  if (!copy) throw Error(`Missing editorial ${key}`);

  const compoundPubchemUrl = isElement ? null : `https://pubchem.ncbi.nlm.nih.gov/compound/${record.identifiers.pubchem_cid}`;
  const reference = isElement
    ? record.provenance.sources.find((source) => source.id === 'rsc' || source.name.includes('RSC') || source.url.includes('rsc.org'))?.url
    : compoundPubchemUrl;
  const entry = manifest[key];

  record.editorial = {
    summary: copy.summary,
    uses: copy.uses,
    story: copy.story,
    sources: [{ name: isElement ? 'Royal Society of Chemistry' : 'PubChem / NCBI', url: reference ?? record.provenance.sources[0].url }],
  };
  record.media = { photo: entry?.photo ?? null, structure: entry?.structure ?? null };
  record.external_links = {
    wikipedia: entry?.wikipedia ?? null,
    pubchem: isElement ? 'https://pubchem.ncbi.nlm.nih.gov/element/' + encodeURIComponent(record.names.en) : compoundPubchemUrl,
  };

  if (!isElement) {
    record.display_formula = copy.display_formula;
    record.composition = composition(copy.display_formula);
    const pubchemAtoms = JSON.stringify(composition(record.molecular_properties.molecular_formula).sort(bySymbol));
    const displayAtoms = JSON.stringify([...record.composition].sort(bySymbol));
    if (pubchemAtoms !== displayAtoms) throw Error(`Formula mismatch ${key}`);
  }

  const atlasFields = ['editorial', 'media', 'external_links', ...(isElement ? [] : ['display_formula', 'composition'])];
  record.provenance.editorial_fields = [...new Set([...record.provenance.editorial_fields, ...atlasFields])];
}

/**
 * Re-applies the atlas layer to both snapshots and, with fetchMedia, refreshes media first.
 * @param {boolean} fetchMedia      download Wikipedia links, photos and structures
 * @param {string[]} only           limit fetching to these symbols/slugs (empty = all)
 * @param {boolean} structuresOnly  skip Wikipedia/photos and only fetch missing structures
 */
export async function refreshAtlas(fetchMedia = false, only = [], structuresOnly = false) {
  const photoSelections = JSON.parse(await readFile(photoSelectionsPath, 'utf8'));
  const knownCompounds = JSON.parse(await readFile(new URL('web-app/src/data/known-compounds.json', root), 'utf8'));
  const knownEditorial = Object.fromEntries(
    knownCompounds.map((compound) => [
      compound.slug,
      { display_formula: compound.formula, summary: compound.summary, uses: compound.uses, story: null },
    ]),
  );
  const elements = JSON.parse(await readFile(elementPath, 'utf8'));
  const compounds = JSON.parse(await readFile(compoundPath, 'utf8'));
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    /* first run: no manifest yet */
  }
  await mkdir(publicDir, { recursive: true });

  if (fetchMedia) {
    const isSelected = (record) => only.length === 0 || only.includes(record.symbol ?? record.slug);
    if (!structuresOnly) {
      await refreshWikipediaAndPhotos(elements.filter(isSelected), manifest, photoSelections);
      await refreshWikipediaAndPhotos(compounds.filter(isSelected), manifest, photoSelections);
    }
    await refreshStructures(compounds.filter(isSelected), manifest);
  }

  for (const record of [...elements, ...compounds]) applyAtlasLayer(record, manifest, knownEditorial);

  await writeSnapshot(elementPath, elements);
  await writeSnapshot(compoundPath, compounds);
  const photoCount = Object.values(manifest).filter((entry) => entry.photo).length;
  const structureCount = Object.values(manifest).filter((entry) => entry.structure).length;
  console.log(`Atlas: ${elements.length} elements, ${compounds.length} compounds; ${photoCount} photos, ${structureCount} structures.`);
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  const onlyArgument = process.argv.find((argument) => argument.startsWith('--only='));
  const only = onlyArgument?.slice('--only='.length).split(',') ?? [];
  await refreshAtlas(process.argv.includes('--fetch'), only, process.argv.includes('--structures-only'));
}
