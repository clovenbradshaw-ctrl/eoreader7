// finish-falsify.test.mjs — fold, tighten, arrive and the turn pass, over a
// piece that already has its shape from the EOT draft.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { anchorsFor, carries } from "./prosify.js";
import { foldPiece, ticsOf, tightenPiece, arrive, turnPass, takesUp } from "./finish.js";

const GROUND = [
  "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.",
  "The flood of 1927 covered the low city. The flood of 2010 crested at 51.86 feet.",
].join("\n\n");
const TASK = "Write a piece from this material.";
const draft = buildDraft({ task: TASK, ground: GROUND });
const A = anchorsFor(draft);
const piecesOf = (id, sentences) => {
  const dp = drawnParts(draft).find((p) => p.id === id);
  return { id, pieces: sentences.map((t) => ({ text: t, carries: dp.children.filter((pt) => carries(A.get(pt.id), [t]).ok).map((pt) => pt.id) })) };
};

test("FOLD: a sentence carrying no statement and nothing new is folded; a statement is never folded", () => {
  const parts = [
    piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "Warehouses lined the waterfront by the 1850s."]),
    piecesOf("p2", ["Steamboats and warehouses lined the waterfront.", "The flood of 1927 covered the low city.", "The flood of 2010 crested at 51.86 feet."]),
  ];
  const f = foldPiece(parts, { ground: GROUND });
  assert.equal(f.folded.length, 1);
  assert.match(f.folded[0].sentence, /Steamboats and warehouses lined the waterfront/);
  assert.equal(f.parts[1].pieces.length, 2, "a statement-carrying sentence was folded");
});

test("TICS are the prose's repeated words that neither the material nor the ask ever uses", () => {
  const parts = [piecesOf("p1", ["The bustling steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "The bustling warehouses lined the waterfront by the 1850s."])];
  const t = ticsOf(parts, { ground: GROUND, task: TASK });
  assert.ok(t.has("bustling"), "a repeated decoration was not measured as a tic");
  assert.ok(!t.has("steamboat") && !t.has("warehouse"), "the material's own words were called tics");
  assert.ok(!t.has("the"), "a function word was called a tic");
});

test("TIGHTEN keeps a plain rewrite that keeps every anchor, and refuses one that drops a year", async () => {
  const parts = [piecesOf("p1", ["The bustling steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "The bustling warehouses lined the waterfront by the 1850s."])];
  const draw = async (msgs) => {
    const u = msgs[msgs.length - 1].content;
    if (u.includes("steamboats")) return "Steamboats reached Nashville in 1819 and carried cotton to New Orleans.";
    return "Warehouses lined the waterfront.";            // drops "1850s"
  };
  const t = await tightenPiece(parts, { draft, draw, ground: GROUND, task: TASK });
  assert.equal(t.parts[0].pieces[0].text, "Steamboats reached Nashville in 1819 and carried cotton to New Orleans.");
  assert.equal(t.parts[0].pieces[1].text, "The bustling warehouses lined the waterfront by the 1850s.", "a rewrite that lost its year was kept");
  assert.ok(t.changes.find((c) => !c.kept).reasons.some((r) => /anchors/.test(r)));
});

test("ARRIVE names every missing signal rather than saying 'not done'", () => {
  const parts = [
    piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans."]),
    piecesOf("p2", ["The flood of 2010 crested at 51.86 feet."]),
  ];
  const a = arrive(parts, { draft, ground: GROUND, task: TASK });
  assert.equal(a.arrived, false);
  assert.ok(a.missing.includes("everyStatementCarried"));
  assert.ok(a.details.uncarried.includes("p1.2") && a.details.uncarried.includes("p2.1"));
});

test("THE TURN PASS keeps a bridge that takes up the last part and hands on to the next, and refuses one that does neither", async () => {
  const mk = () => [
    piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "Warehouses lined the waterfront by the 1850s."]),
    piecesOf("p2", ["The flood of 1927 covered the low city.", "The flood of 2010 crested at 51.86 feet."]),
  ];
  const good = await turnPass(mk(), { draft, ground: GROUND, draw: async () => "Those waterfront warehouses sat low, where the river could reach the city." });
  assert.equal(good.bridges[0].kept, true, JSON.stringify(good.bridges[0]));
  assert.match(good.parts[1].pieces[0].text, /waterfront warehouses/);
  const bad = await turnPass(mk(), { draft, ground: GROUND, draw: async () => "Time passed, as it always does." });
  assert.equal(bad.bridges[0].kept, false);
  assert.equal(bad.parts[1].pieces[0].text, "The flood of 1927 covered the low city.", "a refused bridge was inserted anyway");
});

test("takesUp is lexical and says so: a shared subject word is not a turn", () => {
  const subject = new Set(["flood"]);
  assert.equal(takesUp("The flood came.", "Another flood rose.", { ground: GROUND, subject }), false);
});

// ── GEBSER, the arrival archon: the ever-present origin ─────────────────────
import { gebserArrival } from "./archon-rules.js";

test("GEBSER: arrived when the origin is in every part, none of it lost, and no editor still objects", () => {
  const parts = [
    piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "Warehouses lined the waterfront by the 1850s."]),
    piecesOf("p2", ["That waterfront sat low.", "The flood of 1927 covered the low city.", "The flood of 2010 crested at 51.86 feet."]),
  ];
  const g = gebserArrival({ piece: parts, draft, findings: [] });
  assert.equal(g.arrived, true, g.basis);
  assert.equal(g.transparent, 4);
  assert.equal(g.sentences, 5, "the connective sentence counts as a sentence, not against arrival");
});

test("GEBSER: a part of connective prose only has lost its origin, and he says where", () => {
  const parts = [
    piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "Warehouses lined the waterfront by the 1850s."]),
    piecesOf("p2", ["Then the water came, as water does."]),
  ];
  const g = gebserArrival({ piece: parts, draft, findings: [] });
  assert.equal(g.arrived, false);
  assert.ok(g.missing.some((m) => /origin is absent from p2/.test(m)));
  assert.ok(g.missing.some((m) => /lost/.test(m)));
});

