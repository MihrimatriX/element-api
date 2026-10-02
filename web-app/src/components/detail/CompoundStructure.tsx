import GeometryFigure from "../GeometryFigure";
import { ElementTile } from "@/components/ui/element-tile";
import { Section } from "@/components/ui/section";
import type { Geometry } from "@/services/chemistry";
import { STATIC_ELEMENTS } from "@/services/elementData";
import type { ScientificCompound } from "@/services/science";
import { familyOf } from "./record";

/**
 * Compound-only sections: the lab geometry class (anchor `#geometry`, linked from
 * the glossary) and the elements in one formula unit as periodic tiles.
 */
export function CompoundStructure({
  compound,
  geometry,
}: {
  compound: ScientificCompound;
  geometry?: Geometry;
}) {
  return (
    <div className="mt-16 grid gap-x-12 gap-y-16 lg:mt-20 xl:grid-cols-2">
      {geometry && (
        <Section id="geometry" title="Molekül geometrisi" className="mt-0 lg:mt-0">
          <GeometryFigure geometry={geometry} />
        </Section>
      )}
      <Section
        id="composition"
        title="İçindeki elementler"
        description="Bir formül birimindeki atom sayıları. İyonik ve ağ yapılı katılarda bu oran ayrı bir molekül anlamına gelmez."
        className="mt-0 lg:mt-0"
      >
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
          {compound.composition?.map((part) => {
            const element = STATIC_ELEMENTS.find((item) => item.symbol === part.symbol);
            const name = element?.name ?? part.symbol;
            return (
              <li key={part.symbol}>
                <ElementTile
                  symbol={part.symbol}
                  atomicNumber={element?.atomicNumber ?? 0}
                  name={name}
                  family={familyOf(element?.category)}
                  value={`${part.count} atom`}
                  to={`/element/${part.symbol.toLowerCase()}`}
                  label={`${name}, formül biriminde ${part.count} atom`}
                />
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
