import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBatch, readLog } from '../src/runner.mjs';
import { caseFactories } from '../src/reconstruct.mjs';
const c=caseFactories.noul()[0];
const ok=async()=>({answers:{answer:{probability:.5}},usage:{inputTokens:12}});
function temp(t){const p=fs.mkdtempSync(path.join(os.tmpdir(),'jev-test-'));t.after(()=>fs.rmSync(p,{recursive:true,force:true}));return path.join(p,'run');}

test('saves a successful case immediately, then resumes without calls',async t=>{
 const out=temp(t);let calls=0;
 let s=await runBatch([c],{out},async()=>{calls++;return ok();});assert.equal(s.ok,1);assert.equal(calls,1);
 s=await runBatch([c],{out,resume:true},async()=>{throw new Error('must not run');});assert.equal(s.ok,1);assert.equal(readLog(path.join(out,'results.jsonl')).length,1);
});
test('will not overwrite an existing run',async t=>{
 const out=temp(t);await runBatch([c],{out},ok);await assert.rejects(runBatch([c],{out},ok),/already exists/);
});
test('changed request on resume is refused',async t=>{
 const out=temp(t);await runBatch([c],{out},ok);const changed=structuredClone(c);changed.request.state+=' changed';
 await assert.rejects(runBatch([changed],{out,resume:true},ok),/input plan or model differs/);
});
test('retries a transient 529, preserving attempt log',async t=>{
 const out=temp(t);let calls=0;
 const s=await runBatch([c],{out,retryDelay:async()=>{}},async()=>{if(++calls===1){const e=new Error('overloaded');e.statusCode=529;throw e;}return ok();});
 assert.equal(s.ok,1);assert.equal(calls,2);assert.equal(readLog(path.join(out,'results.jsonl'))[0].attempts.length,2);
});
test('429 with long Retry-After stops instead of retry storm',async t=>{
 const out=temp(t);let calls=0;
 const s=await runBatch([c],{out},async(_,{trace})=>{calls++;trace.push({status:429,response_headers:{'retry-after':'120'}});const e=new Error('rate limit');e.statusCode=429;throw e;});
 assert.equal(calls,1);assert.equal(s.errors,1);
});
test('bad response is saved as failure with raw SDK result, not omitted',async t=>{
 const out=temp(t);let calls=0;
 const s=await runBatch([c],{out},async()=>{calls++;return {answers:{answer:{probability:2}}};});
 assert.equal(s.errors,1);assert.equal(calls,1);assert.equal(readLog(path.join(out,'results.jsonl'))[0].sdk_result.answers.answer.probability,2);
});
test('deadline aborts a stalled evaluator',async t=>{
 const out=temp(t);const s=await runBatch([c],{out,timeoutMs:10,maxAttempts:1},()=>new Promise(()=>{}));
 assert.equal(s.errors,1);assert.equal(readLog(path.join(out,'results.jsonl'))[0].error.name,'TimeoutError');
});
test('error resume needs opt-in to retry',async t=>{
 const out=temp(t);await runBatch([c],{out},async()=>{throw new Error('bad');});
 let called=0;await runBatch([c],{out,resume:true},async()=>{called++;return ok();});assert.equal(called,0);
 const s=await runBatch([c],{out,resume:true,retryErrors:true},ok);assert.equal(s.ok,1);assert.equal(readLog(path.join(out,'results.jsonl')).length,2);
});
test('partial trailing log line is backed up and recovered on resume',async t=>{
 const out=temp(t);await runBatch([c],{out},ok);fs.appendFileSync(path.join(out,'results.jsonl'),'{"partial":');
 const s=await runBatch([c],{out,resume:true},ok);assert.equal(s.ok,1);assert(fs.readdirSync(out).some(n=>n.startsWith('results.jsonl.partial-')));
});
test('credentials are redacted from failure bodies',async t=>{
 const out=temp(t);await runBatch([c],{out,secrets:['dummy-test-secret']},async()=>{throw new Error('bad dummy-test-secret');});
 assert(!fs.readFileSync(path.join(out,'results.jsonl'),'utf8').includes('dummy-test-secret'));
});
test('401 stops the batch, leaving remaining cases pending',async t=>{
 const out=temp(t),second={...c,id:'other'};let calls=0;
 const s=await runBatch([c,second],{out},async()=>{calls++;const e=new Error('unauthorized');e.statusCode=401;throw e;});
 assert.equal(calls,1);assert.equal(s.pending,1);assert.equal(s.errors,1);
});