test("GEBSER: not integral while any editor's finding still licenses a revision", () => {
  const parts = [piecesOf("p1", ["Steamboats reached Nashville in 1819 and carried cotton to New Orleans.", "Warehouses lined the waterfront by the 1850s."]), piecesOf("p2", ["The flood of 1927 covered the low city.", "The flood of 2010 crested at 51.86 feet."])];
  const g = gebserArrival({ piece: parts, draft, findings: [{ editor: "William Zinsser", licenses: "rewrite" }, { editor: "Lish / Klinkenborg", licenses: null }] });
  assert.equal(g.arrived, false);
  assert.ok(g.missing.some((m) => /still objecting: William Zinsser/.test(m)));
  assert.ok(!g.missing.join(" ").includes("Klinkenborg"), "a reported, non-licensing finding blocked arrival");
});

// ── the name gate's leading-capital false positives (run 4, 2026-09-21) ─────
import { inventedNameRuns } from "./referent-verify.js";
import { isCommonWord } from "./pos-prior.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const CUMB = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cumberland-ground.md"), "utf8");

test("LIVE: a common word at the start of a sentence is not an invented name, given the prior", () => {
  for (const t of ["This river served as the only road.", "While the Cumberland River fueled growth, floods came.", "Beyond the city, the Port of Nashville handles barges."]) {
    assert.deepEqual(inventedNameRuns(t, CUMB, { isCommonWord }), [], t);
  }
});

test("…and the real inventions from earlier runs still die", () => {
  for (const [t, name] of [["Thomas Duke named the river.", "thomas duke"], ["Vanderbilt funded the dams.", "vanderbilt"], ["Thomas Jefferson surveyed it.", "thomas jefferson"]]) {
    assert.ok(inventedNameRuns(t, CUMB, { isCommonWord }).some((x) => x.name === name), `${name} was admitted`);
  }
});

test("without the predicate the gate reads exactly as it always did", () => {
  // The measured false positive: "This" opening a LATER sentence of a passage
  // (the old gate exempts only the passage's first word).
  const passage = "Donelson led the flatboats upriver. This same river became the only road.";
  assert.ok(inventedNameRuns(passage, CUMB).some((x) => x.name === "this"), "the old behaviour changed for callers that pass nothing");
  assert.deepEqual(inventedNameRuns(passage, CUMB, { isCommonWord }), [], "with the prior, a later sentence's 'This' is still flagged");
});

