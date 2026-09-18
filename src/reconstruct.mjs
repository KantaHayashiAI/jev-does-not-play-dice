/**
 * Pure reconstructions of the article's original request templates and seeded inputs.
 * No API calls. Not a record of historical HTTP payloads.
 * Source file hashes and the known limitations are in data/provenance.json and docs/methods.md.
 */
const uniform = (options) => Object.fromEntries(options.map(k => [k, 1 / options.length]));

export function diceCases() {
const SEED = 20260920;
function mulberry32(a        ) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const pick =     (a     ) => a[Math.floor(rnd() * a.length)];

const WHO = ['A player', 'The dealer', 'A student', 'My neighbour', 'The referee', 'A colleague'];
const WHERE = [
  'at a games night', 'in a statistics class', 'during a board game',
  'in a probability demonstration', 'at a tabletop session', 'in a lab exercise',
];
const SEALED = [
  'The result is covered by a cup and has not been looked at.',
  'The die landed inside a closed box and nobody has seen it.',
  'The result is hidden under an opaque lid.',
  'Nobody has observed the outcome yet.',
  'The face that came up has not been revealed to anyone.',
  'The result remains concealed.',
];
const FAIRNESS = [
  'The die is fair, so every face is equally likely.',
  'The die is unbiased: each of the six faces has probability exactly 1/6.',
  'It is a standard, perfectly balanced six-sided die.',
  'The die has been tested and is known to be fair.',
];
const COLORS = ['red', 'blue', 'green', 'yellow', 'white', 'black'];

                                                                  

             
             
                 
                    
  
                
                 
                
                                   
  


function buildState(family        )                                                                         {
  if (family === 'die_numeric') {
    const options = ['1', '2', '3', '4', '5', '6'];
    return {
      options,
      criteria: Object.fromEntries(options.map((o) => [o, `The die shows ${o}`])),
      state: `
${pick(WHO)} rolled a six-sided die exactly once ${pick(WHERE)}.
${pick(FAIRNESS)}
${pick(SEALED)}

Which face came up?
`,
    };
  }
  if (family === 'die_colored') {
    return {
      options: COLORS,
      criteria: Object.fromEntries(COLORS.map((o) => [o, `The die shows ${o}`])),
      state: `
${pick(WHO)} rolled a six-sided die exactly once ${pick(WHERE)}. Instead of
numbers, its faces are coloured red, blue, green, yellow, white and black.
The die is fair, so every colour is equally likely.
${pick(SEALED)}

Which colour came up?
`,
    };
  }
  if (family === 'coin') {
    return {
      options: ['heads', 'tails'],
      criteria: { heads: 'The coin shows heads', tails: 'The coin shows tails' },
      state: `
${pick(WHO)} flipped a fair coin exactly once ${pick(WHERE)}.
Heads and tails each have probability exactly 0.5.
${pick(SEALED)}

Which side came up?
`,
    };
  }
  const options = ['north', 'east', 'south', 'west'];
  return {
    options,
    criteria: Object.fromEntries(options.map((o) => [o, `The pointer landed on ${o}`])),
    state: `
${pick(WHO)} spun a perfectly balanced four-sector spinner exactly once
${pick(WHERE)}. The sectors are north, east, south and west, each covering a
quarter of the disc, so every sector has probability exactly 0.25.
${pick(SEALED)}

Which sector did the pointer land on?
`,
  };
}

const PREFIX                         = {
  die_numeric: 'd', die_colored: 'c', coin: 'k', spinner4: 's',
};

function buildItem(i        , family        )       {

  const { state, options, criteria } = buildState(family);
  const truth = options[Math.floor(rnd() * options.length)];
  return {
    id: `${PREFIX[family]}${String(i).padStart(4, '0')}`,
    family,
    options,
    truth,
    chance: 1 / options.length,
    state,
    criteria,
  };
}

const INSTRUCTIONS = `
Infer which outcome actually occurred.

The situation may be genuinely uncertain. Do not assume that the most likely
outcome is certain. Preserve uncertainty in the probability distribution.
`;


const families = [['die_numeric',400],['die_colored',200],['coin',200],['spinner4',200]];
return families.flatMap(([f,n])=>Array.from({length:n},(_,i)=>{
 const it=buildItem(i,f);
 return {id:`dice:${it.id}`,group:it.family,
 request:{state:it.state, questions:{answer:{type:'choice',instructions:INSTRUCTIONS,criteria:it.criteria}}},
 reference:{kind:'known_distribution',probabilities:uniform(it.options),observed:it.truth},
 provenance:{dataset:'dice',source_id:it.id}};
}));
}

