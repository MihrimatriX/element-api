import * as React from "react";
import { cn } from "@/lib/utils";

/** Loading placeholder. Shape it like the content it stands in for; hide it from assistive tech. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  );
}

export { Skeleton };
