import { useMemo, useState, type ReactNode } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { highlightJson } from "@/lib/highlightJson";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/** One snippet of a CodeBlock. `language: "json"` turns on syntax colouring. */
export interface CodeSample {
  label: string;
  code: string;
  language?: string;
}

interface CodeBlockProps {
  /** Single snippet. Ignored when `samples` is given. */
  code?: string;
  /** Several snippets shown as tabs (curl / JavaScript / Python). */
  samples?: CodeSample[];
  /** Language of `code`; "json" turns on syntax colouring. */
  language?: string;
  /** Header text for a single snippet (file name, endpoint). */
  title?: ReactNode;
  /** Max body height in px before it scrolls. Default 440. */
  maxHeight?: number;
  className?: string;
}

function CodeBody({ code, language }: { code: string; language?: string }) {
  const content = useMemo(
    () => (language === "json" ? highlightJson(code) : code),
    [code, language],
  );
  return (
    <pre
      tabIndex={0}
      className="focus-ring max-h-(--code-max) overflow-auto rounded-b-lg p-4 font-mono text-[13px] leading-6 text-ink-2"
    >
      <code>{content}</code>
    </pre>
  );
}

const headerClass =
  "flex h-11 items-center justify-between gap-3 border-b border-line pr-1.5 pl-4";

/**
 * Read-only code panel with a copy button: a single snippet with an optional
 * title, or language tabs. Long content scrolls inside the panel.
 */
export function CodeBlock({
  code = "",
  samples,
  language,
  title,
  maxHeight = 440,
  className,
}: CodeBlockProps) {
  const [activeLabel, setActiveLabel] = useState(samples?.[0]?.label ?? "");
  const frameClass = cn(
    "min-w-0 rounded-lg border border-line bg-canvas-2 shadow-xs",
    className,
  );
  const style = { "--code-max": `${maxHeight}px` };

  if (!samples?.length) {
    return (
      <figure className={frameClass} style={style}>
        <figcaption className={headerClass}>
          <span className="truncate font-mono text-xs text-ink-3">
            {title ?? language ?? "kod"}
          </span>
          <CopyButton value={code} />
        </figcaption>
        <CodeBody code={code} language={language} />
      </figure>
    );
  }

  const active = samples.find((sample) => sample.label === activeLabel) ?? samples[0];
  return (
    <TabsPrimitive.Root
      value={active.label}
      onValueChange={setActiveLabel}
      className={frameClass}
      style={style}
    >
      <div className={headerClass}>
        <TabsPrimitive.List aria-label="Kod dili" className="-mb-px flex h-full gap-4">
          {samples.map((sample) => (
            <TabsPrimitive.Trigger
              key={sample.label}
              value={sample.label}
              className="focus-ring relative h-full font-mono text-xs text-ink-3 transition-colors hover:text-ink-2 data-[state=active]:text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-ink after:opacity-0 data-[state=active]:after:opacity-100"
            >
              {sample.label}
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        <CopyButton value={active.code} />
      </div>
      {samples.map((sample) => (
        <TabsPrimitive.Content key={sample.label} value={sample.label} tabIndex={-1}>
          <CodeBody code={sample.code} language={sample.language} />
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
