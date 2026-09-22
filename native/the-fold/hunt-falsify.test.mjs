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

// A fetched paragraph must be at least as long as the operator's shortest
// (hunt.js: a hatnote is not a paragraph of this ground); the fixture pads
// every real paragraph past that, and leaves the hatnote short on purpose.
const PAD = " That was the year the river rose and the whole town remembered it for a long time.";
const page = (host, hunt, text) => { const padded = hunt === "material" ? text.split("\n\n").map((p) => (/[.!?]$/.test(p.trim()) && !/^For other uses/.test(p) ? p + PAD : p)).join("\n\n") : text; return { host, url: `https://${host}/p`, hunt, status: "fetched", text: padded, chars: padded.length }; };

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
  // No operator material: no shortest-paragraph bound, so the raw page (unpadded).
  const surfed = { sources: [{ host: "a.example", url: "https://a.example/p", hunt: "material", status: "fetched", text: "The Cumberland River rises in Kentucky.\n\nUnrelated footer text.", chars: 60 }] };
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

test("NOR OUTWEIGHS: at most as many fetched paragraphs as the operator handed over, the ones naming the most of the subject first; headings and bare bullets earn nothing (live: 68 against 8)", () => {
  const { R, subject } = withSubject();
  const filler = Array.from({ length: 12 }, (_, i) => `Nashville saw paragraph ${i + 1} of the river's story.`);
  const rich = "Nashville and the Cumberland River grew together on the wharf.";
  const surfed = { sources: [
    page("wiki.example", "material", ["Nashville & History", "FAQ: the river in Nashville", "- Nashville's Batman Building sits near the Cumberland River.", rich, ...filler].join("\n\n")),
    page("late.example", "material", "Nashville is on the Cumberland River, which is named on this late page."),
  ] };
  const h = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed, topic: "Nashville", R, subject });
  assert.equal(h.bound, 2, "the operator handed over two paragraphs");
  const total = h.sources.filter((s) => s.tier === 1).reduce((n, s) => n + s.admitted, 0);
  assert.equal(total, 2, "no more fetched paragraphs than the operator's own");
  const wiki = h.sources.find((s) => s.id === "wiki.example");
  assert.ok(wiki.text.includes(rich), "the paragraph naming both Nashville and the Cumberland ranks first");
  assert.ok(!/Nashville & History|FAQ:/.test(wiki.text), "a heading with no sentence in it is not a statement");
  // A hatnote ends in a period and names the subject, and is still a
  // fragment: shorter than the operator's shortest paragraph (live, Wikipedia).
  const hat = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed: { sources: [page("w.example", "material", "For other uses, see Nashville (disambiguation).\n\n" + rich + " It handled cotton, then grain, then the whole trade of the middle basin for a century.")] }, topic: "Nashville", R, subject });
  assert.ok(!hat.sources.some((s) => /disambiguation/.test(s.text)), "the hatnote is not a paragraph of this ground");
  assert.match(hat.refused.length ? hat.refused[0].why : hat.sources[1].why, /shortest paragraph|earned admission/);
  assert.ok(!wiki.text.startsWith("- "), "a list marker is stripped");
  assert.match(wiki.why, /more carried the subject but the operator's extent was filled/);
  assert.match(h.basis, /at most 2 paragraph\(s\) — the operator's own extent/);
  const late = h.refused.find((r) => r.id === "late.example") ?? h.sources.find((s) => s.id === "late.example");
  assert.ok(late, "the late page is either admitted within the bound or refused with the reason");
  // With nothing handed over, the bound is stated as absent.
  const open = huntGround({ operator: { id: "none", text: "" }, surfed, topic: "Nashville" });
  assert.equal(open.bound, null);
  assert.match(open.basis, /unbounded: nothing was handed over/);
});

test("the thesis is the operator's: a fetched general sentence cannot be the claim while the operator's material holds a candidate", () => {
  const { R, subject } = withSubject();
  const surfed = { sources: [page("wiki.example", "material", "Nashville is the river city of the South, and the river is its whole history.")] };
  const h = huntGround({ operator: { id: "op.md", text: OPERATOR }, surfed, topic: "Nashville", R, subject });
  assert.equal(h.admitted, 1);
  const draft = attachReferents(buildDraft({ task: "Write an essay on Nashville.", ground: h.ground, sources: h.map }), buildReferents(h.ground));
  const o = arrangeEssay({ draft });
  const fetchedIds = new Set(drawnParts(draft).filter((p) => p.tier === 1).flatMap((p) => p.children.map((c) => c.id)));
  assert.ok(o.thesis, "a thesis was chosen");
  assert.ok(!fetchedIds.has(o.thesis.id), `the thesis (${o.thesis.text}) must come from tier 0`);
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
  const fetchedDup = parts[2].children.filter((c) => /51\.86/.test(c.text)).map((c) => c.id);
  assert.equal(fetchedDup.length, 1);
  assert.ok(fetchedDup.every((id) => !kept.has(id)), "the fetched duplicate is not in the outline");
  assert.ok(parts[1].children.some((c) => kept.has(c.id) && /51\.86/.test(c.text)), "the operator's 51.86 statement is");
});
