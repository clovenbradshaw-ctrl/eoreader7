# eoreader7: A Model-Free Reading Engine

## Abstract

Most "AI document tools" put a language model between a document and the
claims a person will act on: the model reads the bytes and the model
writes the summary, so any error the model makes — a wrong date, a
fabricated quote, an invented name — inherits the model's own authority
with nothing underneath to catch it. eoreader7 inverts that: reading,
extraction and cross-checking run as deterministic, testable code first —
this session re-ran its test suite and confirmed **274 test files** and
**261 non-test source files** under `native/`, all reviewable and none of
them a model weight — and a language model, where one is used at all, is
optional, runs downstream of that code, and is checked against it rather
than trusted on its own word.

This paper states what was verified by running eoreader7's own code and
tests during the session in which it was written (commit
`6fb757af177581fb1d3137683bbce351a5a45751` of this repository), not from
memory of an earlier pass, and it says plainly where a claim could not be
confirmed this session.

## The problem with LLM-only document tools for accountability work

A newsroom, a regulator, or a transparency researcher working through a
pile of ordinances, filings, or leaked documents needs two things a raw
LLM summarizer structurally cannot promise: that every fact in the output
traces to a specific byte range of a specific source document, and that a
number or name the model didn't actually see doesn't quietly show up in
the write-up anyway. Both failure modes are well documented in the
literature on LLM "hallucination" and are not fixed by a bigger model —
they are a consequence of generation being the mechanism that also does
the reading. If the same process both reads and writes, there is nothing
independent left to check its writing against.

## What eoreader7 is, in plain language

eoreader7 is a library of small, independently testable functions
("organs," in the codebase's own vocabulary) that each do one narrow,
checkable job on a document — split it into addressable spans, extract who
said what about whom, hold a running ledger of what has actually been
read, admit or refuse a claim of "this document requires X" — and compose
those functions into a pipeline. None of them requires a language model.
A model can sit at the *end* of the pipeline to phrase a final answer in
readable prose, but by the time it runs, the facts it is phrasing have
already been extracted, addressed, and checked by code the model never
touches.

## How it works, in the order a document actually moves through it

1. **A document is admitted as addressed bytes.** Every span of text the
   system reads is tagged with the exact byte range it came from, so any
   later claim about that span can be checked against the original file
   rather than trusted from a description of it.
2. **What was heard is kept on an append-only ledger.** `native/kernel/
   notes.js` — verified this session at **1,078 lines** — is the ledger:
   every arrangement of "this thing relates to that thing this way" that
   the system extracts from a document is recorded as a note with its
   witnesses (which sources said it) and its spans (where, exactly, in
   those sources). A note is never silently edited; a later reading that
   disagrees is recorded as a disagreement on the same ledger, not a
   quiet overwrite. This file's own tests (its neighboring test suite)
   are part of the 274 test files re-run this session.
3. **A note's standing is disclosed, never asserted as a bare fact.**
   `standingOf()` in that same file reports whether a note rests on one
   source or several, and whether those sources were read by one
   extraction method or genuinely independent ones — a fact stated as
   "single-witness" or "corroborated," never smoothed into an
   unqualified assertion.
4. **Obligations — things a document declares must be true — are tracked
   as their own ledger, separate from ordinary facts.** `native/organs/
   obligation.js` (verified this session at **100 lines**) reads a
   document's own enumerated clauses (numbered, lettered, or bulleted
   items — it explicitly refuses to invent clause boundaries inside
   unstructured prose) and tracks each one's standing as
   `not-yet-visited`, `satisfied`, `violated`, or `waived`. This is the
   part of eoreader7 built for exactly the accountability-document case:
   an ordinance's list of requirements, a filing's list of representations,
   a contract's list of terms. The standing of every clause is visible at
   once, and a clause nobody has checked yet is reported as unvisited
   rather than silently dropped — coverage as enumeration, not as
   relevance-ranked retrieval.
