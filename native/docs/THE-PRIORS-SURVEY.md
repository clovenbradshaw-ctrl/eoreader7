# The priors survey — every mechanism this house calls a "prior," held together

*Archon: `eoreader7-archon-bayes-priors` (Handle: Bayes, `kernel/prior-query.js`).
Standing: **nomination**, same register as `THE-THREE-MATHEMATICS.md` and
`THE-MODULE-CENSUS.md` — a reading of both repos, not a law. Where this
document disagrees with a module's own header comment, the module wins;
this document's contribution is naming what was scattered, not certifying
what is registered.*

## Why this exists

A "write me a sonnet" request came back as a cited paragraph of dolphin
facts (2026-09-17). The immediate bug was mechanical — `register.js`'s
`VOICE_BY_FIELD` had no `lyric` entry, so `writeVoiceFor` silently fell back
to the exposition (essay) voice, and a small model followed those
instructions literally. That got fixed directly (`c787901`). But the fix
itself — hand-writing a paragraph of instructions per genre, keyed by a
closed field name — was flagged as the wrong SHAPE of fix: "we shouldn't
have an organ for a specific modality like that, maybe a prior." Looking
for the right prior turned up something the fix should have used and
didn't: this house already has a real, wired-in "ask what is already known
before generating from nothing" mechanism. It just isn't named consistently
and the fix bypassed it. This document is the survey that grounds fixing
that properly, before anyone (including a future archon) touches the
behavior.

## What "prior" means here — five distinct things, one word

| # | Mechanism | Repo / file | What it actually is | Handle? |
|---|---|---|---|---|
| 1 | Genre meaning-potential cascade | `eoreader7/native/kernel/prior-query.js` | Queries, in order: the genre sidecar (`FortunePrior@1`, accumulated staging per genre×medium×shape), genre-tagged `NeedPrior@1` files, `ReadingPriors@1`/`FoldReadingPrior@1` axioms, the record's own seams, the web hunt. Reads from `live_priors/derived-priors/` (a real directory: `arc-priors/fortune-prior-v1.json`, `need-priors/`, `reading-priors/`, and 10 more families). Wired into `proxy-runner.mjs` at the top of composition planning (`queryMeaningPotential`, guarded by `runMode === "projection"`). | **Now yes — Bayes** (this survey's own contribution) |
| 2 | Residual cross-work impressions | `eoreader7/native/kernel/experience-priors.js` | Frequency-counted network/topology signatures across past readings, conditioning what counts as familiar vs. surprising on the next one. Part of "the wheel" (`THE-WHEEL.md`) — "the re-formed prior that primes the next ground." | Yes — **Vasana** |
| 3 | Rhythm priors | `eoreader7/native/kernel/rhythm-priors.js` | The WHEN, held independent of content — pacing/timing expectations. | Yes — **Tala** |
| 4 | Closed-class linguistic register | `eoreader7/native/adapters/text/priors.js` | Received facts about a language's function words (negation markers, pronoun sets, determiners) — DEF.admit'd, each with a `giver`/`scope`. Not mined, not conditioned by experience — a fixed grammatical fact table. | **No** |
| 5 | Corpus grounding + toggle gate | `the-fold/priors.js` + `the-fold/priors-toggles.js` | `live_priors` itself: a curated local corpus (2,000+ documents, `01-literature-books/` through `18-childrens-books/`) that a claim is checked against (the FREE reference-library tier of the grounding ladder, zero egress), gated by an append-only per-path toggle ledger (a prior arrives OFF; enabling is explicit, at whatever level — corpus, genre, collection, document). This is the literal `live_priors` the user means when they say the name. | **No** |
| 6 (adjacent, not itself a "prior") | Correction-learned rules | `eoreader7/native/organs/correction-rule.js` | Not currently named a "prior" anywhere in its own text, but structurally is one: a natural-language correction mints a falsifiable rule that conditions how a later, matching request is answered — a residual impression from one interaction shaping the next, same shape as Vasana at a different grain (per-task, not per-reading). Renamed from `hive.js` 2026-09-17 (`2cebd8a`) for an unrelated reason (name collision with the actual multi-witness "hive" pattern) — worth a second look once #1–#5 are consistent, not now. | **No** |

**The inconsistency, stated plainly:** three of these six (Vasana, Tala,
and now Bayes) carry a `// Handle:` line and a README row. The other three
— the closed-class register, `live_priors`'s own two files, and the
correction-rule ledger — carry real, working code and real documentation of
their own, but no personified identity and no entry in the one table meant
to be `native/organs/` and `native/kernel/`'s canonical index. That's not a
defect by itself (a Handle is a naming convenience, not a correctness
requirement), but it is why "who is the archon in charge of priors" had no
answer: the concept was real in five separate places and named as a whole
in none of them.

## The concrete finding: the cascade was one call away

`proxy-runner.mjs`'s own comment, dated a day before this survey
(2026-09-14): *"THE MEANING POTENTIAL STAGES, NOT THE TEMPLATE... when the
register names a genre, the void consults the whole prior cascade... BEFORE
the essay template. The template is the fallback for an empty meaning
potential, never the default for a registered genre."* That's exactly the
discipline this survey's trigger violated — `VOICE_BY_FIELD.lyric`/`.music`
are the essay-template's siblings, hand-written per field.

