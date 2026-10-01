import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const destructiveClass =
  "border border-danger/35 bg-danger-soft text-danger hover:border-danger/55 hover:bg-danger/20";

const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Filled cuprite: the one primary action of a view. */
        default:
          "bg-brand text-primary-foreground shadow-xs hover:bg-brand-hover active:bg-brand-press",
        /** Hairline on a raised surface: secondary actions next to a primary one. */
        outline:
          "border border-line-strong bg-surface text-ink shadow-xs hover:border-ink-4 hover:bg-surface-2",
        /** Quiet filled: toolbar actions, filters. */
        secondary: "bg-surface-2 text-ink hover:bg-surface-3",
        /** No chrome until hover: dense toolbars, icon buttons, menus. */
        ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
        /** Text link that behaves like a button. */
        link: "text-brand-ink underline decoration-brand-line underline-offset-4 hover:decoration-brand-ink active:scale-100",
        /** Destructive action (delete, revoke). */
        destructive: destructiveClass,
        /** Alias of `destructive`. */
        danger: destructiveClass,
        /** Unstyled: behaviour and focus ring only; the caller owns the look. */
        plain: "",
      },
      size: {
        none: "",
        default: "h-10 px-4 text-sm has-[>svg]:px-3.5",
        xs: "h-7 gap-1.5 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-11 px-5 text-[15px] has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-11",
      },
    },
    // Links sit in running text: drop the button box whatever the size.
    compoundVariants: [
      {
        variant: "link",
        size: ["default", "xs", "sm", "lg"],
        class: "h-auto px-0 has-[>svg]:px-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * The single button primitive. `asChild` renders the styles on a child element
 * (e.g. a router `Link`) instead of a `<button>`.
 */
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
