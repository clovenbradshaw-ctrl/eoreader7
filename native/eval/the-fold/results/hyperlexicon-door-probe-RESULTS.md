# The hyperlexicon door, measured — and made ready (P73)

`node eval/hyperlexicon-door-probe.mjs` · 2026-09-01 · re-runnable driver
(P19/P27's posture), mirroring the LIVE turn exactly: app.js's own
relation-reader configuration, holon.js's admission (retrieve → read →
admit per passage, witness = the passage ref), holon.js's own ≥2-witness
ledger block. Material: the two committed real Wikipedia fixtures
(`wikipedia-battle-of-borodino.html`, `wikipedia-war-and-peace.html`),
three realistic questions, 3 passages each.

## The question this answers

"Are you reading EOT well enough to have a meaningful hypergraph?" —
asked of the live P57 admission path, which accumulates bound claims
cross-turn and feeds ≥2-witness notes back into the model's prompt as
"confirmed independently in more than one place."

## Three arms

| | A — pre-P73 live config (no prior, no gate) | B — prior on the reader, gate off | C — prior + door gate (P73 live config) |
|---|---|---|---|
| claim verdicts | bound 36 · beyond-reach 17 · unbound 1 · unheard 2 | bound 15 · unheard 31 · beyond-reach 3 | identical to B |
| edges offered to the door | 36 | 15 | 15 |
| turned away at the door | 0 | 0 | 0 |
| notes on the ledger | 29 | 10 | 10 |
| **closed-class (non-verb) labels among notes** | **18 of 29** | **0 of 10** | **0 of 10** |
| notes with ≥2 witnesses | 0 | 0 | 0 |

Arm A reproduces the pre-P73 measurement exactly (the probe's first run,
2026-09-01, scratchpad): `—and→` ×7, `—of→` ×4, `—to→` ×2, `—in→`,
`—on→`, `—or→`, `—himself→`, plus noun labels (`—army→` ×2,
`—artillery→`, `—occupation→`) — 18 of 29 notes carrying a connector that
is definitively not a verb, admitted into the belief ledger with full
standing.

## The findings

**1. The vocabulary gate was the fix, and it was already built — only its
data was missing.** `hypergraph.js`'s `posPriorFor` POS gate (P68) existed,
tested, waiting; app.js already fetched `/priors-data/pos-prior-eng.json`
into the cache it reads — and the file did not exist. Building it (the
engine's own `scripts/build-pos-prior.mjs` over UD_English-EWT, CC BY-SA
4.0 — one curl, one node run, exactly as its header says; 16,654 forms,
matching the documented figure) removes ALL 18 closed-class labels at
EXTRACTION, before the door ever sees an edge: `and`/`of`/`to` never enter
the relation vocabulary, so the junk triples never reach `bound`. Arm C's
ten surviving notes all carry real verbs (`fought`, `loses`, `suffers`,
`resorted`, `managed`, `translated`, `remained`, `set`, `took`,
`discusses`).

**2. The door gate is a wall behind a wall — and that is why it threads
anyway.** Arm C turns away zero edges because arm B's reader already
cleaned itself. The gate (asymmetric: a settled non-verb refused with its
giver, out-of-vocabulary admits — P56's rule, already implemented in
`admit`, previously unreachable) now guards any FUTURE reader path that
lacks the vocabulary gate, at zero cost when there is nothing to refuse.

**3. Corroboration is still structurally unreachable, and that is the
identity seam's job.** 0 of 29 (arm A) and 0 of 10 (arm C) notes ever
reach two witnesses, even with both pages describing the same battle and
stating the same fact ("The Russian army withdraws the next day" /
"Imperial Russian forces retreated southwards"): note identity is the
exact triple, and prose never restates a fact in extractable-identical
form. The ≥2-witness ledger block therefore renders EMPTY on real prose.
`makeHyperlexicon` now takes an injectable `noteIdentity` organ
(canonical forms for the ID alone; display keeps the first reading's own
words; witnesses/spans union; gapping organ falls back to surface forms)
— mechanism proven reachable in `hyperlexicon-identity.test.mjs` (an
injected toy canonicalizer folds two restatements into one note with two
witnesses). The PRODUCTION organ — referent faces for the ends, `sameAct`
lemma equivalence for the connector, both already proven in the MINE-1
work — is the named next wiring, deliberately not invented here.

**4. The remaining defect class is subject-span debris** — `and Andrei`,
`that Napoleon`, `which Tolstoy`, `of Moscow` as subjects: clause openers
and prepositions leading the subject span. That is the extractor's own
gap (eoreader7 native `relations.js`), named as lever 3 and untouched
this pass.

**5. The honest cost of the prior, disclosed.** Bound claims drop 36 → 15
and `unheard` rises 2 → 31: claims whose connector was a function word no
longer bind, because the reader's vocabulary no longer contains function
words. Those were never real relations — but the count is a real recall
change on anything that depended on the old inflated `bound`, and it
rides on EVERY consumer of `relationsFor` (the grounding ladder's
relation tier included), not only the hyperlexicon door. That is the
same distinguishing test P41/P43 already applied to `determiners`/
`negationWords`: this prior CLOSES false bindings (a conjunction heard as
a verb fabricates an edge), so it ships on.

## What "meaningful" now means, precisely

After this pass the live ledger admits ~10 verb-labeled, byte-addressed,
witness-attributed notes from this material instead of 29 mostly-junk
ones; the ledger block stays empty until the identity organ lands (the
seam is in place); and multi-hop reasoning over clean admitted facts was
already measured strong (P60/P61/P63: precision 1.000, oracle-checked).
The bottleneck was admission from prose; half of it (label quality) is
closed by data that was one curl away, and the other half (corroboration
identity) now has its socket.
