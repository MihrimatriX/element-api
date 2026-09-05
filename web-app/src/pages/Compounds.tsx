import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import Seo from '../components/Seo';
import { formatScience, useScience, type ScientificCompound } from '../services/science';
const fold = (v: string) => v.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export default function Compounds() {
  const { data, error, retry } = useScience<ScientificCompound[]>('compounds');
  const [q, setQ] = useState('');
  const filtered = data?.filter(c => fold(`${c.names.tr} ${c.names.en} ${c.names.iupac} ${c.molecular_properties.molecular_formula} ${c.identifiers.pubchem_cid}`).includes(fold(q.trim())));
  return <main className="science-detail"><Seo title="Bileşiklerin dünyası · ElementAPI" description="Molekül formülleri, fiziksel özellikler, güvenlik ve farmakoloji kaynaklarıyla bileşikleri keşfedin." path="/compounds" /><section className="explorer-heading"><div><p className="science-eyebrow">ATOMLAR BİR ARAYA GELİNCE</p><h1>Bileşiklerin dünyası<span>.</span></h1><p>Moleküler yapıdan fiziksel özelliklere, her bağ yeni bir hikâye.</p></div><Link to="/periodic" className="science-text-link">Elementleri keşfet <ArrowUpRight size={16} /></Link></section><div className="explorer-toolbar"><label className="explorer-search"><Search size={18} /><input type="search" aria-label="Bileşik ara" placeholder="Ad, formül veya PubChem CID…" value={q} onChange={e => setQ(e.target.value)} /></label><span role="status">{filtered?.length ?? '…'} bileşik</span></div>{error && <p className="science-notice">{error} <button onClick={retry}>Yeniden dene</button></p>}{!data && !error && <p role="status">Bileşikler yükleniyor…</p>}{filtered?.length === 0 && <p role="status">Eşleşen bileşik bulunamadı.</p>}<div className="science-compounds">{filtered?.map(c => <Link className="science-compound-card" key={c.slug} to={`/compound/${c.slug}`}><span className="science-eyebrow">CID {c.identifiers.pubchem_cid}</span><strong className="compound-formula">{c.molecular_properties.molecular_formula}</strong><h2>{c.names.tr}</h2><p>{c.names.en}</p><footer><span>{formatScience(c.molecular_properties.molecular_weight_g_mol, 'g/mol')}</span><ArrowUpRight size={19} /></footer></Link>)}</div></main>;
}
