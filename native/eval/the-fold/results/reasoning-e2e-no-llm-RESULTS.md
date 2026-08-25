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

**Fixed.** `makeRelationReader` accepts an optional `organs.determiners` —
a RECEIVED closed class with its own named giver (the engine's
`perceiver/text/priors.js`: `DEFINITE_DETERMINERS` +
`INDEFINITE_DETERMINERS`, giver `lang/en`), never a word list typed in
this repo. Omitted, every existing caller is byte-identical. **`app.js`
injects it** at its own `makeRelationReader` call site, so this is live in
the running app rather than an organ nothing enables:

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
claim that gets checked is not the claim that was written.

### 3b. The same shape, one step worse: an *inverted* verdict wearing a real address

The second pass named the post-verbal `bound` as a hazard and left it.
Chasing it turned up the real defect, which is worse and which the first
four rows above hide. The material's own third passage reads *"Lincoln did
**not** dismiss Seward"* — and the extractor mis-parses **the material**
identically, producing the edge `Lincoln —did[+]→ not dismiss Seward`.
Both sides then carry an unread polarity, so they match:

```
"Lincoln did dismiss Seward"  ->  bound  [cabinet.txt#520-620]
```

Not a missed contradiction — an **inverted** one, cited to the very
passage that refutes it.

**Fixed, symmetrically, and by withholding rather than flipping.**
`makeRelationReader` gained an optional `organs.negationWords` (again a
received closed class with its own giver — `NEGATION_WORDS`, `lang/en`).
When the **first token** of either the claim's object span *or* the
backing edge's object span is a negation word, that comparison's polarity
was never measured, and `judge()` returns `beyond-reach` with a typed
reason instead of a verdict. It does not flip the polarity: this tier does
not know what the reading should have been, only that nothing measured it.

The edge side uses `every`, not `some` — a cleanly-stated edge sitting
beside an unmeasurable one still binds on its own merits (pinned as its
own test). The first-token gate keeps it narrow: that is exactly the
position the mis-parse puts the word in, and a negation deeper inside an
object (`"the treaty but not the purchase"`) is a different, real, still
unaddressed construction.

Measured on the same material, both classes now injected:

| claim | before | after |
|---|---|---|
| `Seward never negotiated…` | contradicted | contradicted |
| `Seward hardly negotiated…` | contradicted | contradicted |
| `Seward negotiated the Alaska purchase` | bound | bound |
| `Seward did not negotiate…` | unbound | **beyond-reach** |
| `Seward negotiated not the…` | **bound** | **beyond-reach** |
| `Lincoln did dismiss Seward` | **bound** (cited!) | **beyond-reach** |

Every correct verdict survives; only the unread ones are withheld. And
because `relationFindings` already keeps `beyond-reach` off the record's
unsupported list, over-firing costs coverage but can never convict an
answer — which is what makes the conservative direction safe.

`"Seward didn't negotiate…"` still extracts nothing at all, so there is no
claim object to type. That one stays disclosed and unfixed.

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
- **`"didn't"` extracts no claim at all**, so there is nothing to type as a
  limit — it is silence, not a wrong answer, and it is not fixed.
- **A negation deeper inside an object span** (`"the treaty but not the
  purchase"`) is outside the first-token gate and still unaddressed.
- **The withholding costs coverage.** Every claim whose negation the
  extractor mis-slots now reads `beyond-reach` instead of a verdict —
  including `"Lincoln did not dismiss Seward"`, which is *true* and used to
  read `bound`. That `bound` was accidental (nothing measured its polarity;
  the opposite claim bound just as readily), so withholding is the honest
  reading, but it is a real loss of verified claims, not a free fix.
- **Both received classes are now injected in `app.js`** — which means
  this pass changed live behaviour, not just an opt-in path. Both changes
  are one-directional (a binding can become `unbound`/`beyond-reach`,
  never the reverse), and `beyond-reach` never joins the unsupported list,
  so neither can newly convict an answer. Still: the open question
  CLAUDE.md records for `verbForms` and `createLemmatizer` — whether the
  live app should load a received prior by default — is answered *yes*
  here for these two, on the grounds that each closes a measured FALSE
  BINDING rather than merely widening what the reader hears. That
  distinction is the whole argument, and it does not generalise to the
  other two organs on its own.

## Bottom line

For prose written in plain SVO shape with real referent recurrence, this
repo's mechanical stack alone (no model call) can: verify a claim against
material, disambiguate a near-miss, refuse an absent referent while still
naming the nearest real fact, catch a negated claim as a *contradiction*,
answer a query the material never states as one sentence directly off the
graph, compose a genuinely novel two-hop answer from two independently
stated facts, and — at the top of the ladder — withhold a verdict on a
claim that bound for the wrong reason instead of asserting it.

And one more, from the negation pass: it can **decline to judge a claim
whose polarity nothing ever read**, rather than binding it to the passage
that says the opposite.

What it cannot do is read English shapes the clause extractor was never
built for. The honest form of that limit is the table in §3 rather than
the sentence the first pass wrote — and §3b is the reason it matters: an
unread shape is not a gap in coverage, it is an opening for a confident
wrong answer, until something refuses to judge what nothing measured.

## Test coverage added by the second pass

`hypergraph.test.mjs` +13: the endpoint-disclosure four (bound claim,
token-only object, the description CONTROL, a form-resolved subject); the
determiner three (the defect pinned as it actually behaves, the received
class closing it, an opt-in byte-identity check); and the negation six
(the inverted-and-cited `bound` pinned as the defect, the class closing
it, the claim side, a CONTROL proving a correctly-read negation still
contradicts, `every`-not-`some` on a clean edge beside an unmeasurable
one, and a second opt-in byte-identity check).
`verification.test.mjs` +4 (Entity never asserts an unresolved object,
keeps its plain sentence when both really resolved, discloses a
form-resolved subject, and says so when a claim carries no disclosure at
all).

## Environment note, disclosed rather than glossed over

This sandbox had no checkout at the `../eoreader6.1` compatibility mount
the repo's own `./fold` script creates (it clones EOReader 7 *into* that
mount name — see the script's own header). It was reconstructed the way
`./fold` does: `git submodule update --init` inside the sibling
`eoreader7` checkout, then a symlink at `../eoreader6.1`. `npm install`
was never run here, so vendored-package tests cannot pass either.

Measured against that, via `git stash` on exactly this pass's source
files. The endpoint/determiner half was measured over every test file
importing `hypergraph.js` or `verification.js` (238/224/14 before,
249/235/14 after). The negation half, which also touches `app.js`, was
measured over the **whole suite**:

| | tests | pass | fail |
|---|---|---|---|
| before the negation pass | 993 | 972 | 21 |
| after | 999 | 978 | 21 |

The 21 are pre-existing and identical with the changes stashed: 8 in
`crown.test.mjs`, 2 whole files (`hl.test.mjs`, `hl-acquire.test.mjs` —
the engine cut pinned at this mount predates `interpretation/hl.js`), 4
in `hypergraph.test.mjs` (POS-prior/treebank and referent-bar cases), and
the rest in files needing vendored packages `npm install` never fetched
here. `verification.test.mjs` is fully green throughout. Zero regressions.
