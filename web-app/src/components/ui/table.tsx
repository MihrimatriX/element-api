import * as React from "react";
import { cn } from "@/lib/utils";

/** Data table in a horizontally scrollable frame. Numbers: add `font-mono tabular text-right` to cells. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full text-sm", className)}
        {...props}
      />
    </div>
  );
}

/** Header row group; its rows get a stronger rule. */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-line-strong", className)}
      {...props}
    />
  );
}

/** Body row group; the last row has no rule. */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

/** Row with a hairline rule and hover tint. */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-line transition-colors hover:bg-surface-2/50 data-[state=selected]:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}

/** Column heading cell. */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-ink-3 first:pl-0 last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

/** Body cell; the first and last cells sit flush with the table edges. */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-2.5 align-middle text-ink-2 first:pl-0 last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
};
