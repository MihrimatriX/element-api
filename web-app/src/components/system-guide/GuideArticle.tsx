import { KeyValue } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { CodeMap } from "./CodeMap";
import { GuideBlock } from "./GuideBlock";
import {
  splitGuideTitle,
  type GuideBlock as GuideBlockData,
  type GuideFile,
  type GuidePage,
} from "./guide-model";
import { InlineContent } from "./InlineContent";

type SectionPart =
  | { kind: "files"; files: GuideFile[] }
  | { kind: "block"; block: Exclude<GuideBlockData, { type: "file" }> };

/** Consecutive code-map files become one CodeMap; every other block renders on its own. */
function SectionBody({ blocks }: { blocks: readonly GuideBlockData[] }) {
  const parts: SectionPart[] = [];
  for (const block of blocks) {
    const last = parts.at(-1);
    if (block.type !== "file") parts.push({ kind: "block", block });
    else if (last?.kind === "files") last.files.push(block);
    else parts.push({ kind: "files", files: [block] });
  }
  return (
    <div className="flex flex-col gap-6">
      {parts.map((part, index) =>
        part.kind === "files" ? (
          <CodeMap key={index} files={part.files} />
        ) : (
          <GuideBlock key={index} block={part.block} />
        ),
      )}
    </div>
  );
}

/** One guide page: header with the summary, the facts list, then every section. */
export function GuideArticle({ page, eyebrow }: { page: GuidePage; eyebrow: string }) {
  return (
    <article>
      <PageHeader
        eyebrow={eyebrow}
        title={splitGuideTitle(page.title).name}
        lead={<InlineContent tokens={page.summary} />}
      />
      {page.facts.length > 0 && (
        <KeyValue
          className="mt-10"
          items={page.facts.map((fact) => ({
            label: fact.key,
            value: <InlineContent tokens={fact.value} />,
          }))}
        />
      )}
      <div className="mt-16 lg:mt-20">
        {page.sections.map((section) => (
          <Section key={section.anchor} id={section.anchor} title={section.heading}>
            <SectionBody blocks={section.blocks} />
          </Section>
        ))}
      </div>
    </article>
  );
}
