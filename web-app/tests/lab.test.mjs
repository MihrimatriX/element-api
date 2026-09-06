import test from 'node:test';
import assert from 'node:assert/strict';
import { recipes, materials, hint, combine, discover, unlockedElements, parseProgress, loadProgress, saveProgress, pairKey } from '../src/services/lab.ts';
test('every discovery is reachable and every element opens from the initial set',()=>{
  let found=[];
  while(hint(found)){const next=hint(found);assert.ok(materials.some(m=>m.id===next.result));found=discover(found,next.result);}
  assert.equal(found.length,18);assert.equal(unlockedElements(found).length,15);
});
test('pairs are unordered, unique, and locked inputs cannot be used',()=>{
  assert.equal(new Set(recipes.map(r=>pairKey(...r.inputs))).size,recipes.length);
  assert.equal(combine('H','O',[])?.result,'h2o');assert.equal(combine('O','H',[])?.result,'h2o');
  assert.equal(combine('Mg','O',[]),undefined);assert.equal(combine('H','H',[]),undefined);
});
test('only unique known discoveries contribute to unlock thresholds',()=>{
  const ids=recipes.map(r=>r.result);
  for(const [count,total] of [[0,6],[2,6],[3,9],[7,9],[8,12],[12,12],[13,15]])assert.equal(unlockedElements(ids.slice(0,count)).length,total);
  assert.deepEqual(discover(['h2o'],'h2o'),['h2o']);assert.deepEqual(discover(['h2o'],'fiction'),['h2o']);
});
test('progress survives reload and storage errors do not break play',()=>{
  let raw=null;const storage={getItem:()=>raw,setItem:(_k,value)=>{raw=value;}};
  assert.equal(saveProgress(storage,['h2o','h2o']),true);assert.deepEqual(loadProgress(storage).discovered,['h2o']);
  for(const value of ['{','null','{"version":2,"discovered":["h2o"]}'])assert.deepEqual(parseProgress(value),[]);
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('quota');}};
  assert.equal(loadProgress(blocked).persistent,false);assert.equal(saveProgress(blocked,['h2o']),false);
});
test('published equations conserve each element and provide evidence',()=>{
  const tally=side=>{const result={};for(const term of side.split('+')){const [,factor,formula]=term.trim().match(/^(\d*)(.*)$/);for(const [,symbol,count] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g))result[symbol]=(result[symbol]??0)+Number(factor||1)*Number(count||1);}return result;};
  for(const recipe of recipes.filter(r=>r.reaction)){const [a,b]=recipe.reaction.equation.split('→');assert.deepEqual(tally(a),tally(b));assert.match(recipe.reaction.source,/^https:\/\//);}
});
