import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { hash, assert, readAnswer, compare, redact } from './core.mjs';

function errorRecord(e){return {name:e?.name??'Error',message:String(e?.message??e),status:e?.statusCode??e?.status??null,responseBody:e?.responseBody??null};}
function statusOf(e,trace){return e?.statusCode??e?.status??[...trace].reverse().find(t=>t.status>=400)?.status??null;}
function transient(e,status){
 return [408,429,500,502,503,504,529].includes(status)||['TimeoutError','AbortError'].includes(e?.name)||/fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|overloaded/i.test(String(e?.message??e));
}
function delayFor(trace,attempt){
 const h=[...trace].reverse().find(t=>t.response_headers?.['retry-after'])?.response_headers['retry-after'];
 if(h!==undefined){const numeric=Number(h);const ms=Number.isFinite(numeric)?numeric*1000:Date.parse(h)-Date.now();if(Number.isFinite(ms))return Math.max(ms,0);}
 return Math.min(1000*2**(attempt-1),5000);
}
function repairLastLine(file){
 const bytes=fs.readFileSync(file);
 if(!bytes.length||bytes[bytes.length-1]===10)return null;
 const last=bytes.lastIndexOf(10),prefix=bytes.subarray(0,last+1),tail=bytes.subarray(last+1);
 // A killed append can leave a partial final line. Back it up before truncating.
 fs.writeFileSync(file+'.partial-'+Date.now(),tail,{flag:'wx'});
 fs.writeFileSync(file,prefix);return tail.length;
}
export function readLog(file){
 if(!fs.existsSync(file))return [];
 return fs.readFileSync(file,'utf8').split('\n').filter(Boolean).map((l,i)=>{
  try{return JSON.parse(l);}catch{throw new Error(`Invalid completed log line ${i+1}; refusing to ignore it.`);}
 });
}
export async function runBatch(cases,options,evaluate){
 const {out,model='typesafe-ai/jev',maxAttempts=3,timeoutMs=20000,resume=false,retryErrors=false,secrets=[],signal,onProgress=()=>{},retryDelay=sleep}=options;
 const resolved=path.resolve(out);
 // New results never belong in the committed evidence/input directories.
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const protectedRoots=['data','examples','figures','docs','src','tests','scripts','.git'].map(p=>path.join(root,p));
 assert(resolved!==root&&!protectedRoots.some(p=>resolved===p||resolved.startsWith(p+path.sep)),'Output must be a separate runs directory, not a source or evidence directory.');
 assert(Number.isInteger(maxAttempts)&&maxAttempts>=1&&maxAttempts<=10,'maxAttempts must be 1..10');
 assert(Number.isInteger(timeoutMs)&&timeoutMs>=1,'timeoutMs must be positive');
 assert(!retryErrors||resume,'--retry-errors requires --resume');
 const config={schema_version:1,model,max_attempts:maxAttempts,timeout_ms:timeoutMs,case_count:cases.length,plan_sha256:hash(cases)};
 if(resume){
  assert(fs.existsSync(path.join(out,'manifest.json')),'No manifest to resume');
  const old=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
  assert(old.plan_sha256===config.plan_sha256&&old.model===model,'Resume refused: input plan or model differs from the original run.');
  assert(old.max_attempts===maxAttempts&&old.timeout_ms===timeoutMs,'Resume refused: timeout or retry policy differs.');
 } else {
  assert(!fs.existsSync(out),'Output already exists; choose a new --out or use --resume');
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({...config,created_at:new Date().toISOString(),node:process.version,recording:'SDK result plus captured HTTP bodies when available; no auth headers',sdk_requested:'ai@7.0.105',sdk_installed:options.sdkInstalledVersion??null},null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(cases,null,2)+'\n',{flag:'wx'});
 }
 const lock=path.join(out,'.run.lock');
 const lockFd=fs.openSync(lock,'wx');fs.writeSync(lockFd,String(process.pid));fs.closeSync(lockFd);
 const log=path.join(out,'results.jsonl');
 let logFd;
 try {
  if(resume&&fs.existsSync(log))repairLastLine(log);
  const previous=readLog(log);
  const latest=new Map(previous.map(r=>[r.id,r]));
  for(const r of previous)assert(cases.some(c=>c.id===r.id),'Stored result id is not in this plan');
  logFd=fs.openSync(log,'a');
  const write=r=>{fs.writeSync(logFd,JSON.stringify(redact(r,secrets))+'\n');fs.fsyncSync(logFd);};
  for(const c of cases){
   if(signal?.aborted)break;
   const before=latest.get(c.id);
   if(before?.status==='ok'||(before&&!retryErrors))continue;
   const attempts=[];let resultRow;
   for(let attempt=1;attempt<=maxAttempts;attempt++) {
    const trace=[];const ac=new AbortController();
    const start=Date.now();
    const parentAbort=()=>ac.abort(signal.reason);
    signal?.addEventListener('abort',parentAbort,{once:true});
    let timer;let result;
    try {
     const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
      const e=new Error(`Request exceeded ${timeoutMs} ms`);e.name='TimeoutError';ac.abort(e);reject(e);
     },timeoutMs);});
     result=await Promise.race([evaluate(c,{model,signal:ac.signal,trace}),timeout]);
     const answer=readAnswer(c,result);
     attempts.push({attempt,started_at:new Date(start).toISOString(),elapsed_ms:Date.now()-start,status:'ok',http:trace});
     resultRow={id:c.id,group:c.group,case_sha256:hash(c),status:'ok',finished_at:new Date().toISOString(),answer,comparison:compare(c,answer),sdk_result:result,attempts};
     break;
    } catch(e) {
     const status=statusOf(e,trace),delay=delayFor(trace,attempt);
     const canRetry=!signal?.aborted&&attempt<maxAttempts&&transient(e,status)&&delay<=10000;
     attempts.push({attempt,started_at:new Date(start).toISOString(),elapsed_ms:Date.now()-start,status:'error',error:{...errorRecord(e),status},http:trace,retry_scheduled:canRetry,retry_after_ms:delay});
     resultRow={id:c.id,group:c.group,case_sha256:hash(c),status:'error',finished_at:new Date().toISOString(),error:errorRecord(e),sdk_result:result??null,attempts};
     if(!canRetry)break;
     clearTimeout(timer); signal?.removeEventListener('abort',parentAbort);
     await retryDelay(delay);
    } finally {clearTimeout(timer);signal?.removeEventListener('abort',parentAbort);}
   }
   write(resultRow);latest.set(c.id,resultRow);onProgress(resultRow);
   // Invalid credentials should not cause a full batch of requests to fail.
   if(resultRow.status==='error'&&[401,403].includes(resultRow.attempts.at(-1)?.error?.status))break;
  }
  const rows=cases.map(c=>latest.get(c.id));
  const summary={...config,finished_at:new Date().toISOString(),ok:rows.filter(r=>r?.status==='ok').length,errors:rows.filter(r=>r?.status==='error').length,pending:rows.filter(r=>!r).length};
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  return summary;
 } finally {if(logFd!==undefined)fs.closeSync(logFd);fs.unlinkSync(lock);}
}
