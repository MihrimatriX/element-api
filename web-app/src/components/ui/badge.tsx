import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "focus-ring inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border px-1.5 text-xs font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-brand-line bg-brand-soft text-brand-ink",
        secondary: "border-line bg-surface-2 text-ink-2",
        outline: "border-line-strong text-ink-2 [a&]:hover:bg-surface-2",
        ghost: "border-transparent text-ink-3 [a&]:hover:text-ink",
        link: "border-transparent px-0 text-brand-ink underline-offset-4 [a&]:hover:underline",
        success: "border-success/30 bg-success-soft text-success",
        warning: "border-warning/30 bg-warning-soft text-warning",
        info: "border-info/30 bg-info-soft text-info",
        destructive: "border-danger/30 bg-danger-soft text-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** Small status label (counts, states, tags). Status tones: success, warning, info, destructive. */
function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
