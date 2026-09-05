import { useEffect } from 'react';
import { getPublicSiteUrl } from '../config';

type JsonLd = Record<string, unknown>;

type SeoProps = {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  jsonLd?: JsonLd | JsonLd[];
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${CSS.escape(key)}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${CSS.escape(rel)}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function withContext(node: JsonLd): JsonLd {
  return node['@context'] ? node : { '@context': 'https://schema.org', ...node };
}

export default function Seo({ title, description, path, ogType = 'website', jsonLd }: SeoProps) {
  const json = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const origin = getPublicSiteUrl();
    const pathPart = path.startsWith('/') ? path : `/${path}`;
    const url = `${origin}${pathPart}`;
    const image = `${origin}/og.png`;

    document.title = title;
    document.documentElement.lang = 'tr';

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index, follow');
    upsertMeta('name', 'theme-color', '#2B5F5E');
    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:locale', 'tr_TR');
    upsertMeta('property', 'og:site_name', 'ElementAPI');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', 'ElementAPI — element verisi ve fiyat');
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);

    const scriptId = 'json-ld-seo';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const parsed = json ? JSON.parse(json) as JsonLd | JsonLd[] : null;
    if (parsed) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      const payload = Array.isArray(parsed) ? parsed.map(withContext) : withContext(parsed);
      script.textContent = JSON.stringify(payload);
    } else if (script) {
      script.remove();
    }
  }, [title, description, path, ogType, json]);

  return null;
}
