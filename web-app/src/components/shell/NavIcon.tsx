import {
  BookA,
  BookOpenText,
  CodeXml,
  Coins,
  Compass,
  Database,
  FileText,
  FlaskConical,
  Grid2X2,
  Hexagon,
  Info,
  MessageSquareText,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** One distinct icon per route so rows line up in menus, the mobile sheet and the header. */
const iconByPath: Record<string, LucideIcon> = {
  "/periodic": Grid2X2,
  "/compounds": Hexagon,
  "/lab": FlaskConical,
  "/collection": NotebookPen,
  "/nasil": BookOpenText,
  "/developers": CodeXml,
  "/sozluk": BookA,
  "/docs": FileText,
  "/data": Database,
  "/kilavuz": Compass,
  "/hakkinda": Info,
  "/feedback": MessageSquareText,
  "/demo": Coins,
};

/** Decorative icon for a nav route (nothing for unknown paths). */
export function NavIcon({ to, className }: { to: string; className?: string }) {
  const Icon = iconByPath[to];
  if (!Icon) return null;
  return (
    <Icon
      aria-hidden="true"
      strokeWidth={1.75}
      className={cn("size-4 shrink-0", className)}
    />
  );
}
