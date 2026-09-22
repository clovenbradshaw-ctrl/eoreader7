// prosify-falsify.test.mjs — the prosified pass: coarse draw per part, a
// finer draw only for the facts it measurably dropped, and the source
// sentence as the floor. A stub mouth makes every branch deterministic.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft } from "./eot-draft.js";
import { prosify } from "./prosify.js";

const GROUND = [
  "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.",
  "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet and cost two billion dollars.",
].join("\n\n");
// A neutral ask: selection is the draft stage's business and is tested there.
const TASK = "Write a piece from this material.";
const draft = () => buildDraft({ task: TASK, ground: GROUND });

const stub = (answers) => {
  const calls = [];
  const draw = async (msgs) => {
    const user = msgs[msgs.length - 1].content;
    calls.push(user);
    for (const [cue, reply] of answers) if (user.includes(cue)) return typeof reply === "function" ? reply(user) : reply;
    return "";
  };
  return { draw, calls };
};

test("a part the coarse draw carries whole spends no finer draw", async () => {
  const { draw, calls } = stub([
    ["Steamboats reached", "Steamboats reached Nashville in 1819 and carried cotton downriver to New Orleans. By the 1850s warehouses lined the waterfront."],
    ["flood of 1927", "The flood of 1927 covered the low city. In 2010 the flood crested at 51.86 feet and cost two billion dollars."],
  ]);
  const r = await prosify(draft(), { draw, ground: GROUND, task: TASK });
  assert.equal(calls.length, 2, `expected one draw per part, got ${calls.length}`);
  assert.deepEqual(r.parts.map((p) => p.status), ["carried whole", "carried whole"]);
});

test("THE RECURSION: only the dropped fact is drawn again, alone", async () => {
  const { draw, calls } = stub([
    ["Here is what this part says", (u) => u.includes("Steamboats") ? "Steamboats reached Nashville in 1819 and carried cotton to New Orleans." : "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet and cost two billion dollars."],
    ["Here is the next fact", "By the 1850s, warehouses lined the Nashville waterfront."],
  ]);
  const r = await prosify(draft(), { draw, ground: GROUND, task: TASK });
  const finer = calls.filter((c) => c.includes("Here is the next fact"));
  assert.equal(finer.length, 1, "exactly one finer draw, for the one dropped fact");
  assert.match(finer[0], /Warehouses lined the waterfront/);
  assert.equal(r.parts[0].status, "recursed");
  assert.match(r.parts[0].prose, /warehouses lined/i);
});

test("THE FLOOR: a fact the mouth cannot carry lands as its own source sentence, verbatim", async () => {
  const { draw } = stub([
    ["Here is what this part says", (u) => u.includes("Steamboats") ? "Steamboats reached Nashville in 1819 and carried cotton to New Orleans." : "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet and cost two billion dollars."],
    ["Here is the next fact", "It was a remarkable time of change."],
  ]);
  const r = await prosify(draft(), { draw, ground: GROUND, task: TASK });
  assert.ok(r.parts[0].prose.includes("Warehouses lined the waterfront by the 1850s."), "the floor was not the verbatim source");
  assert.equal(r.parts[0].floored, 1);
});

test("an invented name is refused, and the fact falls to the floor rather than to the invention", async () => {
  const { draw } = stub([
    ["Here is what this part says", (u) => u.includes("Steamboats") ? "Steamboats reached Nashville in 1819, and Thomas Jefferson carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s." : "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet and cost two billion dollars."],
    ["Here is the next fact", "Thomas Jefferson shipped the cotton himself."],
  ]);
  const r = await prosify(draft(), { draw, ground: GROUND, task: TASK });
  assert.ok(!/Jefferson/.test(r.parts.map((p) => p.prose).join(" ")), "an invented name reached the prose");
  const refused = r.records.flatMap((x) => x.refusals).filter((x) => x.kind === "invented");
  assert.ok(refused.length >= 1, "the invention was not refused on the record");
});

