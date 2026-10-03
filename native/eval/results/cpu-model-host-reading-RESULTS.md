# Actual reading pipeline over the CPU model outputs

**Correction:** the zero-referent result in the preceding assay belonged to its isolated native causal assembly. The live reading pipeline is the constitutional HOST. Running the original outputs through it admits three referents: `True`, `False`, and `Output`. It extracts no directional relations. These are the measured results, not an inference from the isolated experiment.

Run `node native/eval/cpu-model-host-reading.mjs > /tmp/host-reading.json`. The driver reads every original generation from `cpu-llm-learning-falsify.json`, creates one HOST session with ten separate documents, and invokes the actual `createSession -> admitChunked -> sessionReferents / sessionRelations` path. It also starts the real proxy and sends all ten unchanged outputs to `POST /v1/read`. Every HTTP response is checked against the corresponding direct HOST result. No model calls, rewritten prose, injected entity names, added transcript headings or fabricated coreference priors occur.

| Measurement | Result |
|---|---:|
| Full original outputs retained as documents | 10/10 |
| Source spans registered and verified against UTF-8 bytes | 6/6 |
| Outputs retained but omitted from span indexing | 4 |
| Discovered per-source referents | 3 |
| Extracted directional relations | 0 |
| Live HTTP readings matching HOST results | 10/10 |
| Export/reimport readings matching originals | 10/10 |

The first explanation admits `True` and `False`; the second code/examples output admits `Output`. The other eight outputs admit no referents. Reading across the explicitly declared ten-source set retains those same three identities, with source-specific witnesses. These are capitalisation-based text discoveries, not a code-aware understanding of Python boolean values or an output channel.

The short responses `"8 + 11 = 19"`, `-9 - 4 = 3`, `12 - 12 = 0`, and `1000 23` are shorter than the HOST's 20-character chunk floor. Their full text remains in the document record, but they have no registered source span. The assay names `host_short_material_not_indexed` for these omissions. The public response reports all characters read but does not currently disclose this particular indexing gap.

English is declared, but the HOST's expected `bin/priors/lang/en.json` is absent at its configured location. The HOST reports `no_abbreviation_prior_for_language` and uses its derived engine floor. Coreference priors are empty; unresolved pronoun/descriptor gaps are retained. This pipeline runs stages 1–5a. It explicitly does not run emergence/binding 5b, altitude 6, population 7 or kind 8. Running the real route does not imply those missing stages ran. It also does not evaluate arithmetic, read a Python AST or perform a semantic holograph chase.

The HTTP assay uses the proxy's existing passive-door mode, with the parent as its supervisor and driver lock restored afterwards. An ordinary active startup attempted to launch the hardcoded macOS Ollama executable and crashed asynchronously when that executable was absent, despite external Heimdall and watchdog-off settings. Passive-door mode avoids starting or reconciling a model daemon and still exercises the unchanged public reading handler. This startup finding is recorded, not silently treated as a successful active boot.

Persisted artifacts: `cpu-model-host-reading.json` contains direct readings, public responses, source hashes, gaps and exact span checks. `cpu-model-host-session.json` is the real serialized HOST session; export/reimport preserves all ten source texts and their readings. No production reading mechanism was changed by this assay.