export function noulCases() {
const SEED = 20260923;
function mulberry32(a        ) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const pick =     (a     ) => a[Math.floor(rnd() * a.length)];

const LOST = [
  'The assignment was never written to the audit log.',
  'The record was lost when the log shipper crashed.',
  'Log retention expired before anyone looked.',
  'The trace was sampled out and no copy survives.',
];

             
                                                        
                                                                                   
  

function shardItem(i        , n        )       {
  const options = Array.from({ length: n }, (_, k) => `shard-${String(k).padStart(2, '0')}`);
  const state = `
A request with no session affinity was assigned to one of ${n} shards by
consistent hashing over a randomly generated request id. The hash spreads ids
uniformly, so each of the ${n} shards is equally likely.
${pick(LOST)}
`;
  const truth = options[Math.floor(rnd() * n)];
  return { id: `shard${n}-${i}`, family: `shard_n${n}`, n, chance: 1 / n, options, describe: (o) => `The request was handled by ${o}`, state, truth };
}

function dieItem(i        )       {
  const options = ['1', '2', '3', '4', '5', '6'];
  const state = `
A player rolled a six-sided die exactly once at a games night.
The die is fair, so every face is equally likely.
${pick(LOST)}
`;
  const truth = options[Math.floor(rnd() * 6)];
  return { id: `die-${i}`, family: 'fair_die', n: 6, chance: 1 / 6, options, describe: (o) => `The die shows ${o}`, state, truth };
}


const items=[]; let i=0;
for(const n of [2,3,4,6,8,10,12,16,20]) for(let k=0;k<60;k++) items.push(shardItem(i++,n));
for(let k=0;k<60;k++) items.push(dieItem(i++));
return items.map(it=>{
const target=it.options[0], desc=it.describe(target);
const instructions = `
Determine whether the following proposition is true of the situation described:
${desc}.

The situation may be genuinely uncertain. Do not assume that the most likely
outcome is certain. Preserve uncertainty in the probability.
`;
return {id:`noul:${it.id}`,group:it.family,
 request:{state:it.state,questions:{answer:{type:'boolean',instructions,criteria:{true:desc,false:`Not: ${desc}`}}}},
 reference:{kind:'known_probability',probability:it.chance,target,observed:target===it.truth},
 provenance:{dataset:'noul',source_id:it.id,hidden_outcome:it.truth,options:it.n}};
});
}

