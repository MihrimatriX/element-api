import { Link } from "react-router-dom";
import { BookMarked, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import coverage from "@/data/coverage.json";
import { Reveal } from "./Reveal";

/** Closing call to action: the two places to start, in one framed band. */
export function ClosingBand() {
  return (
    <section aria-labelledby="closing-title" className="mt-24 lg:mt-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-line bg-canvas-2 px-6 py-12 shadow-md sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-line to-transparent"
          />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
            <div>
              <p className="eyebrow">
                <span className="tabular">{coverage.elements}</span> hücre ·{" "}
                <span className="tabular">{coverage.compounds}</span> bileşik
              </p>
              <h2
                id="closing-title"
                className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
              >
                Bir elementle başla
              </h2>
              <p className="mt-4 max-w-prose text-[15px] leading-7 text-ink-2">
                Tabloyu aç ya da demiri API’den çek. Defterin bu tarayıcıda
                durur; başlamak için hesap gerekmez.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/periodic">
                  <Grid2X2 strokeWidth={1.75} />
                  Tabloyu aç
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/collection">
                  <BookMarked strokeWidth={1.75} />
                  Deftere git
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
