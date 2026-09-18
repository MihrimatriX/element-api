import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  displayFormula,
  formatScience,
  type ScientificCompound,
} from "../services/science";
import { compoundBySlug, compoundGroups } from "../services/chemistry";

const GROUP_TINT: Record<string, string> = {
  gunluk: "#e7f3ea",
  organik: "#f3eee6",
  tuz: "#e8eef6",
  oksit: "#f6ebe6",
  asit: "#f7f1e2",
  malzeme: "#eceeed",
  cevre: "#e6f1f3",
};

export default function CompoundCard({
  compound: c,
}: {
  compound: ScientificCompound;
}) {
  const known = compoundBySlug[c.slug];
  const tint = known
    ? GROUP_TINT[compoundGroups(known)[0] ?? ""] ?? "#f4f6f0"
    : "#f4f6f0";
  return (
    <Link
      className="science-compound-card atlas-compound"
      to={`/compound/${c.slug}`}
    >
      <div className="compound-card-mark" style={{ background: tint }}>
        {displayFormula(c.display_formula ?? c.molecular_properties.molecular_formula)}
      </div>
      <div className="atlas-compound-copy">
        <h2>{c.names.tr}</h2>
        <p>{c.editorial?.summary ?? c.names.en}</p>
        <footer>
          <span>
            {formatScience(
              c.molecular_properties.molecular_weight_g_mol,
              "g/mol",
            )}
          </span>
          <ArrowUpRight size={18} />
        </footer>
      </div>
    </Link>
  );
}