export function forecastCases() {
const pctText = (p        ) => `${Math.round(p * 100)}%`;

const DOMAINS           = [
  {
    id: 'inventory',
    good: 'sufficient', bad: 'shortfall',
    goodDesc: 'Stock will be sufficient through the period',
    badDesc: 'There will be a stock shortfall during the period',
    report: (p, v) => `
Demand planning report, SKU 44120, week commencing Monday.

The forecasting model was run on the last 18 months of sales with the current
on-hand position of 4,180 units and the confirmed inbound of 1,200 units.

Model output:
- Probability that stock is sufficient through the period: ${pctText(1 - p)}
- Probability of a shortfall during the period: ${pctText(p)}

${['The model has been stable for six weeks.','No promotions are scheduled.','Lead time from the supplier is 14 days.','The buyer has not overridden the forecast.','Returns are running at their usual rate.'][v]}
`,
  },
  {
    id: 'capacity',
    good: 'within_capacity', bad: 'saturation',
    goodDesc: 'The cluster stays within capacity during the event',
    badDesc: 'The cluster saturates during the event',
    report: (p, v) => `
Capacity review for the launch window.

The load model was fitted on the last four comparable events, against the
currently provisioned 240 instances.

Model output:
- Probability the cluster stays within capacity: ${pctText(1 - p)}
- Probability of saturation during the window: ${pctText(p)}

${['Autoscaling is configured with a five minute reaction time.','The CDN offload ratio is unchanged.','No dependent service has announced a freeze.','The model was refitted on Monday.','Traffic shaping is not enabled.'][v]}
`,
  },
  {
    id: 'runway',
    good: 'covered', bad: 'breach',
    goodDesc: 'The cash position covers the quarter',
    badDesc: 'The cash position falls short during the quarter',
    report: (p, v) => `
Treasury forecast, quarter ahead.

The cash model incorporates the signed receivables schedule and the committed
spend plan.

Model output:
- Probability the cash position covers the quarter: ${pctText(1 - p)}
- Probability of a shortfall during the quarter: ${pctText(p)}

${['The receivables ageing profile is unchanged.','No new hires are pending approval.','The FX exposure is hedged to the quarter end.','The model is rerun weekly.','One large invoice is due on the 20th.'][v]}
`,
  },
  {
    id: 'sla',
    good: 'met', bad: 'breached',
    goodDesc: 'The SLA will be met this month',
    badDesc: 'The SLA will be breached this month',
    report: (p, v) => `
Reliability forecast for the current month.

The availability model uses the error budget consumed so far and the historical
incident arrival rate.

Model output:
- Probability the SLA is met this month: ${pctText(1 - p)}
- Probability the SLA is breached this month: ${pctText(p)}

${['Two thirds of the month remain.','No change freeze is in effect.','The on-call rotation is fully staffed.','The last incident was 11 days ago.','Error budget burn has been flat this week.'][v]}
`,
  },
];

const CHOICE_INSTRUCTIONS = `
Determine which outcome will occur, based on the report.

The report may describe genuine uncertainty. Do not assume that the most likely
outcome is certain. Preserve uncertainty in the probability distribution.
`;

const boolInstructions = (desc        ) => `
Determine whether the following proposition is true of the situation described:
${desc}.

The report may describe genuine uncertainty. Do not assume that the most likely
outcome is certain. Preserve uncertainty in the probability.
`;


const cases=[];
for(const d of DOMAINS) for(const p of [.05,.10,.20,.30,.40,.45,.50,.55,.60,.70,.80,.90,.95]) for(let v=0;v<3;v++) {
 const state=d.report(p,v);
 for(const type of ['choice','boolean']) {
 const question=type==='choice'
 ? {type,instructions:CHOICE_INSTRUCTIONS,criteria:{[d.good]:d.goodDesc,[d.bad]:d.badDesc}}
 : {type,instructions:boolInstructions(d.badDesc),criteria:{true:d.badDesc,false:`Not: ${d.badDesc}`}};
 cases.push({id:`forecast:${d.id}:${p.toFixed(2)}:${v}:${type}`,group:d.id,
 request:{state,questions:{answer:question}},
 reference:{kind:'stated_probability',probability:p,target:d.bad},
 provenance:{dataset:'forecast',domain:d.id,tail:p,variant:v,kind:type==='choice'?'choice_hop1':'boolean'}});
 }
}
return cases;
}

export function repeatCases() {
const INSTRUCTIONS = `
Infer which outcome actually occurred.

The situation may be genuinely uncertain. Do not assume that the most likely
outcome is certain. Preserve uncertainty in the probability distribution.
`;

const c = {
 id:'uniform_die',
 state:`
A fair six-sided die was rolled exactly once.
The result of the roll is hidden.
Each face 1 through 6 has equal probability.
`,
 criteria:Object.fromEntries(['1','2','3','4','5','6'].map(x=>[`face_${x}`,`The hidden outcome is face ${x}`]))
};

return Array.from({length:30},(_,i)=>({id:`repeat:${i}`,group:'uniform_die',
 request:{state:c.state,questions:{answer:{type:'choice',instructions:INSTRUCTIONS,criteria:c.criteria}}},
 reference:{kind:'known_distribution',probabilities:uniform(Object.keys(c.criteria))},
 provenance:{dataset:'repeat',index:i}}));
}
export const caseFactories={dice:diceCases,noul:noulCases,forecast:forecastCases,repeat:repeatCases};
