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
| 4 | archive copies actually reachable (see below) | RUN4_ROW |

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

RUN4_SECTION

## The ladder — what the next rung would need

Cumulative over the readable notes, run 3 (run 4 in parentheses where it
moved):

| rung | notes reachable | what it needs |
|---|---|---|
| now (`same-sentence`) | 8 | nothing — `snipClaim` finds these today; put to the witness, 1 of 8 was signed and 7 refused, so even this rung is priced by the witness, not by containment |
| + morphology | 8 | the lemmatizer widens nothing here: on this material every form-only miss also crosses a sentence |
| + window (3 sentences) | 14 | cross-sentence binding: the face names "Armstrong" once and then "the commander"/"he"; the referent index + pronoun binding the reading pipeline already has, applied to the FACE rather than the article |
| + both | 15 | |
| `partial`, object missing (119) | — | the source states it in other words — paraphrase, the same wall MINE-1 and P74 named; the witness's job, not containment's |
| `partial`, subject missing (16) | — | the source calls the thing something else — identity across documents ("Eagle" / "the LM" / "the lunar module") |
| `partial`, both (34) | — | both |
| `absent` (150) | — | this face does not state it: the wrong document (a portal, a summary page), a PDF (`beyond-reach: application/pdf`, 3 faces), or a page that answered 403 to this reader (71 addresses, 16 of them archive routes) |

**What the witness said on the 33 leads it was shown (run 3, 44 model
calls — the armed protocol asks twice on a yes):** 1 `states`, 1
`contradicts`, 31 typed refusals (`no-testimony` 18, `indiscriminate` 5,
`uncontained` 5, `unarmed` 2, `decider_unrelated` 1). The one "states" is a real one — *Armstrong's crew became
the backup for Apollo 8* against NASA's own "Armstrong and Aldrin had served
on the backup crew for Apollo 8" — and it lands `primary:nasa.gov#a-b~ranke-v1`
with an address into the kept face. The one "contradicts" (*the camera is
currently on display at the National Air and Space Museum*, against the
museum's own page) is the model reading a page whose tense has moved on;
the note's standing says so and nothing is convicted.

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
- **The remaining gap is paraphrase and identity, not addressing.** Of 334
  notes with a readable cited face, 15 are within reach of containment
  plus a sentence window; 169 are `partial` with the missing side named,
  and 119 of those are missing the OBJECT — the source says it in other
  words. That is the witness tier's question, asked of the right document
  at the right sentence, which is what the footnote binding now delivers.
- **Not established:** any rate for what the witness would sign on those
  169. The 44 calls here were spent on containment's leads; pointing the
  witness at every footnote-bound `partial` with its best window, at a
  declared budget, is the next measurement, and it needs the archive
  route to be open for the faces that rotted.

Raw: `results/ranke-backwards.json` (run 4), `ranke-backwards-run3.json`.
Faces: `fixtures/primary-faces/` (index + text faces).
