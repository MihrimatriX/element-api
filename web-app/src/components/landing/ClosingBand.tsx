import { Link } from "react-router-dom";
import { BookMarked, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import coverage from "@/data/coverage.json";
import { Reveal } from "./Reveal";

/** Closing call to action: the two places to start, in one framed band. */
export function ClosingBand() {
  return (
    <section aria-labelledby="closing-title" className="mt-20 lg:mt-28">
      <Reveal>
        <div className="rounded-xl border border-line bg-surface px-6 py-10 sm:px-10 sm:py-12">
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
