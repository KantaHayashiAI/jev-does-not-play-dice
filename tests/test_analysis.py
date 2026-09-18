import sys
from pathlib import Path
import unittest
import tempfile
import json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import analyze

class AnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=analyze.load_recorded()
    def test_dice_values(self):
        r=analyze.summarize_dice(self.data['dice'])[0]
        self.assertEqual(r['correct'],76);self.assertEqual(r['count'],400)
        self.assertAlmostEqual(r['mean_reported'],.82855)
        self.assertAlmostEqual(r['accuracy'],.19)
        self.assertGreater(r['brier'],r['uniform_brier'])
    def test_noul20(self):
        r=next(r for r in analyze.summarize_noul(self.data['noul']) if r['options']==20)
        self.assertAlmostEqual(r['mean_reported'],.15016666666666667)
        self.assertEqual(r['count'],60);self.assertEqual(r['min_reported'],.13)
    def test_forecast_values(self):
        rows,domains=analyze.summarize_forecast(self.data['forecast'])
        p={r['stated_probability']:r for r in rows}
        self.assertAlmostEqual(p[.45]['choice_mean'],.06583333333333334)
        self.assertAlmostEqual(p[.55]['choice_mean'],.9591666666666666)
        d=next(r for r in domains if r['domain']=='inventory' and r['stated_probability']==.30)
        self.assertAlmostEqual(d['choice_mean'],.05333333333333334)
    def test_uniform_repeat(self):
        r=analyze.summarize_repeat(self.data['repeat'])
        self.assertEqual(r['count'],30);self.assertEqual(r['min_reported'],.69);self.assertEqual(r['max_reported'],.76)
    def test_reconstructed_alignment(self):
        r=analyze.audit_requests(self.data)
        self.assertEqual(r['noul_missing'],['noul:shard6-186'])
    def test_invalid_values(self):
        for v in [-1,1.2,float('nan'),float('inf'),True,None,'0.4']:
            with self.assertRaises(ValueError):analyze.prob(v)
    def test_zero_missing_distribution(self):
        with self.assertRaises(ValueError):analyze.distribution({'A':0,'B':0})
    def test_duplicate_rejected(self):
        with self.assertRaises(ValueError):analyze.summarize_dice(self.data['dice']+[self.data['dice'][0]])
    def test_export_matches_committed(self):
        with tempfile.TemporaryDirectory() as td:
            result=analyze.analyze(td)
            expected=json.loads((ROOT/'data/summary/summary.json').read_text())
            def compare(a,b):
                if isinstance(a,dict):
                    self.assertEqual(set(a),set(b))
                    for k in a:compare(a[k],b[k])
                elif isinstance(a,list):
                    self.assertEqual(len(a),len(b))
                    for x,y in zip(a,b):compare(x,y)
                elif isinstance(a,float):self.assertAlmostEqual(a,b,places=12)
                else:self.assertEqual(a,b)
            compare(result,expected)

if __name__=='__main__':unittest.main()
