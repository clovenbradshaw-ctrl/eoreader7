// origins.test.mjs — where a slot's things come from is a declared, swappable choice.
import test from "node:test";
import assert from "node:assert/strict";
import { makeRegistry, fillSlots, resolveOrigins, MAX_MATCHES } from "../the-fold/surface/origins.mjs";
import { castTexts } from "../the-fold/surface/block-cast.mjs";
import { renderSlot, renderOriginSettings, DOCK_SLOTS } from "../the-fold/surface/dock.mjs";
import { resolveHandles } from "../the-fold/surface/handles.mjs";

const T = [
  { name: "shoes.txt", text: "The baseline result is H0=73.04+-1.04 km/s/Mpc, with a second value 73.30 ± 1.04 with systematics." },
  { name: "planck.txt", text: "We find the Hubble constant $H_0 = (67.4\\pm 0.5)$km/s/Mpc; the Moser spindle appears. Moser spindle again." },
];
const reg = makeRegistry({ castTexts });
const span = (a) => { const [doc, r] = a.split("#"); const [b0, b1] = r.split("-").map(Number); return T.find((t) => t.name === doc).text.slice(b0, b1); };

test("every item names its origin, and every address reads back as its own text", () => {
  const { content } = fillSlots({ registry: reg, texts: T, config: { measures: { adapter: "quantities" }, objects: { adapter: "declared-terms", text: "Moser spindle | graph" } } });
  for (const slot of ["measures", "objects"]) for (const it of content[slot].items) {
    assert.ok(it.origin?.adapter && it.origin.label && it.origin.config, `${it.id} carries its origin`);
    for (const a of it.addresses) assert.ok(span(a).length > 0);
    assert.equal(span(it.address), it.verbatim, "the first address reads back as the item's own verbatim");
  }
  const spindle = content.objects.items.find((i) => i.title === "Moser spindle");
  assert.equal(spindle.count, 2); assert.equal(spindle.kind, "graph");
  assert.equal(span(spindle.address).toLowerCase(), "moser spindle");
});

test("quantities parse value, uncertainty and unit; a following prose word is never a unit", () => {
  const { content } = fillSlots({ registry: reg, texts: T, config: { measures: { adapter: "quantities" } } });
  const by = Object.fromEntries(content.measures.items.map((i) => [i.title, i]));
  assert.deepEqual([by["73.04 ± 1.04 km/s/Mpc"].value, by["73.04 ± 1.04 km/s/Mpc"].uncertainty, by["73.04 ± 1.04 km/s/Mpc"].unit], [73.04, 1.04, "km/s/Mpc"]);
  assert.equal(by["67.4 ± 0.5 km/s/Mpc"].unit, "km/s/Mpc", "the LaTeX form is read");
  assert.ok(by["73.30 ± 1.04"], "'with' after the number is prose, left out of the span");
  assert.equal(by["73.30 ± 1.04"].unit, "");
});

test("a person's pattern is validated, bounded, and its noise is drawn with its count", () => {
  assert.match(reg["user-pattern"].parseConfig("not a regex").error, /not \/regex\/flags/);
  assert.match(reg["user-pattern"].parseConfig("/(/ | x").error, /bad pattern/);
  assert.match(reg["user-pattern"].parseConfig(`/${"a".repeat(201)}/ | x`).error, /longer than/);
  const { content } = fillSlots({ registry: reg, texts: T, config: { objects: { adapter: "user-pattern", text: "/[A-Z]/ | capital" } } });
  assert.ok(content.objects.items.every((i) => i.kind === "capital"));
  const big = [{ name: "big.txt", text: "A ".repeat(MAX_MATCHES + 50) }];
  const r = fillSlots({ registry: reg, texts: big, config: { objects: { adapter: "user-pattern", text: "/A/ | a" } } });
  assert.equal(r.content.objects.truncated, true, "the match ceiling is said, not silent");
});

test("a bad choice is disclosed, never silently defaulted", () => {
  const r = resolveOrigins({ objects: { adapter: "nope" }, measures: { adapter: "declared-terms" }, rows: { adapter: "quantities" }, subject: { adapter: "user-pattern", text: "junk" } }, reg);
  const why = Object.fromEntries(r.disclosed.map((d) => [d.slot, d.reason]));
  assert.match(why.objects, /unknown adapter/);
  assert.match(why.measures, /does not serve measures/);
  assert.match(why.rows, /does not serve rows/);
  assert.match(why.subject, /does not serve subject/);
  assert.deepEqual(Object.keys(r.chosen), []);
});

test("the cast is one option among several and says what it does NOT find", () => {
  const cast = reg["named-beings"];
  assert.equal(cast.runsIn, "node");
  assert.match(cast.misses, /graph|quantity/, "it names its own blind spot");
  const { content } = fillSlots({ registry: reg, texts: T, config: { objects: { adapter: "named-beings" } } });
  assert.ok(content.objects.items.every((i) => i.kind === "being" && i.origin.adapter === "named-beings"));
  assert.equal(makeRegistry()["named-beings"], undefined, "without the engine's organ injected the page has no cast");
});

test("a slot draws where its things came from, in every state", () => {
  const { handles } = resolveHandles({});
  const objects = DOCK_SLOTS.find((s) => s.id === "objects");
  const { content } = fillSlots({ registry: reg, texts: T, config: { objects: { adapter: "declared-terms", text: "Moser spindle | graph" } } });
  const chosen = renderSlot(objects, content.objects, handles).html;
  assert.match(chosen, /from: <b>Terms you declare<\/b>/);
  assert.match(chosen, /<b>does not find<\/b>/);
  assert.match(renderSlot(objects, { items: [] }, handles).html, /nothing chosen — pick an origin in settings/);
  assert.match(renderSlot(objects, { items: [], fixedOrigin: "the bench ledger" }, handles).html, /from: the bench ledger/);
});

test("the origin settings offer only adapters that serve each slot, and say how to write a config", () => {
  const h = renderOriginSettings({ objects: { adapter: "declared-terms", text: "x | y" } }, reg);
  assert.match(h, /data-origin-slot="objects"/);
  assert.match(h, /data-origin-slot="measures"/);
  assert.doesNotMatch(h, /data-origin-slot="rows"/, "ledger-fed slots are not configurable here");
  const measures = h.slice(h.indexOf('data-origin-slot="measures"'));
  assert.doesNotMatch(measures.slice(0, measures.indexOf("</fieldset>")), /Terms you declare/, "an adapter that does not serve the slot is not offered");
  assert.match(h, /selected/);
});
