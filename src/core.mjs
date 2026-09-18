import fs from 'node:fs';
import crypto from 'node:crypto';

export const hash = value => crypto.createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export function assert(condition, message) { if(!condition) throw new Error(message); }
const object = x => x!==null && typeof x==='object' && !Array.isArray(x);
export function probability(x, field='probability') {
 assert(typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1,`${field}: expected a finite number in [0,1]`);
 return x;
}
export function validateCase(c) {
 assert(object(c)&&typeof c.id==='string'&&c.id.length>0,'case requires an id');
 assert(object(c.request),'case requires request');
 assert(Object.keys(c.request).every(k=>['state','questions'].includes(k)),'request accepts only state and questions; put expected values in reference');
 assert(typeof c.request.state==='string'&&c.request.state.trim().length>0,'state must be a nonempty string');
 const qs=c.request.questions;
 assert(object(qs)&&Object.keys(qs).join(',')==='answer','reader runner expects exactly one question named answer');
 const q=qs.answer;
 assert(object(q)&&['choice','boolean'].includes(q.type),'question type must be choice or boolean (Noul)');
 assert(typeof q.instructions==='string'&&q.instructions.length>0,'instructions are required');
 assert(object(q.criteria)&&Object.values(q.criteria).every(v=>typeof v==='string'),'criteria must map keys to strings');
 if(q.type==='choice') assert(Object.keys(q.criteria).length>=2,'choice needs at least two candidates');
 else assert(Object.keys(q.criteria).sort().join(',')==='false,true','Noul criteria must contain true and false');
 const r=c.reference;
 if(r!==undefined) {
  assert(object(r),'reference must be an object');
  if(r.kind==='known_distribution') {
   assert(q.type==='choice'&&object(r.probabilities),'known_distribution needs Choice and probabilities');
   assert(Object.keys(r.probabilities).sort().join('\0')===Object.keys(q.criteria).sort().join('\0'),'reference candidates differ');
   Object.values(r.probabilities).forEach(p=>probability(p));
   assert(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<1e-8,'reference distribution must sum to 1');
   if('observed' in r) assert(Object.hasOwn(q.criteria,r.observed),'unknown observed outcome');
  } else {
   assert(['known_probability','stated_probability'].includes(r.kind),'unknown reference kind');
   probability(r.probability);
   if(q.type==='choice') assert(Object.hasOwn(q.criteria,r.target),'reference target not in choices');
   if('observed' in r) assert(typeof r.observed==='boolean','single-proposition observed must be boolean');
   if(r.kind==='stated_probability') assert(!('observed' in r),'stated forecasts must not be treated as observed outcomes');
  }
 }
 return c;
}
export function loadCases(file) {
 const text=fs.readFileSync(file,'utf8');
 let rows;
 try { rows=file.endsWith('.jsonl')?text.split(/\r?\n/).filter(l=>l.trim()).map(l=>JSON.parse(l)):JSON.parse(text); }
 catch(e){throw new Error(`Cannot parse ${file}: ${e.message}`);}
 if(!Array.isArray(rows))rows=[rows];
 assert(rows.length>0,'input is empty');
 const seen=new Set();
 for(const c of rows){validateCase(c); assert(!seen.has(c.id),`duplicate case id: ${c.id}`);seen.add(c.id);}
 return rows;
}
/** Only this payload reaches the SDK. reference, observed outcomes and ids stay local. */
export function payload(c, model, abortSignal) {
 return {model,state:c.request.state,questions:c.request.questions,maxRetries:0,abortSignal};
}
export function readAnswer(c,result) {
 const a=result?.answers?.answer;
 assert(object(a),'missing answers.answer');
 const q=c.request.questions.answer;
 let answer;
 if(q.type==='boolean') answer={type:'noul',probability:probability(a.probability,'answer.probability')};
 else {
  assert(object(a.probabilities),'missing probability map');
  const keys=Object.keys(q.criteria);
  assert(keys.slice().sort().join('\0')===Object.keys(a.probabilities).sort().join('\0'),'response candidate keys differ from request');
  const values=keys.map(k=>probability(a.probabilities[k],`probabilities.${k}`));
  const sum=values.reduce((s,v)=>s+v,0);
  const rounding=result?.providerMetadata?.typesafe?.rounding?.probabilityDecimals;
  const decimals=Number.isInteger(rounding)&&rounding>=0&&rounding<=12?rounding:2;
  const tolerance=keys.length*0.5*10**(-decimals)+1e-8;
  assert(sum>0&&Math.abs(sum-1)<=tolerance,'probabilities do not sum to 1 within rounding tolerance');
  assert(Object.hasOwn(a.probabilities,a.choice),'choice is not in probability map');
  assert(a.probabilities[a.choice]>=Math.max(...values)-1e-9,'choice did not select a highest-probability option');
  answer={type:'choice',choice:a.choice,probabilities:{...a.probabilities},sum,reported:a.probabilities[a.choice]};
 }
 const confidence=result?.providerMetadata?.typesafe?.confidence?.answer;
 if(confidence!==undefined&&confidence!==null) answer.confidence=probability(confidence,'confidence');
 return answer;
}
export function compare(c,a) {
 const r=c.reference;
 if(!r)return null;
 if(r.kind==='known_distribution') {
  const p=Object.fromEntries(Object.entries(a.probabilities).map(([k,v])=>[k,v/a.sum]));
  const excess=Object.keys(p).reduce((s,k)=>s+(p[k]-r.probabilities[k])**2,0);
  const out={reference_kind:r.kind,expected_selected_probability:r.probabilities[a.choice],reported_selected_probability:a.reported,expected_brier_excess:excess};
  if('observed' in r){out.correct=a.choice===r.observed;out.observed=r.observed;}
  return out;
 }
 const p=a.type==='noul'?a.probability:a.probabilities[r.target];
 const out={reference_kind:r.kind,reference_probability:r.probability,reported_probability:p,difference:p-r.probability};
 if('observed' in r)out.event_occurred=r.observed;
 return out;
}
/** Never log auth headers or the supplied API key. Other input text may still be sensitive. */
export function redact(value,secrets=[]) {
 const safe=secrets.filter(x=>typeof x==='string'&&x.length>0);
 const seen=new WeakSet();
 const json=JSON.stringify(value,(k,v)=>{
  if(/^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|apiKey|api_key)$/i.test(k))return '[redacted]';
  if(typeof v==='bigint')return v.toString();
  if(typeof v==='string'){for(const s of safe)v=v.split(s).join('[redacted]');return v;}
  if(typeof v==='object'&&v!==null){if(seen.has(v))return '[circular]';seen.add(v);}
  return v;
 });
 return json===undefined?null:JSON.parse(json);
}
