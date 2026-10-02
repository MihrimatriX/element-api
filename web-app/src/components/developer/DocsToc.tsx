import { cn } from "@/lib/utils";

/** A titled group of in-page anchors. */
export interface OutlineGroup {
  title: string;
  items: readonly { id: string; label: string }[];
}

interface DocsTocProps {
  groups: readonly OutlineGroup[];
  /** Section currently in view; marked with `aria-current`. */
  activeId: string | null;
  /** Called with the target id when a link is followed. */
  onNavigate?: (id: string) => void;
}

/** "Bu sayfada" table of contents: grouped anchor links with the section in view highlighted. */
export function DocsToc({ groups, activeId, onNavigate }: DocsTocProps) {
  return (
    <nav aria-label="Bu sayfada">
      {groups.map((group) => (
        <div key={group.title} className="mt-7 first:mt-0">
          <p className="eyebrow mb-2.5">{group.title}</p>
          <ul className="border-l border-line">
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    aria-current={active ? "location" : undefined}
                    onClick={() => onNavigate?.(item.id)}
                    className={cn(
                      "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors duration-150",
                      active
                        ? "border-brand-ink font-medium text-ink"
                        : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
