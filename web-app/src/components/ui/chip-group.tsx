import type { ReactElement, ReactNode } from "react";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";

/** One chip. `color` (any CSS colour, e.g. `var(--color-family-noble)`) draws a dot. */
export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  color?: string;
  count?: number;
  disabled?: boolean;
}

interface ChipGroupBase<T extends string> {
  /** Accessible name of the group, e.g. "Element ailesi". */
  label: string;
  options: readonly ChipOption<T>[];
  className?: string;
}

interface SingleChipGroupProps<T extends string> extends ChipGroupBase<T> {
  type: "single";
  /** Selected value; `null` when nothing is selected (clicking the active chip clears it). */
  value: T | null;
  onValueChange: (value: T | null) => void;
}

interface MultipleChipGroupProps<T extends string> extends ChipGroupBase<T> {
  type: "multiple";
  value: T[];
  onValueChange: (value: T[]) => void;
}

const chipClass =
  "focus-ring inline-flex h-8 items-center gap-2 rounded-sm border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink-2 transition-[color,background-color,border-color,transform] duration-150 hover:border-ink-4 hover:text-ink active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 data-[state=on]:border-brand-line data-[state=on]:bg-brand-soft data-[state=on]:text-ink";

function ChipContent<T extends string>({ option }: { option: ChipOption<T> }) {
  return (
    <>
      {option.color && (
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-(--chip-color)"
          style={{ "--chip-color": option.color }}
        />
      )}
      {option.label}
      {option.count !== undefined && (
        <span className="font-mono text-xs text-ink-3 tabular">
          {option.count}
        </span>
      )}
    </>
  );
}

/**
 * Toggle chips for filters. `single`: at most one on (click again to clear);
 * `multiple`: any number on. Arrow keys move between chips.
 */
export function ChipGroup<T extends string>(
  props: SingleChipGroupProps<T>,
): ReactElement;
export function ChipGroup<T extends string>(
  props: MultipleChipGroupProps<T>,
): ReactElement;
export function ChipGroup<T extends string>(
  props: SingleChipGroupProps<T> | MultipleChipGroupProps<T>,
) {
  const { label, options, className } = props;
  const items = options.map((option) => (
    <ToggleGroup.Item
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      className={chipClass}
    >
      <ChipContent option={option} />
    </ToggleGroup.Item>
  ));
  const rootClass = cn("flex flex-wrap gap-2", className);

  if (props.type === "single")
    return (
      <ToggleGroup.Root
        type="single"
        aria-label={label}
        value={props.value ?? ""}
        onValueChange={(next) => props.onValueChange(next ? (next as T) : null)}
        className={rootClass}
      >
        {items}
      </ToggleGroup.Root>
    );

  return (
    <ToggleGroup.Root
      type="multiple"
      aria-label={label}
      value={props.value}
      onValueChange={(next) => props.onValueChange(next as T[])}
      className={rootClass}
    >
      {items}
    </ToggleGroup.Root>
  );
}
