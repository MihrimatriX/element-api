// Writes public/sitemap.xml: every compound, the static pages and all 118
// elements. `__SITE_URL__` is replaced with the public origin at container start
// (docker-entrypoint.sh) or by finalize-static.mjs.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webApp = join(dirname(fileURLToPath(import.meta.url)), "..");

// Element symbols come from the compact `rawElements` string ("Z,Sym,Name,…|…")
// in elementData.ts; renaming that constant breaks this script.
const elementData = readFileSync(join(webApp, "src/services/elementData.ts"), "utf8");
const rawElements = elementData.match(/const rawElements\s*=\s*"([^"]+)"/);
if (!rawElements) throw new Error("rawElements not found in elementData.ts");
const symbols = rawElements[1]
  .split("|")
  .map((row) => row.split(",")[1].toLowerCase());
if (symbols.length !== 118)
  throw new Error(`expected 118 symbols, got ${symbols.length}`);

const pages = [
  "/",
  "/periodic",
  "/compounds",
  "/market",
  "/shop",
  "/docs",
  "/developers",
  "/lab",
  "/lab/formula",
  "/lab/detective",
  "/hakkinda",
  "/nasil",
  "/sozluk",
  "/data",
  "/demo",
];

const compounds = JSON.parse(
  readFileSync(
    join(
      webApp,
      "../compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json",
    ),
    "utf8",
  ),
);

const paths = [
  ...compounds.map((compound) => `/compound/${compound.slug}`),
  ...pages,
  ...symbols.map((symbol) => `/element/${symbol}`),
];
const urls = paths.map((path) => `  <url><loc>__SITE_URL__${path}</loc></url>`);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(join(webApp, "public/sitemap.xml"), xml);
console.log(`sitemap.xml: ${urls.length} URLs (${symbols.length} elements)`);
