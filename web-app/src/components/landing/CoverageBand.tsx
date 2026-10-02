import { Link } from "react-router-dom";
import { Stat } from "@/components/ui/stat";
import coverage from "@/data/coverage.json";
import { Reveal } from "./Reveal";

const FIGURES = [
  { label: "Element", value: coverage.elements, hint: "Tablonun tamamı" },
  { label: "Bileşik kaydı", value: coverage.compounds, hint: "Formül, yapı, anlatım" },
  { label: "Element fotoğrafı", value: coverage.photos, hint: "Lisanslı örnekler" },
  { label: "Yapı görseli", value: coverage.structures, hint: "PubChem kaynaklı" },
];

/**
 * Coverage figures read from `data/coverage.json`, so the landing never
 * drifts from the shipped data, with a link to the sources page.
 */
export function CoverageBand() {
  return (
    <section aria-labelledby="coverage-title" className="mt-20 lg:mt-28">
      <h2 id="coverage-title" className="sr-only">
        Veri kapsamı
      </h2>
      <Reveal>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
          {FIGURES.map((figure) => (
            <Stat
              key={figure.label}
              variant="plain"
              size="lg"
              label={figure.label}
              value={figure.value}
              hint={figure.hint}
              className="bg-canvas-2 p-5 sm:p-7"
            />
          ))}
        </div>
        <p className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[13px] text-ink-3">
          <span>
            Sayılar PubChem, RSC ve NIST kaynaklı. Alım tarihi{" "}
            <span className="font-mono whitespace-nowrap tabular">
              {coverage.retrievedAt}
            </span>
          </span>
          <Link to="/data" className="text-link">
            Kaynaklar ve veri kapsamı
          </Link>
        </p>
      </Reveal>
    </section>
  );
}
