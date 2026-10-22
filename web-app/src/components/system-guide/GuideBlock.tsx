import { CodeBlock } from "@/components/ui/code-block";
import { ExternalLink } from "@/components/ui/external-link";
import type { GuideBlock as GuideBlockData, GuideListItem } from "./guide-model";
import { GuideTable } from "./GuideTable";
import { InlineContent } from "./InlineContent";

const CODE_TITLES: Record<string, string> = {
  mermaid: "Mermaid diyagramı",
  powershell: "PowerShell",
  bash: "Terminal",
};

function ListItems({ items }: { items: readonly GuideListItem[] }) {
  return items.map((item, index) => (
    <li key={index}>
      <InlineContent tokens={item.content} />
      {item.items && (
        <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-ink-4">
          <ListItems items={item.items} />
        </ul>
      )}
    </li>
  ));
}

/**
 * Ordered lists read as numbered steps: each item hangs off a mono counter
 * badge (the browser's own `list-item` counter, so numbering stays native).
 */
const stepListClass =
  "max-w-prose space-y-4 text-[15px] leading-7 text-ink-2 [&>li]:relative [&>li]:pl-10 [&>li]:before:absolute [&>li]:before:top-0.5 [&>li]:before:left-0 [&>li]:before:grid [&>li]:before:size-6 [&>li]:before:place-items-center [&>li]:before:rounded-full [&>li]:before:border [&>li]:before:border-line-strong [&>li]:before:bg-surface [&>li]:before:font-mono [&>li]:before:text-xs [&>li]:before:text-ink-2 [&>li]:before:content-[counter(list-item)]";

/** One non-file block of a guide section: paragraph, list, code or table. */
export function GuideBlock({ block }: { block: Exclude<GuideBlockData, { type: "file" }> }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="max-w-prose text-[15px] leading-7 text-ink-2">
          <InlineContent tokens={block.content} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className={stepListClass}>
          <ListItems items={block.items} />
        </ol>
      ) : (
        <ul className="max-w-prose list-disc space-y-2.5 pl-5 text-[15px] leading-7 text-ink-2 marker:text-ink-4">
          <ListItems items={block.items} />
        </ul>
      );
    case "code":
      return (
        <div>
          <CodeBlock
            code={block.code}
            language={block.language}
            title={CODE_TITLES[block.language] ?? block.language}
          />
          {block.language === "mermaid" && (
            <p className="mt-2 text-[13px] leading-6 text-ink-3">
              Diyagramın kaynağı. GitHub bu bloğu çizim olarak gösterir; kopyalayıp{" "}
              <ExternalLink href="https://mermaid.live">mermaid.live</ExternalLink> içine
              yapıştırarak da görebilirsin.
            </p>
          )}
        </div>
      );
    case "table":
      return <GuideTable table={block} />;
  }
}
