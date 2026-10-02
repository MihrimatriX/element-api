import { useState } from "react";
import { ElementTile, type ElementFamily } from "@/components/ui/element-tile";
import { Formula } from "@/components/ui/formula";
import { Section } from "@/components/ui/section";
import { Specimen } from "./Specimen";

const TILES: { symbol: string; z: number; name: string; family: ElementFamily; mass: string }[] = [
  { symbol: "H", z: 1, name: "Hidrojen", family: "nonmetal", mass: "1,008" },
  { symbol: "Li", z: 3, name: "Lityum", family: "alkali", mass: "6,94" },
  { symbol: "Mg", z: 12, name: "Magnezyum", family: "alkaline", mass: "24,305" },
  { symbol: "Fe", z: 26, name: "Demir", family: "transition", mass: "55,845" },
  { symbol: "Al", z: 13, name: "Alüminyum", family: "post", mass: "26,982" },
  { symbol: "Si", z: 14, name: "Silisyum", family: "metalloid", mass: "28,085" },
  { symbol: "Cl", z: 17, name: "Klor", family: "halogen", mass: "35,45" },
  { symbol: "Ne", z: 10, name: "Neon", family: "noble", mass: "20,180" },
  { symbol: "Nd", z: 60, name: "Neodimyum", family: "lanthanide", mass: "144,24" },
  { symbol: "U", z: 92, name: "Uranyum", family: "actinide", mass: "238,03" },
  { symbol: "Og", z: 118, name: "Oganesson", family: "unknown", mass: "(294)" },
];

const FORMULAS = [
  { value: "H2O", name: "Su" },
  { value: "C9H8O4", name: "Aspirin" },
  { value: "Ca(OH)2", name: "Sönmüş kireç" },
  { value: "CuSO4·5H2O", name: "Göztaşı" },
  { value: "SO4^2-", name: "Sülfat iyonu" },
  { value: "NH4", charge: "+", name: "Amonyum iyonu" },
];

/** Element tiles in every family and state, and chemical formulas. */
export function ChemistrySection() {
  const [selected, setSelected] = useState("Fe");
  return (
    <Section
      id="kimya"
      eyebrow="06"
      title="Kimya bileşenleri"
      description="Karo metni karonun boyutuyla ölçeklenir; çok küçük karolarda ad görsel olarak gizlenir ama ekran okuyucuya okunur."
    >
      <div className="grid gap-5">
        <Specimen title="Element karoları" note="ElementTile · seçmek için tıkla">
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-11">
            {TILES.map((tile) => (
              <ElementTile
                key={tile.symbol}
                symbol={tile.symbol}
                atomicNumber={tile.z}
                name={tile.name}
                family={tile.family}
                value={tile.mass}
                selected={selected === tile.symbol}
                pressed={selected === tile.symbol}
                onClick={() => setSelected(tile.symbol)}
              />
            ))}
          </div>
        </Specimen>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <Specimen title="Hâller" note="selected · dimmed · missing · link">
            <div className="grid grid-cols-4 gap-2">
              <ElementTile symbol="Cu" atomicNumber={29} name="Bakır" family="transition" selected />
              <ElementTile symbol="Na" atomicNumber={11} name="Sodyum" family="alkali" dimmed />
              <ElementTile symbol="Tc" atomicNumber={43} name="Teknesyum" family="transition" value="—" missing />
              <ElementTile symbol="Au" atomicNumber={79} name="Altın" family="transition" to="/element/au" />
            </div>
            <p className="mt-4 text-[13px] text-ink-3">
              Sırasıyla: seçili, filtre dışı, mercekte değeri yok, bağlantı.
            </p>
          </Specimen>
          <Specimen title="Formüller" note="Formula · alt simge ve yük">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {FORMULAS.map((formula) => (
                <li key={formula.name}>
                  <Formula value={formula.value} charge={formula.charge} className="text-xl text-ink" />
                  <p className="mt-1 text-[13px] text-ink-3">{formula.name}</p>
                </li>
              ))}
            </ul>
          </Specimen>
        </div>

        <Specimen title="Yoğun ızgara" note="küçük karolar · ad gizli">
          <div className="grid max-w-md grid-cols-9 gap-1">
            {TILES.slice(0, 9).map((tile) => (
              <ElementTile
                key={tile.symbol}
                symbol={tile.symbol}
                atomicNumber={tile.z}
                name={tile.name}
                family={tile.family}
                to={`/element/${tile.symbol.toLowerCase()}`}
              />
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  );
}
