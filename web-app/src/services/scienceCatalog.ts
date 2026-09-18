import catalogElements from '../../../catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json' with { type: 'json' };
import { asScienceCompound, knownCompounds } from './chemistry.ts';

// ponytail: local JSON is the Vite fallback when /api/v2 is down. STATIC_ELEMENTS stays the layout seed — do not add a fourth copy.

const localElements = catalogElements;
const localCompounds = knownCompounds.map(asScienceCompound);
const elementsById = new Map(localElements.map(e => [e.symbol.toLowerCase(), e]));
const compoundsById = new Map(localCompounds.map(c => [c.slug, c]));

export function localScience(kind: 'elements' | 'compounds', id?: string) {
  if (kind === 'elements') return id ? elementsById.get(id.toLowerCase()) : localElements;
  return id ? compoundsById.get(id.toLowerCase()) : localCompounds;
}

export function mergeRemote<T>(kind: 'elements' | 'compounds', remote: T[]): T[] {
  if (kind === 'elements') {
    const map = new Map(localElements.map(e => [e.symbol.toLowerCase(), e as unknown as T]));
    for (const row of remote) {
      const symbol = (row as { symbol?: string }).symbol;
      if (symbol) map.set(symbol.toLowerCase(), row);
    }
    return [...map.values()];
  }
  const map = new Map(localCompounds.map(c => [c.slug, c as unknown as T]));
  for (const row of remote) {
    const slug = (row as { slug?: string }).slug;
    if (slug) map.set(slug, row);
  }
  return [...map.values()];
}
