import { STATIC_ELEMENTS, categoryLabels, type ElementItem } from './elementData.ts';
import {
  atomCount,
  compoundBySlug,
  formulaText,
  geometryOf,
  knownCompounds,
  parseFormula,
  prune,
  type Counts,
  type KnownCompound,
} from './chemistry.ts';

export const GAMES_KEY = 'elementapi:games:v1';
export interface GameProgress { formula: string[]; detective: string[] }

export function normalizeGames(value: unknown): GameProgress {
  const record = value && typeof value === 'object' ? value as Partial<GameProgress> : {};
  const formula = Array.isArray(record.formula) ? [...new Set(record.formula.filter((id): id is string => typeof id === 'string' && id in compoundBySlug))] : [];
  const known = new Set(STATIC_ELEMENTS.map(e => e.symbol));
  const detective = Array.isArray(record.detective) ? [...new Set(record.detective.filter((id): id is string => typeof id === 'string' && known.has(id)))] : [];
  return { formula, detective };
}
export function parseGames(raw: string | null): GameProgress {
  try { return normalizeGames(JSON.parse(raw ?? 'null')); } catch { return { formula: [], detective: [] }; }
}
export function loadGames(storage: Pick<Storage, 'getItem'>): GameProgress {
  try { return parseGames(storage.getItem(GAMES_KEY)); } catch { return { formula: [], detective: [] }; }
}
export function saveGames(storage: Pick<Storage, 'setItem'>, progress: GameProgress): boolean {
  try {
    storage.setItem(GAMES_KEY, JSON.stringify(normalizeGames(progress)));
    return true;
  } catch { return false; }
}
export function rememberGame(kind: 'formula' | 'detective', id: string): GameProgress {
  let current: GameProgress = { formula: [], detective: [] };
  try { current = loadGames(localStorage); } catch { /* Storage disabled. */ }
  const next = normalizeGames({ ...current, [kind]: [...current[kind], id] });
  try { saveGames(localStorage, next); } catch { /* quota */ }
  return next;
}

const NAMES: Record<string, string> = Object.fromEntries(STATIC_ELEMENTS.map(e => [e.symbol, e.name]));

export function formulaTier(compound: KnownCompound): 1 | 2 | 3 {
  const counts = parseFormula(compound.formula);
  const n = atomCount(counts);
  const k = Object.keys(counts).length;
  if (n <= 3 && k <= 2) return 1;
  if (n <= 7 && k <= 3) return 2;
  return 3;
}
export function unlockedFormulaTier(solved: number): 1 | 2 | 3 {
  if (solved >= 8) return 3;
  if (solved >= 3) return 2;
  return 1;
}
export function formulaPool(tier: 1 | 2 | 3): KnownCompound[] {
  return knownCompounds.filter(c => formulaTier(c) <= tier);
}
export function pickFormula(solved: string[], prefer?: string | null): KnownCompound {
  if (prefer && prefer in compoundBySlug) return compoundBySlug[prefer];
  const cap = unlockedFormulaTier(solved.length);
  const known = new Set(solved);
  const pool = formulaPool(cap).filter(c => !known.has(c.slug));
  const fallback = knownCompounds.filter(c => !known.has(c.slug));
  const list = pool.length ? pool : fallback;
  return list[0] ?? knownCompounds[0];
}
export function gradeFormula(slug: string, input: Counts): { ok: boolean; message: string } {
  const compound = compoundBySlug[slug];
  if (!compound) return { ok: false, message: 'Bu bileşik katalogda yok.' };
  const expected = parseFormula(compound.formula);
  const guess = prune(input);
  const symbols = [...new Set([...Object.keys(expected), ...Object.keys(guess)])];
  const wrong = symbols.filter(symbol => (guess[symbol] ?? 0) !== expected[symbol]);
  if (!wrong.length) {
    const unit = geometryOf(compound);
    const kind = unit.id === 'ionic_lattice' || unit.id === 'network' ? 'formül birimi' : 'molekül';
    return { ok: true, message: `Doğru ${kind}: ${formulaText(compound.formula)}.` };
  }
  const detail = wrong.map(symbol => {
    const want = expected[symbol] ?? 0;
    const got = guess[symbol] ?? 0;
    const name = (NAMES[symbol] ?? symbol).toLocaleLowerCase('tr');
    if (got === 0) return `${name} eksik (olmalı ${want})`;
    if (want === 0) return `${name} bu formülde yok`;
    return `${name} ${got > want ? 'fazla' : 'eksik'} (sen ${got}, olmalı ${want})`;
  });
  const unit = geometryOf(compound).id === 'ionic_lattice' || geometryOf(compound).id === 'network'
    ? ' Bu bir formül birimidir; ayrı molekül değildir.'
    : '';
  return { ok: false, message: `Atom sayıları tutmuyor: ${detail.join('; ')}.${unit}` };
}

