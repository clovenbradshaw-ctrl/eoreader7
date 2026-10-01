// ═══ LOVELACE · TEACH IT TO FISH ═══ WHO DESIGNS EACH VOID.
//
// The operator, 2026-10-01: "be sure we have a clear system of what is designing each of the voids, and that the system, whether conscious or
// unconscious, is smart enough." A VOID is a hole the model is asked to fill: the shape of the hole decides whether the one thing it says is the
// exact thing (CODING-LESSONS 32: the wall was the atom, not the mouth). The model is the least reliable part of the loop, so the part that
// shapes the hole must be accounted for — by name, by kind, by evidence — or the model is being steered by something nobody wrote down.
//
// Four kinds of designer, and only the first two are the system:
//   mechanical  UNCONSCIOUS — computed from the prompt or the record, no model call (organs/cards.js, code-build.js's planUnits, key-referents.js)
//   mouth       CONSCIOUS   — the model proposes the shape as an idea, and what it proposes is linted and recorded before it stands (code-form's design via talk-build)
//   person      STEERED     — a human wrote it so the build could run. Every one is a row on the steering ledger (TEACH-IT-TO-FISH.md §3): a capability still to learn
//   none        ASSUMED     — nothing designs it; a stand-in sentence does. The stand-in is quoted so the test can see it is still there
//
// `basis` is void-spec.js's vocabulary: asked (the person's own words) · measured (read off a record) · declared (a named organ, cited) · supplied
// (a person's hand) · assumed (nothing). `evidence` is a measurement with its date, or exactly "unmeasured" — never blank, never a feeling.
// void-designers.test.mjs reads this table: every named file and export exists, every person/none void is on the ledger, every stand-in is still
// in its file, and a designer that was removed or added without updating this table fails the suite.
export const KINDS = Object.freeze(["mechanical", "mouth", "person", "none"]);
export const BASES = Object.freeze(["asked", "measured", "declared", "supplied", "assumed"]);

