import { NavLink } from "react-router-dom";
import { FlaskConical, Search, Sigma } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES = [
  { to: "/lab", label: "Tezgâh", icon: FlaskConical, end: true },
  { to: "/lab/formula", label: "Formülü kur", icon: Sigma, end: false },
  { to: "/lab/detective", label: "Element dedektifi", icon: Search, end: false },
] as const;

/** Segmented navigation between the three lab modes: free bench, formula builder and element detective. */
export function LabModes() {
  return (
    <nav aria-label="Laboratuvar modları">
      <ul className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-line bg-canvas-2 p-0.5">
        {MODES.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="h-full">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "focus-ring inline-flex h-full items-center gap-2 rounded-md border px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 sm:px-3.5 sm:text-sm",
                  isActive
                    ? "border-line-strong bg-surface-3 text-ink shadow-xs"
                    : "border-transparent text-ink-3 hover:text-ink-2",
                )
              }
            >
              <Icon aria-hidden="true" strokeWidth={1.75} className="hidden size-4 sm:block" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
