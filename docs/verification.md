# Verification

English | [日本語](verification.ja.md)

Local checks for this revision: 2026-09-18, Node.js 22.16.0 and Python 3.13.5.

## Passed

- 29 Node tests and 9 Python tests, using mock API responses.
- Offline analysis of 1,941 recorded outputs.
- Reconstruction checks for 1,942 planned requests, with the known missing Noul output `shard6-186`.
- API-free previews of all four example files, without installed npm dependencies.
- Relative documentation links, English/Japanese navigation, and MIT metadata.
- Recorded data, request snapshots, numeric summaries, and figures match the previous reader package byte for byte. The default die example is now sweep trial `d0020`; the previous example is kept byte for byte as `examples/dice_ordered.json`.

The update changes documentation, licensing metadata, and the language of generated Markdown summaries. Numeric calculations and experiment inputs are unchanged. The existing figures are retained, not re-rendered for this revision.

## Not checked

No live model API calls were made. The original package build could not install the SDK in its network-restricted environment; this revision does not add a live SDK integration check. The dependency versions, resolved URLs, and integrity values are unchanged.

These checks do not authenticate historical server responses, identify the model's internal implementation, or establish that the current hosted model will reproduce recorded outputs. See [methods](methods.md) and [running experiments](running.md).
