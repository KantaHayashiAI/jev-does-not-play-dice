# Methods and limitations

English | [日本語](methods.ja.md)

## Fair random draws: Choice

The dataset contains 400 number-die, 200 color-die, 200 spinner, and 200 coin trials. Each request specifies a fair draw with its outcome hidden. The evaluated probability is `probabilities[choice]`, not `confidence`.

For the number die, mean reported probability is 0.828550 and observed accuracy is 76/400 (0.19). Selecting the same face every time is a valid tie-break; assigning it more than `1/6` is the issue under this setup.

Multiclass Brier is `sum_k (p_k - 1[k=y])²`, without dividing by the number of classes. Probabilities rounded to two decimals can sum to 0.99. Distributions are normalized for Brier computation only; recorded values remain unchanged. For a known distribution `q`, expected excess Brier is `sum_k (p_k - q_k)²`.

Wilson intervals describe observed accuracy under a binomial model. They do not quantify generalization to new prompts or domains.

## Fixed propositions: Noul

The original plan has 60 cases for each of 10 conditions: 2, 3, 4, 6, 8, 10, 12, 16, and 20 shards, plus a fair six-sided die. There are 599 saved outputs; the exception for the missing `shard6-186` record was not retained.

Each question concerns a fixed target: `shard-00` or die face 1. Each condition repeats four text variants. Option count and target probability `1/n` change together, so their effects are not separated.

The 20-shard outputs range from 0.13 to 0.17. This does not establish a structural floor of 0.15. Only one target per condition was queried; multiplying its output by the number of options does not demonstrate a sum across all targets.

The figure shows only the die at 6 options. The 59 six-shard records remain in the full data and summaries. Bars are condition summaries, not an estimated continuous response function.

## Forecast documents: stated values

Four domains are used: inventory, capacity, runway, and service levels. Stated probabilities are 5, 10, 20, 30, 40, 45, 50, 55, 60, 70, 80, 90, and 95 percent. Each domain/probability pair has three different closing descriptions, for 156 documents. Choice and Noul are queried separately; each plotted mean covers 12 documents.

The Choice instruction is “Determine which outcome will occur, based on the report.” It also asks to preserve uncertainty. It does **not** request literal extraction or copying of numbers. Noul evaluates the adverse-outcome proposition from the same document.

The documents include context in addition to the forecast. They do not explicitly establish that all context is incorporated in the forecast, and no real outcomes were observed. This experiment compares **stated and returned values**, not calibration against independently known event probabilities.

The change from a mean of 6.5833% at stated 45% to 95.9167% at stated 55% describes measured points. Connecting them does not prove a mathematical discontinuity. Second-hop calls and loss estimates are excluded.

## Confidence

Recorded confidence values are retained, but are not treated as an independent opinion or a probability of correctness. The analysis does not compute confidence ECE or infer missing confidence values from a proposed formula.

## Reconstruction and live runs

`src/reconstruct.mjs` contains source templates and generators, with no network calls. Seeds such as `20260920` and `20260923` are integer settings, not recorded collection dates.

The original generators share a pseudorandom stream between wording and hidden outcomes. Keeping the comparison metadata outside the API payload is not a proof of strict statistical independence. Reconstruction retains this behavior; a revised generation scheme should be treated as a separate experiment.

Historical files generally lack complete request bodies, SDK responses, exact model revisions, timestamps, and retry histories. Reconstructing requests does not independently establish what was sent at collection time.

The new runner queries the current API. It stores new outputs in `runs/` rather than appending to historical evidence. Its logging and retry code is a reader-oriented implementation, not the original collection program.

## Interpretation limits

These experiments do not identify internal representations, model heads, training objectives, universal probability floors, or comparative performance against other LLMs. Repeating a limited set of synthetic tasks does not establish performance across real workflows. Hosted model aliases can also change over time.
