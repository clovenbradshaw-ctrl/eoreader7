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

---

# Addendum 2: the witness capstone, and the wire (2026-09-01, same day)

**The witness tier run cross-document for real** (gemma2:2b, temperature 0,
sibling-swap armed, verdict derived from the pair): 12 retrieval-proposed
notes from the battle page judged against the novel page. **2 corroborated
("states") against a mechanical baseline of 0; the fabricated-note control
held 0/4** ("Kutuzov commanded the French army", "Bagration wrote War and
Peace" — all refused). 10 refusals is the tier's designed conservatism
(P32's own batch record: low recall, zero wrong corrections). One honest
asterisk: of the two corroborations, "Napoleon fought against General
Mikhail Kutuzov" carries a clean decider ("Napoleon and Prince Mikhail
Kutuzov"); the Grande-Armée note's decider is a Tolstoy-biography sentence
that does not obviously state the claim — counted here as questionable,
never as clean. So the paraphrase wall has exactly one licensed door, and
it works at the witness tier's own measured rates.

**The Station-3→4 wire landed** ("What Is Being Born" §VI): every public
edge now carries `end1Face`/`end2Face` — the earned referent face when the
end resolved to exactly one being, fragments nested by address containment,
ambiguity a disclosed absence. Measured live: 18.6% of Dracula's subjects
carry a face (against 7.5% exact-surface before), the door keys identity
on faces ahead of raw strings, and corroboration did NOT move — exactly as
the ordering predicts, because the paraphrase wall stands between. The wire
went dark twice in its first hour (fragment-referent ambiguity in `faceOf`;
`edgeFace`'s projection stripping the fields) and both darknesses were
caught only by re-running the measurement — III.5, three times in one day.

---

# Addendum 3: the settling walk live — the mouth fills, and the first vote through it is the questionable one (2026-09-01)

The flat budget was replaced by an SPRT-shaped settling walk (corroboration
commit "The budget becomes a settling rule"): feasibility gates, VALUE
ranks (contested > thin > settled, value = expected movement of standing),
a contradiction reopens a settled note (Lamport for free), and the
dark-room hazard — the first cut ranked by overlap descending, spending
its calls on the notes MOST likely to agree — is closed by a
mutation-checked control.

Run live against the real Borodino pair, real gemma2:2b, 16 asks / 99s:

- **The ledger's ≥2-DISTINCT-SOURCES mouth is non-empty for the first
  time** — one note, two real sources, after a week in which every
  mechanical identity measured zero.
- 14 of 16 asks refused (the witness's designed conservatism), 1
  contradiction reported typed, standings honest: 1 settled, 1 contested,
  375 thin.

**And the one vote through the mouth is the QUESTIONABLE one.** The
attested decider is the same Tolstoy-biography sentence the capstone
already flagged: byte-verbatim in the slice — so it passed the strongest
containment wall — while not actually STATING that the Grande Armée fought
the Imperial Russian Army. The wall checks BYTES, not entailment, and a
verbatim-but-irrelevant `because` walks through it. This is now a concrete
live specimen of the decider gap, not a hypothetical: the next mechanical
check it licenses is cheap and typed — require the decider to share the
CLAIM's own names/features before a vote lands, which is P31's company law
aimed at the decider instead of the number. Until that lands, a consumer
weighing a `testimony:` vote must weigh it against the witness's measured
record INCLUDING this specimen — one of the two live corroborations to
date rests on a decider that does not state the claim.

The clean corroboration from the capstone ("Napoleon fought against
General Mikhail Kutuzov") did NOT recur in this run's 16-ask window — the
walk's candidate ordering differs from the capstone probe's, and the
budget bound before reaching it. maxAsks was the binding constraint (375
thin notes remained), which is the expected shape when everything starts
at one source.

---

# Addendum 4: the decider-company wall — the questionable vote is gone, the clean one stands (2026-09-01)

Addendum 3's caveat is closed, and not by hand. The decider must now keep
the CLAIM'S OWN COMPANY (P31 aimed at the decider), and the rule is
PER-END, derived from the relation's structure rather than tuned to the
specimen (P71): an assertion relates two ends, so a decider silent on
either end cannot be stating the relation.

The whole-claim floor was tried first and DEFEATED BY THE LIVE SPECIMEN
ITSELF: the full Tolstoy decider contains "the Imperial Russian Army"
VERBATIM — end2, three shared features — while never mentioning the
Grande Armée or any fight. Topic adjacency beats any whole-claim count;
the same failure class that killed company-based act identity. Per-end
asks the structural question instead, and the refusal names WHICH end
the decider is silent on.

Live rerun (40 asks, 143s): `decider_unrelated: 2` — the Tolstoy vote
refused with `missingEnd: end1`; and the ledger's ≥2-distinct-sources
mouth now holds exactly ONE note, the clean one:

  "Napoleon" —fought→ "against General Mikhail Kutuzov"
  decider: "Napoleon and Prince Mikhail Kutuzov"   [both pages]

Both ends present in the decider, a genuine cross-document paraphrase
corroboration — the first fully-clean second vote the ledger has ever
held. The pinned unit test carries the FULL live decider sentence, so
the truncated-fixture mistake that let the first floor pass its own test
cannot recur.
