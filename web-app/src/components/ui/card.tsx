import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/** Raised panel with a hairline. Compose with CardHeader / CardContent / CardFooter for consistent padding. */
function Card({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="card"
      className={cn(
        "flex flex-col rounded-xl border border-line bg-surface text-ink-2 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/** Title row of a card; put an action (button, badge) after the title block and it aligns right. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5",
        className,
      )}
      {...props}
    />
  );
}

/** Card heading (h3, Geist, not display). */
function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "font-sans text-base font-semibold tracking-normal text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary line under a card title. */
function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("mt-1 text-sm text-ink-3", className)}
      {...props}
    />
  );
}

/** Main body of a card. */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 py-5", className)}
      {...props}
    />
  );
}

/** Bottom action row, separated by a hairline. */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-line px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
