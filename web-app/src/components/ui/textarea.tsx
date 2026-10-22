import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClass } from "./classes";
import { useFieldControl } from "./field-context";

/** Multi-line input that grows with its content. Field-aware like `Input`. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  const field = useFieldControl();
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        controlClass,
        "field-sizing-content min-h-24 px-3 py-2.5 leading-6",
        className,
      )}
      {...field}
      {...props}
    />
  );
}

export { Textarea };
