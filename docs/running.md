# Running experiments

English | [日本語](running.ja.md)

## Preview and execution

Run commands from the repository root. Without `--execute`, the CLI prints requests and local references without using the network, even when an API key is set. The default selection limit is 6 cases.

```bash
node src/run.mjs --input examples/forecast.json
node src/run.mjs --help
```

Examples contain 1 dice request, 3 Noul requests, and 2 forecast requests. To edit an input, copy an example and change `request.state` or `request.questions.answer`. Update or remove `reference` when the comparison target changes.

For live calls:

```bash
npm ci
cp .env.example .env.local
# Set AI_GATEWAY_API_KEY in .env.local.
npm run experiment -- --input examples/forecast.json --execute --out runs/forecast-demo
```

`npm run experiment` loads `.env.local`. When running `node src/run.mjs` directly, set the environment variable yourself. Never put API keys in source code or CLI arguments.

The runner uses the Vercel AI Gateway model alias `typesafe-ai/jev`. Noul is sent as `type: "boolean"`. This is not a direct TypeSafe API client.

## Larger request sets

```bash
# Preview three reconstructed requests; no API call.
node src/run.mjs --input data/requests/dice.jsonl --limit 3

# Send those three requests.
npm run experiment -- --input data/requests/dice.jsonl --limit 3 --execute --out runs/dice-three
```

Use `--all` to select an entire file explicitly. Planned counts are dice 1,000; Noul 600; forecast 312; repeat 30. Historical Noul outputs contain 599 records. Prefix subsets can be biased toward specific conditions; they are not representative samples of a full experiment.

## Outputs and resume

```text
runs/forecast-demo/
├── manifest.json   # Model, settings, versions, timestamps, and plan hash
├── plan.json       # Requests and local comparison metadata
├── results.jsonl   # Append-only results, errors, and retry records
└── summary.json    # Latest success/error/pending counts
```

```bash
npm run experiment -- --input examples/forecast.json --execute --out runs/forecast-demo --resume
```

Successful cases are not resent. Add `--retry-errors` to retry saved failures as well. The model, plan hash, and timeout/retry settings must match the manifest; use a new output directory for changed experiments.

Completed cases are appended and synced to disk. Resuming can produce multiple rows for an ID; the latest row is its current state. If the process dies after a request completes remotely but before saving it, a resumed run may resend that request. Exactly-once execution is not guaranteed.

A truncated final JSONL row is backed up as `.partial-*` during resume. A corrupt complete row causes an error. If forced termination leaves `.run.lock`, confirm that the previous process has stopped before removing the lock.

## Timeouts and retries

Defaults are 20 seconds per attempt and up to 3 attempts per case. SDK-internal retries are disabled. The runner retries 429 responses, selected 5xx responses, and temporary network errors. Authentication errors stop the batch. Invalid probability distributions are recorded as errors rather than silently repaired.

A `Retry-After` longer than 10 seconds is recorded as a failure instead of blocking indefinitely. Resume later when appropriate. Timed-out requests may still have run remotely, and retries may incur additional charges.

## Versions and logs

The lockfile retains `ai@7.0.105` and the dependency versions from the original experiments. Pinning the SDK does not pin the hosted model behind `typesafe-ai/jev`. Exact model versions are recorded only when returned by the SDK.

Captured HTTP request and JSON response bodies are recorded per attempt when available. Response-body capture is limited to 2 MB and flags truncation. If the SDK bypasses the captured fetch path, an HTTP body may be unavailable; planned payloads and SDK results are saved separately.

Authentication and Cookie headers are not collected. The supplied key is redacted from results. **Custom document text remains in local logs.** Review content, responses, and IDs before sharing results. `.env.local` and `runs/` are excluded from Git.

## Plotting

Existing PNGs are in `figures/`. Regeneration requires Matplotlib:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-plot.txt
python3 scripts/plot.py
```

Output goes to `output/figures/`. Use `--lang en` for English only, or `--jp-font /path/to/font.ttf` to supply a Japanese font. Font files are not bundled. Inter is used when installed; otherwise Latin text falls back to DejaVu Sans. Rendering can differ across font and OS versions.
