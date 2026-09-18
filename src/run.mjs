#!/usr/bin/env node
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCases, assert, redact } from './core.mjs';
import { runBatch } from './runner.mjs';
import { makeLiveEvaluator } from './live.mjs';

const help=`Jev reader experiments — dry run unless --execute is explicitly supplied.

  node src/run.mjs --input examples/dice.json
  npm run experiment -- --input examples/noul.json --execute
  npm run experiment -- --input examples/forecast.json --execute --out runs/forecast-demo

Options:
  --input FILE       JSON array/object or JSONL; default examples/dice.json
  --limit N          At most N requests; default 6 (never silently launches a full dataset)
  --all              Explicitly select every case in the file
  --execute          Allow paid API requests. AI_GATEWAY_API_KEY is required.
  --out DIR          New run directory; auto-generated under runs/ if omitted
  --resume           Resume an existing --out with the same input/model/policy
  --retry-errors     On resume, retry previously failed cases too
  --timeout-ms N     Per-attempt timeout; default 20000, allowed 1..300000
  --max-attempts N   Total attempts per case including first; default 3, maximum 10
  --model ID         Default typesafe-ai/jev; other IDs must support evaluate
  --help            Show this help

No API calls are made by preview, analyze, plots, build:requests or tests.
A retry may be billed even when the earlier request timed out. No fixed cost is promised.
`;
function parse(args){
 const out={input:'examples/dice.json',limit:6,execute:false,all:false,resume:false,retryErrors:false,timeoutMs:20000,maxAttempts:3,model:'typesafe-ai/jev'};
 const boolean={'--execute':'execute','--all':'all','--resume':'resume','--retry-errors':'retryErrors'};
 const strings={'--input':'input','--out':'out','--model':'model'};
 const numbers={'--limit':'limit','--timeout-ms':'timeoutMs','--max-attempts':'maxAttempts'};
 for(let i=0;i<args.length;i++) {
  const k=args[i];
  if(k==='--help'){out.help=true;continue;}
  if(k in boolean){out[boolean[k]]=true;continue;}
  if(k in strings||k in numbers){assert(i+1<args.length&&!args[i+1].startsWith('--'),`Missing value for ${k}`);const v=args[++i];out[strings[k]??numbers[k]]=k in numbers?Number(v):v;continue;}
  throw new Error(`Unknown argument: ${k}`);
 }
 for(const [key,max] of [['limit',10000],['timeoutMs',300000],['maxAttempts',10]])assert(Number.isInteger(out[key])&&out[key]>=1&&out[key]<=max,`${key} must be an integer in 1..${max}`);
 assert(!out.resume||out.out,'--resume requires --out');assert(!out.retryErrors||out.resume,'--retry-errors requires --resume');
 return out;
}
async function main(){
 const opt=parse(process.argv.slice(2));if(opt.help){console.log(help);return;}
 const all=loadCases(opt.input),cases=opt.all?all:all.slice(0,opt.limit);
 console.log(`${opt.execute?'LIVE (billable)':'DRY RUN (no network)'}: ${cases.length}/${all.length} cases; model ${opt.model}`);
 if(!opt.execute){
  console.log(JSON.stringify({requests:cases.map(c=>({id:c.id,model:opt.model,...c.request})),references_kept_local:cases.map(c=>({id:c.id,reference:c.reference??null})),note:'Only model, state and questions are sent. Use --execute to send requests.'},null,2));return;
 }
 assert(process.env.AI_GATEWAY_API_KEY?.trim(),'AI_GATEWAY_API_KEY is missing. Copy .env.example to .env.local, or export the variable.');
 const apiKey=process.env.AI_GATEWAY_API_KEY;
 const evaluate=await makeLiveEvaluator(apiKey);
 opt.out??=path.join('runs',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex'));
 const ac=new AbortController();let interrupt=0;
 const stop=()=>{interrupt++;ac.abort(new Error('Interrupted'));if(interrupt>1)process.exit(130);};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 try {
  const summary=await runBatch(cases,{...opt,sdkInstalledVersion:evaluate.sdkVersion,secrets:[apiKey],signal:ac.signal,onProgress:r=>{
   console.log(redact(`${r.id}: ${r.status==='ok'?JSON.stringify(r.comparison??r.answer):r.error.message}`,[apiKey]));
  }},evaluate);
  console.log(`Saved to ${opt.out}`);console.log(JSON.stringify(summary,null,2));
  if(summary.errors||summary.pending)process.exitCode=1;
 } finally {evaluate.close();process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
main().catch(e=>{console.error(redact(String(e.message??e),[process.env.AI_GATEWAY_API_KEY]));process.exitCode=1;});
