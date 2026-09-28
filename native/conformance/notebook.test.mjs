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
  assert.equal(r.output.trim(), "6.0"); assert.equal(r.figures.length, 1); assert.match(r.figures[0].sha, /^[0-9a-f]{64}$/);
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
  const none = await act(s, H, { op: "line", line: "is the rpm column smooth?" }, { dir: tmp });
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
  const gone = await act(again.state, H, { op: "line", line: "is the rpm column smooth?" }, { dir: tmp });
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
