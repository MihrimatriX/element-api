import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
assert.match(robots, /Sitemap:\s*__SITE_URL__\/sitemap\.xml/);
assert.match(robots, /Disallow:\s*\/login/);
assert.match(robots, /Disallow:\s*\/account/);
assert.match(robots, /Disallow:\s*\/settings/);

const sitemap = readFileSync(join(root, "public/sitemap.xml"), "utf8");
assert.match(sitemap, /__SITE_URL__\/lab</);
assert.match(sitemap, /__SITE_URL__\/periodic</);
assert.doesNotMatch(sitemap, /__SITE_URL__\/stack</);
assert.doesNotMatch(sitemap, /__SITE_URL__\/login</);

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
assert.match(indexHtml, /property="og:image"[^>]*__SITE_URL__\/og\.png/);
assert.match(indexHtml, /name="twitter:card"[^>]*summary_large_image/);
assert.match(indexHtml, /application\/ld\+json/);
assert.match(indexHtml, /"@type":\s*"Organization"/);
assert.match(indexHtml, /"@type":\s*"WebSite"/);

assert.ok(existsSync(join(root, "public/og.png")), "public/og.png missing");

const seo = readFileSync(join(root, "src/components/Seo.tsx"), "utf8");
assert.match(seo, /theme-color.*#0E1110/);
assert.match(seo, /twitter:image:alt/);
assert.match(seo, /noIndex/);

const login = readFileSync(join(root, "src/pages/Login.tsx"), "utf8");
assert.match(login, /noIndex/);
const account = readFileSync(join(root, "src/pages/Account.tsx"), "utf8");
assert.match(account, /noIndex/);
const landing = readFileSync(join(root, "src/pages/Landing.tsx"), "utf8");
assert.match(landing, /"@type":\s*"WebSite"/);

const writeSitemap = readFileSync(
  join(root, "scripts/write-sitemap.mjs"),
  "utf8",
);
assert.match(writeSitemap, /"\/lab"/);
assert.doesNotMatch(writeSitemap, /"\/stack"/);

console.log("seo-static.test: ok");
