// What the Holodeck page relies on, over real HTTP: /state (raw sealed ledgers the page re-verifies itself), /bundle (a zip that
// re-runs in a clean python3 and reproduces every #finding/#result line), the Methods paragraph (every claim's null, n, seed and
// the environment, from the ledger), and the origin gate (loopback only; a foreign website cannot drive the server).
import test from "node:test"; import assert from "node:assert/strict"; import http from "node:http"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { holodeck, originAllowed } from "../the-fold/surface/holodeck.mjs";
import { verifyChain } from "../the-fold/surface/bench.mjs";
import { markedLines } from "../the-fold/surface/notebook-bundle.mjs";

const csv = () => { let a = 4242; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296), g = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * 1.41; };
  let env = 0; const rows = ["t_s,bursty,white"]; for (let i = 0; i < 9000; i++) { env = 0.999 * env + 0.045 * g(); rows.push(`${(i * 0.001).toFixed(3)},${(g() * Math.exp(env * 3)).toFixed(4)},${g().toFixed(4)}`); } return rows.join("\n"); };
const listen = (h) => new Promise((ok) => { const s = http.createServer(h); s.listen(0, "127.0.0.1", () => ok(s)); });

test("the Holodeck contract: /state verifies client-side, /bundle reproduces in clean python3, Methods names null/n/seed, origins gated", { timeout: 400000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hdi-nb-")), learned = fs.mkdtempSync(path.join(os.tmpdir(), "hdi-led-"));
  const srv = await listen(holodeck({ dir, learned, by: "human:tester", swarm: { rounds: 2, ants: 10 }, mouth: null })), base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (b, origin) => (await fetch(base + "/notebook/api", { method: "POST", headers: origin ? { origin } : {}, body: JSON.stringify(b) })).json();
  try {
    assert.equal((await post({ op: "upload", name: "mixed.csv", base64: Buffer.from(csv()).toString("base64") })).error, null);
    assert.equal((await post({ op: "line", line: "what is going on in this file?" })).error, null);
    const S = await (await fetch(base + "/notebook/state")).json();
    for (const k of ["nb", "bench", "workspace", "analyses"]) assert.ok(verifyChain({ entries: S.ledgers[k] }).ok, `${k} verifies with the pure hash`);
    assert.ok(S.server.env.python && S.server.env.numpy, "the environment is reported");
    const execs = S.ledgers.nb.filter((e) => e.kind === "exec"); assert.ok(execs.length >= 2); assert.ok(execs.every((e) => e.env?.numpy), "every run records its environment");
    // a forged entry is caught by the same client-side check
    const forged = S.ledgers.nb.map((e, i) => (i === 1 ? { ...e, source: "tampered" } : e)); assert.equal(verifyChain({ entries: forged }).ok, false);

    // Methods: every claim names its null, n and seed, and the environment
    const claims = S.ledgers.nb.filter((e) => e.kind === "cell" && e.type === "claim");
    if (claims.length) { for (const c of claims) assert.match(S.methods.text, new RegExp(`Claim ${c.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} [\\s\\S]*?null: [^;]+; n = \\d+; seed = \\d+`)); assert.match(S.methods.text, /python \d/); assert.match(S.methods.text, /numpy \d/); }

    // origins: loopback is allowed, a foreign site is not, and a foreign POST changes nothing
    assert.ok(originAllowed("http://localhost:8000") && originAllowed("http://127.0.0.1:5173") && !originAllowed("https://example.org") && !originAllowed("http://localhost.example.org"));
    const r = await fetch(base + "/notebook/state", { headers: { origin: "http://localhost:8000" } }); assert.equal(r.headers.get("access-control-allow-origin"), "http://localhost:8000");
    const bad = await fetch(base + "/notebook/api", { method: "POST", headers: { origin: "https://example.org" }, body: JSON.stringify({ op: "ws-new", type: "chat" }) }); assert.equal(bad.status, 403);
    assert.equal((await (await fetch(base + "/notebook/state")).json()).tabs.length, 1, "the refused POST opened nothing");
    const pre = await fetch(base + "/notebook/api", { method: "OPTIONS", headers: { origin: "http://localhost:8000", "access-control-request-private-network": "true" } }); assert.equal(pre.status, 204); assert.equal(pre.headers.get("access-control-allow-private-network"), "true");
    // the bundle, unzipped into a clean directory and re-run with plain python3
    const zipBytes = Buffer.from(await (await fetch(base + "/notebook/bundle")).arrayBuffer());
    const out = fs.mkdtempSync(path.join(os.tmpdir(), "hdi-bundle-")); fs.writeFileSync(path.join(out, "b.zip"), zipBytes);
    const unz = spawnSync("python3", ["-c", "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])", path.join(out, "b.zip"), path.join(out, "x")], { encoding: "utf8" }); assert.equal(unz.status, 0, unz.stderr);
    const ip = JSON.parse(fs.readFileSync(path.join(out, "x", "notebook.ipynb"), "utf8")); assert.equal(ip.nbformat, 4); assert.ok(ip.nbformat_minor >= 0 && ip.metadata && Array.isArray(ip.cells));
    for (const c of ip.cells) { assert.ok(["code", "markdown"].includes(c.cell_type)); assert.ok("source" in c && "metadata" in c); if (c.cell_type === "code") assert.ok("outputs" in c && "execution_count" in c); }
    const exp = JSON.parse(fs.readFileSync(path.join(out, "x", "expected.json"), "utf8")); assert.ok(exp.runs.length >= 2);
    assert.ok(exp.runs.some((r) => r.lines.some((l) => l.startsWith("#finding "))), "there are findings to reproduce");
    const run = spawnSync("python3", ["run_all.py"], { cwd: path.join(out, "x"), encoding: "utf8", env: { PATH: process.env.PATH, HOME: out }, timeout: 300000 });
    assert.equal(run.status, 0, run.stdout + run.stderr); assert.match(run.stdout, new RegExp(`reproduced ${exp.runs.length} of ${exp.runs.length}`));
    // a tampered expectation is caught (the comparison is real)
    exp.runs[0].lines = [...exp.runs[0].lines, "#finding something that never ran"]; fs.writeFileSync(path.join(out, "x", "expected.json"), JSON.stringify(exp));
    assert.equal(spawnSync("python3", ["run_all.py"], { cwd: path.join(out, "x"), encoding: "utf8", timeout: 300000 }).status, 1);
    assert.deepEqual(markedLines("x\n#finding a = 1\n#result true\n#scope {}"), ["#finding a = 1", "#result true"]);

  } finally { srv.close(); }
});