test("a mouth that fails outright leaves every part at its floor, never empty, and the error on the record", async () => {
  const draw = async () => { throw new Error("box is pressured"); };
  const r = await prosify(draft(), { draw, ground: GROUND, task: TASK });
  assert.equal(r.parts.length, 2);
  for (const p of r.parts) assert.ok(p.prose.trim().length > 0, `${p.id} came back empty`);
  assert.deepEqual(r.parts.map((p) => p.status), ["floor", "floor"]);
  assert.ok(r.records.some((x) => /pressured/.test(String(x.error))));
});

test("the second part opens from where the first actually landed", async () => {
  const { draw, calls } = stub([
    ["Steamboats reached", "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. By the 1850s warehouses lined the waterfront."],
    ["flood of 1927", "The flood of 1927 covered the low city. In 2010 the flood crested at 51.86 feet and cost two billion dollars."],
  ]);
  await prosify(draft(), { draw, ground: GROUND, task: TASK });
  assert.match(calls[1], /The piece so far ends: "By the 1850s warehouses lined the waterfront\."/);
});

// ── the three errors the first live run passed (2026-09-21) ────────────────
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { anchorsFor, carries } from "./prosify.js";
const REAL = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cumberland-ground.md"), "utf8");
const realDraft = buildDraft({ task: "Write an essay on the role of the Cumberland River in Nashville's growth.", ground: REAL });
const A = anchorsFor(realDraft);
const idOf = (needle) => realDraft.root.children.flatMap((p) => p.children).find((pt) => pt.text.includes(needle)).id;

test("LIVE: a fact whose YEAR was dropped is not carried — the 1927 flood cannot take the 2010 crest", () => {
  const id = idOf("May 2010 crested");
  const wrong = carries(A.get(id), ["The flood of 1927 crested at a staggering 51.86 feet, inundating the Opryland area and the downtown riverfront."]);
  assert.equal(wrong.ok, false, "a misbound year passed");
  assert.ok(wrong.missingNumbers.includes("2010"));
  const right = carries(A.get(id), ["In May 2010 the flood crested at 51.86 feet and put the Opryland area and the downtown riverfront under water, costing Nashville more than 2 billion dollars."]);
  assert.equal(right.ok, true, `a faithful sentence failed: ${JSON.stringify(right)}`);
});

test("LIVE: a fact whose NAMES were dropped is not carried — 'these groups' is not the Cherokee", () => {
  const id = idOf("Cherokee, Chickasaw");
  const wrong = carries(A.get(id), ["These groups utilized the river for trade, travel, and the establishment of settlements."]);
  assert.equal(wrong.ok, false, "a fact survived with none of its names");
  assert.ok(wrong.missingNames.some((n) => n.split("/").includes("cherokee")));
});

test("LIVE: a fact is never judged against itself alone — 'river' does not carry the French traders", () => {
  const id = idOf("French traders");
  const wrong = carries(A.get(id), ["This designation, however, was not the only one the river bore."]);
  assert.equal(wrong.ok, false, "a word every part carries passed as this fact's own");
  const right = carries(A.get(id), ["French traders had earlier called it the Shawnee River."]);
  assert.equal(right.ok, true);
});

test("the subject is not demanded of every fact: the prose may say 'the river'", () => {
  for (const [id, a] of A) for (const alts of a.names) for (const n of alts) assert.ok(!["cumberland", "nashville"].includes(n), `${id} demands the subject name "${n}"`);
});

test("a capital at a sentence start that the material also writes in lowercase is not a name", () => {
  const id = idOf("Cotton, tobacco, iron");
  assert.ok(!A.get(id).names.some((alts) => alts.includes("cotton")), "'Cotton' at a sentence start was demanded as a name");
});

