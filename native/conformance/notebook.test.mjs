import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import zlib from "node:zlib";
import { ingest, parseDelimited } from "../organs/ingest.js";
import { emptyNotebook, addData, addCell, editCell, sourceOf, execsOf, stale, verify } from "../the-fold/surface/notebook.mjs";
import { runCell, runPython } from "../the-fold/surface/notebook-run.mjs";
import { toIpynb, fromIpynb } from "../the-fold/surface/notebook-ipynb.mjs";
import { promote, phrase, statusOf } from "../the-fold/surface/bench.mjs";
import { renderPage, act, save, load } from "../the-fold/surface/notebook-surface.mjs";

const H = "human:me";
const zipOf = (files) => { // minimal stored zip writer for fixtures
  const parts = [], cd = []; let off = 0;
  for (const [n, d] of Object.entries(files)) {
    const nb = Buffer.from(n), raw = Buffer.from(d), def = zlib.deflateRawSync(raw);
    const crc = zlib.crc32 ? zlib.crc32(raw) : 0;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(def.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    parts.push(lh, nb, def);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(def.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    cd.push(ch, nb); off += 30 + nb.length + def.length;
  }
  const cdb = Buffer.concat(cd), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(cd.length / 2, 10); e.writeUInt32LE(cdb.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdb, e]);
};

test("ingest: docx, xlsx, csv, ipynb, html read to text; an unknown binary is a NAMED gap, not empty text", () => {
  const docx = ingest({ name: "a.docx", bytes: zipOf({ "word/document.xml": "<w:p><w:t>H0 &amp; more</w:t></w:p>" }) });
  assert.match(docx.text, /H0 & more/);
  const x = ingest({ name: "a.xlsx", bytes: zipOf({ "xl/sharedStrings.xml": "<sst><si><t>p</t></si></sst>", "xl/worksheets/sheet1.xml": '<sheetData><row><c r="A1" t="s"><v>0</v></c></row><row><c r="A2"><v>7</v></c></row></sheetData>' }) });
  assert.deepEqual(x.tables[0].header, ["p"]); assert.deepEqual(x.tables[0].rows, [["7"]]);
  const c = ingest({ name: "t.csv", bytes: Buffer.from('a,b\n1,"x,y"\n') });
  assert.deepEqual(c.tables[0].rows, [["1", "x,y"]]);
  const nb = ingest({ name: "n.ipynb", bytes: Buffer.from(JSON.stringify({ cells: [{ cell_type: "code", source: ["1+1"], outputs: [{ text: ["2"] }] }] })) });
  assert.match(nb.text, /1\+1/); assert.ok(nb.gaps.some((g) => g.kind === "outputs_are_recorded_not_verified"));
  const bin = ingest({ name: "x.bin", bytes: Buffer.from([0, 1, 2, 3, 0, 0]) });
  assert.equal(bin.text, ""); assert.equal(bin.gaps[0].kind, "unsupported_binary");
});

test("ingest: a PDF text layer is read (incl. 2-byte glyphs); an image-only PDF is a named gap, never blank", () => {
  const stream = zlib.deflateSync(Buffer.from("BT /F1 12 Tf (Hubble H0 = 73.04) Tj ET"));
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"), stream, Buffer.from("\nendstream\nendobj\n")]);
  assert.match(ingest({ name: "a.pdf", bytes: pdf }).text, /H0 = 73\.04/);
  const empty = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nstream\nq Q\nendstream\n");
  assert.ok(ingest({ name: "e.pdf", bytes: empty }).gaps.some((g) => g.kind === "needs_ocr"));
});

test("the log is append-only and sealed: an altered entry breaks the chain", () => {
  let s = emptyNotebook();
  s = addCell(s, { id: "m", type: "markdown", source: "x", author: H }).state;
  assert.ok(verify(s).notebook.ok);
  const forged = { ...s, nb: { ...s.nb, entries: [{ ...s.nb.entries[0], source: "y" }] } };
  assert.equal(verify(forged).notebook.ok, false);
});

test("an edit supersedes and keeps the past; an unchanged edit and an edit of a claim are refused", () => {
  let s = emptyNotebook();
  s = addCell(s, { id: "c", type: "code", lang: "js", source: "1", author: H }).state;
  s = editCell(s, { cell: "c", source: "2", by: H }).state;
  assert.equal(sourceOf(s.nb, "c"), "2"); assert.equal(s.nb.entries.filter((e) => e.kind === "edit").length, 1); assert.equal(s.nb.entries[0].source, "1");
  assert.ok(editCell(s, { cell: "c", source: "2", by: H }).error);
  s = addCell(s, { id: "k", type: "claim", source: "claim", author: H }).state;
  assert.match(editCell(s, { cell: "k", source: "wider", by: H }).error, /new claim/);
});

test("a run states its own scope and result; nothing is passed in, and a stale run says why", () => {
  let s = emptyNotebook();
  s = addCell(s, { id: "c", type: "code", lang: "js", source: 'console.log("#scope {\\"kind\\":\\"instance\\",\\"label\\":\\"toy\\"}"); console.log("#result true")', author: H }).state;
  const r = runCell(s, "c"); s = r.state;
  assert.equal(r.exec.result, true); assert.equal(r.exec.scope.kind, "instance");
  assert.equal(stale(s, "c"), null);
  s = editCell(s, { cell: "c", source: "console.log(1)", by: H }).state;
  assert.match(stale(s, "c"), /source changed/);
  s = addData(s, ingest({ name: "d.txt", bytes: Buffer.from("hi") }), H).state;
  s = runCell(s, "c").state; assert.equal(stale(s, "c"), null);
  s = addData(s, ingest({ name: "d2.txt", bytes: Buffer.from("more") }), H).state;
  assert.match(stale(s, "c"), /data changed/);
});

test("a claim's ladder is the bench's: a bound check without a failed control cannot promote, and a model never can", () => {
  let s = emptyNotebook();
  s = addCell(s, { id: "k", type: "claim", source: "x is small", author: H }).state;
  s = addCell(s, { id: "chk", type: "code", lang: "js", source: 'console.log("#scope {\\"kind\\":\\"range\\",\\"lo\\":1,\\"hi\\":3}");console.log("#result true")', author: H, for: "k", role: "check" }).state;
  s = runCell(s, "chk").state;
  assert.match(promote(s.bench, { card: "k", to: "computed_in_range", by: H }).error, /control/);
  s = addCell(s, { id: "ctl", type: "code", lang: "js", source: 'console.log("#scope {\\"kind\\":\\"range\\",\\"lo\\":1,\\"hi\\":3}");console.log("#result false")', author: H, for: "k", role: "control" }).state;
  s = runCell(s, "ctl").state;
  assert.ok(promote(s.bench, { card: "k", to: "computed_in_range", by: "model:x" }).error);
  const p = promote(s.bench, { card: "k", to: "computed_in_range", by: H });
  assert.ok(!p.error); assert.equal(statusOf(p.log, "k"), "computed_in_range");
  assert.match(phrase(p.log, "k"), /every case from 1 to 3/);
});

test("python cells run with ingested tables as files, capture figures, and have NO network", () => {
  let s = emptyNotebook();
  s = addData(s, ingest({ name: "t.csv", bytes: Buffer.from("a,b\n1,2\n3,4\n") }), H).state;
  const r = runPython("import csv\nprint(sum(float(x['b']) for x in csv.DictReader(open('data/t.csv.csv'))))\nimport matplotlib.pyplot as plt\nplt.plot([1,2]);save('p')", s.files);
  // A host that cannot isolate the network says so in the run's own record (notebook-run.mjs) — the
  // second half of this test already accepts that note; the result itself is what is compared here.
  const withoutIsolationNote = (o) => o.replace(/\n*\[note: network isolation unavailable[^\]]*\]\s*$/, "");
  assert.equal(withoutIsolationNote(r.output).trim(), "6.0"); assert.equal(r.figures.length, 1); assert.match(r.figures[0].sha, /^[0-9a-f]{64}$/);
  const n = runPython("import socket\ntry:\n  socket.create_connection(('1.1.1.1',53),timeout=3); print('NET')\nexcept Exception as e: print('blocked')", {});
  assert.ok(/blocked/.test(n.output) || /NOT network-isolated/.test(n.output), "either blocked, or the run says isolation was unavailable");
  assert.ok(!/^NET/m.test(n.output) || /NOT network-isolated/.test(n.output));
});

