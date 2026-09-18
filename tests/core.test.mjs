import test from 'node:test';
import assert from 'node:assert/strict';
import { caseFactories } from '../src/reconstruct.mjs';
import { validateCase, payload, readAnswer, compare, redact, loadCases } from '../src/core.mjs';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dice=caseFactories.repeat()[0],noul=caseFactories.noul()[0];
const good={answers:{answer:{choice:'face_1',probabilities:{face_1:.80,face_2:.04,face_3:.04,face_4:.04,face_5:.04,face_6:.04}}}};

test('all reconstructed requests pass validation',()=>{
 for(const f of Object.values(caseFactories))for(const c of f())validateCase(c);
});
test('reconstructed files are deterministic',()=>{
 execFileSync(process.execPath,['scripts/build_requests.mjs','--check'],{cwd:root});
});
test('counts distinguish planned and observed records',()=>{
 assert.equal(caseFactories.dice().length,1000);assert.equal(caseFactories.noul().length,600);
 assert.equal(caseFactories.forecast().length,312);assert.equal(caseFactories.repeat().length,30);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'data/recorded/noul.json'))).length,599);
});
test('references and observed values are not in the SDK payload',()=>{
 const c=structuredClone(dice);c.reference.observed='secret-hidden-outcome-marker';c.provenance.extra='private-marker';
 const p=payload(c,'typesafe-ai/jev',undefined);
 assert.deepEqual(Object.keys(p),['model','state','questions','maxRetries','abortSignal']);
 assert(!JSON.stringify(p).includes('secret-hidden-outcome-marker'));assert(!JSON.stringify(p).includes('private-marker'));
});
test('default example die is sweep request d0020, as shown in the article',()=>{
 const [c]=loadCases(path.join(root,'examples/dice.json'));
 const src=caseFactories.dice().find(x=>x.id==='dice:d0020');
 assert.deepEqual(c.request,src.request);assert.deepEqual(Object.keys(c.request.questions.answer.criteria),['1','2','3','4','5','6']);
});
test('ordered example die uses noninteger keys for explicit order',()=>{
 const [c]=loadCases(path.join(root,'examples/dice_ordered.json'));
 const keys=Object.keys(c.request.questions.answer.criteria);
 assert(keys.every(k=>k.startsWith('face_')));
 assert.deepEqual(Object.keys(Object.fromEntries([...keys].reverse().map(k=>[k,k]))),[...keys].reverse());
});
test('choice response retains original probabilities',()=>{
 const a=readAnswer(dice,good);assert.equal(a.reported,.80);assert.equal(a.probabilities.face_2,.04);
 assert(compare(dice,a).expected_brier_excess>0);
});
test('Noul probability is not interpreted as a yes/no answer accuracy',()=>{
 const a=readAnswer(noul,{answers:{answer:{probability:.25}}});
 const m=compare(noul,a);assert.equal(m.reference_probability,.5);assert.equal(m.reported_probability,.25);assert(!Object.hasOwn(m,'correct'));
});
test('missing probabilities are errors, not zeros',()=>{
 const r=structuredClone(good);delete r.answers.answer.probabilities.face_6;assert.throws(()=>readAnswer(dice,r),/keys differ/);
 assert.throws(()=>readAnswer(noul,{answers:{answer:{}}}),/finite number/);
});
test('zero and out-of-range maps are rejected',()=>{
 const r=structuredClone(good);for(const k of Object.keys(r.answers.answer.probabilities))r.answers.answer.probabilities[k]=0;
 assert.throws(()=>readAnswer(dice,r),/sum/);
 r.answers.answer.probabilities.face_1=1.2;assert.throws(()=>readAnswer(dice,r),/finite/);
});
test('argmax inconsistency is rejected and not repaired',()=>{
 const r=structuredClone(good);r.answers.answer.choice='face_2';assert.throws(()=>readAnswer(dice,r),/highest/);
});
test('rounding is tolerated but not silently normalized in the saved answer',()=>{
 const r=structuredClone(good);r.answers.answer.probabilities.face_6=.03;
 const a=readAnswer(dice,r);assert(Math.abs(a.sum-.99)<1e-9);assert.equal(a.probabilities.face_6,.03);
});
test('forecast reference is marked as a stated value, not event truth',()=>{
 const cases=caseFactories.forecast();
 for(const c of cases){assert.equal(c.reference.kind,'stated_probability');assert(!('observed' in c.reference));}
 const c=cases[0],d=cases[1];assert.equal(c.request.state,d.request.state);assert.equal(c.reference.target,d.reference.target);
});
test('auth headers and exact key values are redacted',()=>{
 const x=redact({Authorization:'Bearer fake-key',x:'fake-key',cookie:'secret'},['fake-key']);
 assert.equal(x.Authorization,'[redacted]');assert.equal(x.cookie,'[redacted]');assert.equal(x.x,'[redacted]');
});
test('preview runs with no SDK installed and no key',()=>{
 const out=execFileSync(process.execPath,['src/run.mjs','--input','examples/forecast.json'],{cwd:root,env:{...process.env,AI_GATEWAY_API_KEY:''},encoding:'utf8'});
 assert(out.includes('DRY RUN (no network)'));assert(out.includes('2/2 cases'));
});
test('unknown CLI arguments fail closed',()=>{
 assert.throws(()=>execFileSync(process.execPath,['src/run.mjs','--execut'],{cwd:root,stdio:'pipe'}));
});
test('empty API key stops execute before a network request',()=>{
 assert.throws(()=>execFileSync(process.execPath,['src/run.mjs','--execute'],{cwd:root,env:{...process.env,AI_GATEWAY_API_KEY:''},stdio:'pipe'}),e=>e.stderr.toString().includes('AI_GATEWAY_API_KEY is missing'));
});
