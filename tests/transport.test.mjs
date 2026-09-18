import test from 'node:test';
import assert from 'node:assert/strict';
import { makeLiveEvaluator } from '../src/live.mjs';
import { caseFactories } from '../src/reconstruct.mjs';

test('HTTP capture records request/response bodies without authorization',async()=>{
 const original=globalThis.fetch;let received;
 globalThis.fetch=async(url,init)=>{
  received=JSON.parse(init.body);
  return new Response(JSON.stringify({answers:{answer:{probability:.5}}}),{status:200,headers:{'content-type':'application/json','set-cookie':'do-not-save','x-request-id':'test-id'}});
 };
 let evaluate;
 try {
  evaluate=await makeLiveEvaluator('dummy-secret',{experimental_evaluate:async args=>{
   const {abortSignal,...wire}=args;
   const r=await fetch('https://example.invalid/mock-evaluation',{method:'POST',headers:{authorization:'Bearer dummy-secret','content-type':'application/json'},body:JSON.stringify(wire),signal:abortSignal});
   return r.json();
  }});
  const c=caseFactories.noul()[0],trace=[];
  const result=await evaluate(c,{model:'typesafe-ai/jev',signal:undefined,trace});
  assert.equal(result.answers.answer.probability,.5);
  assert(!Object.hasOwn(received,'reference'));assert(!Object.hasOwn(received,'provenance'));
  assert.equal(trace.length,1);assert.equal(trace[0].response_headers['x-request-id'],'test-id');
  assert(!JSON.stringify(trace).includes('dummy-secret'));assert(!JSON.stringify(trace).includes('do-not-save'));
  assert(trace[0].request_body.includes('state'));assert(trace[0].response_body.includes('probability'));
 } finally {evaluate?.close();globalThis.fetch=original;}
});
