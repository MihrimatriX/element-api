import {
  STATIC_ELEMENTS,
  categoryLabels,
  type ElementItem,
} from "./elementData.ts";
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
} from "./chemistry.ts";
import { foldTurkish } from "../lib/text.ts";

/** localStorage key of the side-game scores (kept apart from the discovery notebook). */
export const GAMES_KEY = "elementapi:games:v1";

/** Solved puzzle ids per side game: compound slugs and element symbols. */
export interface GameProgress {
  formula: string[];
  detective: string[];
}

const EMPTY_GAMES: GameProgress = { formula: [], detective: [] };
const elementSymbols = new Set(STATIC_ELEMENTS.map((e) => e.symbol));
const elementNames: Record<string, string> = Object.fromEntries(
  STATIC_ELEMENTS.map((e) => [e.symbol, e.name]),
);

/** Unique string ids that pass `isKnown`; anything else in storage is dropped. */
function knownIds(value: unknown, isKnown: (id: string) => boolean): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((id): id is string => typeof id === "string" && isKnown(id)),
    ),
  ];
}

/** Cleans stored progress: unknown slugs/symbols and duplicates are removed. */
export function normalizeGames(value: unknown): GameProgress {
  const record =
    value && typeof value === "object" ? (value as Partial<GameProgress>) : {};
  return {
    formula: knownIds(record.formula, (id) => id in compoundBySlug),
    detective: knownIds(record.detective, (id) => elementSymbols.has(id)),
  };
}

/** Parses the stored JSON; corrupt or missing data gives empty progress. */
export function parseGames(raw: string | null): GameProgress {
  try {
    return normalizeGames(JSON.parse(raw ?? "null"));
  } catch {
    return EMPTY_GAMES;
  }
}

/** Reads progress from a Storage; a throwing storage gives empty progress. */
export function loadGames(storage: Pick<Storage, "getItem">): GameProgress {
  try {
    return parseGames(storage.getItem(GAMES_KEY));
  } catch {
    return EMPTY_GAMES;
  }
}

/** Writes progress; returns false when storage is unavailable or full. */
export function saveGames(
  storage: Pick<Storage, "setItem">,
  progress: GameProgress,
): boolean {
  try {
    storage.setItem(GAMES_KEY, JSON.stringify(normalizeGames(progress)));
    return true;
  } catch {
    return false;
  }
}

/** Progress from this browser's localStorage; empty when site data is blocked. */
export function readGames(): GameProgress {
  try {
    return loadGames(localStorage);
  } catch {
    return EMPTY_GAMES;
  }
}

/** Records one solved puzzle and returns the new progress (also when it could not be saved). */
export function rememberGame(
  kind: keyof GameProgress,
  id: string,
): GameProgress {
  const current = readGames();
  const next = normalizeGames({ ...current, [kind]: [...current[kind], id] });
  try {
    saveGames(localStorage, next);
  } catch {
    // Storage blocked: the score lives for this page view only.
  }
  return next;
}

/**
 * First item ranked after `currentRank`, wrapping round to the first item.
 * Skipping walks forward through the list instead of bouncing between two items.
 */
function nextAfter<T>(
  items: T[],
  rank: (item: T) => number,
  currentRank: number,
): T | undefined {
  return items.find((item) => rank(item) > currentRank) ?? items[0];
}

/** True for ionic or network solids, whose formula is a formula unit rather than a molecule. */
export function isFormulaUnit(compound: KnownCompound): boolean {
  const { id } = geometryOf(compound);
  return id === "ionic_lattice" || id === "network";
}

/** Difficulty: 1 = up to 3 atoms of 2 elements, 2 = up to 7 atoms of 3 elements, 3 = the rest. */
export function formulaTier(compound: KnownCompound): 1 | 2 | 3 {
  const counts = parseFormula(compound.formula);
  const atoms = atomCount(counts);
  const elements = Object.keys(counts).length;
  if (atoms <= 3 && elements <= 2) return 1;
  if (atoms <= 7 && elements <= 3) return 2;
  return 3;
}

/** Highest tier open after `solved` correct formulas (tier 2 at 3, tier 3 at 8). */
export function unlockedFormulaTier(solved: number): 1 | 2 | 3 {
  if (solved >= 8) return 3;
  if (solved >= 3) return 2;
  return 1;
}

