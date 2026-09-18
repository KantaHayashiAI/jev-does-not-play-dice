# Publishing

English | [日本語](publishing.ja.md)

Use the extracted `jev-does-not-play-dice/` directory as the repository root.

Before pushing:

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
node scripts/build_requests.mjs --check
python3 scripts/analyze.py
```

The repository uses the [MIT license](../LICENSE). `package.json` and the root lockfile entry use `"license": "MIT"`. `private: true` prevents accidental npm publication; it does not prevent hosting the repository on GitHub.

Keep `.env.local`, `runs/`, `node_modules/`, font files, and private documents out of commits. The workflow in `.github/workflows/verify.yml` runs offline tests and checks the pinned SDK export. It does not call a model or require API credentials.

`README.md` is the English landing page; `README.ja.md` is the Japanese version. Methods and usage pages link to both languages. Article and repository URLs are not filled with placeholder addresses.
