import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ElementTile } from "@/components/ui/element-tile";
import coverage from "@/data/coverage.json";
import { familyOf, STATIC_ELEMENTS } from "@/services/elementData";
import { Reveal } from "./Reveal";

/** Period 4 (K → Kr): one real row that crosses almost every family. */
const PERIOD_FOUR = STATIC_ELEMENTS.filter((element) => element.row === 4);

/**
 * Periodic-table feature: what a record holds, and a live row of the table
 * whose tiles open the element pages.
 */
export function TableFeature() {
  return (
    <section aria-labelledby="feature-table" className="mt-24 lg:mt-32">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end lg:gap-16">
        <Reveal>
          <p className="eyebrow">Periyodik tablo</p>
          <h2
            id="feature-table"
            className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
          >
            Her hücre kaynaklı bir kayda açılır
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="max-w-prose text-[15px] leading-7 text-ink-2">
            Atom kütlesi, elektron dizilimi, erime ve kaynama noktası, izotoplar
            ve Türkçe anlatım tek sayfada. Tabloyu aileye, kütleye,
            elektronegatifliğe ya da oda sıcaklığındaki hâle göre
            boyayabilirsin. {coverage.compounds} bileşik de formülü ve yapı
            görseliyle ayrı bir katalogda.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <Button asChild variant="link">
              <Link to="/periodic">
                Tüm tablo
                <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
            <Button asChild variant="link">
              <Link to="/compounds">
                Bileşik kataloğu
                <ArrowRight strokeWidth={1.75} />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.12} className="mt-10">
        <figure>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-18">
            {PERIOD_FOUR.map((element) => (
              <ElementTile
                key={element.symbol}
                symbol={element.symbol}
                atomicNumber={element.atomicNumber}
                name={element.name}
                family={familyOf(element.category)}
                to={`/element/${element.symbol.toLowerCase()}`}
              />
            ))}
          </div>
          <figcaption className="mt-4 text-[13px] text-ink-3">
            4. periyot: potasyumdan kriptona {PERIOD_FOUR.length} element. Bir
            hücreye dokun, kaydı açılır.
          </figcaption>
        </figure>
      </Reveal>
    </section>
  );
}
