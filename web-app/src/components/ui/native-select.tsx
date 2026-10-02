import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlClass } from "./classes";
import { useFieldControl } from "./field-context";

/** Native `<select>` styled like `Input`; fills its container. Field-aware like `Input`. */
function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  const field = useFieldControl();
  return (
    <div
      data-slot="native-select-wrapper"
      className="relative w-full has-[select:disabled]:opacity-50"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          controlClass,
          "h-10 appearance-none pr-9 pl-3 data-[size=sm]:h-8 data-[size=sm]:text-[13px]",
          className,
        )}
        {...field}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

/** Option with the dark surface colours (native dropdowns ignore most CSS). */
function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-surface-2 text-ink", className)}
      {...props}
    />
  );
}

/** Option group with the dark surface colours. */
function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-surface-2 text-ink-3", className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
