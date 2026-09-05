import { useEffect, useState } from 'react';
import { API_ORIGIN } from '../config';
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type ScientificRecord = { [key: string]: JsonValue };
export interface ScientificElement {
  id: string; symbol: string; atomic_number: number; names: { tr: string; en: string };
  classification: { category: string; period: number; group: number | null; block: string; series: string };
  layout: { row: number; column: number };
  atomic_properties: { atomic_mass: number | null; electron_configuration: { short: string | null }; electronegativity: { pauling: number | null } };
  thermodynamic_properties: { standard_state: string | null; melting_point: { k: number | null; c: number | null }; boiling_point: { k: number | null; c: number | null }; density_g_cm3: { reported: number | null } };
}
export interface ScientificCompound {
  id: string; slug: string; names: { tr: string; en: string; iupac: string }; identifiers: { pubchem_cid: number };
  molecular_properties: { molecular_formula: string; molecular_weight_g_mol: number };
}
const cache = new Map<string, Promise<unknown>>();
export const scienceUrl = (path: string) => `${API_ORIGIN}/api/v2/${path}`;
async function get<T>(path: string): Promise<T> {
  if (!cache.has(path)) cache.set(path, fetch(scienceUrl(path), { signal: AbortSignal.timeout(15000), credentials: 'omit' }).then(async response => {
    if (!response.ok) throw new Error(response.status === 404 ? 'Kayıt bulunamadı.' : 'Bilimsel veri servisine ulaşılamadı.');
    return response.json();
  }).catch(error => { cache.delete(path); throw error; }));
  return cache.get(path) as Promise<T>;
}
export async function listScience<T>(kind: 'elements' | 'compounds'): Promise<T[]> {
  const first = await get<{ info: { pages: number }; results: T[] }>(`${kind}?pageSize=100&view=summary`);
  const rest = await Promise.all(Array.from({ length: first.info.pages - 1 }, (_, i) => get<{ results: T[] }>(`${kind}?pageSize=100&view=summary&page=${i + 2}`)));
  return [...first.results, ...rest.flatMap(page => page.results)];
}
export function useScience<T>(kind: 'elements' | 'compounds', id?: string) {
  const key = `${kind}/${id ?? ''}`;
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    const promise = id ? get<T>(`${kind}/${encodeURIComponent(id)}`) : listScience(kind) as Promise<T>;
    promise.then(data => { if (active) setState({ key, data }); }).catch(error => { if (active) setState({ key, error: error.message }); });
    return () => { active = false; };
  }, [kind, id, key, attempt]);
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, retry: () => { setState({ key }); retry(n => n + 1); } };
}
export const formatScience = (value: number | null | undefined, unit = '') => value == null ? '—' : `${new Intl.NumberFormat('tr-TR', { maximumSignificantDigits: 7 }).format(value)}${unit ? ` ${unit}` : ''}`;
export const phaseLabels: Record<string, string> = { solid: 'Katı', liquid: 'Sıvı', gas: 'Gaz', unknown: 'Bilinmiyor' };
