// The falsification battery for cli/reason.mjs (2026-09-22). Each item: the
// PROSE a reasoner would write (every premise the engine gets is in it), the
// TRUTH, the finding KIND the engine must raise (or "none" — a control it
// must not convict), and the SPEC the engine reads. Items slip1–slip5 are slips
// this session's Claude actually made; their record is in the transcript.
const PREREQ = { items: ["addr", "gates", "void_level", "ground_level", "floor_level", "reopen", "ladder_honest", "discourse_sep"],
  before: [["addr", "void_level"], ["addr", "floor_level"], ["addr", "reopen"], ["gates", "reopen"], ["void_level", "ground_level"], ["ground_level", "floor_level"]] };
const PREREQ_PROSE = "Prerequisites: addr before void_level; addr before floor_level; addr before reopen; gates before reopen; void_level before ground_level; ground_level before floor_level. Nothing else is constrained; ladder_honest and discourse_sep have no prerequisites.";
const C = (ground, rel, a0, a1, extra = {}) => ({ ground, rel, roles: { ARG0: a0, ARG1: a1 }, ...extra });

export const ITEMS = [
  // ── slips made in this session ──────────────────────────────────────────
  { id: "slip1", source: "slip (this session)", truth: "error", expect: "claim_fails_oracle",
    prose: "Heimdall dropped gemma2:2b at 16:12:41. My retry at 16:13:55 was refused too, so the model was still refused ten minutes (600 s) later.",
    spec: { equations: [{ ref: "slip1", statement: "16:13:55 - 16:12:41 >= 600" }] } },
  { id: "slip2", source: "slip (this session)", truth: "error", expect: "order_not_entailed",
    prose: `${PREREQ_PROSE} Therefore reopen must come after ground_level: upward flow needs per-level ground to exist first.`,
    spec: { order: { ...PREREQ, claims: [{ ref: "slip2", first: "ground_level", then: "reopen" }] } } },
  { id: "slip3", source: "slip (this session)", truth: "error", expect: "order_not_entailed",
    prose: `${PREREQ_PROSE} So the dependency order requires ladder_honest before gates.`,
    spec: { order: { ...PREREQ, claims: [{ ref: "slip3", first: "ladder_honest", then: "gates" }] } } },
  { id: "slip4", source: "slip (this session)", truth: "error", expect: "unlicensed_inference",
    prose: "Observed: the greeting was classified as research; research triggered a web search; the web search admitted a wrong page; the model answered from that page. Therefore the greeting classifier killed the conversation.",
    spec: { inferences: [{ kind: "same-reasoning", ref: "slip4", end1: "greeting_miss", label: "caused", end2: "conversation_dead", relation: "causes", yields: "causes" }] } },
  { id: "slip5", source: "slip (this session)", truth: "error", expect: "universal_refuted",
    prose: "I tested 14 social phrasings against the greeting check; 'hi' and 'hey!' matched it and the other 12 fell through. So every social turn falls through to research.",
    spec: { universals: [{ ref: "slip5", end1: "every social turn", label: "falls through to", end2: "research", tested: 14, counterexamples: ["hi", "hey!"] }] } },

  // ── code ────────────────────────────────────────────────────────────────
  { id: "code1", source: "code", truth: "error", expect: "refuted_in_scope",
    prose: "In parse(), `result` is always a string for the whole function — it is declared `let result = ''` at the top. (Inside parse's catch block: `result = null`.)",
    spec: { declare: { functional: ["has-type"] }, claims: [C("/parse", "has-type", "result", "string", { force: "strict" }), C("/parse/catch", "has-type", "result", "null")] } },
  { id: "code2", source: "code", truth: "error", expect: "circular",
    prose: "The module graph is acyclic: app imports router, router imports views, views imports store, and store imports router for the route names.",
    spec: { declare: { acyclic: ["imports"] }, claims: [C("/", "imports", "app", "router"), C("/", "imports", "router", "views"), C("/", "imports", "views", "store"), C("/", "imports", "store", "router")] } },
  { id: "code3", source: "code", truth: "sound", expect: "none",
    prose: "In handler(), `id` is a string. Inside handler's loop body a new `const id` is a number — a different, inner binding that shadows the outer one.",
    spec: { declare: { functional: ["has-type"] }, claims: [C("/handler", "has-type", "id", "string"), C("/handler/loop", "has-type", "id", "number")] } },
  { id: "code4", source: "code", truth: "error", expect: "standing_contradiction",
    prose: "In load(), config.port has type number (from the schema). Also in load(), config.port has type string (read raw from the environment, never parsed).",
    spec: { declare: { functional: ["has-type"] }, claims: [C("/load", "has-type", "config.port", "number"), C("/load", "has-type", "config.port", "string")] } },
  { id: "code5", source: "code", truth: "sound", expect: "none",
    prose: "In moduleA, its local helper x depends on its local helper y. In moduleB, a different local helper y depends on a different local helper x. Dependencies are acyclic within each module.",
    spec: { declare: { acyclic: ["depends-on"] }, claims: [C("/moduleA", "depends-on", "x", "y"), C("/moduleB", "depends-on", "y", "x")] } },

  // ── prose ───────────────────────────────────────────────────────────────
  { id: "prose1", source: "prose control", truth: "sound", expect: "none",
    prose: "Lincoln met Mary Owens in 1836. Lincoln met Mary Todd in 1839.",
    spec: { identity: "caseless", claims: [C("/", "met", "Lincoln", "Mary Owens"), C("/", "met", "Lincoln", "Mary Todd")] } },
  { id: "prose2", source: "prose control", truth: "sound", expect: "none",
    prose: "Section 2, about the 1927 flood, says the tone of the river towns was not hopeful. Section 4, about the 1938 dam, says the tone of the river towns was hopeful.",
    spec: { identity: "caseless", claims: [C("/section2", "tone-was", "river towns", "hopeful", { polarity: "-" }), C("/section4", "tone-was", "river towns", "hopeful")] } },
  { id: "prose3", source: "prose control", truth: "sound", expect: "none",
    prose: `${PREREQ_PROSE} So addr must come before reopen.`,
    spec: { order: { ...PREREQ, claims: [{ ref: "prose3", first: "addr", then: "reopen" }] } } },
  { id: "prose4", source: "prose control", truth: "sound", expect: "none",
    prose: "The drop was at 16:12:41 and the cooldown was 600 seconds, so it ended at 16:22:41.",
    spec: { equations: [{ ref: "prose4", statement: "16:22:41 - 16:12:41 == 600" }] } },
  { id: "prose5", source: "prose", truth: "error", expect: "standing_contradiction",
    prose: "Andrew Jackson was born in 1767 in the Waxhaws. [two paragraphs later] Jackson, born in 1779, moved to Nashville as a young lawyer. (A person is born in exactly one year.)",
    spec: { identity: "caseless", declare: { functional: [{ rel: "born-in-year", giver: "a person is born once" }] }, claims: [C("/", "born-in-year", "Andrew Jackson", "1767"), C("/", "born-in-year", "andrew jackson", "1779")] } },
  { id: "prose6", source: "prose", truth: "error", expect: "polarity_contradiction",
    prose: "The Cumberland flows through Nashville. [later, in the same section] Through Nashville the Cumberland does not flow.",
    spec: { identity: "caseless", claims: [C("/", "flows-through", "the Cumberland", "Nashville"), C("/", "flows-through", "The Cumberland", "Nashville", { polarity: "-" })] } },

  // ── falsifyGfp: is "strict" actually enforced, not just uncontradicted ──
  // Not a slip from this session's transcript (falsify1/falsify2 are
  // constructed, unlike the slipN items above) — a realistic mistake this
  // mechanism exists to catch: marking a claim "strict" without declaring
  // anything that would let a violation of it be caught.
  { id: "falsify1", source: "falsify-guard construction", truth: "sound", expect: "strict_guard_untested",
    prose: "parse() always returns a Result object. (Declared strict; nothing here declares \"returns\" one-valued or acyclic, so the checker has nothing to enforce it with.)",
    spec: { claims: [C("/parse", "returns", "parse", "Result", { force: "strict" })] } },
  { id: "falsify2", source: "falsify-guard construction", truth: "sound", expect: "strict_guard_reachable",
    prose: "In load(), config.port always has type number. (Declared strict, and \"has-type\" IS declared one-valued — a real counterexample at this ground would be caught.)",
    spec: { declare: { functional: ["has-type"] }, claims: [C("/load", "has-type", "config.port", "number", { force: "strict" })] } },
];

