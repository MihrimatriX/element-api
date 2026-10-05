import { Link } from "react-router-dom";
import { FlaskConical, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Formula } from "@/components/ui/formula";
import coverage from "@/data/coverage.json";
import { Reveal } from "./Reveal";

/** Brand photo of a cuprite (Cu₂O) crystal. */
const HERO_PHOTO = "/brand/elementapi-hero-void-cuprite.jpg";

/**
 * Landing hero: slogan, one concrete sentence about what the site holds and
 * the two main entry points, next to the cuprite crystal that gives the
 * brand its colour. Owns the page's only h1.
 */
export function LandingHero() {
  return (
    <section
      aria-labelledby="landing-title"
      className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16"
    >
      <Reveal>
        <p className="eyebrow flex items-center gap-2.5">
          <span aria-hidden="true" className="h-px w-5 bg-brand-ink" />
          Türkçe kimya atlası
        </p>
        <h1
          id="landing-title"
          className="mt-5 font-display text-display-lg font-semibold tracking-tight text-ink"
        >
          Atomdan bileşiğe.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
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
        <p className="mt-6 text-[13px] text-ink-3">
          Hesap gerekmez. Keşiflerin bu tarayıcıdaki deftere yazılır.
        </p>
      </Reveal>

      <Reveal delay={0.12}>
        <figure className="relative overflow-hidden rounded-2xl border border-line bg-canvas shadow-glow">
          <img
            src={HERO_PHOTO}
            alt="Koyu zemin üzerinde kuprit kristali"
            width={1280}
            height={720}
            fetchPriority="high"
            className="aspect-[4/3] w-full object-cover mask-radial-farthest-side mask-radial-from-60% mask-radial-to-100% lg:aspect-[5/4]"
          />
          <figcaption className="absolute bottom-4 left-4 flex items-center gap-2 rounded-sm border border-line bg-canvas/85 px-2.5 py-1.5 text-xs text-ink-2">
            <Formula value="Cu2O" className="text-ink" />
            <span aria-hidden="true" className="text-ink-4">
              ·
            </span>
            kuprit
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
