# Reading with recall: what earned, what refuted, what was discarded (2026-09-01)

User direction: *"test and proceed, dont use the sidecars if they are not
very good."* Three measurements, three different verdicts, each kept.

## 1. The sidecars are not very good — measured, and retired from use

80 sampled `.eot.json` sidecars: every one carries recipe id
`aea2233a6055abf1` or `dc46a97f9c6e5277` — NEITHER is today's
`40777b399dad77ea`, so all are records of the superseded reading (dark POS
gate, bare-anchor subjects). Content confirms: **41.4% junk subjects**,
18 of 1,044 notes corroborated. They stay as history (LP2) and nothing
consumes them. The fix is regeneration under the current recipe
(`--fresh`, whose own doc names this exact case: "for when the RECIPE
itself was the defect"), begun for the narrative corpus the same day.

## 2. Within-novel note identity: an honest negative, and a reframe

The P73 `noteIdentity` seam was finally filled with the earned organ
(ends canonicalized through the referent alias map) and measured on an
in-order Dracula read, three arms: exact-triple, referent-ends, and a
DERANGED-alias control built to fail. **All three arms byte-identical**
(7,020 notes, 25 cross-passage corroborated, 0.4%): the alias lookup
never fired once, because equality-with-a-surface is the wrong join key
for NP-widened ends ("the range of knowledge of those who" contains no
bare surface).

The reframe worth more than the fix: **fiction re-mentions REFERENTS,
not propositions.** A novel almost never restates a fact at
edge-extractable grain across passages — 0.4% may be near the true rate,
not a defect. Referent re-arrival is constant (which is exactly why the
NeedPrior harvest worked at that grain). Proposition restatement lives in
ENCYCLOPEDIC and CROSS-DOCUMENT reading — P74's withdraw/retreat
specimen was two pages about one event, never one novel. The
hyperlexicon's corroboration story should be pointed there, and
within-novel corroboration should stop being read as a health metric.

## 3. A retrieval-loop probe, DISCARDED by its own control (II.23)

A quick probe ("does prior-seeded recallCandidates surface relevant
records at reading time better than cold ACT-R?") produced numbers
(21.1% vs 4.9%) that are REPORTED HERE ONLY AS DISCARDED. Two defects,
both caught by inspection before anything was concluded: the control
shuffled the SAME sentence's words — and a bag-of-words cue is
order-blind, so the control could not fail (control hits 39 vs 43 real);
and citations were recorded ON HIT, so the seeded arm fed itself — a
rich-get-richer confound. The NeedPrior's standing rests solely on the
clean prequential held-out validation (Dracula never pooled: 0.1924 vs
0.1725, paired 316–260). A sound reading-loop measurement needs a
citation policy independent of the scorer and a control drawn from
material the cue never saw. Fourth time in one day the resolution test
(eo-constitution II.23) caught the person writing the check.

---

# Addendum: the cross-document measurement, and the third revision of the bottleneck story (2026-09-01)

The reframe in §2 predicted proposition restatement lives cross-document.
Measured on the committed Borodino pair — two real Wikipedia pages about
one battle (80K + 72K chars, 377 + 350 gate-lit edges, 992 union
referents), through the door, three arms:

| arm | notes | cross-doc corroborated |
|---|---|---|
| exact triple | 727 | **0** |
| referent-canonicalized ends (containment) | 725 | 1 |
| deranged-alias control | 725 | **1 — the SAME note** |

The one join is `"he" —was→ "hit by massed Russian cannon fire"` — both
pages describe Bagration's wounding in near-verbatim words, and a bare
pronoun end passes through ANY alias map untouched, which is why the
control equals B. Attributable lift from referent identity: **zero.**

## What this settles

Two pages about the SAME EVENT, guaranteed shared subject matter, and
mechanical triple identity finds nothing — because even encyclopedic
prose restates a proposition in different words ("Kutuzov commanded the
Russian army" / "the Russian army under Kutuzov..."). This is not a new
wall; it is the SAME wall measured twice before under other names:
MINE-1's `unbound` plateau ("closing it needs a different verdict
criterion entirely — semantic entailment, not structural matching") and
P74's synonymy verdict (withdraw≠retreat is not morphology).

**The bottleneck story, third revision.** (1) Garbage admission — fixed
(the dark gate, the NP walker, the category stops). (2) Identity — now
REFUTED as the lever: filled with the earned organ and measured flat,
within-book and cross-document alike. (3) The real remainder is
PARAPHRASE, and it is the semantic tier's problem. The licensed tool for
it already exists: the witness tier (P32) — a small model asked "does
this page state this note?", the verdict derived mechanically from a
sibling-swapped pair, the decider shown in source bytes. Cross-document
corroboration is that machinery pointed at the door's ≥2-witness gate
instead of at claim verification. Nothing else measured today can feed
that gate; nothing mechanical this project has built or refuted can.

The ladder in CLAUDE.md's "bottlenecks" section is amended accordingly:
its steps 2-4 (noteIdentity ends, sameLemma labels, kind gate) remain
correct for what they each do — but none of them, alone or together,
moves corroboration, and that is now a measured fact, not a prediction.
