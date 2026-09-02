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

---

# Addendum 5: Pass 1 landed — 3.2× votes-per-ask, control hardened and holding (2026-09-01)

NEXT-PASSES Tier 1, Pass 1. Diagnosis first: of the walk's top-40
candidates, **14 (35%) were structurally hopeless** — their ends never
co-occur anywhere in the corroborating page, so the per-end decider wall
could never pass, and every ask spent on one was a wasted model call.

Two mechanisms, one geometry (the decider wall's own per-end covering
condition, applied BEFORE the spend):

- **Prefilter**: `endsCopresentWindow` — no co-presence window anywhere
  means skip WITHOUT an ask, tallied apart (`skippedNoCopresence`) from
  the witness's own refusals, because no call was spent and no testimony
  heard.
- **Slice centering**: for plausible candidates the witness reads the
  co-presence window — where a stating sentence would have to live —
  instead of wherever generic anchor scoring wanders (P32's own named
  prose-vs-table gap).

Live, same material, same protocol: **25 asks spent (15 skipped free),
106s, 2 clean votes** vs the prior 40 asks / 143s / 1 —
**votes-per-ask 0.025 → 0.08, 3.2×.** The Kutuzov decider IMPROVED
("aide-de-camp to Prince Mikhail Ilarionovich Kutuzov in the coming war
(the Battle of Austerlitz) against Napoleon" — both ends verbatim plus
the relation itself). The Grande Armée decider is marginal and said so:
ends covered via "Russian countryside", it states the MARCH, not the
fight — the residual gap is the LABEL, and mechanical label-company is
the refuted synonymy road, so it stays a disclosed residue guarded by
the armed sibling protocol, not chased.

