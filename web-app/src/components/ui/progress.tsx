import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** Thin horizontal progress bar (`value` out of `max`, default 100). Give it an `aria-label`. */
function Progress({
  className,
  value,
  max = 100,
  style,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const percent = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
        className,
      )}
      style={{ ...style, "--progress": `${percent}%` }}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-(--progress) rounded-full bg-brand-ink transition-[width] duration-500 ease-out-expo"
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
