# Recorded results

English | [日本語](SUMMARY.ja.md)

## Fair random draws

|Task|Cases|Known probability of correctness|Mean reported probability|Observed accuracy|
|---|---:|---:|---:|---:|
|die_numeric|400|16.7%|82.9%|19.0%|
|die_colored|200|16.7%|76.4%|16.0%|
|spinner4|200|25.0%|90.2%|26.5%|
|coin|200|50.0%|92.0%|52.0%|

## Noul (Yes/No)

|Condition|Cases|Known probability|Mean output|
|---|---:|---:|---:|
|shard_n2|60|50.00%|46.90%|
|shard_n3|60|33.33%|31.05%|
|shard_n4|60|25.00%|24.65%|
|fair_die|60|16.67%|19.20%|
|shard_n6|59|16.67%|21.39%|
|shard_n8|60|12.50%|16.93%|
|shard_n10|60|10.00%|17.28%|
|shard_n12|60|8.33%|17.33%|
|shard_n16|60|6.25%|14.80%|
|shard_n20|60|5.00%|15.02%|

## Forecast documents

Comparison with stated values, not calibration against real-world event probabilities.

|Stated probability|Documents|Choice|Noul|
|---:|---:|---:|---:|
|5%|12|1.50%|9.75%|
|10%|12|1.58%|13.50%|
|20%|12|2.25%|20.58%|
|30%|12|3.17%|26.42%|
|40%|12|5.00%|32.00%|
|45%|12|6.58%|36.17%|
|50%|12|29.50%|43.00%|
|55%|12|95.92%|46.67%|
|60%|12|97.33%|50.33%|
|70%|12|98.17%|54.42%|
|80%|12|98.67%|64.33%|
|90%|12|99.00%|70.33%|
|95%|12|99.17%|75.92%|

## Scope

Checks consistency of recorded outputs and reconstructed inputs; no model API calls or historical HTTP verification. Noul `correct` records whether the proposition occurred, not whether a model answer was correct.
