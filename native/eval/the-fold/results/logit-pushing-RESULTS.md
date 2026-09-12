# Logit pushing, measured on gemma2:2b — the honest result

*2026-09-12. The vendor path (gemma2 tokenizer → `logits_bias` to Ollama) is
wired end-to-end; the experiment says where it holds and where it is inert.*

## The mechanism, built

- `native/organs/gemma2-tokenizer.mjs` + `gemma2-tokenizer.json` — the 256k
  BPE vocab+merges, vendored from the gemma2:2b GGUF (Ollama embeds the
  tokenizer in the model blob). The vocab's id-order is byte-identical to the
  HuggingFace tokenizer.json (255,969/256,000 tokens match; the 31 differ only
  in multi-space display — `"  "` vs `"▁▁"` — the ORDER is identical, so ids
  map 1:1 to what Ollama's `logits_bias` consumes).
- `logitBiasFor(claim)` → the claim's own words → token ids → a `Map<id,bias>`.
- `streamOllamaChat({ logitsBias })` → Ollama's `options.logits_bias`. Verified
  accepted by Ollama 0.33.2 (`/api/chat`, status 200, bias applied).

## The experiment (all on gemma2:2b, live, key-word hits of the claim's terms)

| condition | control | pushed | verdict |
|---|---|---|---|
| A exact-claim voice task, t0.6 | 4.0/4 | 4.0/4 | identical |
| A exact-claim voice task, t1.3 | 4.0/4 | 4.0/4 | identical |
| B paraphrase-pressure (mouth picks wording), t0.9 | 3.0/4 | 3.0/4 | identical |
| C push as the ONLY signal (neutral continuation), t0.9 | 0.0/4 | 0.0/4 | no steering |
| C push as the ONLY signal, t1.2 | 0.0/4 | 0.0/4 | no steering |

## The finding

**On gemma2:2b, `logits_bias` has no measurable effect.** The model's
conditioning on the prompt dominates entirely — a ±16 bias on a handful of
tokens is noise against the learned prior. Even with a fully neutral prompt
and the push as the only signal, none of the pushed words surface.

This is the note's own wall made measured: *"a 2B model at temperature 0
voices the claim almost verbatim — which is what you want."* The prompt is
the binding; the push adds nothing at this scale.

## What it means for the voice pipeline

- **The push is not wasted** — it is wired, load-bearing only when the mouth
  is larger/looser (a 7B+ model that paraphrases aggressively). That is the
  future model-hunting case the pipeline names.
- **On the current mouth, fidelity is prompt-shaped, not push-shaped.** The
  Kelsen gauge (high = bound, low = impressionistic) is the right lever; the
  logit push is the mechanism that will carry it once the mouth grows.
- The tokenizer stays as the plumbing for that future — the cost of building
  it was one afternoon; the capacity it unlocks is model-agnostic logit bias.

*Honest status: mechanism real, effect inert at 2B, ready for a larger mouth.
Not tuned, not papered over — measured and recorded.*