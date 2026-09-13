# The address — what a SHA must name in this system

**Standing: nomination.** This document states the addressing model the
EO / holarchy / holograph requires, against the model git's SHA-1/256
implements, and it says which parts of git's model are kept, which are
structural, and which are refused. It is checkable against the code and
the record, and both win any disagreement with it. Written 2026-09-13,
as a spec, from what the codebase already does — nothing here proposes a
mechanism the instrument does not already carry in at least one organ.

The question it answers, asked directly: *does the EO and holarchy and
holographic nature of the system require a different labelling model than
GitHub — in the sense of the SHAs?* Yes. Not because hashing is wrong —
Merkle hashing is the holographic property and is kept — but because git
hashes **content**, and this system's addresses name three things content
cannot express: a **resolution** (the grain of the pattern), a **birth**
(the identity a being was given, not the bytes it happens to wear), and
an **act under a ground** (a difference measured against a rebuilt null,
by a named recipe, on an append-only log). Content is one argument of an
address here, never the whole address.

---

## 1. The claim

An address in this system is a **small pattern over the record** with five
properties, each of which is already a law or a measured mechanism
elsewhere in the codebase:

1. **It points at the whole.** Every line the record produces carries an
   address — a byte range, a turn, a note's witnesses, an act's seq — and
   the record can expand that address back to the bytes, the claims around
   them, the referent's whole neighbourhood. This is THE-HOLOGRAPH.md's
   first property and the holonic-objects rule ("one address refers
   losslessly to a whole universe").

2. **It is a birth, not a spelling (P168, S80).** A referent's id is minted
   at first admission and kept across refresh. The partition of surfaces
   into beings is identical under a rename; the address does not move when
   the spelling does. Identity is by consequence — two figures are one iff
   folding on either makes the same difference to the ground
   (`identity-is-the-fold-at-a-point.md`) — never by appearance, not even
   in principle.

   *The wheel names this register (`native/docs/THE-WHEEL.md`, canonical):
   the being minted at first admission is a **Being** — the spokes; the
   fold at a point is the **Fold** — the rim; the ground the address stands
   on is the **Void** — the hub. This document cites the wheel's naming
   and never re-derives it.*

3. **It self-verifies against the bytes it names (P5.2).** Byte-offset
   self-verification is mandatory; every span reads back as its own pair or
   it throws. A normalisation that changes length (`normaliseNewlines`)
   without recording itself is a measured defect (P67's prerequisite
   finding), because an address that cannot be re-expanded has stopped
   being an address.

4. **It names one thing, or it lies (P137).** A bare turn number stopped
   being unique the moment more than one conversation could be recalled
   from; the fix (`turn:3.12`) was not a cleverer number but the rule: an
   address that names two things is an address that lies. An address is
   also never a licence to quote something else — it is checked against
   what it names before it is used.

5. **It carries a grain.** The shadow recognizes at its finest grain and
   only echoes at its coarsest ("something like this was here"); the echo
   is the deidentified, sealed minimum that is never read back into EOT.
   Every tier of the level ladder is a compression over the tier below,
   and a consumer is handed the rung that settles the question, with the
   addresses struck until the record attaches them mechanically.

The consequence: **what a consumer is handed is a function of the
question, not a function of the material.** A novel and a shelf of them
cost the same few hundred tokens per turn, because the reading happened
once and a turn is a query over it.

## 2. What git's SHA already is — and what is kept

A commit hash is a Merkle root: it commits the whole tree, and every
fragment — a blob's SHA, a subtree's SHA — is a fragment of a holographic
plate that verifies against the whole, exactly. That is Gabor's property
at one resolution. This codebase already uses it in every place identity
should be content: the chained `seq/prev/SHA-256` build-log hashes,
skills as content-addressed `<digest>.json`, `mintClaimId`'s Web Crypto
SHA-256, content-addressed fetched pages and materials, and P68's recipe
hashes. **The Merkle idea is not the problem and is not replaced.** A
byte address stays a hash of the bytes it names; that is the floor the
whole ladder stands on (WHAT-IS-BEING-BORN.md, Station 0: "from byte 0,
everything has an address").

Git's SHA also already has the two properties the naive reading of "we
need different SHAs" might think it lacks:

- **Immutability with history.** A commit's hash is fixed at birth and
  never changes; change is expressed by a new commit whose parent names
  the old. That is closer to EO's append-only log than to a mutable
  database.
- **Whole-over-part authority.** A root hash commits its parts; you
  cannot change a part without changing the root. That is the holograph's
  compression direction.

## 3. Where the model parts ways — four structural gaps

### 3.1 One resolution, not a ladder

Git has exactly one rung: exact. A blob hash tells you whether the bytes
are identical, and nothing else. The holograph's whole point is a **grain
ladder** — finest grain *recognizes*, coarsest only *echoes* — and the
echo is deliberately lossy, a fragment of a fragment whose reconstruction
is "a shape so faint it can say no more than that something like this was
here." A content hash cannot express a lossy tier, because a lossy
fingerprint is not an equality test; it is a **similarity test with a
declared grain and a measured null band** (the keyless field of
`relative.js`, the shadow/echo tiers of THE-HOLOGRAPH.md §3). The address
must therefore carry its grain, not only its referent.

### 3.2 Identity is consequence, never content

A git blob SHA is a spelling: same bytes, same hash, anywhere on earth.
Change a byte, and the identity is a different identity. This system's
referents are the opposite by law (P168, S80): the id is given at birth
and kept, and the same being read again — with more material, a
reassignment, a witnessed merge — keeps its address while its **standing**
revises. Git cannot express "same thing, corrected understanding"; its
identity would re-birth on every refresh. The measured cost of the
spelling model is on the record: under founder-rule naming, four beings'
addresses oscillated between refreshes and 25 superseded addresses still
carried mentions; under birth-rule naming, zero and one. And the
identity-by-content attempt was refuted on its own terms: `sameLemma(
"withdraws","retreated")` is false, so lemma-folding the note identity
joins nothing — identity by content is stemming wearing a `form:` prefix.

### 3.3 The hash commits acts under a ground, not states

A claim in this system is a **difference against a rebuilt ground** — the
perturbation, the null's draws, the recipe, the giver are part of what a
finding *is*. None of that is content, so no content hash can name it.
Three mechanisms already hash the right thing:

- **Act-hash over the log.** Build logs and the reading record seal each
  entry by `seq`, `prev`, and a SHA-256 over its *canonical payload* —
  the act (kind, message, code, author, run, prev), not a snapshot of the
  whole. Re-append from the serialized lines reproduces the log
  byte-for-byte; a hash over state instead of acts could not.
- **Recipe identity (P68).** The witness on a note names who read, not
  only what: SHA-256 over a caller-declared descriptor *including the
  repos' own git-commit state*, carried as `slug@recipeId`. Two readings
  of one book by two recipes are two instruments, and `independentReadings`
  counts `(source, recipe)` pairs apart — the two-sources-through-one-
  decoder failure is refused on the record.
- **Frame identity (S42/S43, P80/P81).** What the reader stood on —
  assembly, priors, levers, provider — is the log's first entry, declared
  with the ledger's birth. A claim without a frame is a view from nowhere,
  and a view from nowhere is refused.

Git's SHA commits a snapshot of bytes; EO's hashes commit a snapshot of
*acts and the conditions they were performed under*.

### 3.4 The address must survive the revision of what stands on it

Standings are revisable by law: a changed prior invalidates downstream
standing (Constitution II.1); a ground is conceded with REC and re-zeroed;
a belief is a belief, never a verdict. All of that happens **over** an
address that must not move. Git's identity model has no standing layer to
revise — the hash and the value are the same object — so the revision
question does not arise; it cannot arise. The two-layer split — address
fixed at birth, standing computed over it — is the load-bearing
distinction the SHA sense of the question is really about.

## 4. The address vocabulary

The system does not have one kind of address; it has a ladder of them,
and each is a rung of the same compression. Which rung a thing is
addressed by says which question the address answers.

| rung | address | names | identity rule | can be handed to the mouth? |
|---|---|---|---|---|
| bytes | `source:file#a-b` | the material, as given | content (self-verifying, P5.2) | no — struck (2026-08-18) |
| birth | `ref:auto:<id>` | a being the reading established | minted at first admission, kept (P168, S80) | no — struck |
| act | `<log>:<seq>` | a performed act on the append-only log | chained SHA-256 over the act's canonical payload | no — struck |
| recipe | `<source>~<recipeId>` | a reading, by whom and under what | SHA-256 over descriptor + repos' git state (P68) | no — struck |
| frame | the log's first entry | what the reader stood on | declared with the ledger's birth (S42/S43) | no — struck |
| holon | a block at a resolution | the compression over the rung below | derived; re-expands losslessly by the record | yes — as the pattern |
| shadow / echo | deidentified pattern | the residue of significance, at a grain | similarity with a measured null band, never equality | never — a lien, not content |

Two readings of the table:

1. **Everything below the holon rung is machine-addressed; only the holon
   reaches the mouth, and only with its addresses struck.** A model handed
   an address will write one, and a written address is a fabrication order
   — measured when an instruction to cite addresses produced a fabricated
   "[4]" (the 2026-08-18 decision). The record keeps every address and
   attaches them after the draft (`cite.js`), mechanically.

2. **The shadow/echo is the one rung that does not expand.** The echo is a
   sealed minimum shared without confession; the semiotic triangle's broken
   base is the law: the deidentified pattern can never touch the file
   except through the reading. That is not a limitation of the addressing
   model — it is the addressing model's only privacy tier.

## 5. The invariants

These are the normative rules the spec states. A future mechanism that
produces or consumes addresses must hold all five; a mechanism that
breaks one has produced a non-address.

- **A1 — An address names one thing.** If two entities can be addressed
  by one string, the string is not an address; disambiguate (P137's
  `turn:3.12` rule).
- **A2 — An address is a birth, not a spelling.** Content is a permitted
  identity for bytes (A4) and never for beings. A being's id does not
  follow its founder's spelling, and a rename is never a re-clustering
  (P168's partition-invariant test).
- **A3 — An address self-verifies.** Every span reads back as its own pair,
  or the computation that produced it is refused. A length-changing
  transform must record itself or it corrupts every address downstream.
- **A4 — A byte address is a hash of its bytes.** The Merkle floor is
  kept. Content-addressing is correct exactly where the thing addressed is
  content.
- **A5 — An act's hash covers the act, its giver, and its recipe.** The
  hashed payload is the canonical act (kind, operator, seq, prev), the
  named giver where the act is received, and the recipe under which the
  reading was made. Two instruments, two hashes — never a collision to a
  shared bytes hash.
- **A6 — Standing revises over the address; the address does not revise.**
  A changed prior reverts findings to `shown`; a ground concedes with REC;
  the address those stand on does not move.
- **A7 — The mouth never receives an address.** It receives a pattern with
  addresses struck; expansion is a door the record opens, never a thing
  the mouth does.
- **A8 — The shadow is never expanded.** A deidentified pattern is a lien
  on content, never content; the echo's base stays broken.

## 6. What is refused

- **Content-hash as identity for beings** — the spelling model. Refuted by
  P168's own measurement and by `sameLemma`'s flat zero on real pages.
- **Identity derived from content by any looser key** — stemming, a
  "form:" prefix, lemma-folding — refuted as "stemming wearing a
  `form:` prefix" and by the withdrawal/retreat synonymy wall. A loosened
  key is judged on its marginal admits, never on aggregate coverage.
- **A hash that re-births on change** — the model's identity would
  oscillate with every refresh, which is the defect P165 measured and
  P168 closed.
- **A null band phrased as a pass/fail without a stated false-positive
  rate** — the entropy-null law (P172) applies to similarity addresses
  exactly as to any other check: the rate is the band's own arithmetic,
  not a sample min/max.
- **An address as a licence to quote something else** (P137) and **a
  frame-less claim** (S42/S43, "no view from nowhere").

## 7. Where it stands in the code

- `eoreader7/native/kernel/` — the log, the fold as a transient projection
  (P159), `reconstruct`, the `EOReferent@1`/`EOMention@1`/`EOOperation@1`
  entries with addresses given at birth.
- `eoreader7/native/adapters/text/surfaces.js`, `pronouns.js`,
  `relations.js` — byte-accurate spans, self-verifying (P5.2); the
  `extractSurfaces`/`discoverReferents` birth-naming with `addresses:
  "birth"` (P168, S80).
- `the-fold/build-log.js`, `records/` — the chained `seq/prev/SHA-256`
  act-hashes; the append-only logs replayed through the kernel's `append`.
- `the-fold/hyperlexicon.js::recipeId` (P68) — `slug@recipeId` witnesses;
  `the-fold/reading-log.js` — the address book as a projection of the
  constitutional reader's log.
- `the-fold/firewall.js::strikeAddresses` / `mouthFacing` — A7, the
  mouth's wall; `the-fold/cite.js` — the mechanical re-attachment.
- `the-fold/relative.js`, `relative-pattern.js` — the keyless shadow
  field, recall by cue with a measured null band.
- `the-fold/cursor.js`, `record-log.js::resolveAddress` — cursor-relative
  and birth-relative addressing (P130/P131, GFP).

## 8. The walls that stay

- **A reading can be complete, consistent, and wrong.** The addressing
  model guarantees provenance, never correspondence; only an oracle on
  facts can say whether what was addressed is true, and only on facts
  (P60's judge, shuffled).
- **The shadow cannot be shared as knowledge.** The echo's privacy is the
  cost of the echo's thinness; a room exchanges patterns, and a pattern is
  a lien.
- **The ladder compresses only as far as the reading heard.** The Lens is
  only as full as the relation reader's recall; the paraphrase wall
  (MINE-1, P74) bounds every rung above the byte.
- **Coherence is the ceiling of any address algebra.** A mechanism that
  hashes its own acts can prove its own internal consistency and nothing
  about the world — the standing wall, restated for the SHA sense: hashing
  is a way of keeping, never a way of knowing.

---

*Amendment register: none yet. This document ships as a nomination —
checkable against the code and the record, both of which win any
disagreement with it — and its normative claims are the invariants in §5,
each of which is an existing law or measured mechanism cited above.*