// hunt-falsify.test.mjs — STAGE 5 (HUNT / GROUND) PROVEN (2026-09-22):
// the operator's material is tier 0 by being handed over; a fetched page
// earns tier 1 paragraph by paragraph, by carrying the void's subject; a
// page that carries nothing is refused and the refusal written; exemplar
// pages are never ground; and where a fetched statement repeats an
// operator statement the operator's stands, however much richer the
// fetched one is (arrange.js reads the tier).
import test from "node:test";
import assert from "node:assert/strict";
import { huntGround, huntLines, sourceAt } from "./hunt.js";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { arrangeEssay } from "./arrange.js";

const OPERATOR = [
  "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Nashville grew as a river port.",
  "The Cumberland River flooded Nashville in 1927. The flood of 2010 crested at 51.86 feet in Nashville.",
].join("\n\n");
const withSubject = () => { const R = buildReferents(OPERATOR); const d = attachReferents(buildDraft({ task: "Write an essay on Nashville.", ground: OPERATOR }), R); return { R, subject: d.subjectRefs }; };

const page = (host, hunt, text) => ({ host, url: `https://${host}/p`, hunt, status: "fetched", text, chars: text.length });

test("the operator's material is tier 0 by being handed over; with nothing surfed the ground is exactly it", () => {
  const h = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed: null });
  assert.equal(h.sources.length, 1);
  assert.equal(h.sources[0].tier, 0);
  assert.equal(h.ground, OPERATOR);
  assert.equal(h.admitted, 0);
  assert.deepEqual(h.map, [{ id: "op.md", tier: 0, url: null, start: 0, end: OPERATOR.length }]);
});

test("a fetched page earns admission paragraph by paragraph — a paragraph naming a being of the subject is in, the site's furniture is out", () => {
  const { R, subject } = withSubject();
  assert.ok(subject.size > 0, "the fixture has a subject (Nashville)");
  const surfed = { sources: [
    page("river.example", "material", "Jump to content\n\nMenu · Log in · Search\n\nNashville sits on the Cumberland River, and its wharf handled cotton for a century.\n\nSubscribe to our newsletter."),
    page("cats.example", "material", "Cats sleep sixteen hours a day.\n\nA kitten opens its eyes at ten days."),
    page("howto.example", "exemplars", "An essay has an introduction, a body and a conclusion. Nashville is not mentioned as ground."),
  ] };
  const h = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed, topic: "Nashville", R, subject });
  assert.equal(h.admitted, 1);
  const river = h.sources.find((s) => s.id === "river.example");
  assert.equal(river.tier, 1);
  assert.equal(river.admitted, 1, "one of four paragraphs carried the subject");
  assert.equal(river.paragraphs, 4);
  assert.match(river.text, /^Nashville sits on the Cumberland River/);
  assert.doesNotMatch(river.text, /Subscribe|Jump to content/);
  assert.equal(h.refused.length, 1);
  assert.equal(h.refused[0].id, "cats.example");
  assert.match(h.refused[0].why, /none names a being of the subject/);
  assert.equal(h.exemplars, 1, "the exemplar page is read for the shape only, never ground");
  assert.ok(h.ground.startsWith(OPERATOR), "tier 0 comes first");
  assert.equal(sourceAt(h.map, h.ground.length - 1).id, "river.example");
  assert.equal(sourceAt(h.map, 0).tier, 0);
  assert.ok(huntLines(h).some((l) => /^refused cats\.example/.test(l)));
});

test("with no operator material and a stated subject, admission is by the subject's own words; with neither, nothing fetched can earn it", () => {
  const surfed = { sources: [page("a.example", "material", "The Cumberland River rises in Kentucky.\n\nUnrelated footer text.")] };
  const some = huntGround({ operator: { id: "none", text: "" }, surfed, topic: "the Cumberland River" });
  assert.equal(some.admitted, 1);
  assert.equal(some.sources[0].tier, 1);
  assert.equal(some.sources[0].text, "The Cumberland River rises in Kentucky.");
  assert.match(some.test, /carries a word of the ask's subject/);
  const none = huntGround({ operator: { id: "none", text: "" }, surfed, topic: null });
  assert.equal(none.admitted, 0);
  assert.equal(none.refused.length, 1);
  assert.match(none.basis, /NO GROUND/);
});

test("FETCHED MATERIAL NEVER OUTRANKS THE OPERATOR'S: a richer fetched duplicate leaves and the operator's statement stands", () => {
  const { R, subject } = withSubject();
  const richer = "The flood of 2010 crested at 51.86 feet in Nashville, Tennessee, on the Cumberland River, the highest since 1937.";
  const surfed = { sources: [page("flood.example", "material", richer)] };
  const h = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed, topic: "Nashville", R, subject });
  assert.equal(h.admitted, 1);
  const draft = attachReferents(buildDraft({ task: "Write an essay on Nashville.", ground: h.ground, sources: h.map }), buildReferents(h.ground));
  const parts = drawnParts(draft);
  assert.deepEqual(parts.map((p) => p.tier), [0, 0, 1], "the parts carry their source's tier");
  const o = arrangeEssay({ draft });
  const dup = o.findings.find((f) => f.kind === "duplicate_across_sources");
  assert.ok(dup, "the duplicate is found");
  assert.match(dup.detail, /the operator's material, though the fetched statement was richer/);
  const kept = new Set(o.slots.flatMap((s) => s.statements));
  const fetchedIds = parts[2].children.map((c) => c.id);
  assert.ok(fetchedIds.every((id) => !kept.has(id)), "the fetched duplicate is not in the outline");
  assert.ok(parts[1].children.some((c) => kept.has(c.id) && /51\.86/.test(c.text)), "the operator's 51.86 statement is");
});
