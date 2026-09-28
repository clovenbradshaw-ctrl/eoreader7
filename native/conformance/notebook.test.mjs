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

test("the page persists, reloads verified, and refuses to load a tampered file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nbp-"));
  let s = emptyNotebook();
  s = act(s, H, { op: "add", id: "c", type: "code", lang: "js", source: "console.log(5)" }).state;
  s = act(s, H, { op: "run", cell: "c" }).state; save(dir, s);
  const back = load(dir); assert.match(renderPage(back), /chain verifies/); assert.match(renderPage(back), /console\.log\(5\)/);
  const j = JSON.parse(fs.readFileSync(path.join(dir, "notebook.json"), "utf8")); j.nb[0].source = "console.log(9)"; fs.writeFileSync(path.join(dir, "notebook.json"), JSON.stringify(j));
  assert.throws(() => load(dir), /does not verify/);
  assert.ok(act(emptyNotebook(), "model:x", { op: "add", id: "z", type: "claim", source: "a" }).state, "a model may PROPOSE a claim");
});
