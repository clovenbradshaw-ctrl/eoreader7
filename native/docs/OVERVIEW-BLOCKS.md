# Situated overview blocks

An overview is a reproducible view of selected, versioned material. It is not
an independent source. Every frame declares its question, viewpoint, owner,
experiencer, selection and literal query. The eight block types are frame,
witness, relation, contrast, trace, measure, negative-space and inquiry.

`native/organs/overview.js` owns the pure reading contract. Penelope's
`organs/generation/overview.mjs` owns portable materialization and export;
its `overview` API adapter uses the existing generation lifecycle. Holodeck
vendors these modules byte-identically and adds the full-page reading surface.

## Byte contract

Source IDs and full SHA-256 versions identify received UTF-8 text. Addresses
are half-open UTF-8 byte ranges, never JavaScript character offsets. Split
surrogates and invalid byte seams refuse. Reopening requires the exact source
version and quote; no search relocates an old address. Entire artifacts replay
from their recipes; this checks counts, manifests, reverse indexes and retained
gaps as well as passages. Portable HTML re-renders and compares byte-for-byte.
The record is inspectable, not digitally signed; an author who replaces both
recipe and artifact has authored a new account, not proven authenticity.

## Negative space

An expectation has an owner, basis, query, optional owned stakes and a next
inquiry. A sourced basis must resolve to selected witnesses; this establishes
the basis's location, not semantic entailment. Exact text search yields literal
matches, not-found-in-scope, or incomplete-search. Partial/unread/empty material
cannot produce a complete-search absence. Neither a match nor an absence says
whether a voice is represented equitably. Indirect speech, wording variants,
uncollected material and unexamined impacts remain open questions.

## Reading experience

Gaps and inquiries precede selected passages. A passage opens adjacent text
lines and the whole source. Original-text selections expose direct uses and
transitive dependencies. Exports include the full selected text and complete
construction recipe, with no external assets or network calls. A scope, frame
or source change invalidates the active browser preview and export; a change
while building refuses the outdated result. Opening does not certify reading
or understanding, and the surface awards no such badge.

## Archons and boundaries

Native Penelope intake runs actual ethosClear/requireClearance, logos over
support edges, and pathosOf for a declared experiencer. Pathos reports artifact
rhythm and the absence of a measured curve; it does not diagnose human affect,
laziness or comprehension. Browser-only materialization replays provenance and
declares that it has no native ethos clearance attached. Provenance follows
Ostrom's demand for an account, here checked by deterministic reconstruction,
not by claiming an unrun provenance-cover clearance.

Current automatic selection is case-sensitive literal retrieval of text lines.
Relations, contrasts and traces are explicitly owned arrangements with witnessed
premises, not inferred chronology or established semantic relations. No automatic
impact ranking, missing-voice determination, or equity score is implemented.
Received plain text is preserved before Holodeck rendering. Existing extracts
remain in their declared extraction address space; original PDF, audio, image
and spreadsheet coordinate mapping is not supplied by this implementation.

## Falsification

- `node --test native/tests/overview.test.js` in eoreader7
- `node --test gym/overview.test.mjs` in Penelope
- `npm run test:overview` in Holodeck (after `npm install --ignore-scripts`)
- Penelope's `npm test`, `node gym/check-tapestry.mjs` and `--selftest`

Controls plant stale versions, shifted Unicode addresses, altered quotes and
counts, dropped gaps, missing ownership, dangling premises, incomplete coverage,
HTML/script injection, changed frames during construction and broken fragment
links. UI checks use a DOM harness; live visual browser testing remains separate.