test("Williams: a cause dated after its effect is flagged; a true order is not", async () => {
  const { williamsCausalOrder } = await import("./archon-rules.js");
  const run6 = "The flood of May 2010 put the riverfront under water. However, this flood spurred a long-term effort to tame the river. The Corps built locks and dams beginning in the 1920s.";
  const f = williamsCausalOrder(run6);
  assert.equal(f.length, 1);
  assert.equal(f[0].kind, "cause_after_effect");
  assert.deepEqual(f[0].words, ["spurred"]);
  assert.equal(williamsCausalOrder("The flood of 1927 covered the city. It spurred the Corps to build dams in the 1930s.").length, 0);
  assert.equal(williamsCausalOrder("The dams of the 1950s were built in response to the flood of 1927.").length, 0);
  assert.equal(williamsCausalOrder("The flood of 1927 came in response to the dams of the 1950s.").length, 1, "the backward connective, inverted");
  const piece = [{ id: "p6", pieces: [{ text: "The flood of May 2010 put the riverfront under water.", carries: ["p5.3"] }, { text: "However, this flood spurred a long-term effort to tame the river.", carries: [] }, { text: "The Corps built locks and dams beginning in the 1920s.", carries: ["p6.1"] }] }];
  const g = williamsCausalOrder("", { piece });
  assert.equal(g[0].licenses, "fold", "a sentence whose only job was the false link is folded");
});

test("Lish cuts decoration without a model and never a fact or a grounded list", async () => {
  const { lishCut } = await import("./finish.js");
  const known = new Set(["donelson", "led", "flotilla", "cumberland", "wolf", "creek", "dam", "constructed", "created", "lake", "cotton", "tobacco", "iron", "lumber", "moved", "downriver", "port", "nashville", "handles", "barge", "traffic"]);
  assert.equal(lishCut("Donelson, a man of foresight, led a flotilla up the Cumberland in 1779.", { known }), "Donelson led a flotilla up the Cumberland in 1779.");
  assert.equal(lishCut("The Port of Nashville handles barge traffic, a testament to the river's enduring role.", { known, flagged: new Set(["testament"]) }), "The Port of Nashville handles barge traffic.");
  assert.equal(lishCut("Cotton, tobacco, iron, and lumber moved downriver.", { known }), null, "a grounded list is not decoration");
  assert.equal(lishCut("Wolf Creek Dam, constructed in 1951, created Lake Cumberland.", { known, keeps: (t) => t.includes("1951") }), null, "a segment holding a fact stays");
  assert.equal(lishCut("A testament to the river, the dam.", { known, flagged: new Set(["testament"]) }), null, "a cut that leaves no verb is refused");
});

test("a bridge that restates the sentence it leads into is refused", async () => {
  const { turnPass } = await import("./finish.js");
  const parts = [
    { id: "a4", pieces: [{ text: "Cotton and tobacco moved downriver to New Orleans.", carries: ["p4.3"] }] },
    { id: "a5", pieces: [{ text: "The floods of 1927 and 2010 covered the low city.", carries: ["p5.2"] }] },
  ];
  const draw = async () => "After the cotton trade, the floods of 1927 and 2010 covered the low city.";
  const r = await turnPass(parts, { draft: { root: { children: [] }, subject: [] }, draw, ground: "Cotton and tobacco moved downriver to New Orleans. The floods of 1927 and 2010 covered the low city." });
  const b = r.bridges[0];
  assert.ok(b, "a bridge was attempted");
  assert.equal(b.kept, false);
  assert.ok(b.reasons.includes("restates the sentence it leads into"));
});

