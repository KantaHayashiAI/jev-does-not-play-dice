# Jev Does Not Play Dice

[English](README.md) | 日本語

Jevの確率出力を検証するコード・保存結果・分析スクリプトです。公平な抽選、Noul（Yes or No）、予測文書の3種類の実験を収録しています。

解説記事：[Jevはサイコロを振らない｜「較正された確率」の意外な落とし穴](https://note.com/kantahayashiai/n/n4c54eed30787)（note）

## Results

公平な抽選では、隠された結果についてモデルに手がかりがないにもかかわらず、Choiceは選んだ候補に高い確率を付けました。問題はランダムな結果を当てられなかったことではありません。実測正答率が偶然水準に近いのは予想通りです。注目したのは、報告された確率が、その既知の不確実性を反映していなかったことです。

Noulは条件によっては基準となる確率にかなり近づきましたが、低確率域ではなお高めの値を返しました。また、予測文書の実験では、上流で記載された不確実性がChoiceの確率としてそのまま保持されず、50%の少し下と少し上で報告値が大きく変化しました。

| 実験 | 真値・基準値 | 平均報告確率 | 実測正答率 |
|---|---:|---:|---:|
| 公平な6面サイコロ — Choice | 16.7% | **82.9%** | 19.0%（76/400） |
| 公平なコイン — Choice | 50.0% | **92.0%** | 52.0% |
| 6個の等確率な選択肢 — Noul | 16.7% | **21.4%** | — |
| 20個の等確率な選択肢 — Noul | 5.0% | **15.0%** | — |
| 文書に45%と記載 — Choice | 45.0% | **6.6%** | — |
| 文書に55%と記載 — Choice | 55.0% | **95.9%** | — |

これらは、このリポジトリに収録した特定の入力・条件で得られた結果です。Jevの確率が一般に利用できないことを示すものではありません。

## 必要環境

- Python 3.10以上：オフライン分析用。追加パッケージは不要です。
- Node.js 22.16以上：入力のプレビューとAPI実行用。
- Vercel AI GatewayのAPIキー：API実行時のみ必要です。

## 使い方

コマンドはリポジトリのルートで実行します。

### 保存結果を再集計する

```bash
python3 scripts/analyze.py
```

`output/summary/` にCSV・JSON・Markdownを出力します。APIは呼び出さず、保存データも変更しません。[集計済みの結果](data/summary/SUMMARY.ja.md)と[図](figures/)も収録しています。

### 入力を確認する

```bash
node src/run.mjs --input examples/dice.json
node src/run.mjs --input examples/noul.json
node src/run.mjs --input examples/forecast.json
```

各サンプルのリクエスト数は順に1件・3件・2件です。`examples/dice.json` は数字サイコロ400件のうちの `d0020` で、記事に掲載したリクエストです(記録上の結果は0.83で、400件の中央値)。`examples/dice_ordered.json` は文面を固定したサイコロのプロンプトで、選択肢のキーが `face_N` のため、書いた順序がそのまま保たれます(`"1"` のような整数風のキーはJavaScriptが常に並べ替えます)。こちらの記録上の結果は約0.72と低めです。既定ではプレビューのみで、APIキーやnpm依存パッケージのインストールは不要です。別の入力を試す場合はサンプルのJSONを編集します。

### APIで実験する

```bash
npm ci
cp .env.example .env.local
# .env.local に AI_GATEWAY_API_KEY を設定します。
npm run experiment -- --input examples/dice.json --execute --out runs/my-dice
```

**`--execute` を付けた場合だけ、料金が発生するAPI呼び出しを行います。** 既定は逐次実行・1試行20秒・最大3試行です。結果はGit対象外の `runs/` に保存します。再開には `--resume` を指定します。詳細は[実行オプション](docs/running.ja.md)を参照してください。

## テスト

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
node scripts/build_requests.mjs --check
```

API応答をモック化したオフラインテストです。図の再描画は[実行ガイド](docs/running.ja.md#図の再描画)を参照してください。

## 構成

```text
examples/       編集して試せる小さな入力セット
src/            実行・検証・入力再構成
scripts/        再集計・描画・入力生成
data/recorded/  過去のモデル出力
data/requests/  再構成した入力
data/summary/   集計済みの結果
figures/        日本語・英語の図
tests/          オフラインテスト
docs/           方法と使い方
```

## ドキュメント

[方法と限界](docs/methods.ja.md) · [データ形式と由来](docs/data.ja.md) · [実行ガイド](docs/running.ja.md) · [検証記録](docs/verification.ja.md)

NoulはVercel AI SDKでは `type: "boolean"` を使います。過去の保存結果と新規実行は分離しています。予測文書の記載値は、実際の発生確率を独立に検証した値ではありません。

TypeSafe・Vercelとは無関係の個人プロジェクトです。

## ライセンス

[MIT](LICENSE)