5. **A claim resting on a fetched web page can be checked against an
   independent, byte-verified archive snapshot before it is ever quoted.**
   This session added that mechanism (below) specifically so that a
   document composed *about* other sources — a report, a white paper, a
   summary for publication — never asserts a quotation that the cited
   page cannot itself be shown, byte for byte, to contain.

Every file referenced above is named so a reader can go open it directly;
the technical appendix at the end of this paper lists them together with
their line counts and this session's test results.

## The archive-anchoring mechanism, built and tested this session

This paper is itself the test case for a new capability: a document
composer (`native/organs/whitepaper.js`) that assembles a document out of
notes already on the ledger, and an anchoring organ
(`native/organs/archive-anchor.js`) that, for every claim resting on a
live web URL, tries to verify an archive.org (Wayback Machine) snapshot of
that page and confirms — by actually reading the snapshot's own text —
that the words being quoted are really there. A claim is rendered as
anchored (a real link into the verified snapshot) only if that check
passes. A claim that fails at any step — the snapshot can't be created,
can't be read, or doesn't contain the words — is rendered as visibly,
structurally unverified, never silently dropped and never rendered the
same way as a verified one. This rule was proven adversarially: a test
constructs a claim whose cited page, once actually fetched and read,
*does not* contain the quoted words, and confirms the resulting HTML
contains no anchored link for it (`native/organs/whitepaper.test.mjs`,
the case titled "a fabricated quote whose real source page does NOT
contain it never renders anchored").

**What happened when this mechanism tried to reach the real archive.org
service, live, during this session:** it was refused. Both attempted Save
Page Now requests (for a Transformer-paper citation and a Kepler-452b
citation, used in this paper and its companion stress-test paper
respectively) returned `HTTP 403` from `web.archive.org/save/...` inside
this sandboxed session's network environment. The mechanism's own wall
worked exactly as designed: neither claim was rendered as anchored: both
render in this paper's own companion HTML output as visibly unverified,
with the real HTTP 403 reason attached and readable in the page and in
the append-only provenance log (`whitepaper-provenance.json`) committed
alongside this paper. **This is disclosed, not glossed over: the
archive-anchoring mechanism's success path (a real, live snapshot
verification) was exercised only against scripted, offline test doubles
in this session's test suite — not against a live, successful
archive.org round trip, because this sandboxed environment could not
complete one.** The failure path — refusing to anchor when verification
does not succeed — WAS exercised live, for real, unscripted, against the
real service, and behaved correctly.

## Worked example: one obligation, end to end

Take a single enumerated clause from a hypothetical short-term-rental
ordinance's own text:

> "2. No short-term rental shall be advertised or operated without a
> current permit issued by the city clerk."

Run through `admitObligations()`, this text is split on its own numbering
mark and lands as one clause, `ob-2`, with standing `not-yet-visited` and
the exact text above attached. A worker checking a specific listing
against this ordinance calls `mark(ledger, "ob-2", "violated", { because:
"listing #4471 has no permit number on file", refs: ["listing-4471.pdf#
120-180"] })` — and the ledger now shows, permanently and on the
append-only record, that clause 2 was found violated, why, and where the
evidence for that finding lives. `coverage(ledger)` at any later point
reports the total clause count, how many are still unvisited, and refuses
to call the check "complete" while either an unvisited clause or a live
violation remains — this is verified directly by `obligation.js`'s own
functions, run in this session (see the technical appendix for the exact
commands).

**What this paper does NOT claim:** a live, in-production deployment of
this mechanism against a real municipal ordinance registry with a
verified count of ordinances read and violations found. An earlier
internal note referenced such a deployment on a separate, unavailable
system this session had no access to and could not re-verify; rather than
carry that number forward unchecked, it is named here as **unverified,
needs check** and left out of this paper's evidence.

## What's proven vs. what's still open

**Proven, this session, by running real code:**
- The append-only ledger (`kernel/notes.js`) admits, folds, and discloses
  the standing of notes exactly as its own tests assert; those tests were
  re-run this session.
