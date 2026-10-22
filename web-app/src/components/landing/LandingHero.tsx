import { Link } from "react-router-dom";
import { FlaskConical, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import coverage from "@/data/coverage.json";

/** Brand photo of a cuprite (Cu₂O) crystal. */
const HERO_PHOTO = "/brand/elementapi-hero-void-cuprite.jpg";

/**
 * Landing hero: the slogan, one concrete sentence about what the site holds
 * and the two main entry points, beside the cuprite photo with a plain
 * caption. Owns the page's only h1.
 */
export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16"
    >
      <div>
        <h1
          id="landing-title"
          className="font-display text-display-lg font-semibold text-ink"
        >
          Atomdan bileşiğe.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">
          {coverage.elements} element ve {coverage.compounds} bileşik kaydı,
          elementleri birleştirdiğin bir laboratuvar ve anahtar istemeyen açık
          bir API.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/periodic">
              <Grid2X2 strokeWidth={1.75} />
              Tabloyu aç
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/lab">
              <FlaskConical strokeWidth={1.75} />
              Laboratuvar
            </Link>
          </Button>
        </div>
        <p className="mt-5 text-[13px] text-ink-3">
          Hesap gerekmez. Keşiflerin bu tarayıcıdaki deftere yazılır.
        </p>
      </div>

      <figure>
        <img
          src={HERO_PHOTO}
          alt="Koyu zemin üzerinde kuprit kristali"
          width={1280}
          height={720}
          fetchPriority="high"
          className="aspect-[4/3] w-full rounded-lg border border-line object-cover"
        />
        <figcaption className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-3">
          <Formula value="Cu2O" className="text-ink-2" />
          <span aria-hidden="true">·</span>
          kuprit
        </figcaption>
      </figure>
    </section>
  );
}
