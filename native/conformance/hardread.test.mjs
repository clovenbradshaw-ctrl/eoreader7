// hardread.test.mjs — what happens when something will not read: the swarm, two senses, learned rules.
// The pure parts run everywhere. The live vision arm needs python3 + opencv + matplotlib + tesseract and
// says so, typed, when they are absent — a skipped assay is disclosed, never silently green.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  skeleton, expressionOf, readingFromText, swarmRegion, learnRules, concedeRule, emptyRules, autoHardRead, RULE_FLOOR, MAX_ANTS, CV_GAPS,
} from "../the-fold/surface/hardread.mjs";
import { unreadMentions } from "../the-fold/surface/origins.mjs";

const rngFixed = () => 0.99; // never scout
const asym = (v, u, d) => ({ value: v, up: u, down: d, sym: u === d });

test("the expression is the anchor through its notation, cut before prose; the skeleton names the shape", () => {
  const q = "H_{0} = 73.3_{-1.8}^{+1.7}$, a 2.4% precision measurement, in agreement";
  assert.equal(expressionOf(q, "H_{0} = ".length), "H_{0} = 73.3_{-1.8}^{+1.7}");
  const f = "Ho = 69.8 $\\pm$ 0.6 (stat) $\\pm$ 1.6 (sys) km/s/Mpc. No statistically";
  assert.equal(expressionOf(f, "Ho = ".length), "Ho = 69.8 $\\pm$ 0.6 (stat) $\\pm$ 1.6 (sys)");
  assert.equal(skeleton("H_0=73.3^{+1.7}_{-1.8}"), skeleton("H_0=74.5^{+5.6}_{-6.1}"), "same shape, different numbers");
  assert.notEqual(skeleton("H_0=73.3^{+1.7}_{-1.8}"), skeleton("H_0=73.3_{-1.8}^{+1.7}"), "the order of the stack is part of the shape");
});

test("a reading is read off every notation this corpus wrote, and refuses what it cannot", () => {
  assert.deepEqual(readingFromText("H0=73.04+-1.04 km/s"), { value: 73.04, up: 1.04, down: 1.04, sym: true, parts: [1.04] });
  assert.equal(readingFromText("H_0 = (67.4\\pm 0.5)").up, 0.5);
  assert.deepEqual(readingFromText("H_0=73.3^{+1.7}_{-1.8}"), asym(73.3, 1.7, 1.8));
  assert.deepEqual(readingFromText("H_{0} = 73.3_{-1.8}^{+1.7}"), asym(73.3, 1.7, 1.8));
  const ss = readingFromText("Ho = 69.8 $\\pm$ 0.6 (stat) $\\pm$ 1.6 (sys)");
  assert.equal(ss.value, 69.8); assert.equal(ss.up, Math.round(Math.hypot(0.6, 1.6) * 1e6) / 1e6, "stat and sys add in quadrature, and the parts are kept");
  assert.deepEqual(ss.parts, [0.6, 1.6]);
  assert.equal(readingFromText("H0 = 73.3 and later"), null, "a bare number with no stated error is not a measurement");
  assert.equal(readingFromText("H0 = 73.3 +1.7"), null, "one bound alone is not read as symmetric");
});

const region = (expr) => ({ doc: "d.txt", at: [0, expr.length], expr });
const okImage = (only) => (route, r) => ({ reading: route === only ? readingFromText(r.expr) : null, seen: route });

test("accepted only when a text reading AND an image reading agree; the trust rule is two senses", () => {
  const r = region("H_0=73.3^{+1.7}_{-1.8}");
  const good = swarmRegion(r, { trails: {}, dir: "/tmp", rng: rngFixed, now: 1, image: okImage("cv-stack:16") });
  assert.equal(good.outcome.resolved, true);
  assert.equal(good.outcome.accepted.image, "cv-stack:16");
  // both text routes agree with each other, but no image reading exists: NOT accepted
  const blind = swarmRegion(r, { trails: {}, dir: "/tmp", rng: rngFixed, now: 1, image: () => ({ reading: null }) });
  assert.equal(blind.outcome.resolved, false, "text agreeing with text is one sense");
  assert.deepEqual(blind.trails, {}, "nothing deposited for an unresolved region");
  // an image that reads a DIFFERENT number is a disagreement, not a tie-break
  const liar = swarmRegion(r, { trails: {}, dir: "/tmp", rng: rngFixed, now: 1, image: () => ({ reading: asym(73.3, 1.7, 1.9) }) });
  assert.equal(liar.outcome.resolved, false);
  assert.ok(liar.outcome.ants <= MAX_ANTS);
});

test("only the routes that produced the accepted reading leave a trail, and the image trail is shared across notations", () => {
  const image = okImage("cv-stack:20");
  const a = swarmRegion(region("H_0=73.3^{+1.7}_{-1.8}"), { trails: {}, dir: "/tmp", rng: rngFixed, now: 1000, image });
  assert.ok(a.outcome.ants > 1, "the first region has to search: the default order carries no knowledge");
  const routes = Object.values(a.trails).flat().map((t) => t.route);
  assert.ok(routes.includes("cv-stack:20"));
  assert.ok(!routes.includes("cv-stack:12") && !routes.includes("ocr-line"), "routes that failed deposit nothing");
  // a different notation, same picture: the colony's image trail carries over
  const seen = [];
  const b = swarmRegion(region("H_{0} = 73.3_{-1.8}^{+1.7}"), { trails: a.trails, dir: "/tmp", rng: rngFixed, now: 1001, image: (route, r) => { seen.push(route); return image(route, r); } });
  assert.equal(seen[0], "cv-stack:20", "the learned route is tried first");
  assert.ok(b.outcome.ants < a.outcome.ants, "the colony needs fewer ants the second time");
});

