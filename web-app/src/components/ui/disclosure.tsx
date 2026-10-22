import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible } from "radix-ui";
import { cn } from "@/lib/utils";

/** Show/hide section. Put the heading outside the trigger when the section needs one in the outline. */
function Disclosure(props: React.ComponentProps<typeof Collapsible.Root>) {
  return <Collapsible.Root data-slot="disclosure" {...props} />;
}

/** Full-width toggle row with a rotating chevron. */
function DisclosureTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Collapsible.Trigger>) {
  return (
    <Collapsible.Trigger
      data-slot="disclosure-trigger"
      className={cn(
        "focus-ring group flex w-full items-center justify-between gap-4 rounded-md py-3 text-left text-[15px] font-medium text-ink transition-colors hover:text-ink",
        className,
      )}
      {...props}
    >
      <span className="flex flex-1 items-center justify-between gap-3">
        {children}
      </span>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:text-ink-2 group-data-[state=open]:rotate-180"
      />
    </Collapsible.Trigger>
  );
}

/** Collapsible body; animates its height open and closed. */
function DisclosureContent({
  className,
  ...props
}: React.ComponentProps<typeof Collapsible.Content>) {
  return (
    <Collapsible.Content
      data-slot="disclosure-content"
      className={cn(
        "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className,
      )}
      {...props}
    />
  );
}

export { Disclosure, DisclosureContent, DisclosureTrigger };
