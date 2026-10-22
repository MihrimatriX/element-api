import { ProgressRing } from "@/components/ui/progress-ring";
import { Stat } from "@/components/ui/stat";
import { catalogSize } from "../../services/lab";
import { lessons } from "../../services/lessons";

interface NotebookProgressProps {
  discovered: number;
  completedRoutes: number;
}

/** Header aside: share of the compound catalogue discovered, with discovery and route counts. */
export function NotebookProgress({
  discovered,
  completedRoutes,
}: NotebookProgressProps) {
  const compoundsLeft = catalogSize - discovered;
  const routesLeft = lessons.length - completedRoutes;
  return (
    <div className="panel flex items-center gap-5 p-5 sm:gap-6 sm:p-6 lg:w-[25rem]">
      <ProgressRing
        value={discovered}
        max={catalogSize}
        size={92}
        thickness={6}
        label="Bileşik kataloğu ilerlemesi"
      />
      <div className="grid min-w-0 flex-1 gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Stat
            variant="plain"
            label="Keşif"
            value={discovered}
            unit={`/ ${catalogSize}`}
          />
          <Stat
            variant="plain"
            label="Rota"
            value={completedRoutes}
            unit={`/ ${lessons.length}`}
          />
        </div>
        <p className="text-[13px] leading-5 text-ink-3">
          {discovered === 0
            ? "İlk molekülü laboratuvarda kaydet; defter burada dolacak."
            : `${compoundsLeft} bileşik ve ${routesLeft} rota kaldı.`}
        </p>
      </div>
    </div>
  );
}
