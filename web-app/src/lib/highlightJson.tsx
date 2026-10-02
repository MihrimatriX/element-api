import type { ReactNode } from "react";

const TOKEN_CLASS = {
  key: "text-syntax-key",
  string: "text-syntax-string",
  number: "text-syntax-number",
  literal: "text-syntax-literal",
  punct: "text-syntax-punct",
} as const;

const JSON_TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[[{}\],]|:/g;

/** Dependency-free JSON syntax colouring: wraps tokens in spans with the syntax token colours. */
export function highlightJson(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  const paint = (text: string, kind: keyof typeof TOKEN_CLASS) =>
    nodes.push(
      <span key={key++} className={TOKEN_CLASS[kind]}>
        {text}
      </span>,
    );

  for (const match of source.matchAll(JSON_TOKEN)) {
    const [token, quoted, colonAfter, literal] = match;
    if (match.index > cursor) nodes.push(source.slice(cursor, match.index));
    if (quoted !== undefined) {
      paint(quoted, colonAfter ? "key" : "string");
      if (colonAfter) paint(colonAfter, "punct");
    } else if (literal !== undefined) {
      paint(literal, "literal");
    } else if (/^-?\d/.test(token)) {
      paint(token, "number");
    } else {
      paint(token, "punct");
    }
    cursor = match.index + token.length;
  }
  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}

/** Pretty-prints any value as JSON (strings pass through unchanged). */
export function jsonSource(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