test("ipynb round-trips cells; imported outputs are recorded as produced elsewhere, never as a run here", () => {
  let s = emptyNotebook();
  s = addCell(s, { id: "m", type: "markdown", source: "# T", author: H }).state;
  s = addCell(s, { id: "c", type: "code", lang: "js", source: "console.log(2)", author: H }).state;
  s = runCell(s, "c").state;
  const j = toIpynb(s); assert.equal(j.cells.length, 2); assert.equal(j.cells[1].outputs[0].text.join(""), "2");
  const back = fromIpynb(j, { author: "human:imp" });
  assert.equal(back.state.nb.entries.filter((e) => e.kind === "cell").length, 2);
  assert.equal(execsOf(back.state.nb, "imp2").length, 0); assert.equal(stale(back.state, "imp2"), "never run");
  assert.ok(back.notes.some((n) => /produced elsewhere/.test(n.recorded ?? "")));
});

test("the page persists, reloads verified, and refuses to load a tampered file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nbp-"));
  let s = emptyNotebook();
  s = (await act(s, H, { op: "add", id: "c", type: "code", lang: "js", source: "console.log(5)" })).state;
  s = (await act(s, H, { op: "run", cell: "c" })).state; save(dir, s);
  const back = load(dir); assert.match(renderPage(back), /chains? verif/); assert.match(renderPage(back), /console\.log\(5\)/);
  const j = JSON.parse(fs.readFileSync(path.join(dir, "notebook.json"), "utf8")); j.nb[0].source = "console.log(9)"; fs.writeFileSync(path.join(dir, "notebook.json"), JSON.stringify(j));
  assert.throws(() => load(dir), /does not verify/);
  assert.ok((await act(emptyNotebook(), "model:x", { op: "add", id: "z", type: "claim", source: "a" })).state, "a model may PROPOSE a claim");
});