/** Catalogue compounds up to and including `tier`, in catalogue order. */
export function formulaPool(tier: 1 | 2 | 3): KnownCompound[] {
  return knownCompounds.filter((c) => formulaTier(c) <= tier);
}

const compoundRank = new Map(knownCompounds.map((c, index) => [c.slug, index]));

/**
 * Next compound for "Formülü kur". `prefer` (a slug from the URL) wins when it exists.
 * Otherwise the next unsolved compound of the unlocked tiers after `current`, so
 * "Başka kayıt" always moves on; when everything is solved it cycles the catalogue.
 */
export function pickFormula(
  solved: string[],
  prefer?: string | null,
  current?: string,
): KnownCompound {
  if (prefer && prefer in compoundBySlug) return compoundBySlug[prefer];
  const known = new Set(solved);
  const notCurrent = (c: KnownCompound) => c.slug !== current;
  const open = (c: KnownCompound) => notCurrent(c) && !known.has(c.slug);
  const unlocked = formulaPool(unlockedFormulaTier(solved.length)).filter(open);
  const anyOpen = knownCompounds.filter(open);
  const candidates = [unlocked, anyOpen, knownCompounds.filter(notCurrent)].find(
    (list) => list.length > 0,
  );
  const currentRank = current ? (compoundRank.get(current) ?? -1) : -1;
  return (
    nextAfter(candidates ?? knownCompounds, (c) => compoundRank.get(c.slug) ?? 0, currentRank) ??
    knownCompounds[0]
  );
}

/** Checks the atom counts against the compound; the message names every wrong element. */
export function gradeFormula(
  slug: string,
  input: Counts,
): { ok: boolean; message: string } {
  const compound = compoundBySlug[slug];
  if (!compound) return { ok: false, message: "Bu bileşik katalogda yok." };
  const expected = parseFormula(compound.formula);
  const guess = prune(input);
  const symbols = [...new Set([...Object.keys(expected), ...Object.keys(guess)])];
  const wrong = symbols.filter((symbol) => (guess[symbol] ?? 0) !== expected[symbol]);
  const unit = isFormulaUnit(compound);
  if (!wrong.length) {
    return {
      ok: true,
      message: `Doğru ${unit ? "formül birimi" : "molekül"}: ${formulaText(compound.formula)}.`,
    };
  }
  const detail = wrong.map((symbol) => {
    const want = expected[symbol] ?? 0;
    const got = guess[symbol] ?? 0;
    const name = (elementNames[symbol] ?? symbol).toLocaleLowerCase("tr");
    if (got === 0) return `${name} eksik (olmalı ${want})`;
    if (want === 0) return `${name} bu formülde yok`;
    return `${name} ${got > want ? "fazla" : "eksik"} (sen ${got}, olmalı ${want})`;
  });
  const unitNote = unit ? " Bu bir formül birimidir; ayrı molekül değildir." : "";
  return {
    ok: false,
    message: `Atom sayıları tutmuyor: ${detail.join("; ")}.${unitNote}`,
  };
}

/** One detective case: the element, its clues in reveal order and four candidates. */
export interface DetectiveItem {
  element: ElementItem;
  clues: string[];
  choices: ElementItem[];
}

/** Element by symbol, ignoring case ("fe", "FE" and "Fe" all find iron). */
export function findElement(symbol: string | null | undefined): ElementItem | undefined {
  const wanted = symbol?.trim().toLowerCase();
  if (!wanted) return undefined;
  return STATIC_ELEMENTS.find((e) => e.symbol.toLowerCase() === wanted);
}

/** True when `text` would give the answer away (mentions the name or symbol). */
function leaks(text: string, element: ElementItem): boolean {
  const haystack = text.toLocaleLowerCase("tr");
  return [element.name, element.symbol, element.nameEn]
    .filter((needle): needle is string => Boolean(needle))
    .some((needle) => haystack.includes(needle.toLocaleLowerCase("tr")));
}

