import type { ReactNode } from "react";

/** Cheap JSON token paint for mineral terminals — no deps. */
export function highlightJson(source: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[[{}\],]|:/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(source))) {
    if (m.index > last) {
      out.push(source.slice(last, m.index));
    }
    const [full, str, colonAfter, lit] = m;
    if (str != null) {
      out.push(
        <span key={i++} className={colonAfter ? "jw-key" : "jw-str"}>
          {str}
        </span>,
      );
      if (colonAfter) out.push(colonAfter);
    } else if (lit != null) {
      out.push(
        <span key={i++} className="jw-lit">
          {lit}
        </span>,
      );
    } else if (/^-?\d/.test(full)) {
      out.push(
        <span key={i++} className="jw-num">
          {full}
        </span>,
      );
    } else {
      out.push(
        <span key={i++} className="jw-punc">
          {full}
        </span>,
      );
    }
    last = m.index + full.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

export function jsonSource(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
