# Data format and provenance

English | [日本語](data.ja.md)

The source archive is `jev-dice(2).zip`. [provenance.json](../data/provenance.json) records archive and file hashes, original row indices, and selection rules.

| Dataset | Original file | Included records |
|---|---|---|
| `data/recorded/dice.json` | `jev_fairdie_results.json` | All 1,000 rows; byte-identical |
| `data/recorded/noul.json` | `jev_boolean_scaling_results.json` | All 599 rows; byte-identical |
| `data/recorded/forecast.json` | `jev_risk_erasure_full_results.json` | 312 of 468 rows: `choice_hop1` and `boolean` |

Selected rows retain their original values. These files are recorded experiment outputs, not complete raw HTTP responses.

## Recorded fields

- **Dice:** `truth` is the locally generated hidden outcome; `selected` is the model's answer; `correct` compares them. `reported` equals `probabilities[selected]`; `p_truth` equals `probabilities[truth]`; `chance` is `1 / number of options`.
- **Noul:** `target` is the fixed proposition's outcome and `reported` is its predicted probability. The legacy `correct` field means `target == truth`: it records whether the proposition occurred, **not whether the model answered correctly**.
- **Forecast:** `tail` is the probability stated in the synthetic document. `reported_p_bad` is the reported probability for that event. Choice also records `reported_p_good` and `selected`. Records labeled `kind: "boolean"` are displayed as Noul.

## Request format

Each line in `data/requests/*.jsonl` is a case:

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
        "criteria": {
          "true": "A shortfall occurs",
          "false": "No shortfall occurs"
        }
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

Only `request` is passed to the SDK, with the model name added by the CLI. `id`, `group`, `reference`, and `provenance` stay local.

| Reference kind | Meaning |
|---|---|
| `known_distribution` | Known probability distribution over all options |
| `known_probability` | Known probability of a yes/no proposition |
| `stated_probability` | A forecast value stated in a document |

When editing a case, update its `reference` or remove it when no comparison value is known. The runner does not infer a new ground truth from edited text.

Requests are reconstructed from source templates and defaults. They are **not historical HTTP captures**.

## Scope

The original collection entrypoints, exploratory README, unrelated classification experiments, order/conflict/payoff studies, and second-hop predictions are not included. Recorded probabilities are never edited to match the article. Display rounding and Brier normalization happen only during analysis.
