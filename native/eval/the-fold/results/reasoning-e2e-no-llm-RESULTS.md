# How far without an LLM — e2e reasoning driver

`eval/reasoning-e2e-no-llm.mjs` asks a small set of questions against real
prose and answers them using only mechanical organs already in this repo —
`hypergraph.js`'s real extraction/judgment (`makeRelationReader`), its
direct graph-query door (`queryEdges`/`queryFillers`), `verification.js`'s
nine-cell taxonomy, and `capacity-runner.js`'s real `evaluate` door.
**Zero model calls anywhere in the run.** Full raw output is reproducible
with `node eval/reasoning-e2e-no-llm.mjs`.

Two passes are recorded here. The second one exists because the first
one's own printed output contained two defects the first pass did not
notice, and because one of the first pass's stated limits turned out, on
measurement, to be wrong.

---

## First pass — what got a real, mechanical answer

**Tier 1 — direct claim verification** (`report.read(claim)`, i.e. `judge()`):
- `"Lincoln appointed Seward"` → `bound` (the material states this edge).
- `"Lincoln appointed Chase"` → `unbound`, with the nearest real edge named
  (`Lincoln —appointed→ Seward`) — a genuine near-miss disambiguation: the
  material says Lincoln *nominated* Chase, a different verb, and the
  extractor correctly refused to conflate them.
- `"Seward did not negotiate the Alaska purchase"` → `unbound`.
- `"Lincoln appointed Napoleon"` → `unbound`, again with the nearest real
  edge offered rather than a bare refusal.

**Tier 2 — direct graph queries** (`queryFillers`, no sentence ever
extracted for these): "who did Lincoln appoint?" → Seward; "who did Lincoln
nominate?" → Chase. Answered straight off the material's own edge set.

**Tier 3 — novel answers, genuinely composed, not stated anywhere as one
sentence:**
- *"What did Lincoln's Secretary of State go on to negotiate?"* — no
  passage says this. It's built by chaining `Lincoln —appointed→ Seward`
  with `Seward —negotiated→ the Alaska purchase`, two edges from two
  different sentences, addressed to both.
- *"Who chose the person who administered Grant's oath?"* — chains
  `Chase —administered→ Grant` with `Lincoln —nominated→ Chase`.

Both are real two-hop graph composition: a question the material never
answers in one place, answered correctly by walking two real, addressed
edges. This remains the headline finding — **novel, in the literal sense
of "never stated," and correct, with zero generation involved.**

**Tier 4 — verification.js's nine-cell taxonomy:** on the bound claim,
4 of 9 cells compute a real verdict (Void/Entity/Field/Link all `holds`);
the other 5 (Kind, Network, Atmosphere, Lens, Paradigm) report
`not_yet_executable` with a named reason each — exactly the state
CLAUDE.md already discloses for this module, reproduced live rather than
assumed.

---

## Second pass — two defects the first pass printed without seeing, and one limit it got wrong

### 1. Existence/Entity was reporting a check it never ran

The first pass's own Tier 4 output, on the claim it labelled *"no such
referent in this material at all"*, read:

```
Lincoln appointed Napoleon (no referent):
  Entity: holds — subject and object both resolve to referents this material establishes
  Link:   fails — no edge binds this exact subject, verb, and object
```

Napoleon is nowhere in that material. The Entity cell was inferring "both
endpoints resolved" from a single fact: that hypergraph.js's verdict was
not `beyond-reach`. But `beyond-reach` gates on the **subject** (plus the
narrow case of an object carrying neither referent nor content word). An
object that resolves to no referent but does carry a content word falls
through to `endpointsMatch`'s own `tokensShare` branch — a deliberate and
correct design, since objects are very often descriptions rather than
names — and never touches that gate. The absence of `beyond-reach`
therefore licenses a statement about the subject and nothing at all about
the object.

This is the mirror of the constitutional line CLAUDE.md already draws in
the other direction (a checking organ may withhold, or convict, but may
never manufacture the second out of the first): a cell may report what it
checked, or say it did not check — it may never report a check it never
ran as though it had.

**Fixed additively.** `judge()` now carries `claim.endpoints =
{subject, object}`, each `"referent"` / `"form"` / `"tokens"` / `"none"`,
read off the same `endpoint()` results it already computes. Entity's
verdict is deliberately unchanged (still `holds` wherever it held before,
so nothing downstream moves) — the reason sentence and a machine-readable
`endpoints` field on the cell now say what was actually established:

