import { useState } from 'react';
import { Atom, Image as ImageIcon } from 'lucide-react';
import type { AtlasMedia } from '../services/science';

export function AtomShell({symbol, shells = []}: {symbol: string; shells?: number[]}) {
  const count = shells.length;
  return <svg className="atom-shell" viewBox="0 0 220 220" role="img" aria-label={`${symbol}, şematik elektron kabukları: ${shells.join(', ') || 'veri yok'}`}>
    <circle cx="110" cy="110" r="24" className="atom-nucleus" />
    <text x="110" y="117" textAnchor="middle">{symbol}</text>
    {shells.map((electrons, shell) => {
      const radius = 38 + shell * (58 / Math.max(1, count-1));
      return <g key={shell}><circle cx="110" cy="110" r={radius} className="atom-orbit" />{Array.from({length:electrons}, (_, i) => {
        const angle=(i/electrons)*Math.PI*2 + shell*.4;
        return <circle key={i} cx={110+radius*Math.cos(angle)} cy={110+radius*Math.sin(angle)} r={electrons>20?2:2.8} className="atom-electron" />;
      })}</g>;
    })}
  </svg>;
}
function ImageWithFallback({media, fallback}: {media: AtlasMedia; fallback: React.ReactNode}) {
  const [failed,setFailed]=useState(false);
  return failed ? <>{fallback}<p className="visual-unavailable">Görsel yüklenemedi. Şematik gösterim.</p></> : <img src={media.url} alt={media.caption} loading="lazy" decoding="async" width="500" height="500" onError={()=>setFailed(true)} />;
}
export default function AtlasVisual({symbol, formula, shells, photo, structure, compact=false}: {symbol?:string;formula?:string;shells?:number[];photo?:AtlasMedia|null;structure?:AtlasMedia|null;compact?:boolean}) {
  const [mode,setMode]=useState<'photo'|'structure'>('photo');
  const selected=mode==='photo'&&photo?photo:structure;
  const fallback=symbol?<AtomShell symbol={symbol} shells={shells}/>:<div className="formula-fallback">{formula}<small>Formül gösterimi</small></div>;
  return <figure className={`atlas-visual ${compact?'is-compact':''}`}>
    {!compact&&photo&&<div className="visual-toggle" aria-label="Görsel türü"><button aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}><ImageIcon size={14}/> Fotoğraf</button><button aria-pressed={mode==='structure'} onClick={()=>setMode('structure')}><Atom size={14}/> {symbol?'Atom şeması':'Yapı'}</button></div>}
    <div className="atlas-image">{selected?<ImageWithFallback key={selected.url} media={selected} fallback={fallback}/>:fallback}</div>
    <figcaption>{selected?<><span>{selected.caption}</span>{(!compact||photo)&&<><a href={selected.source_url} target="_blank" rel="noreferrer">{selected.creator || 'Görsel kaynağı'}</a><span>{selected.license_url?<a href={selected.license_url} target="_blank" rel="noreferrer">{selected.license}</a>:selected.license}</span></>}</>:<span>{symbol?'Şematik kabuk modeli · ölçekli değildir':'Doğrulanmış yapı görseli bulunmuyor'}</span>}</figcaption>
  </figure>;
}
