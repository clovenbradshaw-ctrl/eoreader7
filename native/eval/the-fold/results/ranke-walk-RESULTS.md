# Ranke on new material, live: the primary-source chase over two real pages (2026-09-03)

**Driver:** `eval/the-fold/ranke-walk.mjs`. **Material:** two Wikipedia pages
this project had never read — *Battle of Austerlitz* and *War of the Third
Coalition*, fetched 2026-09-02, read by the production reader (walls on,
POS prior lit) into one ledger. **The organ:** `native/organs/ranke.js`,
named after Leopold von Ranke by the user's direction — the account is
judged by the document it stands on. **Declared:** 30 fetches, 6 searches,
3 sources consulted per note; the witness is gemma2:2b under the select
protocol (the model points at a gathered sentence by index; the verdict is
derived). **Kept:** every fetched face, content-addressed under
`fixtures/primary-faces/` with its index, so the run reproduces offline.

Nothing below is a claim that a note is true. The ledger is the richest map
this reader can make of what claims are made about the truth, and by whom;
Ranke adds one more kind of witness to it — *the document the account
cites, at an address* — and the numbers measure how often that witness
could be found and read.

## What the pages offer

| page | notes heard | outbound links (leads) | unsourced quotations (>= 6 words) |
|---|---|---|---|
| Battle of Austerlitz | — | 51 | 5 (13 before the prose gate) |
| War of the Third Coalition | — | 19 | 1 (2 before) |
| **ledger** | **605 notes** (627 heard) | | |

The prose gate on quotations was earned by the first run: a quotation
crossing a line break, carrying a URL, a footnote arrow or page/volume
apparatus is a reference-list fragment the quote marks happened to bracket
— «(as per Bodart), at 6,000 men.\n\n- ↑ Farwell (2001)» and two bare
Wikipedia URLs were "quotes" on the first run and six searches were spent
on them for nothing.

**The novel gate, same breath:** a 300KB slice of Dracula with 509
quotation marks → `citing: false`, 0 leads, 0 searches, 0 fetches, typed
`no_citations`. A page that cites nothing has declared no sources; its
quotation marks are dialogue until proven otherwise.

## Three runs, one afternoon — what each one changed

| run | rule | fetches | faces read | containment leads | witness | real attested | redealt control attested |
|---|---|---|---|---|---|---|---|
| 1 | every link a lead, in citation order | 24 | 12 | (318 consults: 178 at zero overlap) | none — containment landed directly | 0 | 2 |
| 2 | a link sharing no word with the claim is not a lead for it; archive.org `details` → `_djvu.txt` full text | 30 | 18 | 1 real, 6 redealt | none | 1 | 6 |
| 3 | **the witness reads every lead; only its own "states" lands** | 30 (cached) | 18 | 1 real, 6 redealt | gemma2:2b, select | **0** | **1** |

The control is the redealt ledger — each note's end2 rotated to the next
note's — chased over the SAME kept faces (II.23: a control built to fail).

**Run 2 decided the organ's shape.** Containment (`snipClaim`: a sentence
carrying every content word of both ends) found 1 lead on the real ledger
and 6 on the redealt one — an attest rate the redeal reproduces is not
evidence, and a `primary:` witness landed on containment alone would have
been a witness to co-occurrence. So containment became what it is: a LEAD
to a sentence. The landing is the witness tier's — `witnessNote`, the same
armed select protocol the ledger walk uses — and without witness organs
injected Ranke reports its leads as `unwitnessed` and lands nothing.

**Run 3 is the shipped mechanism.** The one real lead (*Napoleon —ordered→
the attack*, a table-of-contents line in the full text of a Napoleon
biography on archive.org) was put to the witness, which said `no-testimony`
— correctly: the line names Napoleon and a departure, not an attack
ordered. On the redealt ledger the witness said "states" once, for *as
Napoleon —intentionally→ in November* — a debris note whose words the same
biography carries in one sentence; a wrong read by a 2B model on a claim
that is not a claim, and exactly what the control exists to show beside
any number. Zero real, one control: **on this material the chase found
nothing it could land, and said so.**

## Why the yield is what it is — the faces

Of 30 fetches: 18 faces read, 8 answered 403, 4 were shells (a 206-char
paywall face at muse.jhu.edu, the class P56 already measured). Of the 18:
catalogue records (lccn.loc.gov, catalogue.bnf.fr, worldcat — the
*existence* of the book, none of its prose), Google Books stubs (613 chars),
one 188KB marxists.org transcription, one 21KB worldhistory.org essay
(itself an account), and — through the archive.org `details` →
`stream/…_djvu.txt` address rule — one whole book's OCR text (5.9KB
catalogue page → the full biography). **The cited primaries of a Wikipedia
battle article are mostly books, and the links point at the catalogue, not
the page.** The address rule that turns one catalogue into text is one row
in a declared table (`FULL_TEXT_FACES`), an address rule and never a
layout scrape; other hosts need their own rows, each with its giver.

The six quote searches returned zero results on every query (the search
engine's own faces answered with nothing this run — a measured absence,
recorded in `searches.json`, not a silent skip).

## What is established, and what is not

- **The gate holds.** A novel is never chased. A citing page is chased only
  where a lead shares a word with the note. Every run is budgeted and
  every budget is spent visibly, typed when exhausted.
- **The landing is the witness's.** Containment is a lead; the control
  showed why. What lands is `primary:<host>#a-b~ranke-v1` — kind declared,
  address into the face, recipe named — and the kernel counts it apart
  from the account it was chased from (`standingOf.kinds`), so an account
  and the document it cites are never summed as two of a kind.
- **On this material, zero landed.** Not a weak organ — the cited sources
  are catalogues and paywalls, and the one full text the chase reached
  states none of the 605 notes in a sentence the witness would sign. That
  is the honest shape of "chase primary sources" on an encyclopedia
  article about a battle: the primaries are books, and reading them is a
  different budget than following a link.
- **Not established:** any attest rate. One real lead is not a rate; the
  witness's one false "states" on the control is one observation of a 2B
  model, not its calibration here.

## Next, named

1. More address rules for full-text faces (HathiTrust, Gallica, Google
   Books' text endpoint) — each a declared row with a giver, measured on
   its own marginal leads (LP11).
2. The witness on primary faces at book scale: a djvu text is 100K+
   chars, and `witnessSlice`/`statingCandidates` were measured on pages;
   whether a lead's sentence is even offered to the picker at that scale
   is unmeasured.
3. Quote leads on a page whose search engine answers — three searches at
   zero results measured the engine, not the mechanism.

Raw numbers: `results/ranke-walk.json` (run 3). Faces:
`fixtures/primary-faces/` (index + text faces + searches).
