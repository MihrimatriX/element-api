import * as React from "react";
import { Collapsible } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function Disclosure(props: React.ComponentProps<typeof Collapsible.Root>) {
  return <Collapsible.Root data-slot="disclosure" {...props} />;
}
function DisclosureTrigger({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Collapsible.Trigger>) {
  return (
    <Collapsible.Trigger
      data-slot="disclosure-trigger"
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-sm py-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      <span className="flex flex-1 items-center justify-between gap-3">
        {children}
      </span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </Collapsible.Trigger>
  );
}
function DisclosureContent({
  className,
  ...props
}: React.ComponentProps<typeof Collapsible.Content>) {
  return (
    <Collapsible.Content
      data-slot="disclosure-content"
      className={cn("pb-4", className)}
      {...props}
    />
  );
}
export { Disclosure, DisclosureTrigger, DisclosureContent };
