# 実行時の注意

[English](running.md) | 日本語

## 少数から始める

`--execute`を付けない実行は入力プレビューです。APIキーが設定済みでも、プレビューは通信しません。初期上限は6件。リポジトリ全体を読み込んで勝手に数千件送る処理はありません。

通常の実行はVercel AI Gateway経由で`typesafe-ai/jev`を指定します。NoulもAPIへは`boolean`で送ります。API入口は[Vercelの公式例](https://vercel.com/ai-gateway/models/jev)に合わせています。基盤モデル本体へ直接問い合わせる経路ではありません。

認証には自分の `AI_GATEWAY_API_KEY` を使います。`.env.local` は `npm run experiment` のNodeフラグで読み込みます。`node src/run.mjs` を直接使う場合は環境変数を自分で設定してください。キーをコマンドラインの引数やソースへ書かないでください。

## 保存・再開

各ケースを完了するたびにJSONLへ追記してfsyncします。成功を保存したケースは同じ実行を再開しても送り直しません。エラーは消さず、`--retry-errors`で試した後も以前の行を履歴として残します。

ログは追記履歴なので、再開後の行数がケース数より増えることがあります。現在の状態は同じIDの最新行です。`summary.json`は最新状態で成功・失敗・未実行を数えます。API呼び出し後・結果保存前にプロセスが落ちた場合は、再開時の再送を避けられません。「サーバー側で厳密に一回しか実行されない」保証ではありません。

`manifest.json`のモデル・計画ハッシュ・タイムアウト／リトライ設定が一致しないとresumeを拒否します。異なる試験は別フォルダへ保存してください。

強制終了でJSONL末尾が途中までになった場合は、再開時にその末尾を `.partial-*` へ退避してから回復します。途中の完全な行が壊れているときは黙って無視せず停止します。

`.run.lock`は同じrunディレクトリの二重起動を避けるものです。強制終了で残った場合は、以前のプロセスが動いていないことを確認してからそのlockを削除して再開してください。

## タイムアウトと再試行

1試行あたり既定20秒、最大3試行です。SDK内部の再試行は0にし、外側で回数を数えます。429や一部の5xx、一時的ネットワーク障害は再試行します。認証エラーは全体を止めます。検証で分布の矛盾を検出した場合は値を修正せずエラーにします。

`Retry-After`が10秒より長いときは、そのケースを失敗として残し、無限に待ちません。十分時間を空けた後、自分でresumeしてください。これは高スループット用のベンチマークランナーではなく、読者が少数の入力を確認するための逐次ランナーです。

タイムアウトしてもリモート側で推論が実行されていた可能性があります。再試行には追加料金がかかり得ます。特定の価格や実行時間はコードでは保証しません。

## モデル版・SDK版

`package-lock.json`は原実験のlockから、このツールが必要とする`ai@7.0.105`とその依存・peer依存だけを残しています。TypeScriptやtsxやdotenvは不要になったため除きました。SDKのresolved URLとintegrityは原lockの値を維持しています。

`typesafe-ai/jev`はエイリアスです。SDKを固定してもサーバー側のモデル更新は固定できません。実際のrevisionが応答に出ていればSDK結果へ残りますが、提供されない版を推定して埋めることはありません。

## HTTP記録と機密

取得できたHTTPリクエスト本文・JSON応答本文は再試行ごとに記録します。応答本文はログ肥大化を避けるため2MBで打ち切り、その場合はフラグを残します。SDKがglobal fetchを使わない場合など、HTTP本文を捕捉できない可能性もあります。送信予定のstate/questionsとSDK結果は別に保存します。

認証・Cookieヘッダーは収集しません。供給されたキー文字列は結果ログから除去します。ただし、入力文書自体の機密を自動的に判別する仕組みではありません。独自の実験結果をGitHubに上げるときは本文、応答、各種IDを確認してください。


## 入力の編集と実行範囲

サンプルの `request.state` または `request.questions.answer` を編集します。比較対象も変わる場合は `reference` を更新し、比較値が不明なら削除してください。`reference` はモデルに送信しません。

```bash
node src/run.mjs --input data/requests/dice.jsonl --limit 3
npm run experiment -- --input data/requests/dice.jsonl --limit 3 --execute --out runs/dice-three
```

全件を選ぶには `--all` を指定します。計画はdice 1,000件、Noul 600件、forecast 312件、repeat 30件です。Noulの保存結果は599件です。先頭だけの部分実行は、全体を代表する標本とは限りません。

## 図の再描画

既存のPNGは `figures/` にあります。再描画にはMatplotlibを使います。

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-plot.txt
python3 scripts/plot.py
```

`output/figures/` に出力します。英語のみなら `--lang en`、日本語フォントを指定する場合は `--jp-font /path/to/font.ttf` を追加します。フォントファイルは同梱していません。Interがなければ欧文はDejaVu Sansにフォールバックします。OSやフォントによって描画結果に差が出る場合があります。
