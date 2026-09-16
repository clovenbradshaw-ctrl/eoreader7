import test from "node:test";
import assert from "node:assert/strict";
import { groundAttention, ARCHON_TO_CRITERION_MAP } from "../the-fold/ground-attention.js";
import { groundSelector } from "../the-fold/ground-selector.js";
import { matchArchons, ARCHONS } from "../organs/archon-compendium.js";
import { refuteRelation } from "../kernel/refutation.js";
import { bannedHits } from "../the-fold/earned-cast.js";

const OPTS = { draws: 199, seed: 20260812, alpha: 0.05 };
const deps = { matchArchons, groundSelector, refuteRelation, groundOpts: OPTS };
const j = (s) => s.join(" ");

const FIRSTHAND_RECORDS = [
  { ref: "survivor-account.txt", text: j(["I was standing on the dock when the first explosion threw me off my feet.", "I saw the flames reach the second warehouse within minutes.", "I tried to call out to the night watchman but couldn't find him in the smoke.", "I didn't leave until the crews physically walked me back from the water line."]) },
  { ref: "wire-service.txt", text: j(["A warehouse fire near the harbor caused significant damage overnight, officials said.", "The cause remains under investigation pending a structural inspection.", "Local businesses in the area were advised to expect delays through the weekend.", "A public briefing is scheduled for Thursday afternoon."]) },
  { ref: "port-authority.txt", text: j(["Harbor operations were suspended following fire damage to warehouse facilities.", "Two berths remain closed pending inspection.", "The port authority has not released a damage estimate.", "A joint statement with the fire marshal is expected by end of week."]) },
];

test("groundAttention: declared deps are required, never silently substituted", () => {
  assert.throws(() => groundAttention({ task: "x", records: FIRSTHAND_RECORDS }, {}), /matchArchons is injected/);
});

test("groundAttention: thin material never fires", () => {
  const r = groundAttention({ task: "was there an eyewitness?", records: [{ ref: "a.txt", text: "hi" }] }, deps);
  assert.equal(r.fired, false);
  assert.equal(r.reason, "insufficient_material");
});

test("groundAttention: a topic-irrelevant task never fires, even over real material", () => {
  const r = groundAttention({ task: "what time is it", records: FIRSTHAND_RECORDS }, deps);
  assert.equal(r.fired, false);
  assert.equal(r.reason, "no_matched_archon_names_a_criterion");
});

test("groundAttention: a witness-shaped question over real firsthand material fires, clean", () => {
  const r = groundAttention({ task: "was there an eyewitness account of the harbor fire?", records: FIRSTHAND_RECORDS }, deps);
  assert.equal(r.fired, true);
  assert.equal(r.winner, "what eyes and ears witnessed");
  assert.equal(r.veto.standing, "insufficient"); // no edges offered — honest, not a silent pass
  assert.deepEqual(bannedHits(r.text), []);
  const lower = r.text.toLowerCase();
  for (const a of ARCHONS) {
    assert.equal(lower.includes(a.handle), false, `leaked handle "${a.handle}"`);
    assert.equal(lower.includes(a.name.toLowerCase()), false, `leaked name "${a.name}"`);
  }
});

test("groundAttention: a real refutation (cycle) vetoes an otherwise-winning pick", () => {
  const cycleEdges = [
    { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "a" }, { standing: "referent", ref: "b" }] },
    { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "b" }, { standing: "referent", ref: "a" }] },
  ];
  const r = groundAttention({ task: "was there an eyewitness account of the harbor fire?", records: FIRSTHAND_RECORDS, edges: cycleEdges }, deps);
  assert.equal(r.fired, false);
  assert.equal(r.reason, "nagarjuna_veto");
});

test("groundAttention: every mapped archon handle exists in the real compendium", () => {
  for (const handle of Object.keys(ARCHON_TO_CRITERION_MAP)) {
    assert.ok(ARCHONS.some((a) => a.handle === handle), `"${handle}" is not a real compendium entry`);
  }
});
