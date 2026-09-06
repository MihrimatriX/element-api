import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { displayFormula, formatScience, type ScientificCompound } from '../services/science';
import AtlasVisual from './AtlasVisual';
export default function CompoundCard({compound:c}: {compound:ScientificCompound}) {
  return <Link className="science-compound-card atlas-compound" to={`/compound/${c.slug}`}>
    <AtlasVisual compact formula={displayFormula(c.display_formula??c.molecular_properties.molecular_formula)} structure={c.media?.structure}/>
    <div className="atlas-compound-copy"><strong className="compound-formula">{displayFormula(c.display_formula??c.molecular_properties.molecular_formula)}</strong><h2>{c.names.tr}</h2><p>{c.editorial?.summary??c.names.en}</p><footer><span>{formatScience(c.molecular_properties.molecular_weight_g_mol,'g/mol')}</span><ArrowUpRight size={18}/></footer></div>
  </Link>;
}