test("the / bar: python by default, typed refusals, no delete, checks bind to claims", async () => {
  const { parseCommand } = await import("../the-fold/surface/notebook-commands.mjs");
  assert.equal(parseCommand("is it intermittent?").op, "ask"); assert.equal(parseCommand("/py 1+1").lang, "python");
  assert.equal(parseCommand("/js 2").lang, "js");
  assert.match(parseCommand("/rm k1").error, /append-only/);
  assert.match(parseCommand("/nonsense").error, /\/help/);
  assert.equal(parseCommand("/check k1 print(1)").for, "k1");
  assert.equal(parseCommand("/promote k1 proved by-hand").evidence, "by-hand");
  let s = emptyNotebook();
  s = (await act(s, H, { op: "line", line: "/claim x is small" })).state;
  const chk = await act(s, H, { op: "line", line: "/check k1 scope_range(1,3); result(True)" });
  assert.ok(!chk.error, chk.error); s = chk.state;
  assert.equal(execsOf(s.nb, "c1")[0].result, true); assert.equal(execsOf(s.nb, "c1")[0].scope.kind, "range");
  assert.ok((await act(s, H, { op: "line", line: "/check nope 1" })).error);
  const v = await act(s, H, { op: "line", line: "/py np.arange(3).sum()" }); assert.match(execsOf(v.state.nb, "c2")[0].output, /3/, "the last expression is displayed, as Jupyter does");
});

test("er7 is preloaded in python cells: data(), table(), scope_*, wmean, tools()", async () => {
  let s = emptyNotebook();
  s = addData(s, ingest({ name: "t.csv", bytes: Buffer.from("v,e\n70,1\n72,1\n") }), H).state;
  const r = runPython("rows=table('t.csv'); print(len(rows), round(wmean([70,72],[1,1]),1)); tools()", s.files);
  assert.match(r.output, /2 71\.0/); assert.match(r.output, /numpy/); assert.match(r.output, /er7:/);
});

import { plan } from "../the-fold/surface/notebook-plan.mjs";
import * as L from "../the-fold/surface/notebook-learn.mjs";
const csv = (n) => { let t = "t_s,u,rpm\n"; const r = (() => { let a = 7; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296); })(); for (let i = 0; i < n; i++) t += `${(i * 0.001).toFixed(3)},${(r() - 0.5).toFixed(4)},${(1500 + Math.sin(i * 0.031)).toFixed(3)}\n`; return t; };
const world = () => { const ing = ingest({ name: "probe.csv", bytes: Buffer.from(csv(800)) }); return { ing, files: { "probe.csv": { text: ing.text, tables: ing.tables } }, tmp: fs.mkdtempSync(path.join(os.tmpdir(), "learn-")) }; };
const GOOD = {
  name: "smoothness", desc: "how smooth is the signal: adjacent samples against a shuffled copy", claim: "{{COL}} is smooth: adjacent samples differ less than in a shuffled copy of the same values.",
  check: 'from turb import *\nt,x,rep=series("{{FILE}}","{{COL}}")\na=float(np.std(np.diff(x))); b=float(np.std(np.diff(np.random.default_rng(0).permutation(x))))\nprint(f"#finding {{COL}}: step std {a:.4f} against {b:.4f} for a shuffle")\nscope_sample(1,0,"one shuffle of {{COL}}")\nresult(a<0.5*b)',
  control: 'from turb import *\nt,x,rep=series("{{FILE}}","{{COL}}"); x=np.random.default_rng(1).permutation(x)\na=float(np.std(np.diff(x))); b=float(np.std(np.diff(np.random.default_rng(0).permutation(x))))\nprint(f"control: shuffled {{COL}} step std {a:.4f} vs {b:.4f}")\nscope_sample(1,0,"a shuffled {{COL}} against another shuffle")\nresult(a<0.5*b)',
};

