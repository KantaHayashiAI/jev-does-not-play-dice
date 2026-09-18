# 公開手順

[English](publishing.md) | 日本語

展開した `jev-does-not-play-dice/` をリポジトリのルートとして使用します。

公開前の確認コマンド：

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
node scripts/build_requests.mjs --check
python3 scripts/analyze.py
```

ライセンスは [MIT](../LICENSE) です。`package.json` とlockfileのルート項目に `"license": "MIT"` を設定しています。`private: true` はnpmへの誤公開を防ぐ指定で、GitHub公開を妨げません。

`.env.local`、`runs/`、`node_modules/`、フォントファイル、非公開文書はコミットしないでください。`.github/workflows/verify.yml` はオフラインテストと固定SDKのexport確認を実行します。モデルを呼び出さず、APIキーも不要です。

`README.md` が英語の入口、`README.ja.md` が日本語版です。方法・実行ガイドも両言語を相互リンクしています。記事やリポジトリのURLに仮のアドレスは入れていません。
