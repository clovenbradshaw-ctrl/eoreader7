# Kinship reasoning — a two-hop, cross-relation-type derivation, live (2026-08-28)

Driver: `eval/kinship-reasoning.mjs` (re-runnable; writes
`eval/results/kinship-reasoning.json`, committed). Engine mechanism: the
same `eoreader7/native/kernel/reaction.js` circuit `eval/mechanical-
reasoning.mjs` already exercises (POLICIES.md P60). Material: four real
Wikidata entities, **fetched live** over the network the moment this
driver runs (never a fixture) — Queen Victoria (Q9439), her daughter
Victoria, Princess Royal ("Vicky", Q116728), Vicky's son Wilhelm II
(Q2677), and Victoria's son Edward VII (Q20875). Verified by hand before
any code was written: Vicky's own page states her mother is Q9439,
Wilhelm's own page states his mother is Q116728, Edward VII's own page
states his mother is Q9439 too — a real, mutually self-consistent
three-generation family fragment, not invented.

## Why this is a different shape from the succession driver

`eval/mechanical-reasoning.mjs`'s chemistry is `closureAffordances` — the
transitive closure of **one relation with itself** (`replaces(c,b) ∘
replaces(b,a) ⇒ after(c,a)`). A careful reader can derive that from two
*adjacent* succession-box entries by eye. This driver declares two
affordance rows by hand, each combining **two different relations**, and
the second row consumes the first row's own derived output:

```
childOf ∘ hasChild   ⇒ siblingOf          (bridge: the shared parent)
childOf ∘ siblingOf  ⇒ hasAuntOrUncle     (bridge: the shared parent-generation person)
```

No single fetched Wikidata page states either derived fact. Siblinghood
is never asserted on the page that also names the shared parent's other
children — it requires reading **two separate people's own pages** and
noticing they name the same mother. And Wikidata has **no aunt/uncle
property at all** — there is nothing to even misread as "in the text".

## The circle, end to end

Three real assertions offered from three separate pages, plus nine of
Victoria's own real `P40` (child) claims read off her one page — 11 raw
facts total, every one addressed into the received file's own bytes and
self-verified before use (P5.2; 0 unaddressed). All 11 admitted through
the-fold's own P57 door with zero refusals.

Projected into the engine's edge shape (`predigest.js::assertionEdges`)
and reacted against the declared two-row chemistry, `cue: null` (the
disclosed full-closure control — this driver is testing the *chemistry*,
not the *physics* gate; `eval/mechanical-reasoning.mjs`'s own arm 3
already exercises the physics/cue gate on this same circuit):

- **Step 1: 8 `siblingOf` facts derived** — Vicky's real siblings, i.e.
  every one of Victoria's other 8 children. (Vicky herself is correctly
  excluded — `relation-composition.js`'s own self-loop guard refuses a
  chain whose bridge would make an endpoint its own sibling; this was not
  special-cased by this driver, the kernel already holds it.)
