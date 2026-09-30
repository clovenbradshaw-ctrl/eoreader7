# The visual-mimicry playbook

Standing: operational guide, not theory. `THE-THEORY-OF-PATHOS.md` answers
*why* pathos is a Pattern-grain verdict on an experiencer's ground, never a
property of an artifact; this document answers *how an agent actually runs
the pipeline* — on the podcast app this was built against, and on any
arbitrary generated content that needs to look like something real.

Every file named below is real and already in this repo (`native/organs/`,
`native/eval/`). Nothing here is aspirational; where a step is a RECIPE
rather than a built function, it says so.

---

## 1. The five organs, and what each one alone can and cannot tell you

| organ | file | answers | cannot answer |
|---|---|---|---|
| Pathos | `organs/visual-pathos.js` | does this reading's ground hold, or has it gone stale/collapsed/contested (Pattern-grain, `reGroundCondition`) | what a fix should look like — pathos is the neti-neti, never the taste |
| WCAG | `organs/contrast.js` | does a TEXT element clear a real, received contrast floor | anything about taste, spacing, or non-text elements (see §5's bug) |
| Girard | `organs/girard.js` | what real, local, already-built systems actually do (measured conventions: accent hue family, border-radius median, elevation step) | whether a NEW reference disagrees with the existing ones — that is reference-fit's job |
| Reference-fit | `organs/reference-fit.js` | whether a property's fit toward a growing reference corpus has LANDED, is CONTESTED, or was CONCEDED — always revisable, typed by the 9 EO operators | what the "right" reference even is — a person or a search step supplies that |
| Element-referents | `organs/element-referents.js` | which element in THIS round is the SAME thing as an element in a PRIOR round (persisted/changed/appeared/vanished) | anything about whether that thing looks good |

None of these five is sufficient alone. The whole point of chaining them is
that each is scoped exactly to what it can honestly measure, and never
asked to cover for what it cannot.

## 2. The loop, restated as a runbook

This is `eval/podcast-pathos-repair-loop.mjs`'s own shape, generalized past
the podcast app. Follow it in this order for ANY generated artifact:

1. **Generate or load the artifact.** Any HTML/CSS your pipeline already
   produces — a model call through `adapters/build/code-anchor-log.js`'s
   `proposeAnchor`/`foldCode`, or a file already on disk. Nothing here
   requires the artifact to have been made by a model.
2. **Extract real elements via CDP.** `eval/podcast-cdp-lib.mjs::
   extractElements` is podcast-specific (its own `EXTRACT_EXPR` hardcodes a
   selector list and a `.episode` class). For arbitrary content, write the
   equivalent for YOUR markup: navigate, `document.querySelectorAll(...)`
   over whatever tags/classes matter, read `getBoundingClientRect()` and
   `getComputedStyle()`, and — this is the part that is easy to skip and
   was the actual cause of a real bug this session (§5) — **always include
   each element's own `textContent`, trimmed**, even when you don't think
   you need it yet. Every consumer downstream (element-referents' text
   keying, contrast's text-scoping) depends on this one field existing.
3. **Connect elements to referents.** `organs/element-referents.js::
   establishElementReferents(elements)` — works on ANY array shaped
   `{selector, text, rect, ...}`, not just podcast episodes. Call
   `bridgeElementReferents(prevRound, thisRound)` every time you re-extract,
   so your pipeline can say "the nav bar changed" or "a new card appeared"
   instead of reasoning about raw DOM scan-order indices, which shift on
   every edit.
4. **Read pathos.** `organs/visual-pathos.js::visualPathosOf({experiencer,
   elements, focalId, popOutThreshold, groups, groupingMargin, regime,
   tokenUsage})` — `experiencer` is REQUIRED and must be a real, specific
   reader ("a first-time visitor scanning for X, on a laptop, ordinary
   indoor lighting"), never a generic placeholder; pathos's whole theory
   (§THE-THEORY-OF-PATHOS.md) is that a verdict without a real experiencer
   is meaningless. Read `condition.kind`: `ground_holds` means nothing is
   asking to be fixed at the felt-shape level (contrast can still fail
   independently — it rides alongside, never folded in); `stale` means a
   real flatline (nothing pops out); `collapse`/`contested` name strain
   conditions this repo currently has no automatic repair for — these are
   ALWAYS surfaced as named, unrepaired findings, never silently dropped.
5. **Diagnose repairable tasks.** Each strategy is independent and
   independently testable:
   - `contrast` — mechanical, WCAG, zero model calls (`mechanicalContrastFix`
     in the repair loop).
   - `differentiate`/`retaste` — ONE isolated model call per attempt,
     contract-checked (a real, distinct rule; if it declares a color, it
     must clear Girard's `checkMimicry` against the app's own established
     accent) before it is ever accepted.
   - `roundness`/`elevation` — mechanical, Girard-measured (`dominantConvention`,
     `ELEVATION_STEP`/`elevationRelationship`), zero model calls.
   - `reference-fit` — the 9-operator cycle, §3 below.
   A task this loop has NO strategy for is pushed as `{kind:"unrepaired",
   detail: "..."}` — read every one of these before declaring victory; a
   loop that silently ignores what it cannot fix is worse than one that
   says so.
6. **Apply, verify LIVE, iterate.** Every mechanical fix is applied via
   `code-anchor-log.js`'s `proposeAnchor`/`appendAnchorLog`/`foldCode` (a
   SYN revision, contract-checked by `wellFormed`/`coherenceGate` BEFORE
   anything is written to disk). After writing, re-extract and re-read —
   never trust a fix without re-measuring it. **Screenshot it.** Every
   real bug this session (§5) was found by looking at a screenshot, not by
   reading the CSS. A fix that looks correct in the stylesheet and has
   never been screenshotted is a hypothesis, not a fix.
7. **Budget the loop.** `MAX_ROUNDS` is a declared constant with a stated
   giver/basis (P9 discipline — this repo refuses hand-picked numbers with
   no reason attached). Pick a number and write down why; never leave a
   loop open-ended.

## 3. Fitting toward a reference, generalized past "background color"

`organs/reference-fit.js` is written for ONE property (`background`) in
its own tests, but nothing in its API is background-specific — `property`
is a caller-supplied string. To use it for a NEW property (border-radius,
a spacing unit, a shadow blur, a font-size scale — anything reducible to a
comparable value):

1. `proposeReference(log, {name, giver})` — once per reference source
   (idempotent; safe to call every run).
2. `signMeasurement(log, {property, reference, hex})` — **the shipped
   module hard-codes hex-color math (median-of-RGB) in `synthesizeCandidate`.
   For a NON-color property** (a pixel value, a ratio), you have two honest
   options: (a) if the property is genuinely a color, reuse it as-is; (b)
   for anything else, `dominantConvention` in `organs/girard.js` already
   does exactly this for a numeric property (median across real references,
   `n`/`perReference` disclosed) — call THAT for the SYN step's math instead
   of `synthesizeCandidate`, and hand-roll a thin property-specific wrapper
   around `defineCandidate`/`evaluateCandidate`/`concedeCandidate` (which
   are property-agnostic — they only ever take a `candidateHex`/property
   name as an opaque payload). Do not copy reference-fit.js's own RGB math
   for a non-color property; reuse `dominantConvention`'s median instead.
3. `bindCorrespondence`, then `synthesizeCandidate` — SYN reports
   `contested: true` when the corpus disagrees beyond `SPREAD_THRESHOLD`
   (declared, giver stated). **Never skip straight to `evaluateCandidate`
   without checking `contested` first** — a contested SYN must be refused
   before any check function runs; checking a value nobody agrees on
   dresses up disagreement as agreement.
4. `defineCandidate` → `evaluateCandidate` with a REAL, property-appropriate
   check function (WCAG contrast for a color that sits behind text; a
   minimum tap-target size for a spacing value; whatever the property's
   own domain actually requires). A candidate that is DERIVED (corpus
   agrees) but fails its check is still refused — agreement among
   references never overrides a hard, real constraint.
5. Only a `landed` status is fit to apply mechanically. `refused` and
   `conceded` are named findings, surfaced exactly like an unrepaired
   pathos task — never silently retried every run (`needsReopen`/
   `latestRound` make reopening AUTOMATIC on new evidence, never on a
   timer or an unconditional retry).
6. **Persist the ledger.** `loadReferenceFitLog`/`persistReferenceFitLog`
   in the repair loop are the pattern: replay a JSONL file through
   `kernel/task-log.js`'s real `createTaskLog`/`append` on load, append
   only the NEW entries (`log.entries.slice(fromSeq)`) on save. One ledger
   file per property-family is fine; one ledger for the WHOLE app's design
   system is also fine — `property` already namespaces every task_id.

## 4. Gathering a real reference, without inventing anything

Two tiers, cheapest first:

**Tier 1 — already-local systems.** `girard.js`'s `mimeticFinding`/
`dominantConvention` read real CSS text from files already on disk (this
session used `the-fold/index.html`, `heimdall/src/style.css` — any sibling
repo's real, already-built stylesheet works the same way). This needs NO
network access at all and should always be tried first — it is instant,
free, and the evidence is already fully provenanced (a file path on disk).

**Tier 2 — a real image, found and measured.** When local systems don't
cover the property you need (this session: no local system had a raster
screenshot of a mobile podcast app), the recipe demonstrated live this
session:

1. **Search** a real, freely-licensed image source. Wikimedia Commons's
   search API worked well (`commons.wikimedia.org/w/api.php?action=query&
   list=search&srnamespace=6&srsearch=<query>&format=json`) — CC-licensed,
   real screenshots of real apps exist there for most common categories.
   Always send a real, descriptive `User-Agent` header (Commons rate-limits
   generic ones) and expect to back off and retry once on "too many
   requests."
2. **Fetch through the sandboxed egress proxy, never a raw cert-bypass
   hack.** `curl --proxy "$HTTPS_PROXY" --cacert /root/.ccr/ca-bundle.crt
   ...` (or the tool-level equivalent) is the sanctioned crossing; a
   Chrome instance launched with `--ignore-certificate-errors` for this
   purpose was tried earlier THIS SAME SESSION and explicitly walked back
   by direct user correction ("we need this all done with local hardware" /
   "use the sandboxed egress proxy"). Read `/root/.ccr/README.md` if a
   fetch fails on a certificate error.
3. **Verify what you downloaded before trusting it.** Read the image (this
   tool's own image-reading capability, or any real decoder) and confirm
   it is genuinely what you think it is before extracting anything from it
   — a redirect, a rate-limit error page, or a wrong search result all look
   like "a file downloaded successfully" from `curl`'s own exit code alone.
4. **Measure real pixels, never guess.** `eval/extract-image-palette.mjs`
   loads a real image into a real headless-Chrome canvas and returns a
   quantized color histogram — no invented colors, no image-parsing
   dependency beyond the browser already in this environment. **Sample a
   STRUCTURAL region, not the whole frame**, when the image mixes chrome
   with content (a status bar, a nav bar) — a whole-frame histogram
   conflates UI chrome with photographic/cover-art content and cannot tell
   them apart by share or saturation alone (measured directly, disclosed
   as a real, open limitation in `eval/extract-image-palette.mjs`'s own
   header — accent-colored ICONS still don't reliably surface this way;
   that gap is real and unsolved, not hidden).
5. **Feed the measured value into `reference-fit.js` as one more SIG'd
   reference**, with the image's own real source URL as its `giver` — never
   as a silent override of what Tier 1 already established. Let SYN/EVA
   decide whether it agrees or is contested; never hand-pick which
   reference "wins."

## 5. Four real bugs, caught only by looking, kept here so the next agent doesn't re-make them

1. **HSL lightness is not perceived brightness.** `#303030` and `#402020`
   have identical HSL lightness (18.8% each — coincidence of the math) but
   real WCAG relative luminance differs. `girard.js::elevationRelationship`
   requires an injected `relativeLuminance` (never HSL `l`) for exactly
   this reason. If you ever ask "does X look brighter than Y," use
   `contrast.js::relativeLuminance`, never `hexToHsl(...).l`.
2. **An achromatic color's hue is a convention, not a measurement.**
   `hexToHsl` returns `h=0` for any zero-saturation color — the same value
   a genuinely RED color also produces. Comparing hue between two colors
   without first checking both sides' saturation produces false "same hue"
   agreements. `elevationRelationship`'s `hueComparable` flag is the guard;
   copy the pattern (check saturation before trusting a hue comparison)
   anywhere else hue gets compared.
3. **`flex: 1` means something different in a row than in a column.** A
   rule written for a flex ROW child (grow horizontally) silently collapses
   to zero HEIGHT when the same element becomes a flex COLUMN child,
   because `flex:1`'s default `flex-basis: 0%` now applies to the
   cross-axis-turned-main-axis. Caught only by measuring
   `getBoundingClientRect()` on the live page and finding `{w:300, h:0}` —
   never assume a flex rule survives a `flex-direction` change; re-measure.
4. **A contrast check is scoped to TEXT, and an element with no text is out
   of scope entirely — checking it anyway is a category error, not a
   stricter check.** A decorative status dot with `background-color` but
   no rendered text was checked for "text contrast" against its own fill,
   and a mechanical repair loop spent 80+ cycles "fixing" it — making the
   total failure count go UP, not down. `organs/contrast.js::
   contrastFindings` now filters out any element whose caller supplies
   `text: ""`; an element with no `text` field at all (an older caller) is
   unaffected. **The general lesson: before applying ANY check organ to an
   element, confirm the element is actually the KIND of thing that check's
   own received standard is scoped to.** WCAG 1.4.3 names text explicitly;
   it was applied to a non-text element anyway, and nothing in the pipeline
   noticed until a screenshot showed the failure count climbing.

## 6. Scaling to "extremely complex websites," using only what is already here

Nothing above is podcast-specific once you separate it into its real
layers. A genuinely complex site — a multi-page dashboard, a blog with a
dozen component types, an e-commerce grid — is the SAME loop, run over a
LARGER anchor set and a LARGER reference corpus:

- **More anchors, same architecture.** `code-anchor-log.js` already
  supports arbitrarily many named anchors (`style`, `escapeHtml`,
  `renderEpisodes`, `subscribe` today) — a complex site is simply more of
  them (`nav`, `productCard`, `filterSidebar`, `checkoutForm`, ...), each
  independently proposed, revised, and conceded. Nothing about the
  algebra changes; it is the SAME `INS`/`SIG`/`SEG`/`CON`/`SYN`/`DEF`/`EVA`/
  `REC` vocabulary, more tasks on the same kind of ledger.
- **More components, same referent mechanism.** `establishElementReferents`
  already groups by selector and disambiguates by text-or-position within
  each group — this scales to hundreds of components (as already proven
  live: 711 real DOM elements, then 1065, correctly bridged) without any
  change to the organ itself. A complex site's "did the checkout button
  change between round 3 and round 7" is the exact same call as "did
  episode 12's title change."
- **More design properties, same reference-fit ledger.** §3's recipe (one
  `property` string per fittable value) is how a WHOLE design system —
  not just one background color — gets built up: a spacing scale, a type
  scale, a shadow/elevation ladder, a border-radius family, each as its
  own set of `reference:*`/`signal:*`/`candidate:*`/`define:*` tasks on
  the SAME or a sibling ledger. Nothing here caps how many properties one
  pipeline can track; the cost is real evidence-gathering per property,
  not a structural limit.
- **More references, same corroboration discipline.** As the reference
  corpus grows (more local systems on disk, more downloaded real
  screenshots), `SPREAD_THRESHOLD`/`contested` keeps doing its job: a
  design decision only ever lands once real, independent references
  genuinely agree, and a decision that WAS settled correctly reopens the
  moment a new, disagreeing reference arrives — this is what "always
  revisable" buys at scale: a complex site's design system does not
  ossify around one early, possibly-wrong measurement.
- **Local-hardware-first, always.** Tier 1 (§4) should cover the large
  majority of a complex site's needs — this repo alone has multiple real,
  independently-built local systems (the-fold, heimdall) to measure
  against before ever reaching for Tier 2's network crossing. Reach for a
  downloaded reference image only when local evidence genuinely runs out,
  and always through the sanctioned proxy with real, disclosed provenance
  — never invent a plausible-sounding hex value because gathering the real
  one felt like more work.
- **Verify live, at every scale.** The four bugs in §5 were each found on
  a SMALL app (one CSS property, one component type). A complex site with
  many more moving parts will have MORE of this class of bug, not fewer —
  the discipline (screenshot after every change, re-measure rather than
  re-read the CSS, check that a fix's own effect is even visible before
  calling it done) matters more as the surface grows, not less.

## 7. A minimal checklist for a brand-new arbitrary-content project

1. Generate or load your artifact via `code-anchor-log.js`.
2. Write your own `extractElements`-equivalent for your markup — CDP,
   `getBoundingClientRect`/`getComputedStyle`, and ALWAYS a `text` field.
3. Call `establishElementReferents`/`bridgeElementReferents` every round.
4. Call `visualPathosOf` with a real, specific experiencer.
5. Diagnose: contrast (mechanical) → differentiate/retaste (one checked
   model call) → any measured Girard convention (roundness/elevation/
   accent, mechanical) → reference-fit for each property you want fit
   toward a real corpus.
6. Gather references: Tier 1 (local systems) before Tier 2 (a real,
   searched, proxy-fetched, provenanced image).
7. Apply only DERIVED-and-holding (or CONTESTED-but-checked-false)
   candidates; disclose everything else as a named, unrepaired finding.
8. Screenshot. Look at it. Re-measure whatever you changed. Only then
   call the round done.
9. Persist every ledger (anchor log, pathos-repair log, reference-fit
   log) so the next run — by you, or by a different agent — picks up
   exactly where this one left off, with nothing re-derived from scratch.
