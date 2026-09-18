import catalog from '../data/lessons.json' with { type: 'json' };
import { normalizeDiscoveries } from './lab.ts';

export interface LessonQuestion {
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}
export interface Lesson {
  id: string;
  title: string;
  description: string;
  discoveries: string[];
  questions: LessonQuestion[];
}
export const lessons = catalog as Lesson[];
export interface LearningProgress { discoveries: string[]; lessons: string[] }
export function normalizeLearning(value: unknown): LearningProgress {
  const record = value && typeof value === 'object' ? value as Partial<LearningProgress> : {};
  const discoveries = normalizeDiscoveries(record.discoveries);
  return { discoveries, lessons: lessons.filter(l => Array.isArray(record.lessons) && record.lessons.includes(l.id) && l.discoveries.every(id => discoveries.includes(id))).map(l => l.id) };
}
export function mergeLearning(a: LearningProgress, b: LearningProgress): LearningProgress {
  return normalizeLearning({ discoveries: [...a.discoveries, ...b.discoveries], lessons: [...a.lessons, ...b.lessons] });
}
