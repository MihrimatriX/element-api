import { useId, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/utils";

/** One segment of a Segmented control. */
export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface SegmentedProps<T extends string> {
  /** Accessible name, e.g. "Görünüm". */
  label: string;
  /** Two to four options. */
  options: readonly SegmentOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Segmented switch for 2–4 mutually exclusive views (radiogroup: arrow keys move and select). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onValueChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const indicatorId = useId();
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      orientation="horizontal"
      className={cn(
        "inline-flex w-fit items-center gap-0.5 rounded-lg border border-line bg-canvas-2 p-0.5",
        size === "sm" ? "h-8" : "h-10",
        className,
      )}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
        const checked = optionValue === value;
        return (
          <RadioGroup.Item
            key={optionValue}
            value={optionValue}
            className={cn(
              "focus-ring relative inline-flex h-full items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150",
              size === "sm" ? "px-2.5 text-[13px]" : "px-3.5 text-sm",
              checked ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {checked && (
              <motion.span
                layoutId={indicatorId}
                aria-hidden="true"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 rounded-md border border-line-strong bg-surface-3 shadow-xs"
              />
            )}
            {Icon && (
              <Icon className="relative size-4" strokeWidth={1.75} />
            )}
            <span className="relative">{optionLabel}</span>
          </RadioGroup.Item>
        );
      })}
    </RadioGroup.Root>
  );
}
