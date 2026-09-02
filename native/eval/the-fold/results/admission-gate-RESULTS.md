# The admission door, measured before and after its ground shipped

*Re-runnable: `node eval/admission-gate.mjs` (offline, no model call —
real relation reader in app.js's live configuration, real hyperlexicon
door, real grammar lens, over the two committed Wikipedia fixture pages).
POLICIES.md P74 is the law (renumbered from P72 on merge); this is the measurement record.*

## The four arms, one variable each

Three declared questions, 8 retrieved passages, holon.js:1050's exact
admission shape. The arms differ ONLY at the two seams P74 closes:

| arm | reader's POS prior | door lens | admitted | junk among admitted | corroboration |
|---|---|---|---|---|---|
| A0 — the live app's actual condition | absent (the 404) | none | 32 | **18/32** | 0/32 |
| A1 — ground shipped | present | none | 19 | **0/19** | 0/19 |
| B — ground + door gate | present | wired | 19 | 0/19 (gate refused 0) | 0/19 |
| B2 — door gate alone | absent | wired | 14 | 0/14 (gate refused **18**) | 0/14 |

**A0 reproduces the reported finding** (18-junk admissions: `of`×5,
`the`×3, `to`×2, `army`×2, `de`×2, `invasion`, `forces`, `occupation`,
`strategy`, `who`, `or`-class connectives) — confirming the mechanism
before claiming anything about the fix.

**A1 is the headline.** The junk does not need the door's gate — it dies
UPSTREAM, at `hypergraph.js`'s own vocabulary-level POS gate (P68's
`posPriorFor` wiring), which had been sitting fully built and dormant
because its ground 404'd on every checkout. Shipping the ground alone
takes junk from 18/32 to 0/19. **The root cause was the ground, not the
gate.**

**B2 prices the door's own marginal value:** with a blind reader, the
door alone refuses 18/32, every refusal verbatim-correct (`"invasion"
settles as noun`, `"of" settles as preposition`, `"who" settles as
pronoun`, …), zero genuine verbs lost — but it is strictly weaker than
the grounded reader: `to`×2 (settles as PART → out of Thrax's declared
scope → admits, the lens's own deliberate OUT_OF_SCOPE design) and
`right` slip through. So the door is defense-in-depth for the case where
the prior fetch fails again, plus the TYPED refusal record (`turnedAway`
with the lens's finding and giver) the vocabulary gate does not produce —
never the primary wall.

**B confirms no interference:** with the grounded reader, the gate
refuses nothing (nothing junky survives to reach it) and admits exactly
A1's set.

## Corroboration: 0 in every arm, and the proposed fix cannot reach its own example

The reported finding #2 (the ledgerBlock structurally unreachable —
note identity is the exact triple, prose never restates a fact in
extractable-identical form) reproduces in all four arms: 0 multi-witness
notes.

The proposed lever — fold note identity by referent face + lemma so
cross-source restatements share a note — was **measured before being
built** (arm C): over arm B's 19 notes, referent-face subject folding +
irregular-tail lemma verb folding yields **0 candidate joins**, within-
or cross-source. And the flagship motivating pair fails by name:
`sameLemma("withdraws", "retreated") = false` — withdraw and retreat
differ at the LEMMA, not the inflection. **The corroboration gap is
synonymy/paraphrase, not morphology** — the same wall MINE-1 already
named ("a different verdict criterion entirely — semantic entailment,
not structural matching"), whose existing answer in this repo is the
witness tier (P32), not identity folding. This measurement also sits
under live_priors' LP11 (a loosened key is judged on its marginal
admits): the head-election eval there found the loosest key's marginal
admits ran 0-56% accurate — coverage gained at coin-flip quality on
exactly the rows where it would be the only voice.

Disclosed limitation of arm C's instrument: verb folding uses eoreader7's
committed irregular-tail table only (`morphology-eng.json`, 5,531 forms);
the regular-suffix rule its design defers to read time exists only in the
absent legacy engine, so regular-inflection pairs (retreats ~ retreated)
do not fold here. That cannot rescue the flagship pair (different lemmas
entirely) but could add within-paradigm joins a fuller instrument would
count — reported, not hand-rolled around.

## Reconstruction caveat

The original driver was not committed, so this reproduces the reported
CONDITION (its mechanism and its finding), not its exact run: my three
questions are declared in the driver's own header, and my A0 lands 18/32
against their 18/29 — same junk class, same labels, different passage
draw.
