import { Badge } from "@/components/ui/badge";

/** HTTP method label: reads stay green, writes are marked as info. */
export function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return (
    <Badge
      variant={method === "GET" ? "success" : "info"}
      className="font-mono tracking-wide"
    >
      {method}
    </Badge>
  );
}
