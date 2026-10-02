// ground-replay-falsify.test.mjs — the producer's contract, enforced at the source.
//
// The perceiver emits the ground reading (Encounter@1 / DeltaFold@1 / EO*); a consumer
// folds that log into lenses (the holodeck's FoldReadingIndex@2). The fold is a LEFT FOLD
// over the log, and a downstream lens is only worth caching if the log replays. So the
// producer's own gate is: a ground reading must be foldable without losing an operation.
//
// This REFUTES a log that a conforming fold cannot replay completely:
//   - any operation that is a silent no-op (neither a payload schema NOR a consequence
//     kind the fold counts) — the class that once dropped identity churn entirely;
//   - an encounter sequence that contradicts a supplied cursor;
//   - a per-source block that does not re-fold to its own per-source view;
//   - a checkpoint + tail that does not equal a full replay (the cached-fold invariant);
//   - unparsable lines.
// The reference fold below is an INDEPENDENT re-derivation of the exact contract — it does
// not import the consumer's fold, so a divergence between producer and consumer is caught.
import test from "node:test";
import assert from "node:assert/strict";

const IDENTITY_KINDS = new Set(["identity_split", "identity_reading_refused", "identity_hypothesis_supported"]);
const SCHEMAS = new Set(["EOReferent@1", "EOHyperedge@1", "EOCanonicalHyperedge@1", "EOIdentityAlternative@1"]);
const enc = (o) => JSON.stringify(o);

function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const SOURCES = ["t/a.txt", "t/b.txt", "t/c.txt"];
const NAMES = ["Alice", "Bob", "Carol", "Mayor", "Chief of Police", "Budget & Finance", "OHS", "Oversight", "Lieutenant", "Sergeant"];

// ── An independent re-derivation of the fold contract ────────────────────────
// Mirrors the consumer's fold (reading-index.js) without importing it: same key formats,
// same aggregation rules, same first/order semantics. The gate folds with THIS and demands
// it equal a direct tally of the log — a producer log that passes here is foldable anywhere.
function newState() {
  return { cur: null, seq: 0, bad: 0, src: {}, cast: new Map(), bonds: new Map(), canon: new Map(), ids: new Map(), kinds: {}, order: [] };
}
const inc = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); };
function foldGround(state, lines) {
  const { src, cast, bonds, canon, ids, kinds, order } = state;
  const S = (s) => src[s] || (src[s] = { chunks: 0, chars: 0, ops: {}, terrain: {}, kinds: {}, cast: {}, bonds: {}, idChurn: {} });
  for (const l of lines) {
    if (!l) continue;
    let j; try { j = JSON.parse(l); } catch { state.bad++; continue; }
    if (j.schema === "Encounter@1") { state.cur = j.source; state.seq++; const X = S(state.cur); X.chunks++; X.chars += j.extent || 0; if (!order.includes(state.cur)) order.push(state.cur); continue; }
    if (j.schema !== "DeltaFold@1" || !state.cur) continue;
    const X = S(state.cur);
    for (const o of j.operations || []) {
      const c = o.consequence || {};
      const k = o.operator + "/" + (c.kind || "?"); inc(kinds, k); inc(X.kinds, k); inc(X.ops, o.operator); inc(X.terrain, o.terrain);
      const v = o.payload && o.payload.value;
      if (v && v.schema === "EOReferent@1") { const id = v.id; let R = cast.get(id); if (!R) { R = { id, surfaces: [], standing: v.standing, mentions: 0, src: {}, first: state.cur, firstSeq: state.seq }; cast.set(id, R); } for (const s of v.surfaces || []) if (!R.surfaces.includes(s)) R.surfaces.push(s); R.mentions = Math.max(R.mentions, v.mentions || 0); R.standing = v.standing || R.standing; inc(R.src, state.cur); inc(X.cast, (v.surfaces || [id])[0]); }
      else if (v && v.schema === "EOHyperedge@1") { const P = (v.participants || []).map((p) => p.surface || p.surfaceKey || "?"); if (P.length < 2) continue; const key = P.slice(0, 2).sort().join(" — "); let B = bonds.get(key); if (!B) { B = { a: P[0], b: P[1], n: 0, rel: {}, pos: 0, neg: 0, src: {}, first: state.cur, firstSeq: state.seq }; bonds.set(key, B); } B.n++; inc(B.rel, v.relation || "?"); if ((v.meta && v.meta.polarity) === "-") B.neg++; else B.pos++; inc(B.src, state.cur); inc(X.bonds, key); }
      else if (v && v.schema === "EOCanonicalHyperedge@1") { const P = (v.participants || []).map((p) => p.value); if (P.length < 2) continue; const key = P.slice(0, 2).sort().join(" — "); let B = canon.get(key); if (!B) { B = { a: P[0], b: P[1], n: 0, alts: {}, src: {} }; canon.set(key, B); } B.n++; for (const p of v.participants || []) for (const a of p.alternatives || []) if (a !== p.value) inc(B.alts, a); inc(B.src, state.cur); }
      else if (v && v.schema === "EOIdentityAlternative@1") { const key = v.left + " ↔ " + v.right; let I = ids.get(key); if (!I) { I = { left: v.left, right: v.right, n: 0, events: {}, src: {} }; ids.set(key, I); } I.n++; inc(I.events, c.kind || v.standing || "?"); inc(I.src, state.cur); inc(X.idChurn, key); }
      else if (IDENTITY_KINDS.has(c.kind)) { const key = c.identity || (o.inputs || []).join(" ↔ "); let I = ids.get(key); if (!I) { I = { left: (o.inputs || [])[0] || key, right: (o.inputs || [])[1] || "", n: 0, events: {}, src: {} }; ids.set(key, I); } I.n++; inc(I.events, c.kind); inc(I.src, state.cur); inc(X.idChurn, key); }
    }
  }
  return state;
}