Checked against the real corpus, not asserted: `live_priors/derived-priors/arc-priors/fortune-prior-v1.json`
holds 16 accumulated sidecar entries — 9 "narrative prose," 3 "narrative,"
2 "historical," 1 "exposition," and **1 "lyric."** `need-priors/` currently
holds one file (`need-prior-eng-narrative.json`) — no lyric `NeedPrior@1`.

That one lyric entry is not a raw reading arc — it has a `.framing` field
(`recipe: "discovered framing — the LLM's trajectory through meaning space,
REC'd as footprints"`), meaning `kernel/discovery.js`'s live path already
ran for this exact genre: no reusable framing existed, so the LLM was
TASKED to propose staging/write-voice/felt-target on the spot, and the
result was appended to the sidecar (`appendFraming`). Timestamped
`2026-09-17T17:10:46Z` — the file's own mtime (12:10 local) matches exactly
— this happened TODAY, almost certainly from a real, model-backed run
against the live proxy during this same investigation, not from any
long-standing prior. Read directly, the discovered `writeVoice` is:

> opening: "The rain falls on the cracked asphalt, each drop a tiny
> drumbeat against the silence."
> body: "He walks, head down, shoulders hunched, the city a blur of grey
> and yellow..."

That is narrative prose — a noir scene-opening, no line breaks, no meter,
no rhyme discipline named anywhere in it. **The one "lyric" prior this
house has discovered is not actually lyric-shaped.** `discoverFraming`
tasks the LLM to propose a framing and accepts whatever well-formed JSON
comes back (`kernel/discovery.js`'s own comment: "the framing must be JSON;
a malformed proposal is refused, never half-adopted" — malformed, not
genre-inappropriate) with no check that the proposal actually exhibits the
genre it claims. Because `framingFor` reuses "the last footprint... never a
merge," this bad exemplar will be handed to every future lyric request as
an "exemplar to continue" until either a better one overwrites it or the
gap is closed structurally.

What this means concretely for the fix already shipped
(`c787901`): `writeVoiceFor`'s `VOICE_BY_FIELD.lyric`/`.music` entries are
the PRIMARY instruction on every call — `discoveredVoice`, when present,
only ever appends an exemplar string after `baseVoice.opening()`/`.body()`,
never replaces them (see the `voice = discoveredVoice ? {...} : baseVoice`
composition in `proxy-runner.mjs`). So the fix was necessary and correct as
far as it went, and it is NOT undermined by today's mis-shaped discovered
framing being layered on top — but that framing is a live, standing risk
worth naming rather than leaving to be found again by surprise. Separately:
nothing in `register.js` documents that `VOICE_BY_FIELD` is the fallback
layer `prior-query.js`'s own comment promises callers; that's a disclosure
gap, not a behavior bug.

## What this document is NOT proposing

Not calibrated Bayesian inference. `organs/corroboration.js` already drew
this line for the whole house, in almost these words: *"This is SPRT's
SHAPE — two boundaries, walk until crossed — without SPRT's calibrated
likelihood ratios, because the witness's true p(yes|true)/p(yes|false) have
not been measured and inventing them would be worse than unit steps."* One
sidecar entry for "lyric" is not a distribution; treating it as one would
be exactly the invented-ratio failure `THE-THREE-MATHEMATICS.md` names
(II.10 — "an invented ratio is a change of units that fails invisibly").
Bayes's name personifies *asking first*, not *computing a posterior*. If
this house ever earns enough corrected/confirmed turns to measure a real
likelihood (via `organs/correction-rule.js`'s ledger, which is the one
place actual outcome data — corrected vs. accepted — already accumulates),
that would be a second, later, separately-justified step, not this one.

## Left for a follow-up pass, not done here

1. **The discovered "lyric" framing is genre-inappropriate** (narrative
   prose, not verse) and will be handed to the next real sonnet/poem
   request as an exemplar until fixed. Two independent, separately-scoped
   fixes, neither done here: (a) `discoverFraming`/`applyDiscovered` should
   check a proposal's SHAPE against what its own genre's voice discipline
   requires before accepting it (a mechanical check — e.g. a lyric field
   proposing a `writeVoice` with no line breaks is a structural mismatch,
   not a content judgment) — this is a real gap in `kernel/discovery.js`,
   not specific to lyric; (b) in the meantime, someone with write access to
   `live_priors/derived-priors/arc-priors/fortune-prior-v1.json` should
   either delete the bad `lyric` entry or append a better one (append-only:
   the latest wins).
2. `native/kernel/register.js` should say, at `VOICE_BY_FIELD`'s own
   definition, that it is the fallback layer `prior-query.js` promises
   callers, not a peer mechanism — a doc fix, not a behavior change.
3. `native/adapters/text/priors.js`, `the-fold/priors.js`,
   `the-fold/priors-toggles.js`, and `native/organs/correction-rule.js`
   have no Handle. Whether they get one, and whether "Bayes" is the right
   umbrella for all of them or only for #1, is worth deciding once, not
   assumed here.
4. `need-priors/` has exactly one genre file (narrative). Building a real
   `NeedPrior@1` for lyric (or any other under-covered field) is how the
   cascade gets something better than one sidecar entry to offer — data
   work, not a code change.
5. No circle in `archon-holocracy/circles.json` covered this domain before
   today; a `priors-consistency` circle was added alongside this survey.
