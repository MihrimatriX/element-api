import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  displayFormula,
  formatScience,
  type ScientificCompound,
} from "../services/science";
import { compoundBySlug, compoundGroups } from "../services/chemistry";

const GROUP_TINT: Record<string, string> = {
  gunluk: "color-mix(in srgb, #3d5c48 28%, #141a18)",
  organik: "color-mix(in srgb, #6b5340 26%, #141a18)",
  tuz: "color-mix(in srgb, #3d4f6b 28%, #141a18)",
  oksit: "color-mix(in srgb, #812f26 22%, #141a18)",
  asit: "color-mix(in srgb, #6b5a30 26%, #141a18)",
  malzeme: "color-mix(in srgb, #4a524e 30%, #141a18)",
  cevre: "color-mix(in srgb, #2f5558 28%, #141a18)",
};

export default function CompoundCard({
  compound: c,
}: {
  compound: ScientificCompound;
}) {
  const known = compoundBySlug[c.slug];
  const tint = known
    ? (GROUP_TINT[compoundGroups(known)[0] ?? ""] ?? "#f4f6f0")
    : "color-mix(in srgb, #4a524e 24%, #141a18)";
  const formula = displayFormula(
    c.display_formula ?? c.molecular_properties.molecular_formula,
  );
  const structure = c.media?.structure;
  return (
    <Link
      className="science-compound-card atlas-compound"
      to={`/compound/${c.slug}`}
    >
      {structure?.url ? (
        <img
          className="compound-card-structure"
          src={structure.url}
          alt={structure.caption}
        />
      ) : (
        <div className="compound-card-mark" style={{ background: tint }}>
          {formula}
        </div>
      )}
      <div className="atlas-compound-copy">
        {structure?.url ? <p className="compound-formula">{formula}</p> : null}
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
