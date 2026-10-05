import { useEffect } from "react";
import { getPublicSiteUrl } from "../config";

type JsonLd = Record<string, unknown>;

type SeoProps = {
  /** Full document title, e.g. "Periyodik tablo · ElementAPI". */
  title: string;
  description: string;
  /** Route path for the canonical link and og:url; the leading slash is optional. */
  path: string;
  /** Private or dead-end pages: robots "noindex, nofollow". */
  noIndex?: boolean;
  ogType?: "website" | "article";
  /** schema.org node(s); `@context` is added when missing. */
  jsonLd?: JsonLd | JsonLd[];
};

const SHARE_IMAGE_ALT = "ElementAPI · kimya atlası";
const JSON_LD_ID = "json-ld-seo";

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
) {
  let meta = document.head.querySelector<HTMLMetaElement>(
    `meta[${attribute}="${CSS.escape(key)}"]`,
  );
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute(attribute, key);
    document.head.appendChild(meta);
  }
  meta.content = content;
}

function upsertLink(rel: string, href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${CSS.escape(rel)}"]`,
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

function withContext(node: JsonLd): JsonLd {
  return node["@context"]
    ? node
    : { "@context": "https://schema.org", ...node };
}

/** Writes the page's JSON-LD script, or removes it when the page has none. */
function syncJsonLd(json: string) {
  let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
  if (!json) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.id = JSON_LD_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  const parsed = JSON.parse(json) as JsonLd | JsonLd[];
  const payload = Array.isArray(parsed)
    ? parsed.map(withContext)
    : withContext(parsed);
  script.textContent = JSON.stringify(payload);
}

/**
 * Head metadata for the current page: title, description, robots, canonical,
 * Open Graph, Twitter card and JSON-LD. Renders nothing.
 */
export default function Seo({
  title,
  description,
  path,
  ogType = "website",
  jsonLd,
  noIndex = false,
}: SeoProps) {
  // Serialised so a new but equal jsonLd object does not re-run the effect.
  const json = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const origin = getPublicSiteUrl();
    const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
    const image = `${origin}/og.png`;

    document.title = title;
    document.documentElement.lang = "tr";

    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow",
    );
    upsertLink("canonical", url);

    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:locale", "tr_TR");
    upsertMeta("property", "og:site_name", "ElementAPI");
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:image:alt", SHARE_IMAGE_ALT);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    upsertMeta("name", "twitter:image:alt", SHARE_IMAGE_ALT);

    syncJsonLd(json);
  }, [title, description, path, ogType, json, noIndex]);

  return null;
}