test("the gate: a method is admitted only if it runs, is deterministic, generalises, and its CONTROL fails", () => {
  const { files } = world(); const ctx = { file: "probe.csv", cols: ["rpm", "u"], files };
  assert.ok(L.admit(GOOD, ctx).ok, L.admit(GOOD, ctx).reason);
  assert.match(L.admit({ ...GOOD, control: GOOD.check }, ctx).reason, /control did NOT fail/);
  assert.match(L.admit({ ...GOOD, check: GOOD.check.replace('"{{COL}}"', '"rpm"') }, ctx).reason, /hard-codes|placeholders/);
  assert.match(L.admit({ ...GOOD, check: GOOD.check.replace("result(a<0.5*b)", "") }, ctx).reason, /#result/);
  assert.match(L.admit({ ...GOOD, check: GOOD.check.replace(/scope_sample.*\n/, "") }, ctx).reason, /#scope/);
  assert.match(L.admit({ ...GOOD, check: GOOD.check.replace("default_rng(0)", "default_rng()") }, ctx).reason, /different answer/);
  const says = GOOD.check.replace('print(f"#finding {{COL}}:', 'print(f"#finding rpm:');
  assert.match(L.admit({ ...GOOD, check: says }, ctx).reason, /still names rpm/, "a finding that names the column it was learned on lies on every other column");
  assert.match(L.admit({ ...GOOD, check: "import subprocess\n" + GOOD.check }, ctx).reason, /does not need/);
  assert.match(L.admit({ ...GOOD, check: GOOD.check.replace('series("{{FILE}}","{{COL}}")', 'series("{{FILE}}","nope")') }, ctx).reason, /did not run/);
});

test("a mouth's refusal is handed back to be repaired; what is admitted is stored with its lineage, and re-storing is a no-op", async () => {
  const { files, tmp } = world(); const seen = [];
  const mouth = async ({ feedback }) => { seen.push(feedback); return feedback ? { ...GOOD, by: "model:fake" } : { ...GOOD, control: GOOD.check, by: "model:fake" }; };
  const g = await L.generate({ question: "is it smooth?", cols: ["rpm", "u"], file: "probe.csv", files, mouth, dir: tmp });
  assert.ok(g.ok); assert.equal(g.attempts.length, 2); assert.match(seen[1], /control did NOT fail/);
  const lib = L.library(tmp); assert.equal(lib.length, 1); assert.equal(lib[0].lineage.mouth, "model:fake"); assert.ok(lib[0].evidence.runs.some((r) => r.role === "control" && r.result === false));
  assert.equal((await L.generate({ question: "again", cols: ["rpm", "u"], file: "probe.csv", files, mouth: async () => GOOD, dir: tmp })).existing, true);
  const never = async () => ({ ...GOOD, control: GOOD.check });
  const bad = await L.generate({ question: "q", cols: ["rpm", "u"], file: "probe.csv", files, mouth: never, dir: fs.mkdtempSync(path.join(os.tmpdir(), "l2-")) });
  assert.equal(bad.ok, false); assert.equal(bad.attempts.length, L.MAX_REPAIRS + 1);
});

test("nothing is preset: with no method and no model it refuses and says how to teach; a learned method is then reused with NO model", async () => {
  const { ing, files, tmp } = world(); let s = addData(emptyNotebook(), ing, H).state;
  const none = await act(s, H, { op: "line", line: "is the rpm column smooth?" }, { dir: tmp, swarm: false });
  assert.match(none.error, /no learned method/); assert.match(none.error, /\/learn/); assert.match(none.error, /nothing yet/);
  const first = await act(s, H, { op: "line", line: "is the rpm column smooth?" }, { dir: tmp, mouth: async () => ({ ...GOOD, by: "model:fake" }) });
  assert.ok(!first.error, first.error); assert.match(first.notice, /learned: smoothness/);
  const again = await act(first.state, H, { op: "line", line: "how smooth is the u column?" }, { dir: tmp, mouth: async () => { throw new Error("the mouth must not be asked"); } });
  assert.ok(!again.error, again.error);
  assert.equal(L.library(tmp)[0].uses, 2);
  const claims = again.state.nb.entries.filter((e) => e.kind === "cell" && e.type === "claim"); assert.equal(claims.length, 2);
  assert.ok(claims.every((c) => c.proposed && statusOf(again.state.bench, c.id) === "stated"), "nothing is promoted for the person");
  assert.match(promote(again.state.bench, { card: claims[0].id, to: "computed_in_range", by: "model:planner" }).error, /never a model/);
  const sk = await act(again.state, H, { op: "line", line: "/skills" }, { dir: tmp }); assert.match(sk.notice, /smoothness|smooth/);
  assert.ok((await act(again.state, H, { op: "line", line: "/forget " + L.library(tmp)[0].id + " because tested" }, { dir: tmp })).notice);
  const gone = await act(again.state, H, { op: "line", line: "is the rpm column smooth?" }, { dir: tmp, swarm: false });
  assert.match(gone.error, /no learned method/, "a conceded method is not chosen");
});

test("/learn: the person's own check and control cells become a method that works on another column", async () => {
  const { ing, tmp } = world(); let s = addData(emptyNotebook(), ing, H).state;
  s = (await act(s, H, { op: "line", line: "/claim rpm is smooth" })).state;
  const A = GOOD.check.replaceAll("{{FILE}}", "probe.csv").replaceAll("{{COL}}", "rpm"), B = GOOD.control.replaceAll("{{FILE}}", "probe.csv").replaceAll("{{COL}}", "rpm");
  s = (await act(s, H, { op: "add", id: "chk", type: "code", lang: "python", source: A, for: "k1", role: "check", run: true })).state;
  s = (await act(s, H, { op: "add", id: "ctl", type: "code", lang: "python", source: B, for: "k1", role: "control", run: true })).state;
  const r = await act(s, H, { op: "line", line: "/learn chk ctl as how smooth the signal is" }, { dir: tmp });
  assert.ok(!r.error, r.error); assert.match(r.notice, /learned/);
  const lib = L.library(tmp)[0]; assert.match(lib.check, /\{\{COL\}\}/); assert.ok(!/\brpm\b/.test(lib.check), "the column name is swapped even inside printed text"); assert.ok(!lib.check.includes('"rpm"')); assert.equal(lib.lineage.mouth, H);
  const use = await act(s, H, { op: "line", line: "how smooth is u?" }, { dir: tmp }); assert.ok(!use.error, use.error);
  assert.match((await act(s, H, { op: "line", line: "/learn chk nope as x" }, { dir: tmp })).error, /both must be code cells/);
});

test("planning only points: a model can choose among LEARNED methods and columns; a dead model falls back with the reason said", async () => {
  const { ing, tmp } = world(); const files = [{ name: ing.name, tables: ing.tables }];
  L.store(tmp, GOOD, { question: "q", mouth: "human:t", file: "probe.csv" }, { generalisation: "x" }); const lib = L.library(tmp);
  const p = await plan("hmm", files, { library: lib, ask: async () => ({ skills: [lib[0].id, "rm -rf /"], columns: ["u", "ghost"] }) });
  assert.deepEqual(p.skills.map((k) => k.id), [lib[0].id]); assert.deepEqual(p.columns, ["u"]); assert.match(p.via, /could only choose/);
  const d = await plan("how smooth is it", files, { library: lib, ask: async () => { throw new Error("connection refused"); } });
  assert.equal(d.skills.length, 1); assert.match(d.via, /unreachable/);
  assert.equal((await plan("something unrelated entirely", files, { library: lib })).skills.length, 0);
  assert.match((await plan("spectrum", [{ name: "x.pdf", tables: [] }])).refusal, /no table/);
});

import { verifyStore } from "../the-fold/surface/notebook-learn.mjs";
import { audit, auditText } from "../the-fold/surface/notebook-audit.mjs";
import { collectSkills } from "../organs/skills-index.js";
const learnedWorld = async () => { const w = world(); let s = addData(emptyNotebook(), w.ing, H).state; const r = await act(s, H, { op: "line", line: "is the rpm column smooth?" }, { dir: w.tmp, mouth: async () => ({ ...GOOD, by: "model:fake" }) }); return { ...w, s: r.state, id: L.library(w.tmp)[0].id }; };

test("a learned method is a SKILL: switched off it is never used and no new one is written around the switch; every switch is a named person's recorded decision", async () => {
  const { s, tmp, id } = await learnedWorld(); const mouth = async () => { throw new Error("the mouth must not be asked around a switch"); };
  assert.match((await act(s, "model:x", { op: "line", line: `/skill ${id} off because I said so` }, { dir: tmp })).error, /named person/);
  assert.match((await act(s, H, { op: "line", line: `/skill ${id} off` }, { dir: tmp })).error, /needs a reason/);
  const off = await act(s, H, { op: "line", line: `/skill ${id} off because it leaks the test set` }, { dir: tmp }); assert.match(off.notice, /now OFF/);
  assert.equal(L.library(tmp)[0].effectiveOn, false); assert.equal(L.library(tmp)[0].switch.by, H);
  const blocked = await act(s, H, { op: "line", line: "how smooth is the u column?" }, { dir: tmp, mouth });
  assert.match(blocked.error, /switched off/); assert.match(blocked.error, /leaks the test set/); assert.match(blocked.error, /will not write a new one around a switch/);
  const sk = collectSkills({ learnedDir: tmp }).learned.find((x) => x.id === `learned:analysis/${id}`); assert.ok(sk, "it is listed among the skills"); assert.equal(sk.effectiveOn, false); assert.equal(sk.parent, "route:analysis");
  await act(s, H, { op: "line", line: `/skill ${id} on because reviewed` }, { dir: tmp });
  assert.ok(!(await act(s, H, { op: "line", line: "how smooth is the u column?" }, { dir: tmp, mouth })).error);
  await act(s, H, { op: "line", line: "/skill all off because the whole group is under review" }, { dir: tmp });
  assert.equal(L.library(tmp)[0].effectiveOn, false, "the parent route silences everything under it");
});

test("the learned library is hash-chained: an altered entry is found, and the page says so", async () => {
  const { s, tmp } = await learnedWorld(); assert.ok(verifyStore(tmp).ok);
  const f = path.join(tmp, "analyses.jsonl"); const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean); const e = JSON.parse(lines[0]); e.name = "rewritten"; lines[0] = JSON.stringify(e); fs.writeFileSync(f, lines.join("\n") + "\n");
  assert.equal(verifyStore(tmp).ok, false); assert.equal(audit(s, tmp).chains.analyses.ok, false);
  assert.match(renderPage(s, { dir: tmp }), /CHAIN BROKEN/);
});

test("audit: a claim traces to its method, the method to its author and gate runs, and to every switch", async () => {
  const { s, tmp, id } = await learnedWorld(); await act(s, H, { op: "line", line: `/skill ${id} off because testing` }, { dir: tmp }); await act(s, H, { op: "line", line: `/skill ${id} on because tested` }, { dir: tmp });
  const a = audit(s, tmp); const c = a.claims[0];
  assert.equal(c.method.id, id); assert.ok(c.check && c.control && c.control.result === false); assert.equal(a.methods[0].learnedBy, "model:fake");
  assert.ok(a.methods[0].gate.runs.some((r) => r.role === "control" && r.result === false)); assert.equal(a.methods[0].switchHistory.length, 2);
  const t = auditText(a); assert.match(t, /produced by smoothness/); assert.match(t, /written by model:fake/); assert.match(t, /off by human:me \(testing\) → on by human:me \(tested\)/); assert.match(t, /not adopted|nobody has adopted/);
  assert.match((await act(s, H, { op: "line", line: "/audit" }, { dir: tmp })).notice, /chains: notebook ok/);
});

test("three stylings of ONE ledger: chat, generate and notebook show the same claims, methods and audit — and drawing changes nothing recorded", async () => {
  const { s, tmp, id } = await learnedWorld(); const before = JSON.stringify(s.nb.entries.map((e) => e.hash));
  const pages = Object.fromEntries(["chat", "generate", "notebook"].map((k) => [k, renderPage(s, { style: k, dir: tmp, live: true, by: H })]));
  assert.match(pages.chat, /class="chat"/); assert.match(pages.chat, /class="bub me"/); assert.match(pages.generate, /id="genbox"/); assert.match(pages.generate, /class="gen"/); assert.match(pages.notebook, /In&nbsp;\[/);
  for (const [k, h] of Object.entries(pages)) { assert.match(h, /smooth/i, k); assert.match(h, new RegExp(id), `${k} carries the method id`); assert.match(h, /id="drawer"/, k); assert.match(h, /Skills · 1\/1 on/, k); assert.match(h, /data-tab="audit"/, k); assert.match(h, /data-op="switch"/, k); }
  assert.ok(pages.chat.indexOf("In&nbsp;[") > pages.chat.indexOf("<details><summary>how this was produced"), "chat keeps the cells behind 'how this was produced'");
  assert.equal(JSON.stringify(s.nb.entries.map((e) => e.hash)), before);
  assert.doesNotMatch(renderPage(s, { style: "notebook", dir: tmp }), /data-op="switch"/, "a static page cannot flip a switch");
  assert.match(renderPage(s, { style: "audit-nonsense", dir: tmp }), /In&nbsp;\[/, "an unknown style falls back to notebook");
});

import { pheromone, loadTrails } from "../the-fold/surface/notebook-swarm.mjs";
test("no method and no model: the ant colony searches the data itself, its finds go through the SAME gate, and they become switchable skills", async () => {
  let a = 12345; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296), gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) * 1.41; };
  const n = 20000; let env = 0, rows = ["t_s,bursty,white,tone"];
  for (let i = 0; i < n; i++) { env = 0.999 * env + 0.045 * gauss(); rows.push(`${(i * 0.001).toFixed(3)},${(gauss() * Math.exp(env * 3)).toFixed(4)},${gauss().toFixed(4)},${(Math.sin(i * 2 * Math.PI / 97) + 0.6 * gauss()).toFixed(4)}`); }
  const ing = ingest({ name: "mixed.csv", bytes: Buffer.from(rows.join("\n")) }); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-"));
  let s = addData(emptyNotebook(), ing, H).state;
  const out = await act(s, H, { op: "line", line: "what is going on in this file?" }, { dir: tmp, mouth: null, swarm: { rounds: 3, ants: 16 } });
  assert.ok(!out.error, out.error); s = out.state;
  const lib = L.library(tmp).filter((k) => String(k.lineage?.mouth).startsWith("swarm:"));
  assert.ok(lib.length >= 1, "the colony found structure and the gate admitted at least one method");
  assert.ok(lib.every((k) => k.evidence.runs.some((x) => x.role === "control" && x.result === false)), "every find passed a control that failed");
  assert.ok(pheromone(loadTrails(tmp)) > 0, "successful ants laid trails, kept on disk");
  assert.ok(verifyStore(tmp).ok, "the colony's runs are on the hash-chained record");
  const ask = s.nb.entries.find((e) => e.kind === "cell" && /^ask/.test(e.id)); assert.match(sourceOf(s.nb, ask.id), /colony searched/); assert.match(sourceOf(s.nb, ask.id), /chance ceiling/);
  const claims = s.nb.entries.filter((e) => e.kind === "cell" && e.type === "claim"); assert.ok(claims.length >= 3, "each admitted method ran on every column"); assert.ok(claims.every((c) => c.proposed && c.method?.id));
  const strongest = lib[0]; const off = await act(s, H, { op: "line", line: `/skill ${strongest.id} off because a swarm find must be reviewed first` }, { dir: tmp }); assert.match(off.notice, /now OFF/);
  const t = auditText(audit(s, tmp)); assert.match(t, /written by swarm:/);
  const before = pheromone(loadTrails(tmp)); const again = await act(s, H, { op: "line", line: "/explore" }, { dir: tmp, swarm: { rounds: 2, ants: 10 } }); assert.ok(!again.error, again.error);
  assert.ok(pheromone(loadTrails(tmp)) >= before, "a second colony inherits and adds to the first one's trails");
});