// ── probes built to BREAK the engine (its declared limits) ─────────────────
// The engine reads identity through a declared resolver and relation
// properties through declarations. Without them it must miss these — the
// falsification records it rather than hiding it.
export const PROBES = [
  { id: "probe1", source: "probe: alias", truth: "error", expect: "standing_contradiction",
    prose: "Andrew Jackson was born in 1767. Old Hickory was born in 1779. (Old Hickory is Andrew Jackson's nickname; a person is born in exactly one year.)",
    spec: { identity: "caseless", declare: { functional: ["born-in-year"] }, claims: [
      { ground: "/", rel: "born-in-year", roles: { ARG0: "Andrew Jackson", ARG1: "1767" } },
      { ground: "/", rel: "born-in-year", roles: { ARG0: "Old Hickory", ARG1: "1779" } }] } },
  { id: "probe2", source: "probe: symmetry", truth: "error", expect: "polarity_contradiction",
    prose: "Lincoln married Mary Todd. Mary Todd did not marry Lincoln.",
    spec: { identity: "caseless", claims: [
      { ground: "/", rel: "married", roles: { ARG0: "Lincoln", ARG1: "Mary Todd" } },
      { ground: "/", rel: "married", roles: { ARG0: "Mary Todd", ARG1: "Lincoln" }, polarity: "-" }] } },
];