```
Entity: holds — subject “Lincoln” resolves to a referent this material
        establishes; object “Napoleon” does not resolve to any referent —
        it was compared by content word alone
```

Why not flip the verdict: measured on the same material, a legitimate
DESCRIPTION lands in the same bucket the stranger does. `"Pierre Bezukhov
married the countess"` reads object-`tokens` exactly as `"…married
Napoleon"` does. A verdict flip keyed on this signal would fire on both,
and would gate Link/Network/Lens through the presupposition wall for
ordinary prose. Pinned as a CONTROL case in `hypergraph.test.mjs`.

### 2. A shared definite article was binding claims the material never made

Found while extending the driver, not reasoned about in advance. Against
four sentences of prose stating only `Seward negotiated the Alaska
purchase`:

```
"Seward negotiated the Suez canal"  -> bound
"Seward negotiated Suez canal"      -> unbound
"Seward negotiated the treaty"      -> bound
"Seward negotiated a canal"         -> unbound
```

The definite article was the entire binding. `endpointsMatch` falls
through to `tokensShare`, one shared token is enough, and the shared token
was `"the"`.

The corpus-scale function-word filter is `cite.js::commonTerms`, which
declares its own floor: below `CORPUS_MINIMUM` (10) chunks it returns
nothing and simply does not run. That floor is declared, not a bug — but
its disclosed residue is *"auxiliary noise in the vocabulary,"* i.e.
something that can only WIDEN what the reader hears. On the object side it
does something that disclosure never covered: it fabricates a binding.

**Fixed opt-in.** `makeRelationReader` accepts an optional
`organs.determiners` — a RECEIVED closed class with its own named giver
(the engine's `perceiver/text/priors.js`: `DEFINITE_DETERMINERS` +
`INDEFINITE_DETERMINERS`, giver `lang/en`), never a word list typed in
this repo. Omitted, every existing caller is byte-identical. Injected, the
fabricated bind closes and the real one survives:

```
"Seward negotiated the Suez canal"       no organ -> bound   | injected -> unbound
"Seward negotiated the Alaska purchase"  no organ -> bound   | injected -> bound
```

### 3. The first pass's negation limit was wrong

The first pass concluded that negation-as-contradiction *"lives only in
`capacity-runner.js`, not in bare `read()`"*. That was drawn from one
specimen and it does not hold. `judge()` returns `contradicted` through
bare `read()` perfectly well — the specimen just happened to use the one
English negation shape the extractor cannot see. Measured, all five
through the same `report.read`:

| claim | read as | verdict |
|---|---|---|
| `Seward never negotiated the Alaska purchase` | `Seward never —negotiated[negated]→ the Alaska purchase` | **contradicted** |
| `Seward hardly negotiated the Alaska purchase` | `Seward hardly —negotiated[negated]→ the Alaska purchase` | **contradicted** |
| `Seward did not negotiate the Alaska purchase` | `Seward —did→ not negotiate the Alaska purchase` | unbound |
| `Seward didn't negotiate the Alaska purchase` | *(nothing extracted)* | no claim |
| `Seward negotiated not the Alaska purchase` | `Seward —negotiated→ not the Alaska purchase` | **bound** |

The real limit is narrower and sharper than the first pass stated: the
engine's gate is `relations.js::negationBeforeVerbFor` — the negation word
must sit **before** the verb it negates. `"not"` and `"didn't"` are both
in the engine's own `NEGATION_WORDS`; the shape is what fails, not the
vocabulary. Periphrastic `"did not <verb>"` puts the auxiliary in the
connector slot and swallows the real predicate into the object, so the
claim that gets checked is not the claim that was written. The last row is
the one worth naming as a hazard rather than a miss: a post-verbal
negation stays polarity-positive and lands `bound` — a negated claim
reported as supported. (It is an archaic construction, and it is not
closed by the determiner organ either — `"alaska"`/`"purchase"` still
match on their own.)

### 4. The whole ladder, run end to end

`capacity-runner.js`'s `evaluate` door is the top of this repo's own
mechanical checking ladder: `judge()`'s raw verdict, squared against its
own negation (`squarePolarity`), then checked for object specificity
(`checkObjectSpecificity`) before anything lands. Driven through the real
`grid`/`landAct`, still zero model calls:

```
"Seward negotiated the Alaska purchase"
   raw judge(): holds | squared: true | object specific: true
   landed verdict: holds
"Seward never negotiated the Alaska purchase"
   raw judge(): refused | squared: true
   landed verdict: refused
"Seward negotiated the Suez canal"
   raw judge(): holds | squared: true | object specific: false
   landed verdict: undetermined — withheld, never guessed
```

