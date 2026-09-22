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
    // one.example answers every query (so it is an exemplar page AND a
    // material page); two.example is the material hunt's second host. The
    // material text carries Nashville (the operator's subject) in one
    // paragraph and furniture in another.
    fetch: async (url) => ({ title: url, text: /material|two\.example|the%20river/.test(url) ? "Jump to content\n\nNashville's wharf on the river handled cotton for a century.\n\nAn essay runs five paragraphs." : "An essay runs five paragraphs. A page about the river. ".repeat(10), chars: 550, headings: ["Introduction", "Conclusion"] }),
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
    // STAGE 5: the material pages earn tier 1 by carrying the subject; the
    // ground names its tiers; the draft's parts carry them.
    const h = lines.find((l) => l.role === "hunt");
    assert.ok(h, "no hunt line");
    assert.match(h.title, /^Hunt: \d+ fetched source\(s\) admitted/);
    assert.match(h.text, /^tier 0  ground\.md/m);
    assert.match(h.text, /^tier 1  /m, "a fetched page earned admission");
    // The two-paragraph fixture has no being named in more parts than not
    // (Nashville is in one), so admission falls to the ask's own subject word.
    assert.match(h.basis, /carries a word of the ask's subject \("river"\)/);
    const g = lines.find((l) => l.role === "ground");
    assert.match(g.title, /ground\.md \(tier 0\)/);
    assert.match(g.title, /\(tier 1\)/);
    assert.ok(lines.findIndex((l) => l.role === "hunt") < lines.findIndex((l) => l.role === "ground"));
    assert.ok(lines.findIndex((l) => l.role === "shape") < lines.findIndex((l) => l.role === "hunt"));
    // STAGES 6–7: the skeleton loop's loop 0 lands, then the settled arrangement.
    const loop0 = lines.find((l) => l.role === "arrange" && /^Skeleton loop 0/.test(l.title));
    assert.ok(loop0, "no skeleton loop 0 line");
    assert.match(loop0.text, /statements placed/);
    const arr = lines.find((l) => l.role === "arrange" && /^Arrangement:/.test(l.title));
    assert.match(arr.basis, /loop\(s\) after the composition/);
    assert.ok(lines.indexOf(loop0) < lines.indexOf(arr));
  } finally { cleanup(wet.docId); }
});

test("STAGES 8–9: the pathos pass loops until Gebser arrives, bounded by a call budget, and the piece lands last with every loop's verdict beneath it", async () => {
  // Pass 1 fixes the steamboats sentence and fails the warehouses one (the
  // rewrite loses its anchors); pass 2 fixes the warehouses one. Clark's
  // refused bridge keeps something licensed throughout, so the loop must
  // be stopped by the budget or by a changeless pass — never by arrival.
  let warehouses = 0;
  const draw = async (msgs) => {
    const u = msgs[msgs.length - 1].content;
    if (u.includes("Rewrite this sentence plainly")) return /warehouses/.test(u) ? (++warehouses === 1 ? "Nothing." : "Warehouses lined the waterfront by the 1850s.") : "Steamboats reached Nashville in 1819 and carried cotton to New Orleans.";
    if (u.includes("carries the reader from")) return "Time passed.";
    if (/flood/.test(u)) return "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet.";
    return "The bustling steamboats reached Nashville in 1819 and carried cotton to New Orleans. The bustling warehouses lined the waterfront by the 1850s.";
  };
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-pathos", draw, pathosBudget: 10 });
  try {
    const lines = read(docId);
    const arrivals = lines.filter((l) => l.role === "arrive");
    assert.ok(arrivals.length >= 2, `the loop must run more than one pass when something is still licensed (ran ${arrivals.length})`);
    assert.ok(arrivals.every((l, i) => new RegExp(`^Gebser · pass ${i + 1} · `).test(l.title)), "each pass has its own arrival verdict");
    assert.match(arrivals.at(-1).title, /stopped$/);
    assert.match(arrivals.at(-1).text, /stopped: (a pass that changed nothing|the budget of 10 model call\(s\) is spent|nothing left licensing a revision)/);
    assert.ok(lines.some((l) => l.role === "check" && /^Loop · pathos 2 · /.test(l.title)), "pass 2's loops are checked like pass 1's");
    assert.ok(lines.some((l) => l.role === "flesh" && /tightened/.test(l.title) && /Warehouses lined/.test(l.text)), "pass 2's rewrite landed");
    const summary = lines.find((l) => l.role === "summary");
    assert.match(summary.text, /pathos passes: [2-9] \(budget 10 call\(s\); stopped: /);
    // Stage 9: the piece is the last line, with the loop verdicts counted beneath it.
    const last = lines.at(-1);
    assert.equal(last.role, "piece");
    assert.match(last.title, /^Piece: 2 part\(s\)$/);
    assert.match(last.basis, /^\d+ loop verdict\(s\) on the record beneath this line/);
    assert.equal(Number(last.basis.match(/^(\d+)/)[1]), lines.filter((l) => l.role === "check").length);
    assert.match(last.text, /Steamboats reached Nashville|steamboats reached Nashville/);
  } finally { cleanup(docId); }
  // The same run under a budget of one call stops at pass 1, and says why.
  warehouses = 0;
  const tight = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-pathos-budget", draw, pathosBudget: 1 });
  try {
    const lines = read(tight.docId);
    const arrivals = lines.filter((l) => l.role === "arrive");
    assert.equal(arrivals.length, 1);
    assert.match(arrivals[0].text, /stopped: the budget of 1 model call\(s\) is spent/);
    assert.match(arrivals[0].basis, /^diaphaneity [\d.]+ · [1-9]\d* of 1 model call\(s\) spent on pathos/);
  } finally { cleanup(tight.docId); }
});

test("STAGE 8, ADDITIVE ONLY: a pass that changes nothing ends the loop, and the first arrival that arrives ends it too", async () => {
  const draw = async () => "Steamboats reached Nashville in 1819 and carried cotton to New Orleans, and by the 1850s warehouses lined the waterfront.";
  const { docId } = await runPipeline({ task: "Write a piece from this material.", groundFiles: [groundFile], id: "test-pipe-pathos-settle", draw, pathosBudget: 50 });
  try {
    const lines = read(docId);
    const arrivals = lines.filter((l) => l.role === "arrive");
    assert.equal(arrivals.length, 1, "with a budget of 50, only arriving or a changeless pass can stop at pass 1");
    assert.match(arrivals[0].text, /stopped: (nothing left licensing a revision|a pass that changed nothing)|arrived/);
    assert.ok(lines.at(-1).role === "piece");
  } finally { cleanup(docId); }
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
