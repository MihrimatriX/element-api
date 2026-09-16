import { normalizeDiscoveries } from './lab.ts';

export const lessons = [
  { id: 'everyday', title: 'Günlük maddeler', description: 'Su, karbondioksit ve amonyakta aynı elementin farklı bağlarını keşfet.', discoveries: ['h2o', 'co2', 'nh3'], question: 'H₂O formülü bize ne söyler?', choices: ['İki hidrojen ve bir oksijen atomu', 'İki oksijen ve bir hidrojen atomu', 'Hidrojen ve oksijenin eşit kütleleri'], answer: 0, explanation: 'Alt indis atom sayısını belirtir. Atom sayısı oranı, kütle oranı değildir.' },
  { id: 'salts', title: 'Tuzlar ve iyonlar', description: 'Sodyum klorür, potasyum klorür ve hidrojen klorür arasındaki bağlantıları incele.', discoveries: ['nacl', 'hcl', 'kcl'], question: 'NaCl kristalindeki 1:1 oranı neyi anlatır?', choices: ['Ayrı NaCl moleküllerini', 'Sodyum ve klorür iyonlarının oranını', 'Eşit gram sodyum ve kloru'], answer: 1, explanation: 'İyonik kristalde formül birimi iyon oranını gösterir; ayrı bir molekülü temsil etmez.' },
  { id: 'oxides', title: 'Metaller ve oksitler', description: 'Magnezyum, kalsiyum ve demirin oksijenle bağlantılarını kur.', discoveries: ['mgo', 'cao', 'fe2o3'], question: 'Gerçek pas için hangi ifade doğrudur?', choices: ['Her zaman tek ve saf bir bileşiktir', 'Yalnız demir metalinden oluşur', 'Farklı oksit ve hidroksitler içerebilir'], answer: 2, explanation: 'Oyunda hematiti keşfediyoruz. Gerçek pasın bileşimi ortam koşullarına göre değişir.' },
] as const;
export interface LearningProgress { discoveries: string[]; lessons: string[] }
export function normalizeLearning(value: unknown): LearningProgress {
  const record = value && typeof value === 'object' ? value as Partial<LearningProgress> : {};
  const discoveries = normalizeDiscoveries(record.discoveries);
  return { discoveries, lessons: lessons.filter(l => Array.isArray(record.lessons) && record.lessons.includes(l.id) && l.discoveries.every(id => discoveries.includes(id))).map(l => l.id) };
}
export function mergeLearning(a: LearningProgress, b: LearningProgress): LearningProgress {
  return normalizeLearning({ discoveries: [...a.discoveries, ...b.discoveries], lessons: [...a.lessons, ...b.lessons] });
}
