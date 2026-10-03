# CPU LLM: verified procedure reuse, 2026-10-03

**Finding:** a real CPU model can propose a bounded procedure that replaces repeated model calls on new inputs. This is a small standalone assay, not a production self-improvement loop or evidence of general reasoning growth.

## Runtime and reproduction

Model: `HuggingFaceTB/SmolLM2-135M-Instruct`, revision `12fd25f77366fa6b3b4b768ec3050bf629380bac`, 134,515,008 parameters. PyTorch `2.14.1+cpu`; Transformers `4.57.1`; four CPU threads. Every parameter's device is asserted to be CPU. Greedy decoding; fixed weights; zero frontier API calls. Recorded model-loading time is about 0.5 seconds after downloading weights. Generation throughput is about 18 tokens/second in this environment, excluding loading/download and verification. Exact per-call timings and raw outputs are retained in `cpu-llm-learning-falsify.json`.

An isolated environment was installed with `python3 -m venv /tmp/er7-cpu-llm`, CPU torch from `https://download.pytorch.org/whl/cpu`, and `transformers==4.57.1` from PyPI. The revision's config, generation config, tokenizer JSON/config, special tokens map and safetensors weights were downloaded from Hugging Face. Supply these in a local directory alongside `revision.json` containing `{"repo":"HuggingFaceTB/SmolLM2-135M-Instruct","sha":"12fd25f77366fa6b3b4b768ec3050bf629380bac"}`. The driver loads only local files.

Run:

```sh
/path/to/cpu-venv/bin/python native/eval/cpu-llm-learning-falsify.py --model-dir /path/to/model > /tmp/cpu-report.json
```

## Task and independent checks

The model is asked to write `solve(text)`, summing whitespace-separated signed integers and returning zero for empty input. Two examples train the proposal. Four independent validation cases cover negatives, empty input, mixed whitespace and zeros. Eight withheld transfer cases cover multi-digit values, negative values, cancellation, newlines, tabs, a larger integer and blank input. No held-out input or result feeds back into proposals or selection.

A narrow AST whitelist admits only a single function with a return expression and approved Python operations. Generated code cannot import modules or perform filesystem/network access. Accepted code executes in another interpreter with a three-second timeout and restricted builtins. Promotion requires every training and validation check to pass. This is a scaffolded code proposal, not independent discovery of arithmetic or invention of an algorithm.

The first proposal sums individual alphanumeric characters and is refused by the AST scope. Its explanation incorrectly describes `isalnum` as converting characters to integers. The second proposal, after adding the two training examples to the instruction, produces:

```python
def solve(text):
    return sum(int(x) for x in text.split())
```

It passes all training and validation checks, then **8/8 withheld tasks**, with **zero further model calls**. Reloading the exact code in a new interpreter also passes **8/8**. Removing the learned procedure yields a named absence, not a silently fabricated answer.

## Counterexamples and comparison limits

Eight separate model calls to answer the same held-out arithmetic questions yield **0/8 format-compliant answers**. A separate, gold-independent parser also accepts a final equation value or a plainly stated answer, giving **3/8 semantically correct answers**. This distinction matters: some answers are right but formatted incorrectly. Other outputs give wrong arithmetic, repeat the input, or generate unrelated code. Raw outputs are retained.

Five out-of-scope inputs (decimal, comma-separated, word numeral, unit and injected-code-shaped string) are refused by an explicit format gate with `outside_signed_integer_scope`. This gate is handwritten assay infrastructure; the model did not learn it. It proves scoped routing can refuse these cases, not that the generated function alone validates arbitrary inputs.

A hand-coded classical summation baseline also succeeds **8/8**. Therefore the experiment supports replacing repeated uncertain language-model answers with a validated procedure. It establishes no superiority over ordinary programming, no weight learning, and no new capability relative to a system already equipped with this summation algorithm. CPU proposals, independent verification, byte-preserved procedures and scope gates are the ingredients demonstrated here; production wiring remains unattempted.
