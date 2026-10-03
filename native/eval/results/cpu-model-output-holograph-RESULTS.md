# Reading the CPU model output through the holograph

**Finding:** the existing holograph captures the actual outputs and preserves provenance, but its identity/query path cannot resolve these small code and arithmetic outputs. Extraction is testimony, not external verification.

Run `node native/eval/cpu-model-output-holograph.mjs > /tmp/cpu-holograph.json`. Input is the recorded ten generations in `cpu-llm-learning-falsify.json`; no new model calls occur. Persisted causal reading logs and source texts are in `cpu-model-output-reading.jsonl`; complete projections and proposition histories are in `cpu-model-output-holograph.json`.

The assembly is the native causal text perceiver and recursive reader, followed by the existing reading-log/document holograph, proposition holograph and output holograph. English POS prior is injected; coreference prior is absent. No constitutional HOST parity measurement, semantic proposition chase, general code-semantics verification or production Heimdall integration is performed. Each generation is a distinct complete source, with its exact prompt, model revision, source hash and anchors retained. Character offsets and explicit UTF-8 offsets are both recorded; every anchor reads back exactly.

| Measurement | Result |
|---|---:|
| Actual model generations read | 10 |
| Causal encounters / verified source anchors | 16 / 16 |
| Captured proposition units | 16 |
| Extracted relation edges | 5 |
| Admitted referents | 0 in every source |
| Document queries returning `question_unresolved` | 10 |
| Code atoms accepted in independently tested task scope | 1 |

The five edges come from the first proposal's explanation, including `This function —uses→ a generator expression ...` and `an integer —using→ the isalnum method`. Some of the extraction is malformed, such as making `an integer` the first end of a converting relation. These edges remain model testimony. Their labels and their presence in a graph do not establish truth. This assay does not fix that parsing or validate the explanation.

The output holograph receives **no independent ground facts**, correctly leaving all displayed units `self:model`. Capturing model output as a source establishes that the model said those bytes; it cannot make the source corroborate itself. The proposition holograph's `invent` derivation here means no independent entailment/chase binding was supplied, not that every statement is false.

One separate adjudication accepts only the second proposal's code-containing atom in context `executable-task:whitespace-separated-signed-integer-sum`. It links to the exact prior execution record (2 training, 4 validation and 8 withheld tests), including that record's hash. The code is accepted for that bounded task; its explanation/example paragraphs inherit no acceptance. General claims remain CANDIDATE with the named gap `external_claim_not_checked`. This adjudication adapter uses already-recorded independent test results; the document holograph did not derive code correctness.

The document holograph's queries all fail identity resolution. A question about a function or an integer cannot follow referent-to-witness links when no corresponding referent was admitted. This is an observed upstream capability gap, not an absent source or a model-loading problem. The existing English prose path is also not a code reader or an arithmetic proof checker. A next integration needs medium-specific code/number encounters with grounded identities and execution evidence, then independently falsified query and composition behavior. No invented named beings or blanket acceptance were added to make this assay appear successful.

Validation: existing document holograph, proposition-holograph falsification and output-holograph suites pass 15/15. The assay asserts complete source coverage, exact anchor readback, no self-corroboration, and exactly one separately scoped accepted code atom.