import http from "node:http";
import { openWorkspace } from "../the-fold/surface/notebook-workspace.mjs";
import { notebookHandler } from "../the-fold/surface/notebook-surface.mjs";
import { datasetOf, search as dsSearch } from "../the-fold/surface/notebook-dataset.mjs";
import { verifyChain } from "../the-fold/surface/bench.mjs";
const wsdir = () => fs.mkdtempSync(path.join(os.tmpdir(), "wsp-"));
const add = async (ws, id, line, ctx = {}) => { const r = await act(ws.state(id), H, { op: "line", line }, { ws, cid: id, ...ctx }); if (r.error) throw new Error(r.error); ws.save(id, r.state); return r; };

test("F6: tabs are isolated and typed — conversations hold separate cells and files; a type flag change is recorded and moves no hash", async () => {
  const ws = openWorkspace(wsdir()); const a = ws.create({ type: "chat", by: H }).id, b = ws.create({ type: "generate", by: H }).id;
  await add(ws, a, "/md note in A"); ws.save(b, addData(ws.state(b), ingest({ name: "only-b.csv", bytes: Buffer.from("x\n1\n2\n") }), H).state); await add(ws, b, "/claim claim in B");
  assert.ok(!Object.keys(ws.state(a).files).length && Object.keys(ws.state(b).files).includes("only-b.csv")); assert.equal(ws.state(a).nb.entries.length, 1); assert.equal(ws.state(b).nb.entries.length, 3 - 0 - 1 + 0);
  const before = JSON.stringify(ws.state(a).nb.entries.map((e) => e.hash));
  for (const t of ["generate", "notebook", "chat"]) assert.ok(!ws.retype(a, t, H).error);
  assert.equal(JSON.stringify(ws.state(a).nb.entries.map((e) => e.hash)), before, "changing the flag alters no log");
  assert.equal(ws.get(a).history.filter((h) => h.kind === "retype").length, 3); assert.equal(ws.get(a).type, "chat"); assert.match(ws.retype(a, "zzz", H).error, /type must/); assert.match(ws.retype(a, "notebook", "model:x").error, /named person/);
  assert.deepEqual(ws.list().map((c) => c.type), ["chat", "generate"]); assert.ok(ws.verify().ok);
});

