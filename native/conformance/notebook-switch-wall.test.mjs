// A switch is a wall, including for the learners. Found while running the Holodeck falsification pass: with "all learned analyses"
// switched off, a question whose words matched no existing method fell through to the colony, which learned new methods and USED
// them — a replacement written around the switch. And a single method switched off could be re-found by /explore (same pipeline,
// same id) and used again. Both must be refused.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { ingest } from "../organs/ingest.js";
import { emptyNotebook, addData } from "../the-fold/surface/notebook.mjs";
import { act } from "../the-fold/surface/notebook-surface.mjs";
import * as L from "../the-fold/surface/notebook-learn.mjs";
const H = "human:me";
const csv = () => { let a = 4242; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296), g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * 1.41; };
  let env = 0; const rows = ["t_s,bursty,white"]; for (let i = 0; i < 9000; i++) { env = 0.999 * env + 0.045 * g(); rows.push(`${(i * 0.001).toFixed(3)},${(g() * Math.exp(env * 3)).toFixed(4)},${g().toFixed(4)}`); } return rows.join("\n"); };

test("switched off means off for the learners too: no new method around 'all off', no re-found method used when it is off", { timeout: 400000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wall-")), ctx = { dir, mouth: null, swarm: { rounds: 2, ants: 10 } };
  let s = addData(emptyNotebook(), ingest({ name: "mixed.csv", bytes: Buffer.from(csv()) }), H).state;
  const first = await act(s, H, { op: "line", line: "what is going on in this file?" }, ctx); assert.ok(!first.error, first.error); s = first.state;
  const lib0 = L.library(dir); assert.ok(lib0.length >= 1, "the colony learned something to switch");

  assert.match((await act(s, H, { op: "line", line: "/skill all off because the whole group is under review" }, ctx)).notice, /OFF/);
  const mouth = async () => { throw new Error("no mouth may be asked while all learned analyses are off"); };
  for (const line of ["zzz qqq xyzzy?", "/explore"]) {
    const r = await act(s, H, { op: "line", line }, { ...ctx, mouth: line === "/explore" ? null : mouth });
    // either refusal is right (a matching method that is off, or the learners' wall); both must name the REAL switch and never call it a concession
    assert.match(r.error ?? "", /all learned analyses are switched off/, `${line}: ${r.error ?? r.notice}`); assert.match(r.error, /under review/); assert.match(r.error, /will not (learn|write) a new (method|one) around/); assert.doesNotMatch(r.error, /conceded/);
  }
  assert.equal(L.library(dir).length, lib0.length, "nothing was learned around the switch");

  await act(s, H, { op: "line", line: "/skill all on because review done" }, ctx);
  // switch off all but one (with every method off, /explore is refused outright — see above); the colony may re-find the others
  const offIds = new Set(lib0.slice(0, -1).map((k) => k.id)); if (!offIds.size) return; // only one method learned: nothing to re-find
  for (const k of lib0.slice(0, -1)) assert.match((await act(s, H, { op: "line", line: `/skill ${k.id} off because it must be re-checked by hand` }, ctx)).notice, /now OFF/);
  const again = await act(s, H, { op: "line", line: "/explore" }, ctx); assert.ok(!again.error, again.error); s = again.state;
  const used = s.nb.entries.filter((e) => e.kind === "cell" && e.type === "claim" && e.method && offIds.has(e.method.id) && e.seq > first.state.nb.entries.length);
  assert.deepEqual(used.map((c) => c.method.id), [], "a method that is off was used after the colony re-found it");
  const note = s.nb.entries.filter((e) => e.kind === "cell" && /^ask/.test(e.id)).at(-1).source; console.log(note.match(/not in use[^;]*/g)?.slice(0, 2) ?? "(the colony re-found none of the switched-off methods this time)");
  assert.ok(L.verifyStore(dir).ok);
});
