// End to end, over real HTTP and the real production door: ingest -> plain question -> ant colony -> gate -> skill -> switch -> audit.
// Real python, real numpy, real sockets. No model (there is none here): the colony is the learner.
import test from "node:test"; import assert from "node:assert/strict"; import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { holodeck } from "../the-fold/surface/holodeck.mjs";

const csv = () => { let a = 4242; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296), g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * 1.41; };
  let env = 0; const rows = ["t_s,bursty,white,tone"]; for (let i = 0; i < 14000; i++) { env = 0.999 * env + 0.045 * g(); rows.push(`${(i * 0.001).toFixed(3)},${(g() * Math.exp(env * 3)).toFixed(4)},${g().toFixed(4)},${(Math.sin(i * 2 * Math.PI / 97) + 0.6 * g()).toFixed(4)}`); } return rows.join("\n"); };

const listen = (handler) => new Promise((ok) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => ok(s)); });
const call = async (base, p, body) => { const r = await fetch(base + p, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }); const t = await r.text(); return { status: r.status, text: t, json: () => JSON.parse(t) }; };

test("holodeck, end to end over HTTP: hub, notebook, colony, gate, skill, switch, audit — and one ledger under both surfaces", { timeout: 300000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hd-nb-")), learned = fs.mkdtempSync(path.join(os.tmpdir(), "hd-led-"));
  const srv = await listen(holodeck({ dir, learned, by: "human:tester", swarm: { rounds: 2, ants: 10 }, mouth: null })); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const hub = await call(base, "/"); assert.equal(hub.status, 200); assert.match(hub.text, /Holodeck/); assert.match(hub.text, /href="\/notebook\/"/); assert.match(hub.text, /href="\/skills\/"/);
    assert.deepEqual((await call(base, "/health")).json().chains, { notebook: true, claims: true, learned: true });
    assert.equal((await call(base, "/nowhere")).status, 404);

    const up = await call(base, "/notebook/api", { op: "upload", name: "mixed.csv", base64: Buffer.from(csv()).toString("base64") }); assert.equal(up.json().error, null); assert.match(up.json().notice, /table/);
    const ask = await call(base, "/notebook/api", { op: "line", line: "what is going on in this file?" }); assert.equal(ask.json().error, null, ask.text);

    for (const style of ["chat", "generate", "notebook"]) { const pg = await call(base, `/notebook/?style=${style}`); assert.equal(pg.status, 200); assert.match(pg.text, /colony searched/); assert.match(pg.text, /structure:/); assert.match(pg.text, /src="|In&nbsp;\[|class="bub/); assert.match(pg.text, /fetch\(BASE\+"\/api"/); }
    const aud = (await call(base, "/notebook/api", { op: "audit" })).json().notice; assert.match(aud, /chains: notebook ok/); assert.match(aud, /written by swarm:/);

    const sk = await call(base, "/skills/"); assert.equal(sk.status, 200); assert.match(sk.text, /learned:analysis\//); assert.match(sk.text, /structure:/); assert.match(sk.text, /BASE=""|BASE="\/skills"/);
    const h0 = (await call(base, "/health")).json(); assert.ok(h0.skills.learned >= 1 && h0.skills.on === h0.skills.learned && h0.files.includes("mixed.csv"));

    const id = fs.readFileSync(path.join(learned, "analyses.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((e) => e.kind === "learn").id;
    assert.match((await call(base, "/skills/toggle", { skill: `learned:analysis/${id}`, on: false, by: "model:x", why: "no" })).json().error, /named person/);
    assert.equal((await call(base, "/skills/toggle", { skill: `learned:analysis/${id}`, on: false, by: "human:tester", why: "e2e: switching it off from the Skills page" })).json().ok, true);
    const h1 = (await call(base, "/health")).json(); assert.equal(h1.skills.off, 1, "the Skills page's switch is the notebook's switch");
    const nbpage = await call(base, "/notebook/?style=chat&drawer=1%26tab=skills".replace("%26", "&")); assert.match(nbpage.text, new RegExp(`sk-${id}`)); assert.match(nbpage.text, /switch: off by human:tester — e2e/);
    const audit2 = (await call(base, "/notebook/api", { op: "audit" })).json().notice; assert.match(audit2, /OFF|off by human:tester/);
    const sw = await call(base, "/notebook/api", { op: "skill", which: id, on: true, why: "e2e: back on from the notebook" }); assert.equal(sw.json().error, null);
    assert.equal((await call(base, "/health")).json().skills.off, 0);
    assert.equal((await call(base, "/notebook/ipynb")).json().nbformat, 4);
    assert.ok(L_verify(learned), "the learned chain still verifies after every switch and run");
  } finally { srv.close(); }
});

import * as L from "../the-fold/surface/notebook-learn.mjs";
const L_verify = (d) => L.verifyStore(d).ok;

test("the production door: /analyze on a table attachment runs the colony inside runProxyTurn, no model, methods named and switchable", { timeout: 300000 }, async () => {
  const learned = fs.mkdtempSync(path.join(os.tmpdir(), "door-led-")); process.env.ER7_LEARNED_DIR = learned; process.env.ER7_SWARM_ROUNDS = "2"; process.env.ER7_SWARM_ANTS = "10";
  const { runProxyTurn } = await import("../../proxy-runner.mjs"); const notes = [];
  const r = await runProxyTurn({ sessionId: "e2e-door", model: "none", task: "/analyze what is going on in this file?", attachments: [{ name: "mixed.csv", base64: Buffer.from(csv()).toString("base64") }] }, null, (n) => notes.push(n));
  assert.match(r.text, /colony searched/); assert.match(r.text, /Methods used/); assert.match(r.text, /\/skills\//); assert.ok(notes.some((n) => n.move === "analysis_door")); assert.ok(notes.some((n) => n.move === "skill_used"));
  assert.ok(L.library(learned).some((k) => String(k.lineage?.mouth).startsWith("swarm:")), "the door's finds are skills in the shared ledger");
  assert.ok(L.verifyStore(learned).ok);
  const again = await runProxyTurn({ sessionId: "e2e-door", model: "none", task: "/analyze is bursty heavy tailed?", attachments: [] }, null, () => {}); assert.match(again.text, /Methods:/, "the same session's notebook is kept; learned methods are reused");
  const none = await runProxyTurn({ sessionId: "e2e-empty", model: "none", task: "/analyze anything?", attachments: [] }, null, () => {}); assert.match(none.text, /no table to analyse/);
});
