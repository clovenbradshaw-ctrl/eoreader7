# The arc-membership B-falsification, first run — UNDERPOWERED, not refuted, not confirmed (2026-10-02)

Driver: `native/eval/the-fold/arc-membership.mjs` (reads every document in
`corpus-failing/` holographically, extracts the meaning signature, and asks
whether the accumulated MEANING separates the failing prose set). Offline: no
model, no web. Not read by any test — a measurement of a design hypothesis,
said so.

**Configuration.** Production reader (createCausalTextPerceiver + the
recursive reader, minRelationSurfaces 2, the POS prior, canonicalization
floor 2). Corpus: the known-failing set, hunted not planted — 2 obituaries
(Daily Press 1992, VT Roanoke Times 1994), 2 memos (SD Staff Memo, Truman
1953), 2 encyclopedia entries (History, Encyclopedia — New World
Encyclopedia), 1 white paper (F5 VDI). Meaning signature per document =
referent surfaces + relation labels + gap surfaces from the holograph's
graphEntries. Separation by the cross-beats-self delta: admitting a
same-form member should move the form's meaning-accumulation less than
admitting a different-form member does.

**The run.**

| form | docs | referents/doc | meaning-set size | self-delta | cross-delta | separation |
|---|---|---|---|---|---|---|
| encyclopedia | 2 | 1 | 23 | 11.0 | 25.6 | +14.6 |
| memo | 2 | 12, 2 | 45 | 21.5 | 21.2 | −0.3 |
| obituary | 2 | 8, 4 | 53 | 24.5 | 20.0 | −4.5 |
| white-paper | 1 | 10 | 32 | 32.0 | 20.8 | −11.2 |

Jaccard meaning-overlap between forms: encyclopedia×memo 0.079,
encyclopedia×obituary 0.013, encyclopedia×white-paper 0.019, memo×obituary
0.010, memo×white-paper 0.013, obituary×white-paper 0.012.

**What happened.** The read is cheap and real: seven documents in 0.1s, each
yielding its beings, relations and gaps through the constitutional reader.
At the MEANING level the forms share almost nothing — obituary and white
paper overlap 0.012, memo and white paper 0.013 — where at the SHAPE level
they are indistinguishable prose (the 479/522 failure). That is Claim A of
the design, supported on first contact.

Claim B (cross-beats-self separation) is **not demonstrated**: encyclopedia
"separates" (+14.6) only because its accumulation is tiny (1 referent per
doc — anything moves it); memo (−0.3) and obituary (−4.5) sit at noise; and
white-paper (−11.2) is an artifact of n=1 (a self-delta of 32.0 against an
empty other-members baseline is not a measurement). Per the design's own law
— `necessaryFacts` refuses below five instances ("too few to claim anything
is necessary to the kind") — seven documents (2/2/2/1) cannot certify B
either way.

**What this licenses.** The meaning-gated hunt is cheap (0.1s/doc, offline),
the machinery exists, and the meaning level DOES separate the failing set on
first contact — the two hardest pairs (obituary×white-paper, memo×white-
paper) show near-zero shared meaning. **What it does not.** A certified
separation: Claim B remains unproven until the corpus reaches n≥5 per form
with a real same-form baseline. The falsifying control is intact: at n≥5, if
a same-form member moves the accumulation as much as a different-form one,
B is refuted.

**Next.** Hunt the fuller corpus (n≥5 per form: white papers, obituaries,
memos, statutes, encyclopedia prose), re-run the same driver, and let
cross-beats-self decide. The record here is the underpowered verdict, filed
before the witnesses arrive — so the progression reads honestly.