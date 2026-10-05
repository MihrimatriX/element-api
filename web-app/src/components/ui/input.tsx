import * as React from "react";
import { cn } from "@/lib/utils";
import { controlClass } from "./classes";
import { useFieldControl } from "./field-context";

/** Text input. Inside a `Field` it picks up id, description and invalid state automatically. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const field = useFieldControl();
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        controlClass,
        "h-10 px-3 file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className,
      )}
      {...field}
      {...props}
    />
  );
}

export { Input };
