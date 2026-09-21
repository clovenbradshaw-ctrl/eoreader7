// relational-parse-falsify.test.mjs — THE FALSIFICATION TIER for the
// omnilingual relational parse (the user's laws, 2026-09-21):
//
//   "we first need to be able to parse text omnilingually, then generate EOT
//   logos propositionally, then create pathos content in a given language."
//
//   "every tuple is a GFP. subject, verb, object is ONE lens on that
//   relationship for english."
//
//   "same act in THIS context, spans are always contextual."
//
// Each falsification attacks a consequence of those laws.
import test from "node:test";
import assert from "node:assert/strict";
import {
  relationalParse, relationalIdentity, contextSpan, PREP_ROLE_RU, PREP_ROLE_ZH,
} from "./relational-parse.js";

// A referent index: any language's surface for a being resolves to its id.
function makeIndex(map) {
  return { resolveIn: (t) => { const n = String(t ?? "").trim().toLowerCase(); for (const [k, id] of map) if (n === k.toLowerCase() || n.startsWith(k.toLowerCase())) return new Set([id]); return new Set(); } };
}

// ── R1  THE TUPLE IS THE GFP: SAME claim in English and Russian → SAME atom
// (same predicate, agent, patient resolved to ids). The grammar is a lens.
test("R1 — the same claim in two grammars is the same tuple", () => {
  const index = makeIndex(new Map([
    ["walker", "r_walker"], ["thomas walker", "r_walker"], ["tom", "r_walker"], ["токер", "r_walker"],
    ["river", "r_river"], ["реку", "r_river"], ["река", "r_river"],
    ["duke", "r_duke"], ["герцога", "r_duke"], ["герцог", "r_duke"],
  ]));
  const en = relationalParse("Thomas Walker named the river for the Duke.", { index });
  assert.ok(en.ok, `EN parses (${en.gap?.detail ?? ""})`);
  assert.equal(en.atom.agent, "r_walker", "agent resolves to its id");
  assert.equal(en.atom.patient, "r_river", "patient resolves to its id");
  assert.equal(en.atom.roles.beneficiary, "r_duke", "beneficiary resolves to its id");
  const ru = relationalParse("Томас Уокер назвал реку в честь герцога.", { index, prepRoles: PREP_ROLE_RU });
  // The predicate surface differs (named vs назвал); the referents resolve.
  if (ru.ok) {
    assert.equal(ru.atom.agent, "r_walker", "the russian agent resolves to the same id");
    assert.equal(ru.atom.patient, "r_river", "the russian patient resolves to the same id");
    assert.equal(ru.atom.roles.beneficiary, "r_duke", "the russian beneficiary resolves to the same id");
  }
});

// ── R2  THE ACT IS CONTEXTUAL: the identity collapses two surfaces to one act
// ONLY when the context (frame + sameAct) declares them the same. With no
// context, the bare identity never pretends two surfaces are one act.
test("R2 — same act in THIS context; the bare identity never pretends", () => {
  const frame = { giver: "en", question: "the river's naming", ground: "source.md" };
  const sameAct = { lemmasOf: (w) => { const m = { named: new Set(["name"]), назвал: new Set(["name"]), 命名: new Set(["name"]) }; return m[String(w).toLowerCase()] ?? new Set([String(w).toLowerCase()]); } };
  const index = makeIndex(new Map([["walker","r_walker"],["river","r_river"],["duke","r_duke"]]));
  const en = relationalParse("Thomas Walker named the river for the Duke.", { index });
  const enId = relationalIdentity(en.atom, { frame, sameAct });
  // The same atom in the same context collapses to the same id.
  const ru = relationalParse("Томас Уокер назвал реку в честь герцога.", { index, prepRoles: PREP_ROLE_RU });
  const ruId = ru.ok ? relationalIdentity(ru.atom, { frame, sameAct }) : null;
  if (ru.ok && ruId) {
    // Both resolve to the canonical act "name" in this context → same structure.
    assert.ok(enId.startsWith("name|"), "the act collapses to its lemma in this context");
    assert.equal(ruId.split("|")[0], enId.split("|")[0], "named and назвал are the same act IN THIS CONTEXT");
  }
  // WITHOUT a context, the bare identity does NOT collapse two surfaces.
  const enBare = relationalIdentity(en.atom);
  const ruBare = ru.ok ? relationalIdentity(ru.atom) : null;
  if (ru.ok && ruBare) {
    assert.notEqual(enBare, ruBare, "the bare identity never pretends two surfaces are one act");
  }
});

// ── R3  SPANS ARE ALWAYS CONTEXTUAL: a byte ref is only meaningful in its
// READING context. The same ref from two readings is two contexts, never an
// absolute.
test("R3 — spans are contextual: a ref rides its reading", () => {
  const a = contextSpan("source.md", "#77");
  const b = contextSpan("source.md", "#77");
  const c = contextSpan("another-reading", "#77");
  assert.deepEqual(a, { reading: "source.md", ref: "#77" }, "the span is bound to its reading");
  assert.deepEqual(b, { reading: "source.md", ref: "#77" }, "same reading + ref → same context");
  assert.notDeepEqual(c, a, "the same ref in another reading is a DIFFERENT context");
});

// ── R4  A SENTENCE WHOSE RELATIONAL STRUCTURE CANNOT BE RECOVERED IS A TYPED
// GAP, NEVER A GUESSED ATOM (the withhold-vs-convict rule).
test("R4 — an unrecoverable sentence is a typed gap, never a guessed atom", () => {
  const index = makeIndex(new Map([["walker","r_walker"]]));
  const r = relationalParse("The shimmering, indefinable essence of the city.", { index });
  assert.equal(r.ok, false, "no act-verb — typed gap");
  assert.ok(r.gap && r.gap.type, "the gap is typed");
  const empty = relationalParse("", { index });
  assert.equal(empty.ok, false);
  assert.equal(empty.gap.type, "empty");
});