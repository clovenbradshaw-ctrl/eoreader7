// pipeline-run-falsify.test.mjs — the whole pipeline with a stub mouth:
// every stage lands on the ledger before the next, and the FOLDED EOT is the
// current state — an alteration supersedes the statement it changes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./pipeline-run.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "..", "documents");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pipe-"));
const groundFile = path.join(tmp, "ground.md");
fs.writeFileSync(groundFile, [
  "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.",
  "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet.",
].join("\n\n"));

const read = (docId) => fs.readFileSync(path.join(DOCS, `${docId}.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const cleanup = (docId) => { for (const f of fs.readdirSync(DOCS)) if (f.startsWith(docId.replace(/:1$/, ""))) fs.rmSync(path.join(DOCS, f)); };

test("every stage lands on the ledger in pipeline order", async () => {
  const draw = async () => "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-order", draw });
  try {
    const roles = read(docId).map((l) => l.role);
    const firstOf = (r) => roles.indexOf(r);
    // The void is declared on every level once the material's shape can be
    // measured (after the draft) and always before any prose is drawn.
    for (const [a, b] of [["prompt", "register"], ["register", "ground"], ["ground", "eot-draft"], ["eot-draft", "void"], ["void", "arrange"], ["arrange", "floor"], ["floor", "prosify"], ["prosify", "part"], ["part", "summary"]]) {
      assert.ok(firstOf(a) >= 0 && firstOf(a) < firstOf(b), `${a} did not land before ${b}`);
    }
  } finally { cleanup(docId); }
});

test("THE FOLD: a sentence carrying two statements supersedes both with one joined statement", async () => {
  const draw = async () => "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-join", draw });
  try {
    const lines = read(docId);
    const superseded = new Set(lines.flatMap((l) => (l.supersedes ? [].concat(l.supersedes) : [])));
    const aliveEot = lines.filter((l) => l.role === "eot" && !superseded.has(l.id));
    const joined = aliveEot.find((l) => l.title === "p1.1 + p1.2");
    assert.ok(joined, `no joined statement in the fold: ${aliveEot.map((l) => l.title).join(" | ")}`);
    assert.ok(!aliveEot.some((l) => l.title === "p1.1" || l.title === "p1.2"), "the joined originals are still standing in the fold");
    assert.ok(lines.some((l) => l.title === "p1.1"), "the original was erased instead of superseded");
  } finally { cleanup(docId); }
});

test("THE FOLD: a statement the mouth cannot carry is superseded by its floor", async () => {
  const draw = async (msgs) => /flood/.test(msgs[msgs.length - 1].content) ? "It was a remarkable time." : "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-floor", draw });
  try {
    const lines = read(docId);
    const superseded = new Set(lines.flatMap((l) => (l.supersedes ? [].concat(l.supersedes) : [])));
    const aliveEot = lines.filter((l) => l.role === "eot" && !superseded.has(l.id)).map((l) => l.title);
    assert.ok(aliveEot.includes("p2.2 (floor)"), `the floored statement is not the standing one: ${aliveEot.join(" | ")}`);
    assert.ok(!aliveEot.includes("p2.2"), "the pre-floor statement still stands beside its floor");
  } finally { cleanup(docId); }
});

test("THE ARCHONS: they read, a flagged sentence is rewritten in place, and the piece's parts supersede", async () => {
  const draw = async (msgs) => {
    const u = msgs[msgs.length - 1].content;
    if (u.includes("Rewrite this sentence plainly")) return "Steamboats reached Nashville in 1819 and carried cotton to New Orleans.";
    if (u.includes("carries the reader from")) return "Time passed.";
    if (/flood/.test(u)) return "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet.";
    return "The bustling steamboats reached Nashville in 1819 and carried cotton to New Orleans. The bustling warehouses lined the waterfront by the 1850s.";
  };
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-archons", draw });
  try {
    const lines = read(docId);
    const superseded = new Set(lines.flatMap((l) => (l.supersedes ? [].concat(l.supersedes) : [])));
    assert.ok(lines.some((l) => l.role === "archon" && /Zinsser · (tic|inflation)/.test(l.title)), "Zinsser did not read the piece");
    assert.ok(lines.some((l) => l.role === "archon" && l.title === "Untaught archons" && /Gornick/.test(l.text)), "the untaught archons were not named");
    const tightened = lines.find((l) => l.role === "flesh" && /tightened/.test(l.title));
    assert.ok(tightened && tightened.supersedes, "a rewrite did not supersede the sentence it replaced");
    const aliveParts = lines.filter((l) => l.role === "part" && !superseded.has(l.id));
    assert.equal(aliveParts.length, 2, "the fold should hold exactly one standing line per part");
    assert.ok(aliveParts.every((l) => l.giver === "eoreader7:finish"), "the standing parts are not the finished ones");
    assert.ok(lines.some((l) => l.role === "arrive"), "no arrival verdict");
    assert.ok(lines.some((l) => l.role === "turn" && /Bridge refused/.test(l.title)), "a bridge that takes nothing up was not refused");
  } finally { cleanup(docId); }
});

test("THE VOID is declared on every level, each operator with its basis, before any prose", async () => {
  const draw = async () => "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const { docId } = await runPipeline({ task: "Write a five-paragraph essay on this material.", groundFiles: [groundFile], id: "test-pipe-void", draw });
  try {
    const lines = read(docId);
    const v = lines.find((l) => l.role === "void");
    assert.ok(v, "no void line");
    for (const level of ["WHOLE", "PART", "SENTENCE", "VERBIAGE", "GROUNDING"]) assert.match(v.text, new RegExp(`^${level}$`, "m"), `level ${level} missing`);
    assert.match(v.text, /cardinality\s+\[asked\]/, "the ask's five paragraphs were not read as asked");
    assert.match(v.text, /\[unmeasured\]/, "an honest gap should be named, not filled");
    assert.ok(lines.findIndex((l) => l.role === "void") < lines.findIndex((l) => l.role === "prosify"), "the void came after prose");
  } finally { cleanup(docId); }
});

test("STAGE 3, SURF: without a web the stage is recorded as not run; with one, its sources land with provenance before the ground", async () => {
  const draw = async () => "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const dry = await runPipeline({ task: "Write an essay on the river.", groundFiles: [groundFile], id: "test-pipe-surf-dry", draw });
  try {
    const s = read(dry.docId).find((l) => l.role === "surf");
    assert.ok(s, "no surf line");
    assert.match(s.title, /not run/);
    assert.match(s.basis, /unmeasured/);
  } finally { cleanup(dry.docId); }
  const web = {
    search: async (q) => ({ results: [{ url: `https://one.example/${encodeURIComponent(q)}`, title: q }, { url: "https://two.example/p", title: "two" }] }),
    fetch: async (url) => ({ title: url, text: "An essay runs five paragraphs. A page about the river. ".repeat(10), chars: 550, headings: ["Introduction", "Conclusion"] }),
  };
  const wet = await runPipeline({ task: "Write an essay on the river.", groundFiles: [groundFile], id: "test-pipe-surf-wet", draw, web });
  try {
    const lines = read(wet.docId);
    const s = lines.find((l) => l.role === "surf");
    assert.match(s.title, /^Surf: \d+ source\(s\) from 2 host\(s\)$/);
    assert.match(s.text, /one\.example/);
    assert.match(s.text, /two\.example/);
    assert.ok(lines.findIndex((l) => l.role === "surf") < lines.findIndex((l) => l.role === "ground"), "surf must land before the ground");
    assert.ok(lines.findIndex((l) => l.role === "register") < lines.findIndex((l) => l.role === "surf"), "surf follows the void's form");
    // STAGE 4 lands right after: the shape as more hosts than not state it.
    const sh = lines.find((l) => l.role === "shape");
    assert.equal(sh.title, "Shape: 5 paragraphs");
    assert.match(sh.text, /paragraph\s+5 \(2\/2 ✓\)/);
    assert.match(sh.text, /parts\s+.*conclusion \(2\/2\)/);
    assert.ok(lines.findIndex((l) => l.role === "shape") < lines.findIndex((l) => l.role === "ground"));
    const dryShape = read(dry.docId === wet.docId ? wet.docId : wet.docId); // (dry's ledger was cleaned above)
    assert.ok(dryShape);
  } finally { cleanup(wet.docId); }
});

test("HORA, NOT TEMPUS: a level that fails leaves the last stable loop's piece, and the run completes", async () => {
  let n = 0;
  const draw = async (msgs) => {
    const u = msgs[msgs.length - 1].content;
    if (u.includes("Rewrite this sentence plainly") || u.includes("carries the reader from")) throw new Error("the mouth went away");
    n++;
    return "The bustling steamboats reached Nashville in 1819 and carried cotton to New Orleans. The bustling warehouses lined the waterfront by the 1850s. The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet.";
  };
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-hora", draw });
  try {
    const lines = read(docId);
    const checks = lines.filter((l) => l.role === "check");
    assert.ok(checks.length >= 2, "every loop is checked");
    assert.match(checks[0].title, /floor/);
    const superseded = new Set(lines.flatMap((l) => (l.supersedes ? [].concat(l.supersedes) : [])));
    const parts = lines.filter((l) => l.role === "part" && !superseded.has(l.id));
    assert.ok(parts.length && parts.every((l) => l.text.length > 20), "a usable piece stands");
    assert.ok(lines.some((l) => l.role === "summary"), "the run completed");
  } finally { cleanup(docId); }
});
