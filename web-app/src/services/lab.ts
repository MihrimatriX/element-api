export interface LabMaterial { id: string; name: string; formula: string; kind: 'element' | 'compound' }
export interface LabRecipe { inputs: [string, string]; result: string; explanation: string; reaction?: { equation: string; conditions: string; byproducts: string[]; source: string } }
export const LAB_VERSION = 1;
export const LAB_STORAGE_KEY = 'elementapi:lab:v1';
export const stages = [
  { at: 0, elements: ['H', 'O', 'C', 'N', 'Na', 'Cl'] },
  { at: 3, elements: ['Mg', 'Ca', 'K'] },
  { at: 8, elements: ['Al', 'Si', 'Fe'] },
  { at: 13, elements: ['Zn', 'Ti', 'Ag'] },
];
const rawElements = 'H,Hidrojen|O,Oksijen|C,Karbon|N,Azot|Na,Sodyum|Cl,Klor|Mg,Magnezyum|Ca,Kalsiyum|K,Potasyum|Al,Alüminyum|Si,Silisyum|Fe,Demir|Zn,Çinko|Ti,Titanyum|Ag,Gümüş';
const rawCompounds = 'h2o,Su,H2O|co2,Karbondioksit,CO2|nh3,Amonyak,NH3|hcl,Hidrojen klorür,HCl|nacl,Sodyum klorür,NaCl|naoh,Sodyum hidroksit,NaOH|mgo,Magnezyum oksit,MgO|cao,Kalsiyum oksit,CaO|kcl,Potasyum klorür,KCl|koh,Potasyum hidroksit,KOH|caco3,Kalsiyum karbonat,CaCO3|al2o3,Alüminyum oksit,Al2O3|sio2,Silisyum dioksit,SiO2|fe2o3,Demir(III) oksit,Fe2O3|fe3o4,Manyetit,Fe3O4|zno,Çinko oksit,ZnO|tio2,Titanyum dioksit,TiO2|agcl,Gümüş klorür,AgCl';
export const materials: LabMaterial[] = [
  ...rawElements.split('|').map(row => { const [id, name] = row.split(','); return { id, name, formula: id, kind: 'element' as const }; }),
  ...rawCompounds.split('|').map(row => { const [id, name, formula] = row.split(','); return { id, name, formula, kind: 'compound' as const }; }),
];
export const materialById = Object.fromEntries(materials.map(m => [m.id, m]));
export const recipes: LabRecipe[] = [
  { inputs: ['H','O'], result:'h2o', explanation:'Suyun molekülünde iki hidrojen ve bir oksijen bulunur. Kartlar madde türünü seçer; denklemdeki sayıları temsil etmez.', reaction:{equation:'2H2 + O2 → 2H2O',conditions:'Hidrojen ve oksijenin tepkimesi başlatıldığında enerji açığa çıkar.',byproducts:[],source:'https://periodic-table.rsc.org/element/1/hydrogen'} },
  { inputs: ['C','O'], result:'co2', explanation:'Karbon ve oksijeni ilişkilendirerek karbondioksiti açtın. Gerçek yanma ürünleri oksijen miktarı ve koşullara bağlıdır.' },
  { inputs: ['N','H'], result:'nh3', explanation:'Amonyak, azot ve hidrojen içerir. Endüstriyel üretimi katalizör ve özel koşullar gerektirir; kart seçimi bir üretim tarifi değildir.' },
  { inputs: ['H','Cl'], result:'hcl', explanation:'Hidrojen klorür gazı, suda çözündüğünde hidroklorik asit çözeltisi oluşturur. Gaz ile çözeltiyi ayırt et.' },
  { inputs: ['Na','Cl'], result:'nacl', explanation:'Sodyum ile klor, özellikleri başlangıç maddelerinden farklı olan iyonik bir tuz oluşturur.',reaction:{equation:'2Na + Cl2 → 2NaCl',conditions:'Elementel sodyum ile klorun tepkimesi güçlü biçimde enerji açığa çıkarır.',byproducts:[],source:'https://edu.rsc.org/lesson-plans/how-does-sodium-react-with-chlorine-14-16-years/91.article'} },
  { inputs: ['Na','h2o'], result:'naoh', explanation:'Sodyumun suyla tepkimesi hidroksit ve hidrojen içeren ürünler verir. Oyunda yalnız sodyum hidroksit kartı açılır.' },
  { inputs: ['Mg','O'], result:'mgo', explanation:'Magnezyum oksit, ısıya dayanıklı bir iyonik katıdır. Denklemde oksijenin iki atomlu gaz olduğuna dikkat et.',reaction:{equation:'2Mg + O2 → 2MgO',conditions:'Magnezyumun oksijenle yanması ısı ve parlak ışık açığa çıkarır.',byproducts:[],source:'https://edu.rsc.org/balanced-chemical-equations/the-change-in-mass-when-magnesium-burns/718.article'} },
  { inputs: ['Ca','O'], result:'cao', explanation:'Kalsiyumun oksidini keşfettin. Sönmemiş kireç olarak bilinen bu madde, kalsiyum karbonattan farklıdır.' },
  { inputs: ['K','Cl'], result:'kcl', explanation:'Potasyum ve klorür iyonları potasyum klorür kristalini oluşturur. Sodyum klorürle benzer formül oranına dikkat et.' },
  { inputs: ['K','h2o'], result:'koh', explanation:'Potasyumun suyla etkileşimi potasyum hidroksit ve hidrojen içeren ürünlere yol açar. Oyunda hidroksit kartı açılır.' },
  { inputs: ['cao','co2'], result:'caco3', explanation:'Kalsiyum oksidin karbondioksiti bağlaması, karbonat dönüşümlerini birbirine bağlar.',reaction:{equation:'CaO + CO2 → CaCO3',conditions:'Karbonatlaşmanın yönü sıcaklığa ve karbondioksit koşullarına bağlıdır; kuvvetli ısıtma ters dönüşümü sağlayabilir.',byproducts:[],source:'https://edu.rsc.org/resources/chemical-reactions-post-16-thermodynamics-tutorials/4012923.article'} },
  { inputs: ['Al','O'], result:'al2o3', explanation:'Alüminyum yüzeyinde oluşan oksit tabakası koruyucudur. Aynı bileşim korundum kristalinde de bulunur.' },
  { inputs: ['Si','O'], result:'sio2', explanation:'Kuvarsın bileşimini keşfettin. Silisyum dioksit katısında atomlar tek tek moleküllerden çok bir bağ ağı oluşturur.' },
  { inputs: ['Fe','O'], result:'fe2o3', explanation:'Demirin oksitlerinden hematiti açtın. Gerçek pas, tek bir saf oksitle temsil edilemez.' },
  { inputs: ['Fe','fe2o3'], result:'fe3o4', explanation:'Bu keşif eşleştirmesi iki demir oksidini ilişkilendirir; maddeleri karıştırınca kendiliğinden manyetit oluştuğunu söylemez. Manyetit demir(II) ve demir(III) içerir.' },
  { inputs: ['Zn','O'], result:'zno', explanation:'Çinko oksit, optik ve yarı iletken özellikleriyle kullanılan beyaz bir oksittir.' },
  { inputs: ['Ti','O'], result:'tio2', explanation:'Titanyum dioksit ışığı güçlü biçimde saçar. Beyaz pigmentlerde kullanılan bu bileşiğin farklı kristal biçimleri vardır.' },
  { inputs: ['Ag','Cl'], result:'agcl', explanation:'Işığa duyarlı gümüş klorürü keşfettin. Bu tuzun az çözünmesi, klorür analizinde değerlendirilir.' },
];
export const pairKey = (a: string, b: string) => [a,b].sort().join('|');
export function normalizeDiscoveries(input: unknown): string[] {
  return Array.isArray(input) ? [...new Set(input.filter((id): id is string => typeof id === 'string' && recipes.some(r => r.result === id)))] : [];
}
export function unlockedElements(discovered: string[]): string[] { const count=normalizeDiscoveries(discovered).length; return stages.filter(s=>count>=s.at).flatMap(s=>s.elements); }
export function availableMaterials(discovered: string[]): string[] { return [...unlockedElements(discovered),...normalizeDiscoveries(discovered)]; }
export function combine(a: string, b: string, discovered: string[]): LabRecipe | undefined {
  const available=availableMaterials(discovered);
  return available.includes(a)&&available.includes(b) ? recipes.find(r=>pairKey(...r.inputs)===pairKey(a,b)) : undefined;
}
export function discover(discovered: string[], result: string): string[] { return normalizeDiscoveries([...discovered,result]); }
export function hint(discovered: string[]): LabRecipe | undefined { return recipes.find(r=>!discovered.includes(r.result)&&combine(...r.inputs,discovered)); }
export function parseProgress(raw: string | null): string[] {
  try { const data=JSON.parse(raw??'null'); return data?.version===LAB_VERSION ? normalizeDiscoveries(data.discovered) : []; } catch { return []; }
}
export function loadProgress(storage: Pick<Storage,'getItem'>): {discovered:string[];persistent:boolean} {
  try {return {discovered:parseProgress(storage.getItem(LAB_STORAGE_KEY)),persistent:true};}catch{return {discovered:[],persistent:false};}
}
export function saveProgress(storage: Pick<Storage,'setItem'>, discovered:string[]): boolean {
  try {storage.setItem(LAB_STORAGE_KEY,JSON.stringify({version:LAB_VERSION,discovered:normalizeDiscoveries(discovered)}));return true;}catch{return false;}
}
export const formulaText = (formula:string) => formula.replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
export const equationText = (equation:string) => equation.replace(/([A-Za-z)])(\d+)/g,(_,symbol:string,n:string)=>symbol+formulaText(n));
