import { letterAnchor, TURKISH_ALPHABET } from "./glossary-terms";

interface GlossaryIndexProps {
  /** Letters that currently have at least one term. */
  activeLetters: ReadonlySet<string>;
}

/**
 * A–Z bar that sticks under the site header as its continuation (same translucent
 * canvas and blur). Letters with terms jump to their section; the rest stay visible
 * but inert so the alphabet keeps its shape.
 */
export function GlossaryIndex({ activeLetters }: GlossaryIndexProps) {
  return (
    <nav
      aria-label="Harf dizini"
      className="sticky top-14 z-10 mt-6 border-b border-line bg-canvas/80 backdrop-blur-md"
    >
      {/* Narrow screens scroll the row sideways; the right-edge fade hints at more letters. */}
      <div className="-mx-2 flex overflow-x-auto py-1.5 [scrollbar-width:none] max-lg:mask-r-from-85%">
        {TURKISH_ALPHABET.map((letter) =>
          activeLetters.has(letter) ? (
            <a
              key={letter}
              href={`#${letterAnchor(letter)}`}
              className="grid h-8 min-w-8 shrink-0 place-items-center rounded-md font-mono text-sm text-ink transition-colors hover:bg-surface-2 hover:text-brand-ink focus-visible:-outline-offset-2"
            >
              {letter}
            </a>
          ) : (
            <span
              key={letter}
              aria-hidden="true"
              className="grid h-8 min-w-8 shrink-0 place-items-center font-mono text-sm text-ink-4"
            >
              {letter}
            </span>
          ),
        )}
      </div>
    </nav>
  );
}
