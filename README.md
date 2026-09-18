# Jev Does Not Play Dice

English | [日本語](README.ja.md)

Code, recorded outputs, and analysis scripts for probability-output experiments with Jev: fair random draws, Noul (Yes/No) questions, and forecast documents.

## Results

On the fair random tasks, Jev's Choice output often assigned a high probability to its selected option even though the model had no information about the hidden outcome. The issue is not that Jev failed to predict a random event; the observed accuracy stayed close to chance, as expected. The notable result is that the reported probabilities did not reflect that known uncertainty.

Noul was closer to the reference probability in some conditions, but still over-reported probabilities in the low-probability range. In the forecast-document experiment, Choice also did not preserve the uncertainty stated upstream: documents stating probabilities just below and above 50% produced sharply different reported probabilities.

| Experiment | Expected / reference probability | Mean reported probability | Observed accuracy |
|---|---:|---:|---:|
| Fair six-sided die — Choice | 16.7% | **82.9%** | 19.0% (76/400) |
| Fair coin — Choice | 50.0% | **92.0%** | 52.0% |
| 6 equiprobable options — Noul | 16.7% | **21.4%** | — |
| 20 equiprobable options — Noul | 5.0% | **15.0%** | — |
| Forecast document: stated 45% — Choice | 45.0% | **6.6%** | — |
| Forecast document: stated 55% — Choice | 55.0% | **95.9%** | — |

These results are specific to the prompts and conditions in this repository. They do not establish that Jev probabilities are generally unusable.

## Requirements

- Python 3.10+ for offline analysis. No extra packages required.
- Node.js 22.16+ for request previews and API runs.
- A Vercel AI Gateway key for API runs only.

## Usage

Run all commands from the repository root.

### Analyze recorded results

```bash
python3 scripts/analyze.py
```

Writes CSV, JSON, and Markdown summaries to `output/summary/`. No API calls; recorded data is not modified. See the [saved summaries](data/summary/SUMMARY.md) and [figures](figures/).

### Preview requests

```bash
node src/run.mjs --input examples/dice.json
node src/run.mjs --input examples/noul.json
node src/run.mjs --input examples/forecast.json
```

These examples contain 1, 3, and 2 requests respectively. Preview is the default and needs neither an API key nor installed npm dependencies. Edit the example JSON to try other inputs.

### Run an experiment

```bash
npm ci
cp .env.example .env.local
# Set AI_GATEWAY_API_KEY in .env.local.
npm run experiment -- --input examples/dice.json --execute --out runs/my-dice
```

**Only `--execute` enables billable API calls.** Defaults: sequential execution, 20 seconds per attempt, up to 3 attempts per case. Results go to `runs/`, which is excluded from Git. Use `--resume` to continue a run; see [runner options](docs/running.md).

## Tests

```bash
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
node scripts/build_requests.mjs --check
```

Tests run offline with mock API responses. For optional figure regeneration, see [plotting](docs/running.md#plotting).

## Repository layout

```text
examples/       Small, editable request sets
src/            Runner, validation, and request reconstruction
scripts/        Analysis, plotting, and input generation
data/recorded/  Historical model outputs
data/requests/  Reconstructed requests
data/summary/   Precomputed summaries
figures/        Japanese and English charts
tests/          Offline tests
docs/           Methods and usage notes
```

## Documentation

[Methods and limitations](docs/methods.md) · [Data format and provenance](docs/data.md) · [Running experiments](docs/running.md) · [Verification](docs/verification.md)

Noul uses `type: "boolean"` in the Vercel AI SDK. Recorded results and new runs are kept separate. Forecast-document percentages are stated values, not independently verified event probabilities.

Independent project; not affiliated with TypeSafe or Vercel.

## License

[MIT](LICENSE)
