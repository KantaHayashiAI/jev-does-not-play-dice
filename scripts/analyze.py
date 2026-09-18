#!/usr/bin/env python3
"""Recompute the article's results from saved records. Standard library only; no API."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
from statistics import mean, stdev

ROOT = Path(__file__).resolve().parents[1]
DICE_ORDER = ['die_numeric', 'die_colored', 'spinner4', 'coin']
NOUL_ORDER = ['shard_n2', 'shard_n3', 'shard_n4', 'fair_die', 'shard_n6', 'shard_n8', 'shard_n10', 'shard_n12', 'shard_n16', 'shard_n20']
DOMAIN_KEYS = {'inventory': ('sufficient','shortfall'), 'capacity': ('within_capacity','saturation'), 'runway': ('covered','breach'), 'sla': ('met','breached')}

def require(ok, message):
    if not ok:
        raise ValueError(message)

def prob(value):
    require(isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value) and 0 <= value <= 1, f'Invalid probability: {value!r}')
    return float(value)

def distribution(values):
    require(isinstance(values,dict) and len(values)>=2, 'Invalid distribution')
    v={k:prob(x) for k,x in values.items()}
    s=sum(v.values())
    require(s>0 and abs(s-1)<=0.005*len(v)+1e-8, f'Invalid probability sum: {s}')
    return v,{k:x/s for k,x in v.items()}

def wilson(success,n):
    z=1.959963984540054
    p=success/n; d=1+z*z/n
    c=(p+z*z/(2*n))/d
    h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
    return c-h,c+h

def unique(rows,key):
    ids=[key(r) for r in rows]
    require(len(ids)==len(set(ids)), 'Duplicate record keys')

def load_recorded():
    manifest=json.loads((ROOT/'data/provenance.json').read_text())
    data={}
    for name,d in manifest['datasets'].items():
        b=(ROOT/d['path']).read_bytes()
        require(hashlib.sha256(b).hexdigest()==d['sha256'], f'{name}: evidence hash differs from manifest')
        rows=json.loads(b)
        require(len(rows)==d['rows'], f'{name}: row count differs')
        data[name]=rows
    return data

def audit_requests(data):
    """Compare saved record fields with independently regenerated local references."""
    inputs={}
    for name in ['dice','noul','forecast','repeat']:
        rows=[json.loads(l) for l in (ROOT/f'data/requests/{name}.jsonl').read_text().splitlines() if l]
        unique(rows,lambda r:r['id']);inputs[name]={r['id']:r for r in rows}
    for row in data['dice']:
        c=inputs['dice']['dice:'+row['id']]
        require(c['reference']['observed']==row['truth'], 'dice hidden outcome mismatch')
        require(c['group']==row['family'], 'dice family mismatch')
        require(set(c['request']['questions']['answer']['criteria'])==set(row['probabilities']), 'dice candidate mismatch')
    missing=set(inputs['noul'])
    for row in data['noul']:
        c=inputs['noul']['noul:'+row['id']];missing.remove(c['id'])
        require(c['provenance']['hidden_outcome']==row['truth'] and c['reference']['target']==row['target'],'Noul reference mismatch')
        require(c['reference']['observed']==row['correct'], 'Noul occurrence flag mismatch')
    require(missing=={'noul:shard6-186'},f'Unexpected Noul missing rows: {missing}')
    for row in data['forecast']:
        api_type='choice' if row['kind']=='choice_hop1' else 'boolean'
        cid=f"forecast:{row['domain']}:{row['tail']:.2f}:{row['variant']}:{api_type}"
        c=inputs['forecast'][cid]
        require(c['reference']['probability']==row['tail'], 'forecast stated reference mismatch')
        require(c['reference']['kind']=='stated_probability', 'forecast is not known truth')
    return {'dice_planned':len(inputs['dice']),'noul_planned':len(inputs['noul']),'noul_missing':sorted(missing),'forecast_requests':len(inputs['forecast']),'repeat_requests':len(inputs['repeat'])}

def summarize_dice(rows):
    unique(rows,lambda r:r['id']);groups=defaultdict(list)
    for row in rows:
        raw,p=distribution(row['probabilities'])
        require(row['selected'] in raw and row['truth'] in raw,'Unknown dice outcome')
        require(row['correct']==(row['selected']==row['truth']),'Wrong dice correct flag')
        require(abs(row['reported']-raw[row['selected']])<1e-9,'Wrong reported value')
        require(abs(row['p_truth']-raw[row['truth']])<1e-9,'Wrong p_truth')
        require(abs(row['reported']-max(raw.values()))<1e-9,'Wrong argmax')
        require(abs(row['chance']-1/len(p))<1e-9,'Wrong chance')
        prob(row['confidence']);groups[row['family']].append((row,p))
    result=[]
    for family in DICE_ORDER:
        g=groups[family]; n=len(g); correct=sum(int(r['correct']) for r,p in g);q=g[0][0]['chance']
        lo,hi=wilson(correct,n)
        result.append({'family':family,'count':n,'chance':q,'mean_reported':mean(r['reported'] for r,p in g),'mean_confidence':mean(r['confidence'] for r,p in g),'correct':correct,'accuracy':correct/n,'accuracy_wilson_low':lo,'accuracy_wilson_high':hi,'brier':mean(sum((v-int(k==r['truth']))**2 for k,v in p.items()) for r,p in g),'uniform_brier':1-q})
    return result

def summarize_noul(rows):
    unique(rows,lambda r:r['id']);groups=defaultdict(list)
    for r in rows:
        prob(r['reported']); require(r['correct']==(r['target']==r['truth']),'Noul event flag differs')
        require(abs(r['chance']-1/r['n'])<1e-9,'Noul expected probability differs')
        groups[r['family']].append(r)
    result=[]
    for family in NOUL_ORDER:
        g=groups[family]; q=g[0]['chance'];p=[r['reported'] for r in g]
        result.append({'family':family,'options':g[0]['n'],'count':len(g),'true_probability':q,'mean_reported':mean(p),'min_reported':min(p),'max_reported':max(p),'sd_reported':stdev(p),'mean_abs_gap':mean(abs(x-q) for x in p),'expected_brier_excess':mean((x-q)**2 for x in p)})
    return result

def summarize_forecast(rows):
    unique(rows,lambda r:(r['kind'],r['domain'],r['tail'],r['variant']))
    groups=defaultdict(dict)
    for r in rows:
        require(r['kind'] in ['choice_hop1','boolean'],'Unexpected phase in narrowed dataset')
        prob(r['tail']);prob(r['reported_p_bad'])
        require(r['domain'] in DOMAIN_KEYS,'Unknown forecast domain')
        if r['kind']=='choice_hop1':
            good,bad=DOMAIN_KEYS[r['domain']]
            raw,_=distribution({good:r['reported_p_good'],bad:r['reported_p_bad']})
            require(r['selected'] in raw and raw[r['selected']]>=max(raw.values())-1e-9,'Forecast choice/argmax mismatch')
        key=(r['domain'],r['tail'],r['variant']);groups[key][r['kind']]=r
    require(len(groups)==156,'Unexpected document count')
    for g in groups.values():require(set(g)=={'choice_hop1','boolean'},'Unpaired forecast document')
    def summarize(keys):
        vals=[groups[k] for k in keys]
        return {'count_per_type':len(vals),'choice_mean':mean(v['choice_hop1']['reported_p_bad'] for v in vals),'noul_mean':mean(v['boolean']['reported_p_bad'] for v in vals)}
    by_p=[];by_domain=[]
    for p in sorted({k[1] for k in groups}):
        by_p.append({'stated_probability':p,**summarize([k for k in groups if k[1]==p])})
        for d in DOMAIN_KEYS:
            by_domain.append({'domain':d,'stated_probability':p,**summarize([k for k in groups if k[0]==d and k[1]==p])})
    return by_p,by_domain

def summarize_repeat(rows):
    require(len(rows)==30 and all(r['case']=='uniform_die' for r in rows),'Unexpected repeat dataset')
    for r in rows:
        raw,_=distribution(r['probabilities'])
        require(abs(r['top']-max(raw.values()))<1e-9 and r['choice'] in raw and raw[r['choice']]==r['top'],'Repeat argmax differs')
    p=[r['top'] for r in rows]
    return {'count':len(rows),'mean_reported':mean(p),'sd_reported':stdev(p),'min_reported':min(p),'max_reported':max(p),'choices':sorted(set(r['choice'] for r in rows))}

def write_csv(p,rows):
    with p.open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)

def analyze(out):
    out=Path(out).resolve()
    for protected in [ROOT/'data/recorded',ROOT/'data/requests']:
        require(not out.is_relative_to(protected),'Refusing to write summaries over records/requests')
    data=load_recorded();checks=audit_requests(data)
    dice=summarize_dice(data['dice']);noul=summarize_noul(data['noul']);fore,domains=summarize_forecast(data['forecast']);repeat=summarize_repeat(data['repeat'])
    result={'scope':'offline recomputation, no new model outputs','checks':checks,'dice':dice,'noul':noul,'forecast':fore,'forecast_by_domain':domains,'repeat':repeat}
    out.mkdir(parents=True,exist_ok=True)
    for name,rows in [('dice',dice),('noul',noul),('forecast',fore),('forecast_by_domain',domains)]:write_csv(out/f'{name}.csv',rows)
    (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    headings = {
        'en': {
            'title': 'Recorded results',
            'nav': 'English | [日本語](SUMMARY.ja.md)',
            'dice': 'Fair random draws',
            'dice_columns': '|Task|Cases|Known probability of correctness|Mean reported probability|Observed accuracy|',
            'noul': 'Noul (Yes/No)',
            'noul_columns': '|Condition|Cases|Known probability|Mean output|',
            'forecast': 'Forecast documents',
            'forecast_note': 'Comparison with stated values, not calibration against real-world event probabilities.',
            'forecast_columns': '|Stated probability|Documents|Choice|Noul|',
            'scope': 'Scope',
            'scope_note': 'Checks consistency of recorded outputs and reconstructed inputs; no model API calls or historical HTTP verification. Noul `correct` records whether the proposition occurred, not whether a model answer was correct.',
        },
        'ja': {
            'title': '保存結果の再集計',
            'nav': '[English](SUMMARY.md) | 日本語',
            'dice': '公平な抽選',
            'dice_columns': '|課題|件数|既知の正答確率|平均報告確率|実測正答率|',
            'noul': 'Noul（Yes or No）',
            'noul_columns': '|条件|件数|既知の確率|平均報告値|',
            'forecast': '予測文書',
            'forecast_note': '記載値との対応。現実の発生確率への較正評価ではない。',
            'forecast_columns': '|記載値|文書数|Choice|Noul|',
            'scope': '確認範囲',
            'scope_note': '保存結果・再構成入力の整合性確認。HTTP本文の歴史的証明やAPI再実行ではない。Noulの`correct`は命題の実現値であり、モデルの正答フラグではない。',
        },
    }
    for language, h in headings.items():
        md = ['# ' + h['title'], '', h['nav'], '', '## ' + h['dice'], '', h['dice_columns'], '|---|---:|---:|---:|---:|']
        for r in dice:
            md.append(f"|{r['family']}|{r['count']}|{r['chance']:.1%}|{r['mean_reported']:.1%}|{r['accuracy']:.1%}|")
        md += ['', '## ' + h['noul'], '', h['noul_columns'], '|---|---:|---:|---:|']
        for r in noul:
            md.append(f"|{r['family']}|{r['count']}|{r['true_probability']:.2%}|{r['mean_reported']:.2%}|")
        md += ['', '## ' + h['forecast'], '', h['forecast_note'], '', h['forecast_columns'], '|---:|---:|---:|---:|']
        for r in fore:
            md.append(f"|{r['stated_probability']:.0%}|{r['count_per_type']}|{r['choice_mean']:.2%}|{r['noul_mean']:.2%}|")
        md += ['', '## ' + h['scope'], '', h['scope_note'], '']
        filename = 'SUMMARY.md' if language == 'en' else 'SUMMARY.ja.md'
        (out/filename).write_text('\n'.join(md), encoding='utf-8')
    return result

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,default=ROOT/'output/summary')
    args=p.parse_args()
    r=analyze(args.out)
    print(f"Verified {sum(len(v) for v in load_recorded().values())} saved records; wrote {args.out}")
    for row in r['dice']:print(f"{row['family']:14s}: reported {row['mean_reported']:.3%}, observed {row['accuracy']:.1%} ({row['count']} cases)")
