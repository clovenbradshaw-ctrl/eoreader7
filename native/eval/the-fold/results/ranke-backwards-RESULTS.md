# Working backwards from a readable-source article: what stands between a note and the cited span that states it (2026-09-03)

**Driver:** `eval/the-fold/ranke-backwards.mjs`. **Material:** the real
Wikipedia *Apollo 11* article (`fixtures/wikipedia-apollo-11.html`, 151KB),
chosen because its citations are largely READABLE — NASA transcripts and
histories, the Smithsonian, presidency.ucsb.edu, weather.gov — where the
Austerlitz pages (`ranke-walk-RESULTS.md`) cited catalogues and paywalls.
**The question, from the user:** not "did Ranke land" but *work backwards
to what it would need to do to get the spans that create the equivalent
hypergraph propositions.* So for every note the article states, the driver
finds the cited faces, and CLASSIFIES the gap between the note and the
nearest span in a cited face, most-demanding-first:

| class | what a snip would need |
|---|---|
| `same-sentence` | one sentence of the face carries every content word of both ends — what `snipClaim` does today |
| `morphology` | same, once forms fold to lemmas (the engine's UniMorph lemmatizer) |
| `window` | every word within three consecutive sentences — cross-sentence binding (a referent named once, then "the crew", "it") |
| `morphology+window` | both |
| `partial` | at least half the words are somewhere in the face; the MISSING side is named |
| `absent` | fewer than half: this face does not state it |

The witness (gemma2:2b, the armed select protocol — the same `witnessNote`
the ledger walk lands on) reads every `same-sentence`/`morphology` lead and,
from run 3, every footnote-bound `partial` lead, so the ladder's next rung
is priced by what the model signs, not only by what containment finds.
**The control (II.23):** the same classification over the ledger with
every note's end2 rotated to the next note's, served from the same kept
faces. `same-sentence`/`morphology` must fall; `partial` is expected to
survive, because single words co-occur — which is exactly why `partial` is
not a lead.

Nothing here claims a note is true. The ledger maps what claims are made
and by whom; Ranke adds the document the account cites as a witness of
its own kind, and these numbers measure how far the chase is from being
able to read that document's own words for a given claim.

## Four runs, one afternoon — what each one changed

| run | rule added | notes | fetches (network) | faces read | readable notes | same-sentence | window | partial | absent | via own footnote | witness calls | control same-sentence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | leads ranked by claim overlap (the walk's own `rankPrimary`) | 575 | 40 (47) | 21 | 285 | 6 | 1 | 96 | 182 | — | 7 | **7 vs real 6** |
| 2 | **footnote binding** — the marker in the prose is an in-page link to one numbered note, whose outbound links are the lead for THAT sentence; trailing markers | 575 | 90 (61) | 42 | 342 | 9 | 2 | 163 | 168 | 32 | 13 | 8 vs 9 |
| 3 | **document identity** (a face must carry the citation's title words or it is the wrong document, and the archive copy is read); bibliography region dropped; witness on footnote-bound partials | 524 | 120 (56) | 56 | 334 | 8 | 6 (+1 m+w) | 169 | 150 | 49 | 44 | 8 vs 8 |
| 4 | **archive copies actually read** — the proxy honoured (`NODE_USE_ENV_PROXY=1`), the cached route failures purged, budget 160 fetches / 60 witness asks | 524 | 160 (58) | 98 | 404 | 18 | 9 (+1 m+w) | 226 | 150 | 67 | 76 | 16 vs 18 |

**Run 1 chased the wrong documents.** Ranking a note's leads by word overlap
with the claim picked whichever cited page shared the most vocabulary — a
NASA mission overview for nearly every note — and never the page the
article's own footnote points at for that sentence. The control said so
before any reading did: 7 same-sentence hits on the rotated ledger against
6 on the real one. A rule that finds the sentence for a false claim as
often as for a true one has found co-occurrence, not the claim.

**Run 2 read the article the way its author wrote it.** A footnote marker
in the prose (`[ 8 ]`) is an in-page anchor to one numbered note in the
reference list, and that note's outbound links are the source for THAT
sentence — `footnoteLeads`/`footnoteLeadsForNote` in `ranke.js`, consulted
before any overlap-ranked link. Found by hand on the first specimens, not
by reasoning: the marker at a span's START belongs to the previous
sentence and the sentence's own marker TRAILS it, so `markersOfSpan` reads
the 40 characters after the span and excludes a leading marker (the
off-by-one that bound every note to its predecessor's source). 244 of 524
notes carry a marker; 129 bind to a footnote that links out. The control
fell to parity (8 vs 9), which is where it should sit for a mechanism that
finds sentences the note's own words happen to inhabit.

**Run 3 found that the cited address often serves a different document.**
31 of 62 footnote-bound fetches redirected: every `hq.nasa.gov/alsj/…`
transcript address now answers with the ALSJ portal page, so "the crew was
awakened by Houston" was being classified against a landing-page menu.
`documentMatches` requires a face to carry at least a third of the
citation's own title words, and on a miss the chase reads the archive copy
(`archiveAddressFor`, or the archive wrapper the citation itself paired
with the link). Same run: 51 notes had been read out of the article's own
bibliography region — "First Man, 2018 film by Damien Chazelle" is a
reference, not a claim — and are dropped by the driver. And the witness
was pointed at footnote-bound `partial` leads too, since a footnote's own
face is where the claim should be even when containment cannot see it.

**Run 3's own result: the archive fallback read nothing — and that was the
environment, not the mechanism.** 129 wrong-document consults, 0 archive
copies read: every one of the 16 `web.archive.org` fetches in the kept
index answered 403. Checked afterwards with curl: the identical snapshot
addresses answer 200 through this sandbox's egress proxy and 403 on the
direct path, and Node's `fetch` does not honour `HTTPS_PROXY` unless
`NODE_USE_ENV_PROXY=1` is set. So run 3's "0 archive copies" measured a
route, not Wayback. Two things were done about it, both disclosed rather
than smoothed: the sixteen 403 archive entries were purged from the kept
index (the index caches a gap as permanently as a face, which is right for
a 404 and wrong for a route failure — a cached refusal is a decision about
a document, and this one was a decision about a network path), and run 4
is the identical driver with the proxy honoured and the budget raised so
the archive fetches are not starved (`MAXF=160`, `WITNESS=60`; run 3 had
spent its 120 to the last fetch).

**Run 4 read the documents run 3 could not, and the picture is now honest
about what is left.** 83 wrong-document consults, 83 read through the
archive copy (run 3: 129 and 0). Faces read 56 → 98; notes with a readable
cited face 334 → 404; footnote-bound notes whose own footnote's face is
readable, 69 of 129. `same-sentence` 8 → 18 — **and the control 8 → 16.**
Reading more of the right documents doubled containment's hits on the real
ledger and on the rotated one alike, which is what the driver's own header
predicted for a class that measures where a note's words co-occur. The
`window` specimens say the same thing in plain sight: a three-sentence
window on a portal page "matches" *Apollo 11's launch* against a table
listing the Akatsuki launch date, and *Aldrin joined Armstrong on the
surface* against "Explore the Apollo Lunar Surface Journal…". Containment
at any grain this driver can define sits at parity with its control on
this material; it is a lead-finder, and the numbers now say so twice.

**The witness is the only thing that separates.** 65 leads shown, 76
model calls (the armed protocol asks twice on a yes): 3 `states`, 2
`contradicts`, 60 typed refusals (`no-testimony` 33, `indiscriminate` 6,
`uncontained` 6, `unarmed` 3, `unarmed-select` 2, `decider_unrelated` 2).
The three that landed:

- *Armstrong's crew became the backup for Apollo 8* — NASA's "Armstrong
  and Aldrin had served on the backup crew for Apollo 8 the previous
  December" (same-sentence, run 3's one landing, held).
- *NASA confirmed [the engine] was from Apollo 11* — an archive copy the
  direct route could not reach in run 3 (same-sentence).
- **The one that prices the next rung:** *William Safire had prepared an
  "In Event of Moon Disaster" announcement for Nixon* — through the
  note's OWN footnote, to thesmokinggun.com, where the face reads "In a
  memo drafted two days before the Eagle landed, aide William Safire
  provided Nixon with a short speech to be delivered 'In Event of Moon
  Disaster.'" Containment classed it `partial` (the source says
  "provided… a short speech", the article says "had prepared… an
  announcement"); the witness signed it. That is the route the whole
  backwards walk was built to find: the right document by the author's
  own footnote, the right sentence offered to a reader, a paraphrase
  crossed by the one instrument licensed to cross it.

The two `contradicts` are a 2B model over-reading, and they land as
standing, never as conviction: the New York parade note against the city
archive's photo caption ("receptions at City Hall and the United Nations"
— the caption does not say where the parade ended, and the model read
silence as denial), and the camera "currently on display" against a
museum page about Armstrong's death (the wrong slice of the right site).
Both are exactly why a `contradicts` from the witness is a witness of a
kind on the ledger and not a verdict.

**Paraphrase grew with reach, as it must.** `partial` 169 → 226, and the
missing side is the OBJECT in 162 of them (subject 21, both 43): the cited
document states the thing in other words. That is now the dominant class
by a factor of eight over everything containment can reach (28), and it
is the class no matcher has moved in this project's history — the same
wall as MINE-1's `unbound` plateau and P74's `withdraws`/`retreated`.


## The ladder — what the next rung would need

Cumulative over the 404 readable notes, run 4 (run 3, over 334, in
parentheses):

| rung | notes reachable | what it needs |
|---|---|---|
| now (`same-sentence`) | 18 (8) | nothing — `snipClaim` finds these today; put to the witness, 2 of 18 were signed and 16 refused, and the control scores 16 — this rung is priced by the witness, not by containment |
| + morphology | 18 (8) | the lemmatizer widens nothing here: on this material every form-only miss also crosses a sentence |
| + window (3 sentences) | 27 (14) | cross-sentence binding — but the control scores 5 to the real 9, and the specimens are portal menus: a bare window is co-occurrence; what this rung needs is the face's own referent index and pronoun binding (the reading pipeline's, applied to the FACE), so the window is chosen by activation, not adjacency |
| + both | 28 (15) | |
| `partial`, object missing (162; run 3 119) | — | the source states it in other words — paraphrase, the same wall MINE-1 and P74 named; the witness's job, not containment's, and the Safire landing above is the proof it can be crossed when the witness is shown the right sentence |
| `partial`, subject missing (21; run 3 16) | — | the source calls the thing something else — identity across documents ("Eagle" / "the LM" / "the lunar module") |
| `partial`, both (43; run 3 34) | — | both |
| `absent` (150, unchanged) | — | this face does not state it: a summary page, a PDF (`beyond-reach: application/pdf`, 3 faces), or a page that answered 403 to this reader itself (55 addresses once the 16 archive routes are excluded — worldcat, doi.org, id.loc.gov, newspapers) |


## What is established, and what is not

- **The lead is the footnote, not the vocabulary.** A cited page found by
  overlap is the wrong document as often as the right one (run 1's control
  beat the real ledger); a cited page found through the sentence's own
  marker is the document the author read.
- **The address is not the document.** Half the footnote-bound addresses
  on a fifty-year-old article serve something else now. Document identity
  is a check the chase must run, and the archive copy is the only recourse
  for a link that has rotted — which makes the archive route a
  load-bearing dependency, and its reachability a measured fact of the
  environment, never an assumption.
- **Containment is at parity with its control at every grain this driver
  can define** (same-sentence 18 vs 16, window 9 vs 5, on the same faces).
  It finds where a note's words live; it does not find the claim. Twice
  measured, on two runs that read different amounts of the right material.
- **The remaining gap is paraphrase and identity, not addressing.** Of 404
  notes with a readable cited face, 28 are within reach of containment
  plus a sentence window; 226 are `partial` with the missing side named,
  and 162 of those are missing the OBJECT — the source says it in other
  words. That is the witness tier's question, asked of the right document
  at the right sentence, which is what the footnote binding now delivers —
  and the Safire landing is one real instance of it being answered.
- **Not established:** any rate for what the witness would sign on those
  226. The 76 calls here were spent on leads containment chose, and 33 of
  the 60 refusals are `no-testimony` — the slice offered did not state it,
  which on a paraphrase is as often the wrong slice as the wrong answer.
  The next measurement points the witness at every footnote-bound
  `partial` with a window chosen by the face's own referent activation
  rather than by word containment, at a declared budget, with the rotated
  control through the identical slicer: if the witness signs the control
  as often as the real ledger, the slicer found co-presence, not the claim.

Raw: `results/ranke-backwards.json` (run 4), `ranke-backwards-run3.json`
(run 3). Runs 1 and 2 are recorded in the driver's own commit history
(`9a78b20`, `1717e1c`) and their headline lines above.
Faces: `fixtures/primary-faces/` (index + text faces).
