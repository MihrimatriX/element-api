import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Formula } from "@/components/ui/formula";
import { materialById } from "../../services/lab";

/** Discovered compounds as links to their records; an empty notebook points to the lab. */
export function DiscoveryGrid({ discoveries }: { discoveries: string[] }) {
  if (discoveries.length === 0)
    return (
      <EmptyState
        icon={FlaskConical}
        title="Henüz bileşik yok"
        titleAs="h3"
        actions={
          <Button asChild>
            <Link to="/lab">Laboratuvara git</Link>
          </Button>
        }
      >
        <p>
          İki hidrojen, bir oksijen. Su burada görününce tuzu dene. Takılırsan{" "}
          <Link to="/nasil" className="text-link">
            el kitabına
          </Link>{" "}
          bak.
        </p>
      </EmptyState>
    );

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {discoveries.map((id) => {
        const material = materialById[id];
        return (
          <li key={id}>
            <Link
              to={`/compound/${id}`}
              className="group flex h-full flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-xs transition-[background-color,border-color,transform] duration-200 hover:border-line-strong hover:bg-surface-2 active:scale-[0.99]"
            >
              <Formula value={material.formula} className="text-lg text-ink" />
              <span className="text-[13px] leading-5 text-ink-3 transition-colors group-hover:text-ink-2">
                {material.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
