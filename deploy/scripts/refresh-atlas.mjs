// --fetch acquires media and Wikipedia links; default reapplies curated content offline.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { elementEditorial, compoundEditorial } from '../data/atlas-editorial.mjs';
const root = new URL('../../', import.meta.url);
const elementPath = new URL('catalog-service/Element.Services.Element.Infrastructure/Data/scientific-elements.json', root);
const compoundPath = new URL('compound-service/Element.Services.Compound.Infrastructure/Data/scientific-compounds.json', root);
const manifestPath = new URL('deploy/data/atlas-media.json', root);
const publicDir = new URL('web-app/public/media/atlas/', root);
const clean = value => String(value ?? '').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
async function writeSnapshot(path, records) {
  if(!path.href.startsWith(root.href))throw Error('Snapshot outside project');
  const text=JSON.stringify(records,null,2)+'\n';
  if(await readFile(path,'utf8').catch(()=>null)===text)return;
  const temporary=new URL(path.href+'.tmp');
  await writeFile(temporary,text);
  for(let attempt=0;attempt<5;attempt++){
    try{await rename(temporary,path);return;}catch(error){if(attempt===4)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
  }
}
const wikiTitle = { 'Water':'Water', 'Sodium chloride':'Sodium chloride', 'Silicon dioxide':'Silicon dioxide' };
async function response(url) {
  for(let attempt=0;attempt<3;attempt++) {
    try { const r=await fetch(url,{headers:{'User-Agent':'ElementAPI/1.0 (educational atlas)'},signal:AbortSignal.timeout(20000)}); if(!r.ok){ const e=new Error(`HTTP ${r.status}`);e.delay=r.status===429?Math.max(10000,Number(r.headers.get('retry-after')||10)*1000):1000;throw e;} return r; }
    catch(e) { if(attempt===2)throw e; await new Promise(resolve=>setTimeout(resolve,Math.min(30000,e.delay??1000))); }
  }
}
const json = async url => (await response(url)).json();
export function composition(formula) {
  const parts=[...formula.matchAll(/([A-Z][a-z]?)(\d*)/g)];
  if(parts.map(m=>m[0]).join('')!==formula)throw Error(`Unsupported formula ${formula}`);
  const totals=new Map(); for(const [,symbol,n] of parts)totals.set(symbol,(totals.get(symbol)??0)+Number(n||1));
  return [...totals].map(([symbol,count])=>({symbol,count}));
}
export async function refreshAtlas(fetchMedia=false, only=[]) {
  const elements=JSON.parse(await readFile(elementPath,'utf8'));
  const compounds=JSON.parse(await readFile(compoundPath,'utf8'));
  let manifest={}; try {manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{/* first run */}
  await mkdir(publicDir,{recursive:true});
  if(fetchMedia) {
    // Batches resolve redirects and language links without making 169 page-load requests.
    const selected=r=>only.length===0||only.includes(r.symbol??r.slug);
    for(const records of [elements.filter(selected),compounds.filter(selected)]) for(let i=0;i<records.length;i+=5) {
      const batch=records.slice(i,i+5);
      const titles=batch.map(r=>wikiTitle[r.names.en]??r.names.en);
      const url=new URL('https://en.wikipedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',redirects:'1',prop:'pageimages|langlinks',piprop:'name',lllang:'tr',lllimit:'max',titles:titles.join('|')});
      const result=await json(url);
      for(const r of batch) {
        let title=wikiTitle[r.names.en]??r.names.en;
        for(const entry of [...(result.query.normalized??[]),...(result.query.redirects??[])])if(entry.from===title)title=entry.to;
        const page=result.query.pages.find(p=>p.title===title&&!p.missing);
        const key=r.symbol??r.slug; manifest[key]??={photo:null,structure:null,wikipedia:null};
        if(page) {
          const tr=page.langlinks?.find(l=>l.lang==='tr');
          manifest[key].wikipedia={url:`https://${tr?'tr':'en'}.wikipedia.org/wiki/${encodeURIComponent(tr?.title??page.title)}`,language:tr?'tr':'en'};
          // For elements, accept only a named specimen, never a portrait or laboratory as a sample.
          const sample=page.pageimage;
          if(r.symbol&&r.atomic_number<=83&&sample&&new RegExp(r.names.en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(sample)&&!/portrait|diagram|electron|spectr|tube|lamp|discharge|atomic|symbol|bohr|icon/i.test(sample)) {
            try {
              const u=new URL('https://commons.wikimedia.org/w/api.php');u.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',titles:`File:${sample}`,iiprop:'url|extmetadata',iiurlwidth:'640'});
              const info=(await json(u)).query.pages[0].imageinfo?.[0];const meta=info?.extmetadata;
              // FAL (Free Art License) is common on Alchemist-hp element samples; treat as openly reusable.
              if(info&&meta&&/CC BY|CC0|Public domain|FAL|Free Art License/i.test(clean(meta.LicenseShortName?.value))) {
                const remote=info.thumburl??info.url;const img=await response(remote);const mime=img.headers.get('content-type');
                if(!['image/jpeg','image/png','image/webp'].includes(mime))continue;
                const filename=`${key.toLowerCase()}.${mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'}`;
                await writeFile(new URL(filename,publicDir),Buffer.from(await img.arrayBuffer()));
                manifest[key].photo={url:`/media/atlas/${filename}`,caption:`${r.names.tr} · madde fotoğrafı`,source_url:info.descriptionurl,creator:clean(meta.Artist?.value),license:clean(meta.LicenseShortName?.value),license_url:clean(meta.LicenseUrl?.value)||null,retrieved_at:new Date().toISOString().slice(0,10)};
              }
            }catch(e){console.warn(`Photo ${key}: ${e.message}; keeping previous image or schema fallback.`);}
          }
        }
      }
      await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
      console.log(`Wikipedia: ${Math.min(i+5,records.length)}/${records.length}`);
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
    for(const r of compounds.filter(selected)) {
      const entry=manifest[r.slug]??={photo:null,structure:null,wikipedia:null};
      if(entry.structure)continue;
      const source=`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${r.identifiers.pubchem_cid}/PNG?image_size=500x500`;
      const img=await response(source);if(!img.headers.get('content-type')?.startsWith('image/png'))throw Error(`Invalid structure ${r.slug}`);
      await writeFile(new URL(`${r.slug}-structure.png`,publicDir),Buffer.from(await img.arrayBuffer()));
      entry.structure={url:`/media/atlas/${r.slug}-structure.png`,caption:`${r.names.tr} · PubChem 2D yapı gösterimi`,source_url:`https://pubchem.ncbi.nlm.nih.gov/compound/${r.identifiers.pubchem_cid}`,creator:'PubChem / NCBI',license:'PubChem generated structure depiction',license_url:'https://pubchem.ncbi.nlm.nih.gov/docs/usage-guidelines',retrieved_at:new Date().toISOString().slice(0,10)};
      await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
    }
  }
  for(const r of [...elements,...compounds]) {
    const element=Boolean(r.symbol),key=r.symbol??r.slug;
    const copy=(element?elementEditorial:compoundEditorial)[key];if(!copy)throw Error(`Missing editorial ${key}`);
    const reference=element?r.provenance.sources.find(s=>s.id==='rsc'||s.name.includes('RSC')||s.url.includes('rsc.org'))?.url:`https://pubchem.ncbi.nlm.nih.gov/compound/${r.identifiers.pubchem_cid}`;
    const entry=manifest[key];
    r.editorial={summary:copy.summary,uses:copy.uses,story:copy.story,sources:[{name:element?'Royal Society of Chemistry':'PubChem / NCBI',url:reference??r.provenance.sources[0].url}]};
    r.media={photo:entry?.photo??null,structure:entry?.structure??null};
    r.external_links={wikipedia:entry?.wikipedia??null,pubchem:element?'https://pubchem.ncbi.nlm.nih.gov/element/'+encodeURIComponent(r.names.en):`https://pubchem.ncbi.nlm.nih.gov/compound/${r.identifiers.pubchem_cid}`};
    if(!element){r.display_formula=copy.display_formula;r.composition=composition(copy.display_formula); const a=JSON.stringify(composition(r.molecular_properties.molecular_formula).sort((x,y)=>x.symbol.localeCompare(y.symbol)));const b=JSON.stringify([...r.composition].sort((x,y)=>x.symbol.localeCompare(y.symbol)));if(a!==b)throw Error(`Formula mismatch ${key}`);}
    r.provenance.editorial_fields=[...new Set([...r.provenance.editorial_fields,'editorial','media','external_links',...(!element?['display_formula','composition']:[])])];
  }
  await writeSnapshot(elementPath,elements);await writeSnapshot(compoundPath,compounds);
  console.log(`Atlas: ${elements.length} elements, ${compounds.length} compounds; ${Object.values(manifest).filter(m=>m.photo).length} photos, ${Object.values(manifest).filter(m=>m.structure).length} structures.`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await refreshAtlas(process.argv.includes('--fetch'),process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',')??[]);
