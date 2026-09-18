import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { payload, redact } from './core.mjs';

function installedVersion(){
 try {
  let d=path.dirname(createRequire(import.meta.url).resolve('ai'));
  for(let i=0;i<6;i++,d=path.dirname(d)) {
   const p=path.join(d,'package.json');
   if(fs.existsSync(p)){const j=JSON.parse(fs.readFileSync(p,'utf8'));if(j.name==='ai')return j.version;}
  }
 } catch {}
 return null;
}
/** SDK import is delayed: offline commands and tests need no npm install.
 * sdkForTest is dependency injection used by offline tests only. */
export async function makeLiveEvaluator(apiKey,sdkForTest=null) {
 let sdk=sdkForTest;
 if(!sdk){try { sdk=await import('ai'); } catch { throw new Error('AI SDK is not installed. Run npm ci before --execute.'); }}
 if(typeof sdk.experimental_evaluate!=='function')throw new Error('This SDK does not expose experimental_evaluate; use the supplied package-lock.json.');
 const context=new AsyncLocalStorage();
 const original=globalThis.fetch;
 // Per-async-call trace ownership also handles an aborted request completing late.
 const wrapped=async (input,init={})=>{
  const trace=context.getStore();if(!trace)return original(input,init);
  const requestUrl=typeof input==='string'?input:input instanceof URL?input.href:input.url;
  let requestBody=init.body;
  if(requestBody===undefined&&input instanceof Request) requestBody=await input.clone().text();
  const entry=redact({url:requestUrl,method:init.method??(input instanceof Request?input.method:'GET'),request_body:typeof requestBody==='string'?requestBody:null},[apiKey]);
  trace.push(entry);
  try {
   const response=await original(input,init);
   entry.status=response.status;
   entry.response_headers={};
   for(const k of ['content-type','x-request-id','x-vercel-id','retry-after']) {
    const v=response.headers.get(k);if(v!==null)entry.response_headers[k]=redact(v,[apiKey]);
   }
   if(/json/i.test(response.headers.get('content-type')??'')) {
    const reader=response.clone().body?.getReader();
    if(reader){
     const chunks=[];let bytes=0;
     try {
      for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;
       if(bytes>2_000_000){entry.response_body_truncated=true;reader.cancel().catch(()=>{});break;}chunks.push(value);}
      entry.response_body=redact(Buffer.concat(chunks).toString('utf8'),[apiKey]);
     } catch(e){entry.capture_error=redact(String(e.message??e),[apiKey]);}
    }
   }
   return response;
  } catch(e){entry.fetch_error=redact(String(e.message??e),[apiKey]);throw e;}
 };
 globalThis.fetch=wrapped;
 const evaluate=(c,{model,signal,trace})=>context.run(trace,()=>sdk.experimental_evaluate(payload(c,model,signal)));
 evaluate.close=()=>{if(globalThis.fetch===wrapped)globalThis.fetch=original;};
 evaluate.sdkVersion=sdkForTest?'mock':installedVersion();
 return evaluate;
}
