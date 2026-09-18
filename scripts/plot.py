#!/usr/bin/env python3
"""Draw the three article figures from independently recomputed summaries. No model API."""
import argparse
import csv
import json
import tempfile
from pathlib import Path
from statistics import mean

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,default=ROOT/'output/figures')
    parser.add_argument('--lang',choices=['ja','en','both'],default='both')
    parser.add_argument('--jp-font',type=Path,help='Optional locally installed Japanese font file; fonts are not bundled')
    args=parser.parse_args()
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        from matplotlib import font_manager
        from matplotlib.ticker import PercentFormatter,MultipleLocator
    except ImportError as e:
        raise SystemExit('Install optional figure dependency: python3 -m pip install -r requirements-plot.txt') from e
    fonts={f.name for f in font_manager.fontManager.ttflist}
    jp_name='Noto Sans CJK JP'
    if args.jp_font:
        font_manager.fontManager.addfont(str(args.jp_font));jp_name=font_manager.FontProperties(fname=str(args.jp_font)).get_name();fonts.add(jp_name)
    if args.lang in ['ja','both'] and jp_name not in fonts:
        raise SystemExit('A Japanese font is required. Install Noto Sans CJK JP or pass --jp-font /path/to/font. Use --lang en for English only.')
    families=(['Inter'] if 'Inter' in fonts else ['DejaVu Sans'])+([jp_name] if jp_name in fonts else [])+['sans-serif']
    plt.rcParams.update({'font.family':families,'axes.unicode_minus':False})
    # Use the same analysis implementation; never manually type chart values.
    from analyze import analyze
    with tempfile.TemporaryDirectory() as temp:
        data=analyze(Path(temp))
    args.out.mkdir(parents=True,exist_ok=True)
    def ticks(ax):
        for t in ax.get_xticklabels():t.set_fontsize(12.6);t.set_fontweight('semibold')
        for t in ax.get_yticklabels():t.set_fontsize(12.2);t.set_fontweight('medium')
        ax.yaxis.set_major_formatter(PercentFormatter(1,decimals=0));ax.grid(axis='y',alpha=.28);ax.set_axisbelow(True)
    def legend(ax,**kw):
        l=ax.legend(frameon=False,fontsize=11.5,**kw)
        for t in l.get_texts():t.set_fontweight('medium')
    def save(fig,name):
        fig.savefig(args.out/name,dpi=220,bbox_inches='tight');plt.close(fig)
    for lang in (['ja','en'] if args.lang=='both' else [args.lang]):
        ja=lang=='ja'
        # 1. Choice probabilities vs observed accuracy; NOT the separate confidence statistic.
        rows=data['dice'];fig,ax=plt.subplots(figsize=(11.2,7));w=.23;x=list(range(len(rows)))
        legends=['課題設定上の正答確率','実測正答率','平均報告確率'] if ja else ['Chance-level accuracy','Observed accuracy','Average reported probability']
        for shift,key,label in [(-w,'chance',legends[0]),(0,'accuracy',legends[1]),(w,'mean_reported',legends[2])]:
            ax.bar([i+shift for i in x],[r[key] for r in rows],width=w,label=label)
        ax.set_ylim(0,1.02);ax.set_xticks(x)
        ax.set_xticklabels(['6面サイコロ\n（数字）','6面サイコロ\n（色）','4等分の\n回転盤','コイン'] if ja else ['Six-sided die\n(numbers)','Six-sided die\n(colors)','Four-way\nspinner','Coin'])
        ticks(ax);ax.set_ylabel('割合' if ja else 'Rate',fontsize=14.2,fontweight='bold');legend(ax,loc='upper left')
        fig.suptitle('公平な抽選で、Jevは当たりやすさをどれくらい高く見積もったか' if ja else 'How much Jev inflated the chance of being right\non fair random draws',x=.5,y=.965,ha='center',fontsize=18,fontweight='semibold')
        fig.text(.5,.025,'数字サイコロ400件、色サイコロ200件、回転盤200件、コイン200件。' if ja else '400 number-die trials; 200 color-die trials; 200 spinner trials; 200 coin trials.',ha='center',fontsize=10)
        fig.subplots_adjust(left=.10,right=.96,top=.84,bottom=.19);save(fig,f'figure1_dice_{lang}.png')
        # 2. One 6-option condition in the figure: fair die. All shard_n6 records stay in data.
        rows=[r for r in data['noul'] if r['family']!='shard_n6'];fig,ax=plt.subplots(figsize=(11.1,7));x=list(range(len(rows)));w=.38
        ax.bar([i-w/2 for i in x],[r['true_probability'] for r in rows],width=w,label='真の確率' if ja else 'True probability')
        ax.bar([i+w/2 for i in x],[r['mean_reported'] for r in rows],width=w,label='Noulの平均報告値' if ja else 'Average Noul output')
        ax.set_xticks(x);ax.set_xticklabels([('6\n（サイコロ）' if ja else '6\n(die)') if r['family']=='fair_die' else str(r['options']) for r in rows])
        ax.set_ylim(0,.55);ticks(ax);ax.set_ylabel('確率' if ja else 'Probability',fontsize=14.2,fontweight='bold');legend(ax,loc='upper right')
        fig.suptitle('Noul（Yes or No）は低い確率に近づくが、\n低確率域では下がりきらない' if ja else 'Noul (Yes/No) gets closer to the truth,\nbut stops falling in the low-probability range',x=.5,y=.965,ha='center',fontsize=18,fontweight='semibold')
        fig.text(.5,.115,'選択肢数' if ja else 'Options',ha='center',va='center',fontsize=14.2,fontweight='bold')
        fig.text(.5,.02,'各条件およそ60件の平均。' if ja else 'Average over about 60 cases per condition.',ha='center',fontsize=10)
        fig.subplots_adjust(left=.10,right=.96,top=.83,bottom=.22);save(fig,f'figure2_noul_{lang}.png')
        # 3. Stated vs returned probability, not empirical event calibration.
        rows=data['forecast'];fig,ax=plt.subplots(figsize=(11.2,7.2));x=[r['stated_probability'] for r in rows]
        ax.plot([0,1],[0,1],color='black',linewidth=6,zorder=1,solid_capstyle='round',label='文書に記載した確率（y=x）' if ja else 'Forecast as written (y=x)')
        ax.plot(x,[r['choice_mean'] for r in rows],marker='o',linewidth=2.3,markersize=6.4,zorder=3,label='Choice（1回目）' if ja else 'Choice (first pass)')
        ax.plot(x,[r['noul_mean'] for r in rows],marker='D',linestyle='--',linewidth=2.1,markersize=5.6,zorder=3,label='Noul（同じ文書）' if ja else 'Noul (same document)')
        ax.set_xlim(0,1);ax.set_ylim(0,1.02);ax.xaxis.set_major_locator(MultipleLocator(.1));ax.yaxis.set_major_locator(MultipleLocator(.1));ax.xaxis.set_major_formatter(PercentFormatter(1,decimals=0));ticks(ax);ax.grid(alpha=.28)
        fig.suptitle('文書に書かれた予測確率と、Jevが付けた確率' if ja else 'Forecast probabilities written in a document\nvs. probabilities reported by Jev',x=.5,y=.965,ha='center',fontsize=18,fontweight='semibold')
        ax.set_ylabel('Jevが対象事象に付けた確率' if ja else 'Probability assigned by Jev to the adverse outcome',fontsize=14,fontweight='bold')
        fig.text(.5,.105,'文書に記載した、不足・未達などの確率' if ja else 'Shortfall / failure probability written upstream',ha='center',va='center',fontsize=13.8,fontweight='bold')
        handles,labels=ax.get_legend_handles_labels();l=ax.legend([handles[i] for i in [1,2,0]],[labels[i] for i in [1,2,0]],loc='lower center',bbox_to_anchor=(.5,1.015),ncol=3,frameon=False,fontsize=11.3)
        for t in l.get_texts():t.set_fontweight('medium')
        for p,xytext in [(.45,(.30,.17)),(.55,(.61,.84))]:
            value=next(r['choice_mean'] for r in rows if r['stated_probability']==p)
            ax.annotate(f'{p:.0%} → {value:.1%}',xy=(p,value),xytext=xytext,fontsize=12,fontweight='semibold',arrowprops={'arrowstyle':'-','lw':1.2})
        fig.text(.5,.018,'4題材 × 3文書条件の平均（各確率・各質問型12件）。線は測定点の平均を結んだもの。\n実際の発生率を測った図ではない。' if ja else '4 domains × 3 document conditions (12 cases per probability per question type).\nLines connect measured means; these are not real-world event frequencies.',ha='center',va='bottom',fontsize=9.8)
        fig.subplots_adjust(left=.11,right=.96,top=.78,bottom=.19);save(fig,f'figure3_forecast_{lang}.png')
    print(f'Wrote figures to {args.out}')
if __name__=='__main__':main()