// ── The gate: a ground reading is foldable only if it replays without loss ──
function falsifyGround(lines, cursor) {
  const problems = [];
  const state = newState();
  foldGround(state, lines);
  if (state.bad) problems.push(state.bad + " of " + lines.length + " lines failed to parse");
  if (cursor && cursor.sequence !== state.seq) problems.push("cursor.sequence " + cursor.sequence + " != " + state.seq + " encounters");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; if (!l) continue;
    let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.schema !== "DeltaFold@1") continue;
    for (const o of j.operations || []) {
      const v = o.payload && o.payload.value;
      if (v && SCHEMAS.has(v.schema)) continue;
      if ((o.consequence || {}).kind && IDENTITY_KINDS.has((o.consequence || {}).kind)) continue;
      problems.push("op " + (o.operator || "?") + " at line " + (i + 1) + " is a silent no-op: no payload schema and no foldable consequence kind");
    }
  }
  // every aggregate the fold reports must equal a DIRECT tally of the raw log (cross-check)
  const st = newState(); foldGround(st, lines);
  const direct = directTally(lines);
  const keys = ["kinds"];
  for (const k of keys) if (JSON.stringify(st[k]) !== JSON.stringify(direct[k])) problems.push("kinds diverge from a direct tally");
  if (JSON.stringify(st.order) !== JSON.stringify(direct.order)) problems.push("order diverges from the direct encounter order");
  const rowEq = (a, b, fields) => fields.every((f) => JSON.stringify(a[f]) === JSON.stringify(b[f]));
  const want = new Map(direct.cast.map((c) => [c.id, c]));
  for (const [id, R] of st.cast) { const W = want.get(id); if (!W || !rowEq(R, W, ["mentions", "src", "surfaces", "standing"])) problems.push("cast row " + id + " diverges from the direct tally"); }
  if (st.cast.size !== direct.cast.length) problems.push("cast size " + st.cast.size + " != direct " + direct.cast.length);
  const wantB = new Map(direct.bonds.map((b) => [b.a + " ↔ " + b.b, b]));
  for (const [key, B] of st.bonds) { const W = wantB.get(B.a + " ↔ " + B.b); if (!W || !rowEq(B, W, ["n", "pos", "neg", "rel", "src"])) problems.push("bond " + key + " diverges from the direct tally"); }
  if (st.bonds.size !== direct.bonds.length) problems.push("bond size " + st.bonds.size + " != direct " + direct.bonds.length);
  const wantS = direct.sources;
  for (const [name, X] of Object.entries(st.src)) { const W = wantS[name]; if (!W || !rowEq(X, W, ["chunks", "chars", "ops", "terrain", "kinds", "cast", "bonds", "idChurn"])) problems.push("source " + name + " diverges from the direct tally"); }
  return { ok: problems.length === 0, problems, state };
}

