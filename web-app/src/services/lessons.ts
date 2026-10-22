import catalog from "../data/lessons.json" with { type: "json" };
import { normalizeDiscoveries } from "./lab.ts";

/** One multiple-choice question that closes a learning route. */
export interface LessonQuestion {
  question: string;
  choices: string[];
  /** Index of the correct choice. */
  answer: number;
  /** Shown once the route is completed. */
  explanation: string;
}

/** A learning route: compounds to discover in the lab, then its questions. */
export interface Lesson {
  id: string;
  title: string;
  description: string;
  /** Compound slugs the learner must discover before the questions open. */
  discoveries: string[];
  questions: LessonQuestion[];
}

/** The learning routes (`src/data/lessons.json`, also read by identity-service). */
export const lessons = catalog as Lesson[];

/** What the notebook stores: discovered compound slugs and completed route ids. */
export interface LearningProgress {
  discoveries: string[];
  lessons: string[];
}

/**
 * Turns untrusted input (storage, server, an imported file) into valid progress:
 * unknown compounds are dropped, and a route only counts as completed when all of
 * its compounds are discovered.
 */
export function normalizeLearning(value: unknown): LearningProgress {
  const record =
    value && typeof value === "object"
      ? (value as Partial<LearningProgress>)
      : {};
  const discoveries = normalizeDiscoveries(record.discoveries);
  const completed = Array.isArray(record.lessons) ? record.lessons : [];
  return {
    discoveries,
    lessons: lessons
      .filter(
        (lesson) =>
          completed.includes(lesson.id) &&
          lesson.discoveries.every((id) => discoveries.includes(id)),
      )
      .map((lesson) => lesson.id),
  };
}

/** Union of two progress records (this device and the account, or a restored backup). */
export function mergeLearning(
  first: LearningProgress,
  second: LearningProgress,
): LearningProgress {
  return normalizeLearning({
    discoveries: [...first.discoveries, ...second.discoveries],
    lessons: [...first.lessons, ...second.lessons],
  });
}
