// bench-dock.test.mjs — the bench ledger, the generic dock, and renameable handles.
// The runs go through the fold's REAL sandbox; nothing here is a stub.
import test from "node:test";
import assert from "node:assert/strict";
import { emptyBench, addCard, promote, statusOf, phrase, verifyChain, parseRun, support } from "../the-fold/surface/bench.mjs";
import { runOnBench } from "../the-fold/surface/bench-run.mjs";
import { resolveHandles, setHandle, validateLabel, DEFAULT_HANDLES } from "../the-fold/surface/handles.mjs";
import { renderDock, renderSettings, checkItems, DOCK_SLOTS } from "../the-fold/surface/dock.mjs";

const SPINDLE = (target) => `
const a=Math.acos(5/6);
const rh=(t)=>{const r=(x,y)=>[x*Math.cos(t)-y*Math.sin(t),x*Math.sin(t)+y*Math.cos(t)];const u=r(1,0),v=r(0.5,Math.sqrt(3)/2);return [u,v,[u[0]+v[0],u[1]+v[1]]];};
const V=[[0,0],...rh(0),...rh(a)];const E=[];
for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)if(Math.abs(Math.hypot(V[i][0]-V[j][0],V[i][1]-V[j][1])-1)<1e-9)E.push([i,j]);
const col=(n,E,k)=>{const c=Array(n).fill(-1);const go=(i)=>{if(i==n)return true;for(let x=0;x<k;x++){if(E.every(([p,q])=>!((p==i&&c[q]==x)||(q==i&&c[p]==x)))){c[i]=x;if(go(i+1))return true;c[i]=-1;}}return false;};return go(0);};
${target}`;

const erdos = (solver) => `
const sol=${solver};
let bad=[];for(let n=2;n<=2000;n++) if(!sol(n)) bad.push(n);
console.log('#scope {"kind":"range","lo":2,"hi":2000}');
console.log('#result '+(bad.length===0));`;
const FULL = `(n)=>{for(let x=Math.ceil(n/4);x<=Math.floor(3*n/4)+1;x++){const m=4*x-n;if(m<=0)continue;const d=n*x;for(let y=Math.ceil(d/m);y<=Math.floor(2*d/m);y++){if((m*y-d)>0&&(d*y)%(m*y-d)==0)return true;}}return false;}`;
const BROKEN = `(n)=>{const x=Math.ceil(n/4);const m=4*x-n;if(m<=0)return true;const d=n*x;for(let y=Math.ceil(d/m);y<=Math.ceil(d/m);y++){if((m*y-d)>0&&(d*y)%(m*y-d)==0)return true;}return false;}`;

function bench() {
  let log = emptyBench();
  log = addCard(log, { id: "moser", text: "The Moser spindle is 4-chromatic: not 3-colourable.", author: "human:ada" }).log;
  return log;
}

test("the parts of a run are read off its own output, never supplied", () => {
  assert.deepEqual(parseRun('#scope {"kind":"range","lo":2,"hi":9}\n#result true'), { scope: { kind: "range", lo: 2, hi: 9 }, result: true });
  assert.deepEqual(parseRun("no lines here"), { scope: { kind: "undeclared" }, result: null });
  assert.equal(parseRun('#scope {"kind":"range","lo":9,"hi":2}').scope.kind, "undeclared", "an inverted range is not a scope");
});