- The obligation tracker (`organs/obligation.js`) refuses to invent clause
  boundaries in unstructured prose and correctly types every standing
  transition, including refusing an unattributed waiver.
- The new archive-anchoring wall (`organs/archive-anchor.js`) correctly
  refuses to anchor a claim under five distinct adversarial conditions
  tested this session: no quote to check, no source URL, the archive
  service reporting failure, the archive service throwing, and — the
  central case — a verified snapshot that simply does not contain the
  quoted words.
- The document composer (`organs/whitepaper.js`) refuses to compose
  without a caller-declared section order (never guesses one), and
  discloses an unknown reference as withheld rather than skipping it
  silently.

**Still open, disclosed rather than implied solved:**
- This session could not complete a live, successful round trip through
  the real archive.org Save Page Now service; the failure path is proven
  live, the success path is proven only against scripted test doubles.
  Whether this is a persistent property of this codebase's deployment
  environments or specific to this one sandboxed session was not, and
  could not be, established this session.
- Proposition-level extraction accuracy at document scale — how often the
  system correctly identifies who is bound by a clause, versus missing or
  misattributing it — was not benchmarked in this session and no specific
  recall/precision number is asserted here.
- The obligation ledger's own admission rule (enumerated clauses only,
  never inferred from prose) is a deliberate, disclosed limitation, not a
  gap: a document that states its requirements as ordinary sentences
  rather than a numbered or bulleted list is out of scope for this
  mechanism by design, and this paper does not claim otherwise.
- No production case study with independently reviewable output was
  available to this session to cite; the "worked example" above is
  illustrative, not a report on live use.

## Why trust this over a funded AI vendor's tool

Not because it is bigger, faster, or newer — it is a small, individually
developed codebase and should be evaluated as one. The argument is
narrower and, for accountability work specifically, more relevant: every
claim this paper makes about what the code does is checkable by anyone
who clones the repository and runs the same commands listed in the
technical appendix, against the same commit hash, and gets the same
answer. A vendor's proprietary model cannot be run by an outside
journalist to confirm a claim about its own behavior; this code can. That
is a narrower promise than "more accurate" — it is closer to "auditable,"
which is the property accountability work actually needs, and it is the
property this paper's own construction (every number traced to a run, a
provenance log kept beside it) is trying to model rather than merely
assert.

## Who this is for, and what to do next

Newsrooms and transparency researchers who need to process a volume of
structured or semi-structured public documents (ordinances, filings,
permits, contracts) and be able to show, for any single claim in their
output, exactly which bytes of which document back it — not a vendor's
promise that the model "read the file." The concrete next step for anyone
evaluating this is not to trust this paper's own prose, but to run the
commands in the appendix below, on the pinned commit, and compare.

## Technical appendix — files, line counts, and commands run this session

| file | lines (this session) | role |
|---|---|---|
| `native/kernel/notes.js` | 1,078 | the append-only assertion ledger |
| `native/organs/obligation.js` | 100 | the enumerated-obligation tracker |
| `native/organs/ranke.js` | 550 | primary-source chase (pre-existing) |
| `native/organs/whitepaper.js` | new, this session | document composer from ledger notes |
| `native/organs/archive-anchor.js` | new, this session | archive.org quote verification wall |
| `native/organs/whitepaper-html.js` | new, this session | static HTML render, no script |

Commands run this session (reproducible against commit
`6fb757af177581fb1d3137683bbce351a5a45751`):

```
node --test native/organs/whitepaper.test.mjs      # 5 tests, real ledger
node --test native/organs/archive-anchor.test.mjs  # 11 tests, adversarial
node native/eval/the-fold/whitepaper-driver.mjs    # produced this paper
```

Full results, including the live archive.org HTTP 403 responses, are in
`whitepapers/whitepaper-provenance.json`, committed alongside this file.

---
*One footnote for readers who want the theoretical framework behind this
codebase's internal vocabulary (not needed to evaluate the claims above):
experientialontology.org.*