export const VOIDS = Object.freeze([
  // ── the build door: /v1/build, organs/code-build.js — a plain-language prompt, nothing else handed in ──
  { id: "units", path: "build", asks: "which functions exist", designer: "planUnits (organs/code-build.js)", kind: "mechanical", basis: "asked", at: "organs/code-build.js#planUnits",
    limit: "reads only names written as calls `name(` or a `named: a, b` list; a task that describes a unit in prose has none and defers to a normal turn",
    evidence: "unmeasured on prompts it was not written against" },
  { id: "unit-words", path: "build", asks: "the part of the prompt that is about THIS unit", designer: "clauseOf", kind: "mechanical", basis: "asked", at: "organs/code-build.js#clauseOf",
    limit: "slices at the next unit's name; a clause that mentions a later unit is cut where that unit is named",
    evidence: "pinned by code-build.test.mjs (each unit is offered the operations ITS clause names)" },
  { id: "language", path: "build", asks: "which language the file is in", designer: "taskLanguage", kind: "mechanical", basis: "asked", at: "organs/code-build.js#taskLanguage",
    limit: "reads the task's own words; unstated is null and offers nothing language-specific", evidence: "pinned by code-build.test.mjs" },
  { id: "signature", path: "build", asks: "what each function takes and in what order", designer: "the sentence 'Assume each function takes a string argument'", kind: "none", basis: "assumed", at: "organs/code-build.js#unitPrompt",
    standIn: "Assume each function takes a string argument.", ledger: 16,
    limit: "the prompt usually STATES the signature (`tally(numbers)`) and the stand-in contradicts it; planUnits keeps only the name",
    evidence: "measured 2026-10-01: right for 2 of 12 task signatures (10 take an object, an array or a number)" },
  { id: "returns", path: "build", asks: "what each function returns", designer: "the task's own clause, shown whole", kind: "none", basis: "asked", at: "organs/code-build.js#unitPrompt",
    ledger: 16, standIn: "It is one unit of this file:", limit: "nothing reads the shape out of the clause; the model reads it", evidence: "unmeasured" },
  { id: "examples", path: "build", asks: "worked inputs and outputs", designer: "nobody — the build door shows none", kind: "none", basis: "assumed", at: "organs/code-build.js#unitPrompt",
    ledger: 5, standIn: "Output only the single function", limit: "a task that quotes an example keeps it only as part of the clause", evidence: "unmeasured; the simple-prompt run shows 7 of 12 first draws fail the three examples they were SHOWN, so an example is a free check once there is one" },
  { id: "check", path: "build", asks: "what decides the unit is right", designer: "the caller's testCommand, else syntax only — disclosed UNVERIFIED", kind: "person", basis: "supplied", at: "organs/code-build.js#buildCodeTask",
    ledger: 5, limit: "a bare prompt gets `syntax_only`, never a pass", evidence: "disclosed in every build's `verified` field" },
  { id: "helpers", path: "build", asks: "which verified operations are in scope", designer: "cardsFor (organs/cards.js)", kind: "mechanical", basis: "declared", at: "organs/cards.js#cardsFor",
    limit: "tags are a closed class with a giver; an offer the draft does not use costs a longer prompt",
    evidence: "measured 2026-10-01 over 12 tasks: precision 0.53, recall 1.00 (8 of 15 offered were used; none needed was withheld)" },
  { id: "keys", path: "build", asks: "which real name an idea means (`tz` for `timezone`)", designer: "resolveKey (organs/key-referents.js)", kind: "mechanical", basis: "measured", at: "organs/key-referents.js#resolveKey",
    limit: "resolves on spelling evidence; a read of a key the data does not carry, with exactly ONE real key sharing a word, is bound only after a draw missed its examples (testUnit ghostBind) — two candidates stay a failure, and the examples still decide",
    evidence: "measured 2026-10-01: frontier bare answers 11/12 -> 12/12 with 0 false binds; small model unchanged (2 of 12 draws read a ghost key); TEACH-IT-TO-FISH §4e" },
  { id: "mouth-order", path: "build", asks: "who fills the unit", designer: "the stigmergy's learned mouth order (kernel/stigmergy.js)", kind: "mechanical", basis: "measured", at: "kernel/stigmergy.js#",
    limit: "orders the mouths already tried; with one model installed it orders nothing", evidence: "unmeasured on this box (one coder installed)" },

  // ── the app path: the unit maker, the-fold/app-units.mjs — contracts a person wired (ledger rows 5, 6, 7) ──
  { id: "contract-units", path: "app", asks: "which leaves an app is made of", designer: "app-leaves.mjs / app-compose.mjs, hand-written", kind: "person", basis: "supplied", at: "the-fold/app-leaves.mjs#",
    ledger: 7, limit: "the decomposition into row leaves was found by hand after whole-response parsers failed on 1.5B/2B/4B", evidence: "TEACH-IT-TO-FISH §3 row 7 (S)" },
  { id: "contract-shape", path: "app", asks: "a leaf's parameters, the shape it returns, which output field is which input field", designer: "app-leaves.mjs / app-bindings.mjs, hand-written", kind: "person", basis: "supplied", at: "the-fold/app-bindings.mjs#",
    ledger: 6, limit: "the layer that binds a comp label to a data key to an output name exists (organs/key-referents.js) and is not yet the author of the contract", evidence: "TEACH-IT-TO-FISH §3 row 6 (B)" },
  { id: "contract-example", path: "app", asks: "the worked example the model is shown, and the oracle that decides it", designer: "app-weather-fuel.mjs, hand-written", kind: "person", basis: "supplied", at: "the-fold/app-weather-fuel.mjs#",
    ledger: 5, limit: "the example's OUTPUT is the oracle's answer: the model is handed the answer key's first line; a copy field could be read off the sample, a transform field cannot", evidence: "TEACH-IT-TO-FISH §3 row 5 (S)" },
  { id: "fields", path: "app", asks: "what each field of a unit's answer IS, when the answer is a flat object", designer: "the cheap species (copy, compose, decide, template, map, argmax, topk) in fielded-swarm.mjs, checked by the examples and then the runs they were not shown", kind: "mechanical", basis: "measured", at: "the-fold/fielded-swarm.mjs#cheapFill",
    limit: "needs the three worked examples (a bare prompt has none, row 5); cannot fill a conditional that answers with an input value, a substring, the best or mean of a list of numbers, a clamp, or a list-valued result",
    evidence: "measured 2026-10-01 with no model: set A (fitted) 23/23 slots, 7/7 units; set C (written after the last edit, never edited for) 14/20 slots, 4/6 units; redealt-target control 0 solved of 40+ (species.test.mjs); on the APP's own nine leaves (app-species.mjs): 16 of 39 object slots, 0 of 9 leaves whole" },
  { id: "wide-leaf", path: "app", asks: "when one leaf is too wide to draw at once", designer: "fieldsOf / fieldPlan (the-fold/app-units.mjs)", kind: "mechanical", basis: "measured", at: "the-fold/app-units.mjs#fieldsOf",
    limit: "reads the keys off the contract's worked example, so it inherits that example's author", evidence: "measured 2026-09-30: 1 of 9 leaves needed it" },

  // the app's other hole classes (2026-10-01, "are these every math shaped holes?" — no: the species fill values computed from a row; the rest of the app is not that)
  { id: "layout", path: "app", asks: "where each thing sits on the page, in what colours and sizes", designer: "layoutOf / themeOf (the-fold/app-render.mjs), computed from the comp's measured zones", kind: "mechanical", basis: "measured", at: "the-fold/app-render.mjs#layoutOf",
    limit: "reads the comp spec; a label that is stacked or a column header is still unread (ledger row 3)", evidence: "unmeasured" },
  { id: "bindings", path: "app", asks: "which comp label is which data field", designer: "app-bindings.mjs tables, hand-written", kind: "person", basis: "supplied", at: "the-fold/app-bindings.mjs#",
    ledger: 6, limit: "the referent layer binds KEYS, not comp fields", evidence: "TEACH-IT-TO-FISH §3 row 6 (B)" },
  { id: "sources", path: "app", asks: "where the weather, the places and the prices come from", designer: "an agent's choice, recorded in fixtures/weather-fuel/SOURCES.md", kind: "person", basis: "supplied", at: "the-fold/fixtures/weather-fuel/SOURCES.md#",
    ledger: 4, limit: "a person picked the five providers and recorded real responses; the system discovers none", evidence: "TEACH-IT-TO-FISH §3 row 4 (S)" },
  { id: "units-conditional", path: "app", asks: "which input field a slot reads when a PARAMETER's value picks it (metric or imperial)", designer: "the model — no species picks a field by an input value", kind: "mouth", basis: "asked", at: "the-fold/app-leaves.mjs#wttrNowContract",
    limit: "the named species gap `input-valued conditional`; the units rule is in the contract's notes as words", evidence: "measured 2026-10-01 (app-species.mjs): wttrNow temp, feels, windSpeed and wttrHour at, temp, condition, windSpeed are filled by no species" },
  { id: "scrape", path: "app", asks: "the value to read out of a page of text (a week's date, a row's price)", designer: "the model — the species read fields of an object, not text", kind: "mouth", basis: "asked", at: "the-fold/app-leaves.mjs#priceAfterContract",
    limit: "newestWeek and priceAfter return a string and a number, not an object of fields", evidence: "measured 2026-10-01 (app-species.mjs): 0 of the 2 scrape leaves are field-shaped, so no species applies" },

  // ── a whole program: organs/code-form.js — the design on the record, then a body per function ──
  { id: "design", path: "program", asks: "modules, functions, signatures and what each says", designer: "the person's stipulation (witness: request), or the mouth's when a talk build made it", kind: "mouth", basis: "asked", at: "organs/code-form.js#makeCodeForm",
    limit: "the mouth-made design is an idea with its witness named; a stipulated one is the person's own words", evidence: "unmeasured on a design the system made from a bare prompt" },
]);

/** the census as numbers: how many voids each kind designs, per path — the line a status report prints */
export function tally(voids = VOIDS) {
  const out = {};
  for (const v of voids) { out[v.path] ??= Object.fromEntries(KINDS.map((k) => [k, 0])); out[v.path][v.kind]++; }
  return out;
}