test("a finite object checked whole reaches computed_in_range only with a control that failed", () => {
  let log = bench();
  const check = SPINDLE(`console.log('#scope {"kind":"instance","label":"Moser spindle, 7 vertices, 11 unit edges"}');console.log('#result '+(E.length===11&&!col(7,E,3)&&col(7,E,4)));`);
  log = runOnBench(log, { id: "r1", card: "moser", role: "check", code: check }).log;
  assert.equal(support(log, "moser").checks.length, 1, "the real sandbox proved it");
  assert.match(promote(log, { card: "moser", to: "computed_in_range", by: "human:ada" }).error, /control/, "no control yet: refused");
  // the control: the same test on a triangle (3-colourable) must say the claim FAILS there
  // the control: the same test on a triangle (3-colourable) must say the claim FAILS there
  const ctl = `
const col=(n,E,k)=>{const c=Array(n).fill(-1);const go=(i)=>{if(i==n)return true;for(let x=0;x<k;x++){if(E.every(([p,q])=>!((p==i&&c[q]==x)||(q==i&&c[p]==x)))){c[i]=x;if(go(i+1))return true;c[i]=-1;}}return false;};return go(0);};
const T=[[0,1],[1,2],[0,2]];
console.log('#scope {"kind":"instance","label":"triangle"}');
console.log('#result '+(!col(3,T,3)));`; // "triangle is not 3-colourable" is false
  log = runOnBench(log, { id: "c1", card: "moser", role: "control", code: ctl }).log;
  const r = promote(log, { card: "moser", to: "computed_in_range", by: "human:ada" });
  assert.ok(r.log, r.error);
  assert.equal(statusOf(r.log, "moser"), "computed_in_range");
  assert.match(phrase(r.log, "moser"), /whole of one finite object \(Moser spindle/);
  assert.match(phrase(r.log, "moser"), /not a proof/);
});

test("a range check states its range and can never read as wider", () => {
  let log = addCard(emptyBench(), { id: "es", text: "Every n >= 2 has 4/n = 1/x + 1/y + 1/z.", author: "human:ada" }).log;
  log = runOnBench(log, { id: "r1", card: "es", role: "check", code: erdos(FULL) }).log;
  log = runOnBench(log, { id: "c1", card: "es", role: "control", code: erdos(BROKEN) }).log;
  assert.equal(log.entries.find((e) => e.id === "r1").result, true, "the full solver clears 2..2000");
  assert.equal(log.entries.find((e) => e.id === "c1").result, false, "the deliberately broken solver is caught");
  log = promote(log, { card: "es", to: "computed_in_range", by: "human:ada" }).log;
  const p = phrase(log, "es");
  assert.match(p, /every case from 2 to 2000/);
  assert.match(p, /Nothing is claimed beyond that/);
  assert.match(promote(log, { card: "es", to: "proved", by: "human:ada" }).error, /evidence/, "proved needs evidence");
});

test("the tool never upgrades: a model cannot promote, cannot be `by`, and its cards stay proposed", () => {
  let log = addCard(emptyBench(), { id: "m", text: "a claim", author: "model:gemma" }).log;
  assert.match(phrase(log, "m"), /proposed by model:gemma; not yet adopted/);
  assert.match(promote(log, { card: "m", to: "conjectured", by: "model:gemma" }).error, /never a model/);
  assert.ok(promote(log, { card: "m", to: "conjectured", by: "human:ada" }).log, "a named human may adopt it");
  assert.match(addCard(log, { id: "x", text: "y", author: "anonymous" }).error, /named/);
  assert.match(promote(promote(log, { card: "m", to: "conjectured", by: "human:ada" }).log, { card: "m", to: "conjectured", by: "human:ada" }).error, /only moves up/);
});

test("a check that printed no scope or no result supports nothing", () => {
  let log = bench();
  log = runOnBench(log, { id: "r", card: "moser", role: "check", code: "console.log('looks fine')" }).log;
  assert.equal(support(log, "moser").checks.length, 0);
  assert.match(promote(log, { card: "moser", to: "computed_in_range", by: "human:ada" }).error, /no passing check/);
});

test("the chain seals every field: an altered scope (a nested field) breaks it", () => {
  let log = bench();
  log = runOnBench(log, { id: "r", card: "moser", role: "check", code: `console.log('#scope {"kind":"range","lo":2,"hi":5}');console.log('#result true')` }).log;
  assert.equal(verifyChain(log).ok, true);
  const forged = { ...log, entries: log.entries.map((e) => e.id === "r" ? { ...e, scope: { kind: "range", lo: 2, hi: 5000000 } } : e) };
  const v = verifyChain(forged);
  assert.equal(v.ok, false);
  assert.match(v.reason, /altered/);
});

test("handles: renaming is validated, disclosed, and only ever touches labels", () => {
  assert.equal(validateLabel("  ").ok, false);
  assert.equal(validateLabel("<b>x</b>").ok, false);
  assert.equal(validateLabel("x".repeat(33)).ok, false);
  const r = resolveHandles({ terrain: { void: "Corpus", field: "corpus" }, status: { proved: "settled" }, slot: { nope: "x", rows: "" } });
  assert.equal(r.handles.terrain.void, "Corpus");
  assert.equal(r.handles.terrain.field, DEFAULT_HANDLES.terrain.field, "a colliding label reverts, case-insensitively");
  assert.ok(r.rejected.some((x) => x.id === "field" && /same as/.test(x.reason)));
  assert.ok(r.rejected.some((x) => x.id === "nope" && x.reason === "unknown id"));
  assert.equal(r.handles.slot.rows, DEFAULT_HANDLES.slot.rows, "an empty label is the default, not a blank");
  assert.deepEqual(Object.keys(r.handles.terrain), Object.keys(DEFAULT_HANDLES.terrain), "ids are the fixed set");
  assert.match(setHandle({}, "terrain", "void", "field").error, /same as/, "renaming onto another handle's label is refused");
  assert.match(setHandle({}, "terrain", "void", "<i>").error, /markup/);
  assert.ok(setHandle({ terrain: { void: "Field" } }, "terrain", "void", "").overrides.terrain.void === undefined, "empty clears");
  assert.equal(setHandle({}, "terrain", "zzz", "a").error, "unknown handle");
});

test("renaming a status changes the drawn word and not the stored status or the ledger", () => {
  let log = bench();
  log = promote(log, { card: "moser", to: "conjectured", by: "human:ada" }).log;
  const before = JSON.stringify(log);
  const { html } = renderDock({ overrides: { status: { conjectured: "hunch" } }, content: { subject: { items: [{ id: "moser", title: "Moser", status: statusOf(log, "moser"), address: "bench#0" }] } } });
  assert.match(html, /data-h="status:conjectured">hunch</);
  assert.match(html, /class="st st-conjectured"/, "the CSS/stored id is the id, not the label");
  assert.equal(JSON.stringify(log), before, "the ledger was not touched by drawing");
});

test("the dock is medium-free: six slots by role, and an item with no address is refused in place", () => {
  assert.deepEqual(DOCK_SLOTS.map((s) => s.id), ["subject", "sources", "measures", "objects", "relations", "rows"]);
  const civic = /\b(plan|agency|agencies|place|district|transit|city)\b/i;
  assert.equal(DOCK_SLOTS.some((s) => civic.test(`${s.id} ${s.role}`)), false, "no medium's noun in the frame");
  assert.deepEqual(checkItems([{ id: "a", address: "x#1" }, { id: "b" }, { id: "c", ungrounded: true }]).refused, [{ id: "b", reason: "no address — say `ungrounded: true` or give one" }]);
  const { html, refused } = renderDock({ content: { measures: { items: [{ id: "h0", title: "H0", address: "2112.04510#1447-1452" }, { id: "bad", title: "no basis" }] } } });
  assert.equal(refused.length, 1);
  assert.match(html, /refused: bad/);
  assert.match(html, /2112\.04510#1447-1452/);
  assert.doesNotMatch(html, /no basis<\/h3>/, "an ungrounded item is not drawn as a row");
});

test("the settings form lists every handle keyed by ns and id, default as placeholder", () => {
  const h = renderSettings({ terrain: { void: "Corpus" } });
  for (const ns of Object.keys(DEFAULT_HANDLES)) for (const id of Object.keys(DEFAULT_HANDLES[ns])) assert.ok(h.includes(`data-ns="${ns}" data-id="${id}"`), `${ns}:${id}`);
  assert.match(h, /value="Corpus"/);
  assert.match(h, /placeholder="Field"/);
});

test("a variant that came back false is said in the claim's own sentence, not left in the rows", () => {
  let log = addCard(emptyBench(), { id: "k", text: "claim", author: "human:ada" }).log;
  const run = (id, role, label, res) => runOnBench(log, { id, card: "k", role, code: `console.log('#scope {"kind":"instance","label":"${label}"}');console.log('#result ${res}')` }).log;
  log = run("a", "check", "set A", true); log = run("b", "check", "set B", false); log = run("c", "control", "shuffled", false);
  log = promote(log, { card: "k", to: "computed_in_range", by: "human:ada" }).log;
  const p = phrase(log, "k");
  assert.match(p, /Checked over the whole of one finite object \(set A\)/);
  assert.match(p, /did NOT hold over the whole of one finite object \(set B\)/);
  assert.equal(support(log, "k").checks.length, 1, "a false variant never counts as support");
});

test("a range or sample scope may carry a label, so variants of one check are distinguishable in the claim's own sentence", () => {
  let log = addCard(emptyBench(), { id: "k", text: "claim", author: "human:ada" }).log;
  const run = (id, role, label, res) => runOnBench(log, { id, card: "k", role, code: `console.log('#scope {"kind":"sample","n":200,"seed":1,"label":"${label}"}');console.log('#result ${res}')` }).log;
  log = run("a", "check", "variant one", true); log = run("b", "check", "variant two", true); log = run("c", "control", "designed wrong", false);
  log = promote(log, { card: "k", to: "computed_in_range", by: "human:ada" }).log;
  const p = phrase(log, "k");
  assert.match(p, /a sample of 200 \(seed 1\), not exhaustive — variant one; a sample of 200 \(seed 1\), not exhaustive — variant two/);
  assert.equal(parseRun('#scope {"kind":"sample","n":5,"seed":1,"label":7}').scope.kind, "undeclared", "a non-string label is not a scope");
});