test("a rule is learned only from recurrence of one shape settled by one route pair, and it can be conceded", () => {
  const image = okImage("cv-stack:20");
  const out = (e) => swarmRegion(region(e), { trails: {}, dir: "/tmp", rng: rngFixed, now: 1, image }).outcome;
  const one = out("H_0=73.3^{+1.7}_{-1.8}");
  assert.equal(learnRules(emptyRules(), [one]).added.length, 0, `one instance is not a pattern (floor ${RULE_FLOOR})`);
  const two = out("H_0=74.5^{+5.6}_{-6.1}");
  const learned = learnRules(emptyRules(), [one, two]);
  assert.equal(learned.added.length, 1);
  assert.equal(learned.added[0].foundVia, "cv-ocr-agreed");
  assert.equal(learnRules(learned.rules, [one, two]).added.length, 0, "not learned twice");
  const other = out("H_{0} = 73.3_{-1.8}^{+1.7}");
  assert.equal(learnRules(emptyRules(), [one, other]).added.length, 0, "different shapes do not pool");
  // the learned rule reads the next region with no ant, and says so
  const texts = [{ name: "d.txt", text: "we report H_0=67.4^{+4.1}_{-3.2} here" }];
  const r = autoHardRead({ texts, anchor: /H_0=/, items: [], rules: learned.rules, image: () => { throw new Error("no image sense may run under a rule"); } });
  assert.equal(r.readings.length, 1);
  assert.equal(r.readings[0].byRule, learned.added[0].name);
  assert.equal(r.readings[0].ants, 0);
  // conceded: the rule stops applying and the region goes back to the swarm
  const back = autoHardRead({ texts, anchor: /H_0=/, items: [], rules: concedeRule(learned.rules, learned.added[0].name, "test"), image: okImage("cv-stack:20") });
  assert.equal(back.readings[0].byRule, null);
  assert.ok(back.readings[0].ants >= 1);
});

test("the door is automatic: it finds what was seen and not read, and re-checks each region against its own bytes", () => {
  const texts = [{ name: "a.txt", text: "We find H0 = 73.3^{+1.7}_{-1.8} and later H0 = 67.4 ± 0.5 km/s." }, { name: "b.txt", text: "Nothing about it." }];
  const items = []; // the ordinary adapter read nothing
  const un = unreadMentions({ texts, anchor: /H0\s*=\s*/, items });
  assert.equal(un.length, 2);
  const r = autoHardRead({ texts, anchor: /H0\s*=\s*/, items, image: okImage("cv-stack:12") });
  const h = r.readings[0];
  assert.equal(texts[0].text.slice(h.at[0], h.at[1]), h.verbatim, "the reading's address reads back as its own text");
  assert.equal(h.value, 73.3);
  assert.ok(r.still.length + r.readings.length === 2, "every region is either read or listed — none vanishes");
  assert.equal(r.readings.some((x) => x.doc === "b.txt"), false, "a source that never mentions it is silent, not unread");
});

// ── the live senses ──────────────────────────────────────────────────────────
const have = (() => { try { const p = spawnSync("python3", ["-c", "import cv2, matplotlib, numpy"], { encoding: "utf8" }); const t = spawnSync("tesseract", ["--version"], { encoding: "utf8" }); return p.status === 0 && t.status === 0; } catch { return false; } })();

test("LIVE: typeset -> OpenCV finds the stacked pair -> Tesseract reads it, agreeing with the text", { skip: have ? false : "python3+opencv+matplotlib+tesseract not installed here — the live arm is not exercised" }, () => {
  const texts = [{ name: "s.txt", text: "we find H_{0} = 73.3_{-1.8}^{+1.7}$, a 2.4% precision measurement" }];
  const r = autoHardRead({ texts, anchor: /H_\{0\}\s*=\s*/, items: [] });
  assert.equal(r.readings.length, 1, JSON.stringify(r.still));
  assert.deepEqual([r.readings[0].value, r.readings[0].up, r.readings[0].down], [73.3, 1.7, 1.8]);
  assert.match(r.readings[0].routes.image, /^cv-stack:\d+$/, "the image sense was the one that agreed, not the OCR line");
});

test("a route that read the WRONG value leaves no trail, even though it produced a reading", () => {
  const r = region("H_0=73.3^{+1.7}_{-1.8}");
  const image = (route) => ({ reading: route === "cv-stack:12" ? asym(73.3, 1.7, 9.9) : route === "cv-stack:16" ? asym(73.3, 1.7, 1.8) : null });
  const s = swarmRegion(r, { trails: {}, dir: "/tmp", rng: rngFixed, now: 1, image });
  assert.equal(s.outcome.resolved, true);
  const routes = Object.values(s.trails).flat().map((t) => t.route);
  assert.ok(routes.includes("cv-stack:16"));
  assert.ok(!routes.includes("cv-stack:12"), "the liar is not reinforced");
});
