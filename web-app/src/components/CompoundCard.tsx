import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  displayFormula,
  formatScience,
  type ScientificCompound,
} from "../services/science";
export default function CompoundCard({
  compound: c,
}: {
  compound: ScientificCompound;
}) {
  return (
    <Link
      className="science-compound-card atlas-compound"
      to={`/compound/${c.slug}`}
    >
      <div className="compound-card-mark">
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
