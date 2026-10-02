import { useEffect, useState } from "react";
import { SCIENCE_BASE_URL } from "../config";

/**
 * Client for the public scientific API (`/api/v2`) with an offline fallback:
 * when the service is unreachable, records come from the JSON snapshot bundled
 * in `scienceCatalog.ts`.
 */

/** Any JSON value, as returned by the scientific API. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** A full record viewed as plain JSON (used to render every section generically). */
export type ScientificRecord = { [key: string]: JsonValue };

/** A photo or structure drawing with its licence and attribution. */
export interface AtlasMedia {
  url: string;
  caption: string;
  source_url: string;
  creator: string;
  license: string;
  license_url: string | null;
  retrieved_at: string;
}

/** Editorial text, media and outbound links shared by element and compound records. */
export interface AtlasFields {
  editorial: {
    summary: string;
    uses: string[];
    story: string | null;
    sources: { name: string; url: string }[];
  };
  media: { photo: AtlasMedia | null; structure: AtlasMedia | null };
  external_links: {
    wikipedia: { url: string; language: string } | null;
    pubchem: string;
  };
}

/** The element fields the UI reads; the full record has many more (see `ScientificRecord`). */
export interface ScientificElement extends AtlasFields {
  id: string;
  symbol: string;
  atomic_number: number;
  names: { tr: string; en: string };
  classification: {
    category: string;
    period: number;
    group: number | null;
    block: string;
    series: string;
  };
  layout: { row: number; column: number };
  atomic_properties: {
    atomic_mass: number | null;
    electron_configuration: { short: string | null };
    electrons_per_shell: number[];
    electronegativity: { pauling: number | null };
  };
  thermodynamic_properties: {
    standard_state: string | null;
    melting_point: { k: number | null; c: number | null };
    boiling_point: { k: number | null; c: number | null };
    density_g_cm3: { reported: number | null };
  };
}

/** The compound fields the UI reads. */
export interface ScientificCompound extends AtlasFields {
  id: string;
  slug: string;
  names: { tr: string; en: string; iupac: string };
  identifiers: { pubchem_cid: number };
  molecular_properties: {
    molecular_formula: string;
    molecular_weight_g_mol: number;
  };
  display_formula: string;
  composition: { symbol: string; count: number }[];
}

type ScienceKind = "elements" | "compounds";

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** Renders formula digits as Unicode subscripts: "H2O" → "H₂O". */
export const displayFormula = (value: string) =>
  value.replace(/\d/g, (digit) => SUBSCRIPT_DIGITS[Number(digit)]);

const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_QUERY = "pageSize=100&view=summary";

// The ~1.4 MB offline snapshot is its own chunk, fetched on the first science view instead of with every page.
let catalogModule: typeof import("./scienceCatalog.ts") | undefined;
const loadCatalog = () =>
  import("./scienceCatalog.ts").then((module) => (catalogModule = module));

/** Absolute API URL for a path such as `elements/fe`. */
export const scienceUrl = (path: string) => `${SCIENCE_BASE_URL}/${path}`;

/** In-flight and settled responses by path; a failed request is evicted so it can be retried. */
const responseCache = new Map<string, Promise<unknown>>();

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(scienceUrl(path), {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    credentials: "omit",
  });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "Kayıt bulunamadı."
        : "Bilimsel veri servisine ulaşılamadı.",
    );
  return response.json();
}

function getCached<T>(path: string): Promise<T> {
  let pending = responseCache.get(path);
  if (!pending) {
    pending = fetchJson(path).catch((error) => {
      responseCache.delete(path);
      throw error;
    });
    responseCache.set(path, pending);
  }
  return pending as Promise<T>;
}

/**
 * Every record of a kind (summary view, all pages in parallel), merged over
 * the local snapshot. Falls back to the snapshot alone when the API fails.
 */
export async function listScience<T>(kind: ScienceKind): Promise<T[]> {
  const local = loadCatalog().catch(() => undefined);
  try {
    const first = await getCached<{ info: { pages: number }; results: T[] }>(
      `${kind}?${PAGE_QUERY}`,
    );
    const later = await Promise.all(
      Array.from({ length: first.info.pages - 1 }, (_, i) =>
        getCached<{ results: T[] }>(`${kind}?${PAGE_QUERY}&page=${i + 2}`),
      ),
    );
    const rows = [first, ...later].flatMap((page) => page.results);
    return (await local)?.mergeRemote(kind, rows) ?? rows;
  } catch (error) {
    const fallback = await local;
    if (!fallback) throw error;
    return fallback.localScience(kind) as T[];
  }
}

/** The local snapshot's record (or list), or `undefined` when the chunk failed to load. */
function localFallback<T>(kind: ScienceKind, id?: string): Promise<T | undefined> {
  return loadCatalog().then(
    (module) => module.localScience(kind, id) as T | undefined,
    () => undefined,
  );
}

interface RemoteResult<T> {
  key: string;
  data?: T;
  error?: string;
}

/**
 * One record (`id` given) or the whole list of a kind. The local snapshot
 * paints first once its chunk loads; the API response replaces it. `error`
 * is set only when neither source has the record.
 */
export function useScience<T>(kind: ScienceKind, id?: string) {
  const key = `${kind}/${id ?? ""}`;
  // Re-render once the snapshot chunk has loaded so `local` picks it up.
  const [, setCatalogReady] = useState(Boolean(catalogModule));
  const local = catalogModule?.localScience(kind, id) as T | undefined;
  const [remote, setRemote] = useState<RemoteResult<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!catalogModule)
      loadCatalog().then(
        () => active && setCatalogReady(true),
        () => undefined,
      );
    const request = id
      ? getCached<T>(`${kind}/${encodeURIComponent(id)}`)
      : (listScience(kind) as Promise<T>);
    request
      .then((data) => {
        if (active) setRemote({ key, data });
      })
      .catch(async (error: Error) => {
        const fallback = await localFallback<T>(kind, id);
        if (active)
          setRemote({
            key,
            data: fallback,
            error: fallback ? undefined : error.message,
          });
      });
    return () => {
      active = false;
    };
  }, [kind, id, key, attempt]);

  const current = remote?.key === key ? remote : null;
  return {
    data: current ? current.data : local,
    error: current?.error,
    retry: () => {
      setRemote(null);
      setAttempt((count) => count + 1);
    },
  };
}

const scienceNumber = new Intl.NumberFormat("tr-TR", {
  maximumSignificantDigits: 7,
});

/** Formats a measured value in Turkish notation (7 significant digits), or "—" when unknown. */
export const formatScience = (value: number | null | undefined, unit = "") =>
  value == null
    ? "—"
    : `${scienceNumber.format(value)}${unit ? ` ${unit}` : ""}`;

/** Turkish labels for `standard_state`. */
export const phaseLabels: Record<string, string> = {
  solid: "Katı",
  liquid: "Sıvı",
  gas: "Gaz",
  unknown: "Bilinmiyor",
};