// A DIRECT tally of the raw log — the independent check the fold must equal.
function directTally(lines) {
  const src = {}; const S = (s) => src[s] || (src[s] = { chunks: 0, chars: 0, ops: {}, terrain: {}, kinds: {}, cast: {}, bonds: {}, idChurn: {} });
  const cast = new Map(); const bonds = new Map(); const kinds = {}; const order = [];
  let cur = null;
  for (const l of lines) {
    if (!l) continue; let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.schema === "Encounter@1") { cur = j.source; const X = S(cur); X.chunks++; X.chars += j.extent || 0; if (!order.includes(cur)) order.push(cur); continue; }
    if (j.schema !== "DeltaFold@1" || !cur) continue; const X = S(cur);
    for (const o of j.operations || []) {
      const c = o.consequence || {}; const k = o.operator + "/" + (c.kind || "?"); inc(kinds, k); inc(X.kinds, k); inc(X.ops, o.operator); inc(X.terrain, o.terrain);
      const v = o.payload && o.payload.value;
      if (v && v.schema === "EOReferent@1") { let R = cast.get(v.id); if (!R) { R = { id: v.id, surfaces: [], standing: v.standing, mentions: 0, src: {} }; cast.set(v.id, R); } for (const s of v.surfaces || []) if (!R.surfaces.includes(s)) R.surfaces.push(s); R.mentions = Math.max(R.mentions, v.mentions || 0); R.standing = v.standing || R.standing; inc(R.src, cur); inc(X.cast, (v.surfaces || [v.id])[0]); }
      else if (v && v.schema === "EOHyperedge@1") { const P = (v.participants || []).map((p) => p.surface || p.surfaceKey || "?"); if (P.length < 2) continue; const key = P.slice(0, 2).sort().join(" — "); let B = bonds.get(key); if (!B) { B = { a: P[0], b: P[1], n: 0, rel: {}, pos: 0, neg: 0, src: {} }; bonds.set(key, B); } B.n++; inc(B.rel, v.relation || "?"); if ((v.meta && v.meta.polarity) === "-") B.neg++; else B.pos++; inc(B.src, cur); inc(X.bonds, key); }
      else if (IDENTITY_KINDS.has(c.kind)) { inc(X.idChurn, c.identity || (o.inputs || []).join(" ↔ ")); }
      else if (v && v.schema === "EOIdentityAlternative@1") { inc(X.idChurn, v.left + " ↔ " + v.right); }
    }
  }
  return { kinds, order, cast: [...cast.values()], bonds: [...bonds.values()], sources: src };
}

// ── A schema-faithful ground reading the perceiver could emit ───────────────
function genGround(seed) {
  const rand = rng(seed); const pick = (a) => a[Math.floor(rand() * a.length)];
  const lines = [];
  for (const src of SOURCES) {
    lines.push(enc({ schema: "Encounter@1", source: src, extent: 1000 + Math.floor(rand() * 4000) }));
    const n = 6 + Math.floor(rand() * 8);
    for (let i = 0; i < n; i++) {
      const operations = [];
      const m = 1 + Math.floor(rand() * 3);
      for (let j = 0; j < m; j++) {
        const r = rand();
        if (r < 0.4) operations.push({ operator: "EVA", consequence: { kind: "EVA/judge" }, terrain: "prose", payload: { schema: "EOReferent@1", value: { schema: "EOReferent@1", id: "ref-" + pick(NAMES).toLowerCase().replace(/[^a-z]/g, ""), surfaces: [pick(NAMES)], standing: pick(["settled", "contested", ""]), mentions: 1 + Math.floor(rand() * 30) } } });
        else if (r < 0.6) operations.push({ operator: "CON", consequence: { kind: "CON/relate" }, terrain: "prose", payload: { schema: "EOHyperedge@1", value: { schema: "EOHyperedge@1", participants: [{ surface: pick(NAMES) }, { surface: pick(NAMES) }], relation: pick(["works for", "oversees", "hears"]), meta: { polarity: rand() < 0.2 ? "-" : "+" } } } });
        else if (r < 0.8) operations.push({ operator: "EVA", consequence: { kind: "identity_hypothesis_supported" }, terrain: "prose", inputs: [pick(NAMES), pick(NAMES)] }); // NO payload — the class that was once dropped
        else operations.push({ operator: "EVA", consequence: { kind: "EVA/judge" }, terrain: "prose", payload: { schema: "EOIdentityAlternative@1", value: { schema: "EOIdentityAlternative@1", left: pick(NAMES), right: pick(NAMES) } } });
      }
      lines.push(enc({ schema: "DeltaFold@1", operations }));
    }
  }
  return lines;
}

// ── The tests ───────────────────────────────────────────────────────────────
test("a well-formed ground reading folds cleanly, cursor agrees, every aggregate equals a direct tally", () => {
  const lines = genGround(1);
  const cursor = { sequence: SOURCES.length };
  const g = falsifyGround(lines, cursor);
  assert.equal(g.ok, true, g.problems.join("; "));
  assert.equal(g.state.seq, SOURCES.length);
});

test("payload-less identity_* consequences are foldable — the class that was once dropped whole", () => {
  const lines = [
    enc({ schema: "Encounter@1", source: "t/a.txt", extent: 100 }),
    enc({ schema: "DeltaFold@1", operations: [{ operator: "EVA", consequence: { kind: "identity_split", identity: "id-1" }, terrain: "prose", inputs: ["Alice", "Alicia"] }] }),
    enc({ schema: "DeltaFold@1", operations: [{ operator: "EVA", consequence: { kind: "identity_reading_refused" }, terrain: "prose", inputs: ["Bob", "Bobby"] }] }),
  ];
  const g = falsifyGround(lines, { sequence: 1 });
  assert.equal(g.ok, true, g.problems.join("; "));
  assert.equal(g.state.ids.size, 2, "both payload-less identity consequences reached the identities fold");
});