test("any distinctive word of a name keeps it: 'Robertson and Donelson' keeps the founders", () => {
  const id = idOf("James Robertson");
  const c = carries(A.get(id), ["Nashville was founded in 1779 by Robertson and Donelson, and the settlement was tied directly to the river."]);
  assert.equal(c.ok, true, JSON.stringify(c));
});

// ── the recursion alters in place (2026-09-21, second live run) ─────────────
const G2 = "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.";
const d2 = () => buildDraft({ task: "Write a piece from this material.", ground: G2 });

test("A PARTIAL CARRIER IS REWRITTEN IN PLACE: the fact is said once, not twice", async () => {
  const { draw } = stub([
    ["Here is what this part says", "Steamboats reached Nashville and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s."],
    ["Rewrite that sentence", "Steamboats reached Nashville in 1819 and carried cotton to New Orleans."],
  ]);
  const r = await prosify(d2(), { draw, ground: G2, task: "x" });
  const prose = r.parts[0].prose;
  assert.equal((prose.match(/New Orleans/g) ?? []).length, 1, `the fact was said twice: ${prose}`);
  assert.match(prose, /in 1819/);
  assert.ok(prose.indexOf("1819") < prose.indexOf("Warehouses"), "the rewrite did not keep its partial's position");
  assert.ok(r.records.some((x) => x.replaces === "Steamboats reached Nashville and carried cotton to New Orleans."));
});

test("A FAILED REWRITE: the floor replaces the partial rather than sitting beside it", async () => {
  const { draw } = stub([
    ["Here is what this part says", "Steamboats reached Nashville and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s."],
    ["Rewrite that sentence", "It was a remarkable time."],
  ]);
  const r = await prosify(d2(), { draw, ground: G2, task: "x" });
  const prose = r.parts[0].prose;
  assert.equal((prose.match(/New Orleans/g) ?? []).length, 1, `partial and floor both stand: ${prose}`);
  assert.ok(prose.startsWith("Steamboats reached Nashville in 1819"), "the floor did not take the partial's place");
});

test("with no partial carrier, a floor lands at its own statement's position", async () => {
  const { draw } = stub([
    ["Here is what this part says", "By the 1850s warehouses lined the waterfront."],
    ["Here is the next fact", "It was a remarkable time."],
  ]);
  const r = await prosify(d2(), { draw, ground: G2, task: "x" });
  assert.ok(r.parts[0].prose.startsWith("Steamboats reached Nashville in 1819"), `the first statement's floor landed out of order: ${r.parts[0].prose}`);
});

test("a month beside a year is extent, not a name: 'May 2010' does not demand 'may'", () => {
  const id = idOf("May 2010 crested");
  assert.ok(!A.get(id).names.some((alts) => alts.includes("may")), "the month was demanded as a name");
});

test("a rewrite may not cost a fact its partial carried (run 11 lost the 1927 flood)", async () => {
  const { buildDraft } = await import("./eot-draft.js");
  const { prosify, anchorsFor, carries } = await import("./prosify.js");
  const ground = "Floods shaped the town.\n\nThe flood of 1927 covered the low town. The flood of 2010 crested at 51.86 feet and caused two billion dollars in damage.";
  const draft = buildDraft({ task: "Write a piece from this material.", ground });
  const calls = [];
  const draw = async (messages) => {
    const u = messages.at(-1).content;
    calls.push(u);
    if (/Rewrite that sentence/.test(u)) return "The flood of 2010 crested at 51.86 feet and caused two billion dollars in damage.";
    if (/1927/.test(u) && /2010/.test(u)) return "The flood of 1927 covered the low town, and the river rose again in 2010.";
    return "Floods shaped the town.";
  };
  const out = await prosify(draft, { draw, ground, task: "Write a piece from this material." });
  const said = out.parts.flatMap((p) => (p.pieces ?? []).map((pc) => pc.text));
  const A = anchorsFor(draft);
  for (const p of draft.root.children) for (const pt of p.children) assert.ok(carries(A.get(pt.id), said).ok, `${pt.id} was lost: ${said.join(" | ")}`);
});
