import { cn } from "@/lib/utils";
import { formatChange, trendOf, type Trend } from "./model";

const trendClass: Record<Trend, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-ink-3",
};

/** Signed 24 h change in mono: green when up, red when down. The sign carries the meaning too. */
export function ChangeValue({
  value,
  className,
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono whitespace-nowrap tabular",
        trendClass[trendOf(value)],
        className,
      )}
    >
      {formatChange(value)}
    </span>
  );
}
