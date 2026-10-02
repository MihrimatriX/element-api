import { useId, useRef, type ComponentProps } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass } from "./classes";

interface SearchFieldProps
  extends Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Accessible label (visually hidden), e.g. "Element ara". */
  label: string;
  /** Number of matches; shown in the field and announced politely. */
  resultCount?: number;
  /** Text for the count. Default: "`n` sonuç". */
  formatCount?: (count: number) => string;
  className?: string;
}

/**
 * Search input with a leading icon, hidden label, clear button (Escape clears too)
 * and an optional live result count.
 */
export function SearchField({
  value,
  onValueChange,
  label,
  resultCount,
  formatCount = (count) => `${count} sonuç`,
  className,
  onKeyDown,
  ...inputProps
}: SearchFieldProps) {
  const inputId = useId();
  const countId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const showCount = resultCount !== undefined && value.trim() !== "";

  function clear() {
    onValueChange("");
    inputRef.current?.focus();
  }

  return (
    <div className={cn("relative w-full", className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            clear();
          }
          onKeyDown?.(event);
        }}
        aria-describedby={showCount ? countId : undefined}
        className={cn(
          controlClass,
          "h-10 pr-3 pl-9 [&::-webkit-search-cancel-button]:appearance-none",
          value && "pr-10",
          showCount && "pr-28",
        )}
        {...inputProps}
      />
      <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
        <span
          id={countId}
          aria-live="polite"
          className="pointer-events-none font-mono text-xs whitespace-nowrap text-ink-3 tabular"
        >
          {showCount ? formatCount(resultCount) : ""}
        </span>
        {value && (
          <button
            type="button"
            onClick={clear}
            className="focus-ring grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
            <span className="sr-only">Aramayı temizle</span>
          </button>
        )}
      </div>
    </div>
  );
}
