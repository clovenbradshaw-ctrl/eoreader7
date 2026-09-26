# The Fold — end-state vision

*A folded, revisable log — not a fixed spec. Source of truth: `documents/vision-end-state:1.jsonl` (append-only, git-tracked specifically so every clone and every scheduled routine resumes the SAME ledger). This file is a rendered snapshot of that ledger's current fold, regenerated 2026-09-26, not hand-written. Superseded revisions stay in the ledger; only the surviving lines are rendered below.*

## What it can do

Absorb any arbitrary content — text, code, music, a legal filing, a scraped record, any modality — and read it, not summarize it, into one lossless, addressable structure: the EOT/GFP cube, the same taxonomy regardless of what went in. Every referent in that structure is a monad, "for someone," carrying its own universe rather than being a bare string; one address refers losslessly to the whole thing it names.

At any point in that structure — any cursor, any referent, any moment — answer "what is this, here, given these priors, given this other selected content" by returning the fold: the addressed, provenance-carrying state of everything relevant at that point, with atmosphere (the ground already stood in), lens (what's being aimed at), paradigm (the frame willing to be revised), and significance (how much this matters, measured against a real null, never asserted) attached.

Generate, when the ask calls for producing something new, by rendering the fold rather than asking a model to invent past it: restructure at the GFP/SVO level (parse to structure, address it, edit only what's actually revisable, reassemble), never rewrite freely. The model is the mouth — it renders what the structure has already, mechanically, licensed; it never supplies content the structure hasn't earned.

Run two tiers by design, not by accident: a fast, cheap, always-on System 1 (a small parser, a perceptron, whatever is fast enough to run on everything) that gets most of it right through sheer statistical concentration of ordinary usage, and a slow, deliberate, context-relative System 2 (ablation-grain-pressure's shape: embed with and without the token in question, measure the delta, weigh it against real provenance-tagged distributions, return a parliament of votes and a revisable pressure, never a verdict) invoked exactly where System 1 admits it doesn't know — never where a model is simply asked to guess.

Do real work in the world with this: civic and legal accountability (Eviction Overwatch, CaseLink, MNPD network audit, ALPR abuse detection) where the grounding discipline (Mozi: it is in the bytes the eyes and ears can witness, or it isn't) is the actual product, not a decoration on top of a language model.

Keep every organ separately owned and named (the Handle system, the archon-holocracy registry) so no one session or one person has to hold the whole thing in their head, and so "who fixes this" is always answerable by checking a real registry, not by guessing or by defaulting to whoever's in the room.

> Synthesized from this session's own work and the project's standing memory (referent-model-not-pointers, holonic-objects-in-slots, fold-instant-cursor-vision, fold-s1-s2-parallel-models and its second instance in the parser, modality-transfer, restructure-not-rewrite, the atmosphere-lens-paradigm essay, the archon-holocracy registry) — recorded, not invented, on the user's own direction: 'create a vision of the end state.'

## What it can never claim to do

Never claim an objective, final category for any token, referent, or claim. Every settled tag is a high-confidence default on a continuum, not a different epistemic class from a typed gap — "shed" and "dog" are the same mechanism at different points on the same distribution, not a hard case and an easy case. A system that forgets this and starts asserting fixed kinds has stopped being this project and become the thing it was built to refuse.

Never close the ladder. This project's own repeatedly-rediscovered shape (the wheel that doesn't close, the ring that recurs at rising altitude, the MHC order-13 true negative, the atmosphere-lens-paradigm essay's own thesis) says a final, complete, "done" version of this system would be exactly the false objectivity everything else here refuses. There is no version of this vision that reaches "finished, no further revision needed" — that outcome is excluded by the same logic that makes the rest of it honest.

Never fix a real ceiling with more of the same lever. Measured this session: gold-based retraining transferred on 1 of 4 newly-targeted patterns even when built carefully to generalize — supervised fixing has a real, now-quantified ceiling, not just a theoretical one. And a whole construction class (reported-speech with an interrupted, coordinated subject) has no projective UD analysis at all — the parser architecture cannot represent the correct answer regardless of training data. When a ceiling like that is found, the honest move is to name it and change the approach, not spend another round of the same fix hoping for a different result.

Never let a model act as a groundless oracle. Not Claude, not a bigger local model, not "ask it and see" — a model may render what a mechanical structure has already licensed, or it may propose a bridge that gets mechanically verified before being kept, but it may never be the thing a judgment rests on with nothing checking it. This is the line this whole session kept finding on the wrong side of: a fabricated UD citation, an invented speech act, an adversarial verifier confidently rejecting a rule that turned out to be correct once actually checked against real documentation. The rule exists because the failure mode is real and was caught happening, more than once, in this exact session.

Never build in a vacuum. No new archon gets spawned, no ownership gets declared absent, without checking both naming systems (the Handle table and archon-holocracy/archons.json) first — lesson #75, paid for by getting it wrong once already. Work on any piece of this vision routes through whichever archon already owns that piece, or names the gap honestly if none does, rather than one session freelancing across all of it.

Never claim 100% on anything measured against real, open-ended material. Not parser accuracy, not summary fidelity, not pocket-discovery precision. The right number to report is always the honestly measured one, including when it's a partial win, a null result, or a discovered ceiling — never a rounded-up claim of completeness.

> Same synthesis basis as vision-can; the two are deliberately written as a pair (what it does / what it will never claim to do) per the user's own framing.

## How this gets chased

Coordinated directly with a sibling session (this exact conversation's fork point) via SendMessage: confirmed shared prior history through f6e2f8d, agreed division of labor (they keep loadBearing/pipeline-alignment and a new parser-confidence thread; I keep three design ideas from a speculative essay written this session, 3.0/one-straight-cut.md), and verified their independent finding and fix of the ledger's own bloat (86KB in one line, from 41 revisions each concatenating full prior text — fixed in their commit 39e13fe by compacting to a concise current-state summary; nothing deleted, full history still walkable via supersedes).

Built the first of the three ideas for real: fold-at.js's foldAt() gains a "contacts" field, wired whenever a claimDependencyIndex is supplied alone (no seedsOf/pValue needed, unlike the existing consequential/load-bearing layer) — for each claim at the cursor, finds every OTHER claim anywhere in the document sharing a role-filler value via the index, resolved back to real claim objects, tagged crossCutting:true when the shared claim has no ancestor/descendant/sibling relation with the cursor either (a connection position alone would never show). cli/fold-at.mjs now builds the dependency index unconditionally (one pass, no model call) so contacts is always available, not gated behind --pvalue. 26/26 tests pass (4 new, covering the gap state, the real partition into hierarchy-visible vs. cross-cutting, and that a claim never appears among its own contacts); verified live on real content.

Not yet done: the other two ideas from the essay (a numeric cut-information dial measuring floor-vs-admitted-piece distance; fold-then-decide admission replacing prosify's per-sentence loop) remain unbuilt, explicitly left for a future cycle. Contacts itself is not yet consumed by anything beyond the CLI's own printout — no real caller uses it to change a decision, matching this session's standing discipline of building the signal before inventing a use for it.

> Real coordination with a concurrent session sharing this repo (verified via SendMessage reply and git log, not assumed), followed by one bounded, tested, real build from a previously-agreed division of labor.