/** Clues from vague to specific; none of them names the element. */
export function detectiveClues(element: ElementItem): string[] {
  const family = categoryLabels[element.category]?.toLocaleLowerCase("tr") ?? "element";
  const clues = [
    `Periyodik tabloda bir ${family}.`,
    `Periyot ${element.period}, grup ${element.group}.`,
  ];
  if (element.phase && element.phase !== "—")
    clues.push(`Oda koşullarında ${element.phase}.`);
  const usedIn = knownCompounds.find(
    (c) => parseFormula(c.formula)[element.symbol] && !leaks(c.nameTr, element),
  );
  if (usedIn) clues.push(`${usedIn.nameTr} kaydının formülünde yer alır.`);
  if (element.summary && !leaks(element.summary, element)) clues.push(element.summary);
  clues.push(
    element.symbol.length === 1
      ? "Sembolü tek harften oluşur."
      : "Sembolü iki harften oluşur.",
  );
  return clues;
}

const detectiveElements = STATIC_ELEMENTS.filter(
  (e) => e.atomicNumber <= 36 && detectiveClues(e).length >= 3,
);

/** Elements the detective game draws from: the first 36 with at least three clues. */
export function detectivePool(): ElementItem[] {
  return detectiveElements;
}

/** Builds the case for `symbol` (any case); undefined for an unknown element. */
export function buildDetective(
  symbol: string,
  solved: string[],
): DetectiveItem | undefined {
  const element = findElement(symbol);
  if (!element) return undefined;
  const clues = detectiveClues(element);
  if (clues.length < 2) return undefined;
  const others = detectiveElements.filter((e) => e.symbol !== element.symbol);
  const similar = others.filter(
    (e) => e.category === element.category || e.period === element.period,
  );
  const choices = [element, ...(similar.length >= 3 ? similar : others).slice(0, 3)];
  for (const extra of others) {
    if (choices.length >= 4) break;
    if (!choices.includes(extra)) choices.push(extra);
  }
  const seen = new Set(solved);
  choices.sort(
    (a, b) =>
      Number(seen.has(a.symbol)) - Number(seen.has(b.symbol)) ||
      a.atomicNumber - b.atomicNumber,
  );
  return { element, clues, choices };
}

/**
 * Next detective case. `prefer` (a symbol from the URL, any case) wins when it exists.
 * Otherwise the next unsolved pool element after `current`, so "Pas geç" always
 * moves on; when everything is solved it cycles the pool.
 */
export function pickDetective(
  solved: string[],
  prefer?: string | null,
  current?: string,
): DetectiveItem {
  const preferred = prefer ? buildDetective(prefer, solved) : undefined;
  if (preferred) return preferred;
  const known = new Set(solved);
  const notCurrent = (e: ElementItem) => e.symbol !== current;
  const open = detectiveElements.filter((e) => notCurrent(e) && !known.has(e.symbol));
  const candidates = open.length ? open : detectiveElements.filter(notCurrent);
  const currentRank = findElement(current)?.atomicNumber ?? 0;
  const next =
    nextAfter(candidates, (e) => e.atomicNumber, currentRank) ??
    detectiveElements[0] ??
    STATIC_ELEMENTS[0];
  return buildDetective(next.symbol, solved) as DetectiveItem;
}

/** Accepts the symbol or the Turkish name, ignoring case and Turkish diacritics. */
export function gradeDetective(
  symbol: string,
  guess: string,
): { ok: boolean; message: string } {
  const target = findElement(symbol);
  if (!target) return { ok: false, message: "Bu element havuzda yok." };
  const given = foldTurkish(guess);
  const ok = given === foldTurkish(target.symbol) || given === foldTurkish(target.name);
  return ok
    ? { ok: true, message: `${target.name} (${target.symbol}).` }
    : {
        ok: false,
        message:
          "Bu ipuçları o elementi göstermiyor. Başka ipucu aç veya farklı bir ad dene.",
      };
}

/** Short quiz after a discovery: does this record describe a molecule or a formula unit? */
export interface KindQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

/** Builds the molecule-vs-formula-unit question for a discovered compound. */
export function recordKindQuestion(compound: KnownCompound): KindQuestion {
  return {
    question: `${compound.nameTr} kaydı neyi gösterir?`,
    choices: [
      "Ayrı bir molekülü",
      "İyon veya ağ formül birimini",
      "Bir karışım veya çözeltiyi",
    ],
    answer: isFormulaUnit(compound) ? 1 : 0,
    explanation: geometryOf(compound).note,
  };
}