export interface DetectiveItem {
  element: ElementItem;
  clues: string[];
  choices: ElementItem[];
}
function leak(text: string, el: ElementItem): boolean {
  const needles = [el.name, el.symbol, el.nameEn].filter((v): v is string => !!v);
  const hay = text.toLocaleLowerCase('tr');
  return needles.some(n => hay.includes(n.toLocaleLowerCase('tr')));
}
export function detectiveClues(el: ElementItem): string[] {
  const clues = [
    `Periyodik tabloda ${categoryLabels[el.category] ?? 'bir element'}.`,
    `Periyot ${el.period}, grup ${el.group}.`,
  ];
  if (el.phase && el.phase !== '—') clues.push(`Oda koşullarında ${el.phase}.`);
  const used = knownCompounds.find(c => parseFormula(c.formula)[el.symbol] && !leak(c.nameTr, el));
  if (used) clues.push(`${used.nameTr} kaydının formülünde yer alır.`);
  if (el.summary && !leak(el.summary, el)) clues.push(el.summary);
  clues.push(el.symbol.length === 1 ? 'Sembolü tek harften oluşur.' : 'Sembolü iki harften oluşur.');
  return clues;
}
export function detectivePool(): ElementItem[] {
  return STATIC_ELEMENTS.filter(e => e.atomicNumber <= 36 && detectiveClues(e).length >= 3);
}
export function buildDetective(symbol: string, solved: string[]): DetectiveItem | undefined {
  const element = STATIC_ELEMENTS.find(e => e.symbol === symbol);
  if (!element) return undefined;
  const clues = detectiveClues(element);
  if (clues.length < 2) return undefined;
  const others = detectivePool().filter(e => e.symbol !== symbol);
  const same = others.filter(e => e.category === element.category || e.period === element.period);
  const rest = (same.length >= 3 ? same : others).slice(0, 8);
  const choices = [element, ...rest.filter(e => e.symbol !== symbol).slice(0, 3)];
  while (choices.length < 4) {
    const extra = others.find(e => !choices.some(c => c.symbol === e.symbol));
    if (!extra) break;
    choices.push(extra);
  }
  const seen = new Set(solved);
  choices.sort((a, b) => Number(seen.has(a.symbol)) - Number(seen.has(b.symbol)) || a.atomicNumber - b.atomicNumber);
  return { element, clues, choices };
}
export function pickDetective(solved: string[], prefer?: string | null): DetectiveItem {
  if (prefer) {
    const preferred = buildDetective(prefer, solved);
    if (preferred) return preferred;
  }
  const known = new Set(solved);
  const pool = detectivePool().filter(e => !known.has(e.symbol));
  const next = (pool[0] ?? detectivePool()[0] ?? STATIC_ELEMENTS[0]).symbol;
  return buildDetective(next, solved)!;
}
export function gradeDetective(symbol: string, guess: string): { ok: boolean; message: string } {
  const target = STATIC_ELEMENTS.find(e => e.symbol === symbol);
  const given = guess.trim();
  if (!target) return { ok: false, message: 'Bu element havuzda yok.' };
  const fold = (v: string) => v.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ok = fold(given) === fold(target.symbol) || fold(given) === fold(target.name);
  return ok
    ? { ok: true, message: `${target.name} (${target.symbol}).` }
    : { ok: false, message: 'Bu ipuçları o elementi göstermiyor. Başka ipucu aç veya farklı bir ad dene.' };
}
export function recordKindQuestion(compound: KnownCompound): { question: string; choices: string[]; answer: number; explanation: string } {
  const id = geometryOf(compound).id;
  const unit = id === 'ionic_lattice' || id === 'network';
  return {
    question: `${compound.nameTr} kaydı neyi gösterir?`,
    choices: ['Ayrı bir molekülü', 'İyon veya ağ formül birimini', 'Bir karışım veya çözeltiyi'],
    answer: unit ? 1 : 0,
    explanation: geometryOf(compound).note,
  };
}
