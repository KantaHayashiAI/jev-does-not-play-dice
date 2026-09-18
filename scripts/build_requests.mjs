import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { caseFactories } from '../src/reconstruct.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const check=args.includes('--check');
for(const [suite, factory] of Object.entries(caseFactories)) {
 const cases=factory();
 const text=cases.map(c=>JSON.stringify(c)).join('\n')+'\n';
 const target=path.join(root,'data','requests',suite+'.jsonl');
 if(check) {
  if(fs.readFileSync(target,'utf8')!==text) throw new Error(`${suite}: reconstructed request file differs`);
 } else fs.writeFileSync(target,text);
 console.log(`${suite}: ${cases.length} reconstructed requests${check?' (matched)':''}`);
}
if(!check) {
 const dice=caseFactories.dice().find(c=>c.id==='dice:d0020');
 const diceOrdered=caseFactories.repeat()[0];
 const noul=caseFactories.noul();
 const forecast=caseFactories.forecast();
 const examples={
  dice:[{...dice,id:'example:dice-d0020'}],
  dice_ordered:[{...diceOrdered,id:'example:fair-die'}],
  noul:['shard_n4','fair_die','shard_n20'].map(g=>noul.find(c=>c.group===g)),
  forecast:forecast.filter(c=>c.group==='inventory'&&c.reference.probability===.3&&c.provenance.variant===0)
 };
 for(const [name,cases] of Object.entries(examples)) {
  const clean=cases.map(c=>({id:c.id,group:c.group,request:c.request,reference:Object.fromEntries(Object.entries(c.reference).filter(([k])=>k!=='observed'))}));
  fs.writeFileSync(path.join(root,'examples',name+'.json'),JSON.stringify(clean,null,2)+'\n');
 }
}