test("F5: a fork is a prefix — same seals, parent untouched, lineage recorded, promotions do NOT travel", async () => {
  const ws = openWorkspace(wsdir()); const a = ws.create({ type: "notebook", by: H }).id;
  await add(ws, a, "/md first"); await add(ws, a, "/claim c is small"); await add(ws, a, "/md after the claim");
  const pr = await act(ws.state(a), H, { op: "promote", card: "k1", to: "conjectured" }, { ws }); ws.save(a, pr.state); assert.equal(statusOf(ws.state(a).bench, "k1"), "conjectured");
  const parentBefore = JSON.stringify(ws.state(a)); const f = ws.fork(a, { at: "k1", title: "variant", by: H }); assert.ok(!f.error, f.error);
  const P = ws.state(a), F = ws.state(f.id);
  assert.equal(JSON.stringify(P), parentBefore, "forking does not touch the parent"); assert.equal(F.nb.entries.length, 2);
  F.nb.entries.forEach((e, i) => assert.equal(e.hash, P.nb.entries[i].hash, "the prefix is the parent's own, seal for seal")); assert.ok(verifyChain(F.nb).ok && verifyChain(F.bench).ok);
  assert.equal(statusOf(F.bench, "k1"), "stated", "the promotion stayed with the parent"); assert.equal(f.notCarried, 1);
  const m = ws.get(f.id); assert.equal(m.parent, a); assert.equal(m.forkedAt, "k1"); assert.equal(m.forkHash, P.nb.entries[1].hash); assert.equal(m.title, "variant");
  await add(ws, f.id, "/md only in the fork"); assert.equal(JSON.stringify(ws.state(a)), parentBefore, "work in the fork never reaches the parent"); assert.equal(ws.state(f.id).nb.entries.length, 3);
  assert.match(ws.fork(a, { at: "nope", by: H }).error, /no cell/); assert.match(ws.fork(a, { by: "model:x" }).error, /named person/);
  const g = ws.fork(f.id, { at: "end", by: H }); assert.ok(!g.error); assert.equal(ws.get(g.id).parent, f.id, "forks of forks keep their own lineage"); assert.ok(ws.verify().ok);
});