- **Step 2: 8 `hasAuntOrUncle` facts derived**, each at **depth 2**,
  consuming step 1's own freshly-derived `siblingOf` edges as its right-
  hand input — the "products re-enter and chain" physics
  (`reaction.js`'s own header) doing genuine work, not a restated example.
- **Step 3: quiescent.** Zero refused, zero self-contradiction
  (`auditChemistry` pre- and post-settle: 0/0).

**Control arm (no chemistry given): 0 derived, 2 withheld pair types,
quiescent.** Nothing reasons without a declared, giver-named chemistry —
the same wall `eval/mechanical-reasoning.mjs`'s own control arm already
holds, reproduced here on a different relation family.

## The headline, and its full provenance

> **Wilhelm II's aunt/uncle is Edward VII** — derived (depth 2), stated
> by no single fetched page, provenance:
> `wikidata/Q2677.json#21551-21565` (Wilhelm's own P25) +
> `wikidata/Q116728.json#17641-17653` (Vicky's own P25) +
> `wikidata/Q9439.json#37956-37969` (Victoria's own P40 entry for
> Edward VII)

Three separate real files, three separate real byte addresses, none of
which individually says anything about an uncle.

## The independent oracle, checked but never fed in

Wikidata separately carries `P3373` (sibling) directly on both Vicky's
and Edward VII's own pages. That property is **never** given to the
reasoning substrate — it is fetched and read only *after* the derivation,
purely as a check on whether the mechanically-derived `siblingOf` set
agrees with what the giver independently, directly states.

**Result: exact agreement.** All 8 mechanically-derived siblings match
Wikidata's own directly-stated `P3373` set for Vicky, precisely — nothing
missed, nothing extra. (A first run of this comparison reported *zero*
agreement and looked like a serious bug; it was one — `assertionEdges`
lowercases every endpoint (`normalizeEnd`) so a derived fact's own
`from`/`to` are lowercase qids, and the oracle comparison was matching
them against Wikidata's raw, un-lowercased qids. Fixed by normalizing
both sides the same way before comparing; recorded here rather than
silently smoothed over, per P5.5.)

## The "never stated" claim, checked mechanically rather than assumed

Every one of the four raw fetched Wikidata JSON dumps was scanned for the
literal words "aunt" or "uncle". **Neither appears anywhere.** The
derived fact is not merely absent from any one page's *sentence* — the
concept itself is absent from the schema of everything this driver read.

## The model comparison — right verdict, wrong reasoning

A real local model (`onnx-community/Qwen2.5-0.5B-Instruct`, CPU, the same
fallback `eval/void-loop-e2e.mjs` already established; no Ollama server
was reachable in this run, so the in-process path ran) was given **only**
the three raw facts the derivation itself starts from — never the words
"sibling", "aunt", or "uncle" — and asked directly:

> Was Edward VII an uncle of Wilhelm II?

**The model answered "yes" — the correct verdict.** But its own stated
reasoning does not demonstrate the two-hop chain it was actually asked to
perform:

> "Edward VII was the third child of Queen Victoria and Prince Albert,
> making him a direct descendant of the same family as his parents.
> Therefore, he is considered to be a cousin of both Victoria and her
> husband, King George V."

This is incoherent on its own terms — it calls Edward VII "a cousin of...
Victoria," his own mother, and invents "King George V," who is named
nowhere in the prompt or the material. The premise given ("direct
descendant of the same family") does not entail the conclusion drawn
("cousin"), and neither entails the "yes, uncle" verdict actually given.
**Read plainly: the verdict is right and the reasoning is fabricated** —
a small model producing a correct-sounding answer by a shortcut (a royal-
family word-association, most likely) rather than by genuinely composing
the two given facts. This is exactly the shape this whole apparatus
exists to catch, and exactly the honest comparison worth making: a
verdict-only check ("did it say yes") would have scored this a clean
pass and missed the fabrication entirely. The raw prompt and the raw
answer are both committed verbatim in `kinship-reasoning.json` so a
reader can check this claim rather than trust it.

## Files

`eval/kinship-reasoning.mjs` (new, re-runnable driver — P19/P27's own
posture, not a committed regression test) + `eval/results/
kinship-reasoning.json` (committed, the full run this document
describes) + this document. No existing file touched — the reaction
circuit, the-fold's hyperlexicon door, and `predigest.js`'s projection
are all reused completely unmodified from `eval/mechanical-
reasoning.mjs`'s own already-measured, already-committed work; this
driver only supplies a new domain, a new (custom, hand-declared, cross-
relation-type) chemistry, and a new independent oracle.

## Disclosed limits

- **The chemistry's giver is this driver itself**, not a member of any
  received-priors register — the same honest disclosure
  `eval/mechanical-reasoning.mjs`'s own `CHEM_GIVER` already makes for
  its succession semantics. "A parent's sibling is your aunt/uncle" is
  ordinary English kinship terminology, uncontroversial, but it is not a
  fact any corpus in this repo proved — it is declared, and the
  declaration names its own risk.
- **Half-siblings are not distinguished.** `siblingOf`, as derived here,
  means "shares at least one parent via the one parent this driver
  followed" — Victoria and Albert's children are full siblings in real
  life, so this does not bite on this specific family, but the affordance
  as declared would derive a half-sibling relation identically to a full
  one, and does not know the difference. A finer gate (requiring
  agreement on *both* parents) is real, disclosed, unbuilt future work —
  the same class of honest gap this repo's own succession work found and
  named for tenure identity (P60's third amendment).
- **This driver fetched only the four entities the demonstration needed**
  (not all nine of Victoria's children's own pages), so seven of the
  eight derived siblings/aunts-uncles render with a qid rather than a
  name in the committed JSON — a real, stated absence (`"label not held
  here"`), never a silent gap.
