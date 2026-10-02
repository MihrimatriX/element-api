import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/ui/disclosure";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GuideFile } from "./guide-model";
import { GuideTable } from "./GuideTable";
import { InlineContent } from "./InlineContent";
import { useActiveAnchor } from "./hooks";

function rowCount(file: GuideFile): number {
  return file.tables.reduce((total, table) => total + table.rows.length, 0);
}

/** The file a deep link points into: the file itself or one of its rows. */
function fileOfAnchor(files: readonly GuideFile[], anchor: string): string | undefined {
  if (!anchor) return undefined;
  return files.find(
    (file) =>
      file.anchor === anchor ||
      file.tables.some((table) => table.rows.some((row) => row.anchor === anchor)),
  )?.anchor;
}

interface CodeMapFileProps {
  file: GuideFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: boolean;
}

/** One file: mono path heading (a toggle when it has tables), purpose line, function table. */
function CodeMapFile({ file, open, onOpenChange, selected }: CodeMapFileProps) {
  const count = rowCount(file);
  const pathClass = "min-w-0 font-mono text-[13.5px] text-ink [overflow-wrap:anywhere]";
  const anchorLink = (
    <Link
      to={{ hash: file.anchor }}
      className="focus-ring absolute top-3.5 -left-7 hidden size-6 place-items-center rounded-sm text-ink-4 opacity-0 transition-opacity group-hover/file:opacity-100 hover:text-ink-2 focus-visible:opacity-100 lg:grid"
    >
      <Link2 aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      <span className="sr-only">{file.path} bağlantısı</span>
    </Link>
  );
  const purpose = file.summary.length > 0 && (
    <p className="-mt-1 pr-8 pb-3.5 text-[13.5px] leading-6 text-ink-3">
      <InlineContent tokens={file.summary} />
    </p>
  );
  const frameClass =
    "group/file relative scroll-mt-24 border-b border-line outline-none data-[selected]:bg-brand-soft/40";

  if (count === 0) {
    return (
      <div id={file.anchor} tabIndex={-1} data-selected={selected || undefined} className={frameClass}>
        {anchorLink}
        <h3 className={cn(pathClass, "py-3.5 font-normal tracking-normal")}>{file.path}</h3>
        {purpose}
      </div>
    );
  }

  return (
    <Disclosure
      open={open}
      onOpenChange={onOpenChange}
      id={file.anchor}
      tabIndex={-1}
      data-selected={selected || undefined}
      className={frameClass}
    >
      {anchorLink}
      <h3 className="font-sans text-base font-normal tracking-normal">
        <DisclosureTrigger className="py-3.5">
          <span className={pathClass}>{file.path}</span>
          <Badge variant="secondary" className="font-mono tabular">
            {count}
          </Badge>
        </DisclosureTrigger>
      </h3>
      {purpose}
      <DisclosureContent>
        {/* px-3 gives the rows' -mx-3 highlight room inside the clipping content. */}
        <div className="grid gap-4 px-3 pb-6">
          {file.tables.map((table, index) => (
            <GuideTable key={index} table={table} />
          ))}
        </div>
      </DisclosureContent>
    </Disclosure>
  );
}

/**
 * A section's code-map files as a list of disclosures with an "open all"
 * toggle. A deep link to a file or one of its rows opens that file.
 */
export function CodeMap({ files }: { files: readonly GuideFile[] }) {
  const activeAnchor = useActiveAnchor();
  const targetFile = fileOfAnchor(files, activeAnchor);
  const [openFiles, setOpenFiles] = useState(() => new Set(targetFile ? [targetFile] : []));
  // A new deep link opens its file once, then the reader is free to close it again.
  const [seenTarget, setSeenTarget] = useState(targetFile);
  if (targetFile !== seenTarget) {
    setSeenTarget(targetFile);
    if (targetFile) setOpenFiles((current) => new Set(current).add(targetFile));
  }

  const expandable = files.filter((file) => rowCount(file) > 0);
  const allOpen = expandable.every((file) => openFiles.has(file.anchor));
  const functionCount = files.reduce((total, file) => total + rowCount(file), 0);

  const setFileOpen = (anchor: string, open: boolean) =>
    setOpenFiles((current) => {
      const next = new Set(current);
      if (open) next.add(anchor);
      else next.delete(anchor);
      return next;
    });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <p className="font-mono text-xs text-ink-3 tabular">
          {formatNumber(files.length)} dosya · {formatNumber(functionCount)} fonksiyon
        </p>
        {expandable.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              setOpenFiles(allOpen ? new Set() : new Set(expandable.map((file) => file.anchor)))
            }
          >
            {allOpen ? "Tümünü kapat" : "Tümünü aç"}
          </Button>
        )}
      </div>
      <div className="border-t border-line">
        {files.map((file) => (
          <CodeMapFile
            key={file.anchor}
            file={file}
            open={openFiles.has(file.anchor)}
            onOpenChange={(open) => setFileOpen(file.anchor, open)}
            selected={file.anchor === activeAnchor}
          />
        ))}
      </div>
    </div>
  );
}
