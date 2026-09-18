import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search } from "lucide-react";
import Seo from "../components/Seo";
import CompoundCard from "../components/CompoundCard";
import { useScience, type ScientificCompound } from "../services/science";
import {
  asScienceCompound,
  COMPOUND_GROUP_LABELS,
  compoundBySlug,
  compoundGroups,
  knownCompounds,
  type CompoundGroup,
} from "../services/chemistry";
const fold = (v: string) =>
  v
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export default function Compounds() {
  const { data } = useScience<ScientificCompound[]>("compounds");
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<CompoundGroup | "">("");
  const records = useMemo(() => {
    const remote = new Map((data ?? []).map((c) => [c.slug, c]));
    return knownCompounds.map(
      (c) => remote.get(c.slug) ?? (asScienceCompound(c) as ScientificCompound),
    );
  }, [data]);
  const filtered = records.filter((c) => {
    const known = compoundBySlug[c.slug];
    if (group && known && !compoundGroups(known).includes(group)) return false;
    return fold(
      `${c.names.tr} ${c.names.en} ${c.names.iupac} ${c.molecular_properties.molecular_formula} ${c.display_formula} ${c.identifiers.pubchem_cid}`,
    ).includes(fold(q.trim()));
  });
  return (
    <main className="science-detail">
      <Seo
        title="Bileşikler · ElementAPI"
        description="Su, tuz, pas, sirke: 167 bilinen kayıt. Formül birimi ile molekül karışmaz."
        path="/compounds"
      />
      <section className="explorer-heading">
        <div>
          <p className="science-eyebrow">167 kayıt</p>
          <h1>Bileşikler</h1>
          <p>
            Su molekül, tuz formül birimi, kuvars ağ. Ad, formül veya grupla
            süz; hayali bileşik yok.
          </p>
        </div>
        <Link to="/periodic" className="science-text-link">
          Elementleri keşfet <ArrowUpRight size={16} />
        </Link>
      </section>
      <div className="explorer-toolbar">
        <label className="explorer-search">
          <Search size={18} />
          <Input
            className="pl-9"
            type="search"
            aria-label="Bileşik ara"
            placeholder="Ad, formül veya PubChem CID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <span role="status">{filtered.length} bileşik</span>
      </div>
      <div className="atlas-lenses" role="group" aria-label="Bileşik grupları">
        <span>Grup</span>
        <Button
          variant="plain"
          size="none"
          aria-pressed={group === ""}
          onClick={() => setGroup("")}
        >
          Tümü
        </Button>
        {(Object.keys(COMPOUND_GROUP_LABELS) as CompoundGroup[]).map((id) => (
          <Button
            variant="plain"
            size="none"
            key={id}
            aria-pressed={group === id}
            onClick={() => setGroup(id)}
          >
            {COMPOUND_GROUP_LABELS[id]}
          </Button>
        ))}
        <Link to="/lab/formula" className="science-text-link">
          Formülü kur <ArrowUpRight size={14} />
        </Link>
      </div>
        {filtered.length === 0 && (
          <div className="learning-empty compound-empty" role="status">
            <p>
              Bu süzgeçte kayıt yok. Su hâlâ H₂O, tuz hâlâ NaCl.
            </p>
            <Button asChild variant="default">
              <Link className="btn primary" to="/lab">
                Laboratuvarda formülü kur
              </Link>
            </Button>
          </div>
        )}
      <div className="science-compounds">
        {filtered.map((c) => (
          <CompoundCard key={c.slug} compound={c} />
        ))}
      </div>
    </main>
  );
}