The third row is the ladder earning its cost live: the article-shared
false `bound` from §2 survives squaring (polarity is genuinely fine) and
is caught one rung up by object specificity, landing as a withheld verdict
rather than a lie. Two independent fixes for one defect, at two different
altitudes — the determiner organ stops it being produced, the specificity
check stops it being believed.

---

## Limits that remain, measured rather than assumed

- **Sentence shape still matters a lot.** An early draft of the corpus used
  fronted adverbials ("Seward *later* negotiated...") and the extractor
  anchored the connector on "later" instead of "negotiated" — the same
  fronted-adverbial gap CLAUDE.md already names for MINE-1. Plain SVO
  extracts cleanly; anything more literary needs the wider clause coverage
  this repo's own notes already flag as unbuilt.
- **A name needs a non-sentence-initial occurrence to be trusted as a
  referent at all** (L2's own rule: capitalization alone never suffices).
  An early corpus draft had "Lincoln" appear only sentence-initially and
  the whole extraction fell over. One corroborating mid-sentence mention
  per name fixed it. This matches CLAUDE.md's own SEED-SPEAKER finding,
  reproduced on fresh material rather than taken on faith.
- **The material's own edge set still carries junk** — `at —a→ smaller
  ceremony`, `about Lincoln —that→ year` — connectors that are not verbs
  at all. That is precisely what `grammar-lens.js`'s
  `mismatchedConnectors` exists to disclose; this driver does not yet run
  it, which is the obvious next tier.
- **Post-verbal negation is unhandled and lands `bound`** (§3, last row) —
  named, not fixed.
- **The determiner organ is opt-in and nothing in the live app injects
  it.** Whether `app.js` should is the same open question CLAUDE.md
  already records for `verbForms` and `createLemmatizer`, and it is not
  resolved here.

## Bottom line

For prose written in plain SVO shape with real referent recurrence, this
repo's mechanical stack alone (no model call) can: verify a claim against
material, disambiguate a near-miss, refuse an absent referent while still
naming the nearest real fact, catch a negated claim as a *contradiction*,
answer a query the material never states as one sentence directly off the
graph, compose a genuinely novel two-hop answer from two independently
stated facts, and — at the top of the ladder — withhold a verdict on a
claim that bound for the wrong reason instead of asserting it.

What it cannot do is read English shapes the clause extractor was never
built for, and the honest form of that limit is the table in §3 rather
than the sentence the first pass wrote.

## Test coverage added by the second pass

`hypergraph.test.mjs` +7 (endpoint disclosure on a bound claim, on a
token-only object, the description CONTROL, a form-resolved subject; the
determiner defect pinned as it actually behaves, the received class
closing it, and an opt-in byte-identity check).
`verification.test.mjs` +4 (Entity never asserts an unresolved object,
keeps its plain sentence when both really resolved, discloses a
form-resolved subject, and says so when a claim carries no disclosure at
all). All pass; the pre-existing failures in this environment are
unchanged — see the environment note below.

## Environment note, disclosed rather than glossed over

This sandbox had no checkout at the `../eoreader6.1` compatibility mount
the repo's own `./fold` script creates (it clones EOReader 7 *into* that
mount name — see the script's own header). It was reconstructed the way
`./fold` does: `git submodule update --init` inside the sibling
`eoreader7` checkout, then a symlink at `../eoreader6.1`. `npm install`
was never run here, so vendored-package tests cannot pass either.

Measured against that, via `git stash` on exactly this pass's source
files, over every test file that imports `hypergraph.js` or
`verification.js` (`adversarial-dialogue`, `capacity-runner`, `crown`,
`experiencer`, `grammar-lens`, `hl`, `hl-acquire`, `holon`, `hypergraph`,
`verification`):

| | tests | pass | fail |
|---|---|---|---|
| before this pass | 238 | 224 | 14 |
| after | 249 | 235 | 14 |

The same 14, named rather than counted: 8 in `crown.test.mjs`, 2 whole
files (`hl.test.mjs`, `hl-acquire.test.mjs` — the engine cut pinned at
this mount predates `interpretation/hl.js`), and 4 in
`hypergraph.test.mjs` (two POS-prior/treebank-dependent connector cases,
two referent-bar/pronoun cases). Every one of them fails identically with
this pass's changes stashed. `verification.test.mjs` is fully green before
and after. +11 tests, all passing, zero regressions.