test("REFUTED: an operation that is a silent no-op (no payload schema, no foldable consequence kind)", () => {
  const lines = [
    enc({ schema: "Encounter@1", source: "t/a.txt", extent: 100 }),
    enc({ schema: "DeltaFold@1", operations: [{ operator: "DEF", consequence: { kind: "" }, terrain: "prose" }] }),
  ];
  const g = falsifyGround(lines, { sequence: 1 });
  assert.equal(g.ok, false);
  assert.ok(g.problems.some((p) => /silent no-op/.test(p)), "the gate names the null event");
});

test("REFUTED: cursor mismatch — the log's own encounter count contradicts the producer's cursor", () => {
  const lines = genGround(2);
  const g = falsifyGround(lines, { sequence: 99 });
  assert.equal(g.ok, false);
  assert.ok(g.problems.some((p) => /cursor/.test(p)));
});

test("REFUTED: an unparsable line", () => {
  const lines = genGround(3); lines.splice(2, 0, "{not json");
  const g = falsifyGround(lines, { sequence: SOURCES.length });
  assert.equal(g.ok, false);
  assert.ok(g.problems.some((p) => /failed to parse/.test(p)));
});

test("per-source blocks are contiguous and re-fold to their own per-source view", () => {
  const lines = genGround(4);
  const whole = falsifyGround(lines, { sequence: SOURCES.length });
  assert.equal(whole.ok, true);
  let start = -1; const ranges = {};
  for (let i = 0; i < lines.length; i++) { const j = JSON.parse(lines[i]); if (j.schema === "Encounter@1") { if (start >= 0) ranges[JSON.parse(lines[start]).source] = [start, i - 1]; start = i; } }
  ranges[JSON.parse(lines[start]).source] = [start, lines.length - 1];
  for (const name of SOURCES) {
    const [a, b] = ranges[name];
    const sub = falsifyGround(lines.slice(a, b + 1), { sequence: 1 });
    assert.equal(sub.ok, true, name + ": " + sub.problems.join("; "));
    assert.deepEqual(sub.state.src[name], whole.state.src[name], name + " per-source view replays from its own byte range");
  }
});

test("checkpoint + tail == full replay: a cached fold equals a fresh fold of the whole log (append-only)", () => {
  const lines = genGround(5);
  const whole = falsifyGround(lines, { sequence: SOURCES.length });
  assert.equal(whole.ok, true);
  // split mid-source (inside the 2nd block) — the fold's current-source attribution crosses it
  let encCursor = 0, split = -1;
  for (let i = 0; i < lines.length; i++) { const j = JSON.parse(lines[i]); if (j.schema === "Encounter@1") { encCursor++; if (encCursor === 2) split = i + 1; } }
  const st = newState();
  foldGround(st, lines.slice(0, split));
  foldGround(st, lines.slice(split));
  for (const key of ["kinds", "order"]) assert.deepEqual(st[key], whole.state[key], key);
  assert.equal(st.seq, whole.state.seq, "encounters");
  for (const [name, X] of Object.entries(st.src)) assert.deepEqual(X, whole.state.src[name], "source " + name);
  assert.deepEqual(st.cast.size, whole.state.cast.size, "castTotal");
  assert.deepEqual(st.bonds.size, whole.state.bonds.size, "bondsTotal");
  assert.deepEqual(st.ids.size, whole.state.ids.size, "identitiesTotal");
});

test("within-source arrival order never changes the tallies; cross-source order is semantic (documented)", () => {
  const lines = genGround(6);
  const rand = rng(99);
  const whole = falsifyGround(lines, { sequence: SOURCES.length });
  const blockShuffled = [];
  let start = -1;
  for (let i = 0; i < lines.length; i++) { const j = JSON.parse(lines[i]); if (j.schema === "Encounter@1") { if (start >= 0) blockShuffled.push(lines[start], ...lines.slice(start + 1, i).sort(() => rand() - 0.5)); start = i; } }
  blockShuffled.push(lines[start], ...lines.slice(start + 1).sort(() => rand() - 0.5));
  const sh = falsifyGround(blockShuffled, { sequence: SOURCES.length });
  assert.equal(sh.ok, true);
  assert.deepEqual(sh.state.cast.size, whole.state.cast.size);
  for (const [name, X] of Object.entries(sh.state.src)) assert.deepEqual(X, whole.state.src[name], "source " + name);
});