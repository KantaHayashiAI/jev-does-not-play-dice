# データの由来とスキーマ

[English](data.md) | 日本語

データ・コードの元は著者が提供した `jev-dice(2).zip` です。原ZIP・元ファイル・収録ファイルのSHA256、行の選択条件は [provenance.json](../data/provenance.json) にあります。

| 読者版 | 元ファイル | 収録方法 |
|---|---|---|
| `data/recorded/dice.json` | `jev_fairdie_results.json` | 1,000行すべて。元ファイルとバイト一致 |
| `data/recorded/noul.json` | `jev_boolean_scaling_results.json` | 599行すべて。元ファイルとバイト一致 |
| `data/recorded/forecast.json` | `jev_risk_erasure_full_results.json` | 468行中、`choice_hop1`と`boolean`の312行。値を変えず抽出 |
| `data/recorded/repeat.json` | `jev_determinism_results.json` | 120行中、`case == "uniform_die"`の30行。値を変えず抽出 |

抽出したファイルでは元の0始まりの行インデックスをmanifestに残しています。これらは**保存された実験記録**であって、完全なraw HTTP応答ではありません。

## 主なフィールド

### dice

`truth`がローカルに生成した非公開の結果、`selected`がモデルの選択、`correct`が両者の一致です。`reported`は `probabilities[selected]`、`p_truth`は `probabilities[truth]`。`chance`は1/候補数です。

### noul

`target`は質問対象、`reported`はその命題が真であるとの報告確率。**旧フィールド`correct`は、`target == truth`、つまり命題が実現したかを表します。モデルが正しく判断したかというフラグではありません。** 分析器はこれを正答率として集計しません。

### forecast

`tail`は合成文書に記載した不足・未達などの確率です。`reported_p_bad`はその事象への出力確率。Choiceでは同時に`reported_p_good`と`selected`があります。`kind`の`boolean`は表示上Noulです。

### repeat

固定入力に対する`choice`、`top`、分布、confidenceが保存されています。実際の非公開の出目を付けた試行ではありません。従って反復の正答率は計算しません。

## 再構成入力

`data/requests/*.jsonl` の1行は次の構造です。

```json
{
  "id": "example-id",
  "group": "inventory",
  "request": {
    "state": "Document text",
    "questions": {
      "answer": {
        "type": "boolean",
        "instructions": "Evaluate the proposition.",
        "criteria": {"true": "A shortfall occurs", "false": "No shortfall occurs"}
      }
    }
  },
  "reference": {
    "kind": "stated_probability",
    "probability": 0.3,
    "target": "shortfall"
  }
}
```

`request`だけをSDKへ渡し、モデル名はCLI側で加えます。`id`、`group`、`reference`、`provenance`はAPIへ送りません。

`reference.kind`は、候補全体の既知分布なら`known_distribution`、真偽命題の既知確率なら`known_probability`、文書の記載値なら`stated_probability`です。任意の文書を加える際に正解確率が分からなければ、referenceを削除してください。

再構成入力は当時保存されていたHTTP本文ではありません。ソースのテンプレートと既定値からの再構成であることを、元記録と区別して扱います。

## 今回含めなかったもの

元のAPIエントリーポイント全体、旧README、stated / implied / silent、損失非対称、対立証拠、通常分類の大量実験、二段目の推論は含めていません。順序実験も別の研究問題なので外しました。原ZIPは変更していません。

生の元データを編集して報告値を合わせる処理はありません。記事の表示用丸めと、Brier計算時の正規化は、元値を保持したまま分析時に行います。