test("Lish never leaves a fragment (run 8)", async () => {
  const { lishCut } = await import("./finish.js");
  const known = new Set(["river", "remains", "reason", "city"]);
  assert.equal(lishCut("The river, a ribbon of destiny, remains the reason the city is where it is.", { known, flagged: new Set(["ribbon", "destiny"]) }), "The river remains the reason the city is where it is.");
  assert.equal(lishCut("A ribbon of destiny, remains the reason the city is where it is.", { known, flagged: new Set(["ribbon", "destiny"]) }), null, "a remainder opening on a verb is a fragment");
  const complete = (t) => !/located below the city ensuring/.test(t);
  assert.equal(lishCut("Cheatham Dam, located below the city, regulates the level, ensuring a steady flow.", { known: new Set(["cheatham", "dam", "located", "city", "level", "ensuring", "steady", "flow"]), flagged: new Set(["regulates"]), complete }), null, "a complete clause may not be cut into an incomplete one");
});

test("Kidder & Todd: a relation no source sentence holds is found; identity the source asserts is honoured", async (t) => {
  const { loadEotParser } = await import("./eot-notation.js");
  const P = await loadEotParser();
  if (!P.ok) { t.skip(P.reason); return; }
  const { kidderToddRelations } = await import("./archon-rules.js");
  const { readFileSync } = await import("node:fs");
  const GROUND = readFileSync(new URL("./fixtures/cumberland-ground.md", import.meta.url), "utf8");
  const piece = (xs) => [{ id: "a1", pieces: xs.map((text) => ({ text, carries: ["p5.3"] })) }];
  const run6 = kidderToddRelations("", { piece: piece(["The May 2010 flood caused significant damage to the Cumberland River."]), ground: GROUND, parse: P.parse });
  assert.equal(run6.length, 1);
  assert.equal(run6[0].licenses, "restore");
  const alias = kidderToddRelations("", { piece: piece(["Nashville's founding in 1779 was linked to this waterway."]), ground: GROUND, parse: P.parse });
  assert.equal(alias.length, 0, "the source says the river IS a waterway");
  const self = kidderToddRelations("", { piece: piece(GROUND.split(/(?<=\.)\s+/).filter((x) => x.length > 20)), ground: GROUND, parse: P.parse });
  assert.equal(self.length, 0, "the null: the source against itself");
});

test("Lish on run 9's breakages: an adjective series is not a seam, a clause is not decoration, the core stays", async () => {
  const { lishCut } = await import("./finish.js");
  const known = new Set(["river", "city", "influence", "cotton", "tobacco", "iron", "lumber", "moved", "downriver", "goods", "back", "gage", "flow"]);
  const r1 = lishCut("The river, in its quiet, unassuming way, has been the city's architect.", { known, flagged: new Set(["way"]) });
  assert.ok(!/river unassuming/.test(r1 ?? ""), "never splits 'quiet, unassuming'");
  assert.equal(lishCut("Cotton, tobacco, iron, and lumber moved downriver, while manufactured goods flowed back up.", { known, flagged: new Set(["flowed"]) }), null, "a subordinate clause is not decoration");
  const core = (t) => (/provides/.test(t) ? "provide|gage" : "offer|gage");
  const r3 = lishCut("The gage provides a snapshot of the flow, offering a tangible sense of its nature.", { known, flagged: new Set(["tangible"]), core });
  assert.equal(r3, "The gage provides a snapshot of the flow.");
});

test("Clark: a sentence glued to its own source is found against the material's own ceiling (run 12)", async () => {
  const { clarkSplice } = await import("./archon-rules.js");
  const { readFileSync } = await import("node:fs");
  const ground = readFileSync(new URL("./fixtures/cumberland-ground.md", import.meta.url), "utf8");
  const bad = "The Port of Nashville handles a diverse range of goods, including aggregates, grain, and steel as today the Port of Nashville handles barge traffic in aggregates, grain, and steel.";
  const f = clarkSplice("", { piece: [{ id: "a7", pieces: [{ text: bad, carries: ["p7.1"] }, { text: "The riverfront has been rebuilt as parkland.", carries: ["p7.2"] }] }], ground });
  assert.equal(f.length, 1);
  assert.equal(f[0].licenses, "repair");
  assert.match(f[0].repair, /^the Port of Nashville handles barge traffic/i);
  const self = clarkSplice("", { piece: [{ id: "g", pieces: ground.split(/(?<=\.)\s+/).map((text) => ({ text, carries: [] })) }], ground });
  assert.equal(self.length, 0, "the null: the source's own sentences");
});