**The control was hardened, not just held**: four fabricated claims ALL
with co-present ends — so they pass the prefilter and get the centered
slice — including a plausible inversion adjacent to the true sentence
("Napoleon was defeated by Kutuzov at Austerlitz") and a
protagonist-commands-army fake ("Pierre Bezukhov commanded the Imperial
Russian Army"). **0/4 false states.** Recall was not bought at
precision's expense; the must-not-shield unit control additionally pins
that the prefilter can never hide a copresent fake from the judge.

Toward Pass 2 (calibration), one number this run already contributes:
across all live fabricated batches to date, 0 false states in 12
armed-protocol asks — an upper bound on p(states|false) that the SPRT
ratios will inherit when the labeled-true batch is run.

---

# Addendum 6: level 5's fifth turn walked through the 27 phaseposts — three built, and an honest third-source result (2026-09-01)

Level 5 (the corroborated note) IS one full turn of the canonical helix
with propositions as operands, and walking it phasepost by phasepost
named exactly which cells had organs and which were the starving gaps:

| step (op·grain) | level-5 organ |
|---|---|
| NUL | the ledger's void — no note yet |
| SIG·Figure | `hear` — first sighting marked |
| INS·Figure | the claim id — note individuated as an object |
| SEG·Figure | `proposeCandidates` — cutting the candidate set |
| CON·Figure | the witness ask — this note related to that source |
| SYN·Figure | `attest` — the multi-witness note composed |
| DEF·Pattern | **`WITNESS_OPERATING_POINT`** — the declared bound (NEW) |
| EVA·Figure | the settling walk's accumulation-vs-bound |
| REC·Figure | **`thirdSourceCandidates`** — a contradiction/thinness ACTED on (NEW) |
| CON·Pattern | **`contests`** in the report — the contest structure as data (NEW) |

The three new ones close NEXT-PASSES Passes 2 (calibrate) and 3
(third-source seeker), and DEF·Pattern's content is the calibration
result itself:

**Calibration (Pass 2), both models, measured not assumed:** gemma2:2b
p(states|stated)=6/18=0.33, p(states|swap)=0/12; qwen2.5:14b 5/18=0.28,
0/12 — **slower and no better, so the small model keeps the job.**
Pooled false-state bound across all live fabricated batches: **0/36**.
A single armed "states" carries LR ≥ ~4, so two independent-source
votes carry ≥ ~16 — which is exactly what `settleFloor=2` already
demanded. **The calibration VALIDATES the unit-step walk rather than
replacing it**, and that is the honest Pass-2 outcome: no fancier rule
earned its place, and the numbers now say so on the record
(`WITNESS_OPERATING_POINT`, carried on every walk report).

**Third-source seeker (Pass 3, REC·Figure), live against the REAL
novel** — three genuinely different source KINDS on one fact (two
encyclopedia articles + Tolstoy's own 3.3MB text): the seeker correctly
proposed the novel as feasible (past the Kutúzov fold — the Maude
translation writes it accented 524×, and an unfolded feature set would
have made the novel invisible, the Bezúkhov bug class recurring at the
fifth turn, now pinned against the real bytes). It found all 60
Napoleon+Kutúzov co-occurrence windows and asked the six densest. The
third vote did NOT land: gemma2:2b, on this material, echoed the CLAIM
back as its own `because` rather than quoting the novel, and
`foldTestimony` correctly refused it — a decider that merely repeats the
claim is not evidence. This is the calibration's own 0.33 recall being
honest, not a mechanism failure: the seeker did its job (right source,
right windows), the wall did its job (no unquoted vote), and the small
model's known low recall is the binding constraint. Recorded as measured
rather than forced — the fact genuinely has a third source, and the
instrument correctly declines to claim it on an unquotable yes.

**The helix lesson, banked:** a starving floor is a turn of the helix
missing an organ at one of its 27 phaseposts, and you find it by walking
the canonical order and asking which cell is empty. Level 5's REC and
CON·Pattern were the empties; now built. The remaining fifth-turn
frontier is not a new mechanism but the witness's recall — which the
calibration measured, the seeker is bottlenecked on, and which no wall
should ever paper over.

---

# Addendum 7: the third vote lands — select, not generate; and the strata get names (2026-09-01)

Addendum 6 closed with the honest negative: the seeker found the right
windows and gemma2:2b could not produce a quotable decider — it echoed
the claim as its own `because`, and the wall refused the unquoted vote.
The user's steer resolved it in one sentence: **"never trust the model on
content, but it's pretty good with meaning if you give it proper
activation context."** The generate protocol was asking the model to do
two jobs — FIND the stating sentence and JUDGE it — and generation is
where a small model wanders. The fix is the project's own posture
everywhere else, applied to the witness: the model slot-fills, the
mechanism constrains.

**The select protocol** (testimony.js: SELECT_SCHEMA /
buildSelectMessages / foldSelect; corroboration.js: statingCandidates +
the select path in witnessNote). Activation is assembled mechanically —
every sentence in the WHOLE source where both ends' distinctive features
fire, density-ranked, capped at a declared limit — and the model POINTS
at one by index. The decider is a real source sentence BY CONSTRUCTION:
the echo failure mode cannot occur, because the model never writes a
`because`. Controls, run live before shipping and pinned as tests: a
fabricated relation over a real co-present set → refused; a true-ish
claim over an all-decoy set → refused; an out-of-range index → refused,
never fabricated; a select refusal does NOT retry the wanderable
generate path.

**Three designs for "which features activate" were tried; two are
refuted, kept here so they are not retried.** (1) Raw co-presence: 6 of
8 candidates fired on the generic word "general" alone — sentences about
OTHER generals; the model then judged garbage. (2) Rarity: refuted by
measurement — kutuzov (529) ≈ general (657) in this novel; a protagonist
is not rare. (2b) A hand-typed title list: refused on the project's own
grounds (a sample of English standing in for the whole). (3) What
shipped — the baby's signal, source-measured, no list: a title also
lives LOWERCASE ("the general said", 424×); a name never does (kutuzov
0×). A word whose lowercase life matches its capitalized life is
generic. With this gate: 8 of 8 candidates genuinely contain Kutúzov.

**The result, live, end to end:** the same note that refused in
addendum 6 — *Napoleon fought against General Mikhail Kutuzov*,
witnesses battle-of-borodino + testimony:war-and-peace — now takes its
THIRD vote from the novel itself, via select: verdict `states`, decider
*"If Kutúzov decided to remain at Krems, Napoleon's army of one hundred
and fifty thousand men would cut him off completely and surround his
exhausted army"* — a genuine statement of the military opposition —
at address `pg2600-the-novel-itself#438131-438364`, verified to name
exactly those bytes in the raw CRLF file. **Three distinct sources.**

**Two P5.2 incidents inside this one pass, both caught by the address
check rather than by eye.** First, the decider's span was being
re-derived by regex search after the fact; the user's correction —
"can't we find it by knowing what we prompted it with?" — moved the
address to be CARRIED FORWARD from the cut (the segmenter's own
offsets), and the search-back helper was deleted. Second, the engine's
splitter normalizes CRLF before computing offsets, so on Gutenberg's
66k-CRLF file the carried offsets named the normalized text, not the
file; statingCandidates now maps offsets back through a CRLF count with
MANDATORY self-verification — a span ships only when the mapped slice
re-normalizes to the cut sentence, else the address is null, never
guessed.

**The strata.** The lowercase gate WORKS and is a reader's signal — it
violates the session's new standing rule ("the system must be able to
work equally well if it only heard the novel and didn't read it").
Shipped anyway, declared rather than silent, with the vocabulary to say
so precisely: LEVELS.md names the two ladders (FLOORS = operand grade,
STRATA = evidence channel: S0 bytes / S1 script / S2 heard / S3
meaning) and the BECOMING convention — a runnable `{todo:true}` test as
the referent of what an organ is trying to become, greppable as the
repo's aspiration map. First entry: `BECOMING heard-clean`, the
determiner-precedence acceptance criterion, written before that design
exists.

**Ask economics, honestly:** the select path spends ONE call per
source (the pointing ask) where the generate path spent two (claim +
armed sibling). The arming is structural instead: decoys cannot be
picked into a verdict because a pick is checked against the candidate
list, and the both-ends filter plus the controls above carry the
insensitivity check's job. Whether select's false-state rate matches
generate's measured 0/36 is NOT yet calibrated — the operating point
declaration covers the generate protocol only, and a select calibration
batch is the natural next measurement before the walk trusts select
votes at the same unit step.