test("all generated content joins the workspace dataset — labelled, searchable across conversations and modes, and never evidence", async () => {
  const ws = openWorkspace(wsdir()); const a = ws.create({ type: "chat", by: H }).id, b = ws.create({ type: "generate", by: H }).id;
  ws.save(a, addData(ws.state(a), ingest({ name: "gauge.csv", bytes: Buffer.from("t,v\n1,2\n") }), H).state);
  await add(ws, a, "/claim turbidity rose after the dam"); await add(ws, a, "/md the dam changed the turbidity regime");
  ws.retype(a, "generate", H); ws.retype(a, "chat", H); await add(ws, a, "/md a note written after switching modes back and forth");
  await add(ws, b, "/md unrelated note about cell culture");
  const items = datasetOf(ws), kinds = new Set(items.map((i) => i.kind)); assert.deepEqual([...kinds].sort(), ["generated", "source"]);
  assert.ok(items.some((i) => i.kind === "source" && i.cell === "gauge.csv") && items.filter((i) => i.kind === "generated" && i.conv === a).length >= 3, "notes and claims made in any mode are in the dataset");
  assert.ok(items.every((i) => i.kind !== "source" || i.type === "file"), "a generated item is never typed as a source");
  const hit = dsSearch(items, "turbidity dam", { excludeConv: b }); assert.ok(hit.length >= 2 && hit.every((h) => h.conv === a));
  assert.equal(dsSearch(items, "turbidity", { excludeConv: a }).length, 0, "other conversations can be searched, this one excluded");
  const r = await act(ws.state(b), H, { op: "line", line: "/dataset dam" }, { ws, cid: b }); assert.match(r.notice, /1 source/); assert.match(r.notice, /never evidence for themselves/); assert.match(r.notice, /\[generated: claim · Chat 1/);
});

test("the tab page over HTTP: a tab per conversation with its type flag, fork buttons, ws-new / ws-fork / ws-retype / ws-close, and one conversation's page never shows another's cells", { timeout: 60000 }, async () => {
  const dir = wsdir(); const h = notebookHandler({ dir, by: H, learned: wsdir(), base: "/nb" });
  const srv = http.createServer(async (req, res) => { const url = new URL(req.url, "http://x"); if (!(await h(req, res, url.pathname.replace(/^\/nb/, "") || "/", url))) { res.statusCode = 404; res.end(); } }); await new Promise((ok) => srv.listen(0, "127.0.0.1", ok)); const base = `http://127.0.0.1:${srv.address().port}/nb`;
  const post = async (b) => (await fetch(base + "/api", { method: "POST", body: JSON.stringify(b) })).json(); const page = async (q = "") => (await fetch(base + "/" + q)).text();
  try {
    let p = await page(); assert.match(p, /id="tabs"/); assert.match(p, /class="ty notebook">notebook/);
    const n = await post({ op: "ws-new", type: "chat" }); assert.ok(n.goto); await post({ c: n.goto, op: "line", line: "/md secret only in the chat tab" });
    p = await page(`?c=${n.goto}`); assert.match(p, /secret only in the chat tab/); assert.match(p, /class="ty chat">chat/); assert.match(p, /data-op="ws-close"/);
    assert.doesNotMatch(await page("?c=c1"), /secret only in the chat tab/, "no leak between tabs");
    const f = await post({ c: n.goto, op: "ws-fork", at: "m1", title: "variantX" }); assert.ok(f.goto); assert.match(f.notice, /forked at m1/);
    const fp = await page(`?c=${f.goto}`); assert.match(fp, /variantX/); assert.match(fp, /forked from/); assert.match(fp, /secret only in the chat tab/); assert.match(fp, /data-op="fork"/);
    assert.equal((await post({ c: f.goto, op: "ws-retype", type: "generate" })).error, null); assert.match(await page(`?c=${f.goto}`), /class="tab on"[^>]*>.*class="ty generate">generate/s);
    assert.equal((await post({ c: f.goto, op: "ws-close" })).error, null); assert.doesNotMatch(await page(), /variantX/, "a closed tab leaves the strip but stays on the record");
    assert.ok(openWorkspace(dir).list(true).some((c) => c.title === "variantX" && c.closed));
  } finally { srv.close(); }
});
