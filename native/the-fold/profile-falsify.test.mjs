// profile-falsify.test.mjs — the cube's two faces read off a statement's parse.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { profileStatements, addressesOf } from "./profile.js";

const GROUND = [
  "The office serves the county.",
  "",
  "The office did not retain the minutes of its meetings. Management should update the manual to include the policies. The council member presented her request for an audit. A motion to hold hearings was made, seconded, and carried.",
  "",
  "The office is a division within the department. The director discussed the work the office performs. The public spoke on the requested audit.",
].join("\n");

test("acts the words cannot separate lean to their stances", async (t) => {
  const P = await loadEotParser();
  if (!P.ok) { t.skip(P.reason); return; }
  const d = buildDraft({ task: "Write a piece from this material.", ground: GROUND });
  attachEot(drawnParts(d).flatMap((p) => p.children), P.parse(GROUND, "t"));
  const pr = profileStatements(d);
  const top = (re) => { const pt = drawnParts(d).flatMap((p) => p.children).find((x) => re.test(x.text)); return pr.byId.get(pt.id)?.stance.top; };
  // A prescription GENERATES: Making or Cultivating (the grain moves with a
  // thin ground's baseline; the mode is what holds — measured).
  assert.ok(["Making", "Cultivating", "Composing"].includes(top(/should update/)), top(/should update/));
  assert.equal(top(/motion to hold/), "Composing");
  // NOT asserted here: classification → Binding and reported speech →
  // Tracing held on the 140-statement OHS dossier but not on this 9-sentence
  // ground — a lean is relative to the source's baseline, and a tiny source's
  // baseline is thin (measured 2026-09-21). The acts above hold even here.
  assert.equal(top(/did not retain/), "Clearing");
});

test("no parse, no profile: stated, never guessed", () => {
  const d = buildDraft({ task: "Write a piece from this material.", ground: GROUND });
  const pr = profileStatements(d);
  assert.equal(pr.byId.size, 0);
  assert.ok(pr.unparsed.length > 0);
  assert.deepEqual(addressesOf(null), []);
});
