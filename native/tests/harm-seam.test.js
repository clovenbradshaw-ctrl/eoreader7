// native/tests/harm-seam.test.js — the seam probe, enforced.
//
// eval/harm-seam.mjs answers the control the isolated-writers run left open
// ("deliberately entangle two features ... rather than silently producing a
// broken splice it reports as clean"). This file makes its answers a thing the
// suite reads on every run, not a number in a results document (P94/P95: a
// figure is enforced only when a test computes it).
//
// Every claim below has a planted control: an input built to make the claim
// FALSE if the claim were false. A probe that reported only successes would
// have demonstrated nothing (II.23).
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as H from "../eval/harm-seam.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const rows = await H.runAll();
const row = (id) => rows.find((r) => r.id === id);
const SEAMS = ["seam/kebab", "seam/prefixed", "seam/bem"];

test("the rendered oracle is not vacuous: it fails the known-bad artifact and passes the known-good ones", () => {
  const bad = row("control/baseline");
  assert.equal(bad.rendered.audio, false, "the round-4 baseline has a download link, not a player");
  assert.equal(bad.rendered.ethos, false, "the round-4 baseline collapses no_signal into conflict");
  const good = row("disjoint/correct");
  assert.deepEqual([good.rendered.audio, good.rendered.ethos], [true, true]);
  assert.equal(row("seam/verbatim").rendered.color, true, "when the conventions coincide the joined page is right");
});

test("the copy of the previous run's oracle is byte-identical (bar its name) to the one that produced the 3/3", () => {
  // Verified against ccr-e0370df3-dzyiuf @ e64f9e9 native/eval/podcast-nary-structural-properties.mjs `measure`.
  const body = H.measureSourceLevel.toString().trim();
  assert.equal(crypto.createHash("sha256").update(body).digest("hex"), "7d63f1c40ff8ea359f418c1e2adeaf9b13967fa1d79fb3a0226d1985bc588835");
});

test("isolation is real: neither writer's view contains the other's region, and each contains its own", () => {
  const html = H.splice(H.readBaseline(), [{ region: "audio", fragment: H.AUDIO_WRITERS.correct }, { region: "ethosExpr", fragment: H.ETHOS_CORRECT }]).html;
  assert.equal(H.viewsAreIsolated(html), true);
  const style = H.viewFor("style", html, H.INTERFACE);
  const tmpl = H.viewFor("template", html, H.INTERFACE);
  assert.ok(H.viewText(style).includes(".ethos-badge.no_signal") && H.viewText(tmpl).includes("ethos-badge"), "each view holds its own region");
  const css = H.regionText(html, "cssRule");
  const tag = H.regionText(html, "badgeOpen");
  assert.equal(H.viewLeaks(style, tag), false);
  assert.equal(H.viewLeaks(tmpl, css), false);
  // PLANTED CONTROLS: views that DO leak the other region must be caught by the same assay.
  // (The first draft of the assay compared against JSON.stringify(view), whose escaping
  // made it pass everything; these two lines are what caught that.)
  assert.equal(H.viewLeaks({ ...style, task: tag }, tag), true);
  assert.equal(H.viewLeaks({ ...tmpl, task: css }, css), true);
});

test("SILENT: each entangled join passes every check the writers and the previous run had — and is broken", () => {
  for (const id of SEAMS) {
    const r = row(id);
    assert.deepEqual(r.local, { style: true, template: true }, `${id}: both writers' own checks pass`);
    assert.equal(r.compiles, true, `${id}: the page compiles and renders`);
    assert.deepEqual(r.sourceLevel, { audioWired: true, ethosCorrect: true }, `${id}: the previous run's oracle reports it clean`);
    assert.equal(r.rendered.color, false, `${id}: yet the joined page draws the wrong colour`);
    assert.equal(r.silentToSourceLevel, true);
    assert.equal(r.silentOnCompileAlone, true);
    assert.equal(r.onCompileAlone, "landed");
  }
});

test("the failure lands exactly where the coupling is: kebab breaks only the multi-word verdict", () => {
  assert.deepEqual(Object.keys(row("seam/kebab").renderedDetail), ["color"]);
  const detail = row("seam/kebab").renderedDetail.color;
  assert.match(detail, /no_signal:/);
  assert.doesNotMatch(detail, /(^|\| )pass:|conflict:/, "single-word verdicts survive kebab-case");
  for (const id of ["seam/prefixed", "seam/bem"]) {
    const d = row(id).renderedDetail.color;
    assert.ok(/pass:/.test(d) && /conflict:/.test(d) && /no_signal:/.test(d), `${id}: a prefix breaks all three verdicts`);
  }
});

test("LOUD: the decomposer's contracts refuse the same joins — typed, evidence kept, head unchanged", () => {
  for (const id of SEAMS) {
    const r = row(id);
    assert.equal(r.gated, "refused");
    assert.equal(r.gatedRefusal.kind, "refusal");
    assert.equal(r.gatedRefusal.reason, "seam_broken");
    assert.deepEqual(r.gatedRefusal.failed, ["color"]);
    assert.ok(r.gatedRefusal.html.includes("ethos-badge"), "the refused html is kept as evidence");
    assert.equal(r.headKeptOnRefusal, true, "a refusal is never the head");
  }
});

test("controls: agreement lands and a declared interface lands — the gate is not simply refusing everything", () => {
  for (const id of ["seam/verbatim", "seam/declared", "disjoint/correct", "oracle/source-child"]) {
    assert.equal(row(id).gated, "landed", id);
    assert.equal(row(id).broken, false, id);
  }
});

test("the previous oracle is loose in one direction and NOT vacuous in the other", () => {
  const dead = row("oracle/dead-audio-keeps-link");
  assert.equal(dead.sourceLevel.audioWired, true, "it reads a dead <audio> beside a surviving download link as wired");
  assert.equal(dead.rendered.audio, false, "the rendered page has no playable src");
  assert.equal(dead.silentToSourceLevel, true);
  const wrong = row("oracle/wrong-property");
  assert.equal(wrong.sourceLevel.audioWired, false, "it does catch a src that names a property that does not exist");
  assert.equal(wrong.rendered.audio, false);
  assert.equal(wrong.silentToSourceLevel, false);
  const child = row("oracle/source-child");
  assert.deepEqual([child.sourceLevel.audioWired, child.rendered.audio], [true, true], "and both accept the legitimate <source> form");
});

test("the declared interface is vocabulary only: it carries no code from either side", () => {
  const text = JSON.stringify(H.INTERFACE);
  assert.ok(text.length < 100, "a few dozen bytes, not a file");
  assert.doesNotMatch(text, /\$\{|<|>|background|color|style|\.ethos/i, "no markup, no CSS, no template code");
  assert.deepEqual([...H.INTERFACE.verdictClasses], [...H.VERDICTS]);
  // and handing it over costs the writers no isolation
  const html = H.splice(H.readBaseline(), [{ region: "audio", fragment: H.AUDIO_WRITERS.correct }, { region: "ethosExpr", fragment: H.ETHOS_CORRECT }]).html;
  assert.equal(H.viewsAreIsolated(html), true);
});

test("splice: regions are matched on the ORIGINAL, so one fragment can never be re-matched by another region's pattern", () => {
  const html = H.readBaseline();
  const trap = "/* <span class=\"ethos-badge\"> */"; // text that matches the badgeOpen pattern, placed EARLIER in the document
  const safe = H.splice(html, [{ region: "cssRule", fragment: trap }, { region: "badgeOpen", fragment: "<b>" }]);
  assert.equal(safe.ok, true);
  assert.ok(safe.html.includes(trap), "the fragment is intact");
  assert.equal([...safe.html.matchAll(/<b>/g)].length, 1);
  // planted control: the previous run's sequential replace edits the WRONG region on the same input
  const sequential = html.replace(H.REGIONS.cssRule, () => trap).replace(H.REGIONS.badgeOpen, () => "<b>");
  assert.ok(!sequential.includes(trap), "sequential replace lets the second pattern eat the first fragment");
});

test("splice refuses, typed: unknown, not found, ambiguous, overlapping", () => {
  const html = H.readBaseline();
  assert.equal(H.splice(html, [{ region: "nope", fragment: "x" }]).refusal.reason, "unknown_region");
  assert.equal(H.splice("<p>nothing</p>", [{ region: "badgeOpen", fragment: "x" }]).refusal.reason, "region_not_found");
  const twice = html.replace("</body>", "<span class=\"ethos-badge\"></body>");
  assert.equal(H.splice(twice, [{ region: "badgeOpen", fragment: "x" }]).refusal.reason, "region_ambiguous");
  assert.equal(H.splice(html, [{ region: "badgeOpen", fragment: "a" }, { region: "badgeOpen", fragment: "b" }]).refusal.reason, "regions_overlap");
});

test("the ledger is append-only: land() never mutates what it was given", async () => {
  const base = H.readBaseline();
  const ledger = Object.freeze({ entries: Object.freeze([Object.freeze({ seq: 0, kind: "round", note: "baseline", html: base })]) });
  const out = await H.land(ledger, { html: "<html>", note: "broken" }, { mode: "structural" });
  assert.equal(out.landed, false);
  assert.equal(ledger.entries.length, 1);
  assert.equal(out.ledger.entries.length, 2);
  assert.equal(out.ledger.entries[0], ledger.entries[0]);
  assert.equal(out.ledger.entries[1].reason, "structure_broken");
});

const permissionAvailable = spawnSync(process.execPath, ["--experimental-permission", "-e", "1"]).status === 0;

test("model-written code is rendered in an isolated child: same result as in-process on trusted html", { skip: !permissionAvailable && "node permission model unavailable" }, async () => {
  const html = H.splice(H.readBaseline(), [{ region: "audio", fragment: H.AUDIO_WRITERS.correct }, { region: "ethosExpr", fragment: H.ETHOS_CORRECT }]).html;
  const a = await H.renderPage(html);
  const b = await H.renderPageIsolated(html);
  assert.deepEqual(b, a);
});

test("isolation holds against the two things a bad fragment can do: hang, and reach outside", { skip: !permissionAvailable && "node permission model unavailable" }, async () => {
  const wrap = (body) => H.readBaseline().replace("subscribeButton.addEventListener('click', async () => {", `subscribeButton.addEventListener('click', async () => { ${body}`);
  const hang = await H.renderPageIsolated(wrap("while (true) {}"), H.EPISODES, { timeoutMs: 1500 });
  assert.equal(hang.ok, false);
  assert.match(hang.error, /killed/);
  // why the child exists at all: node:vm alone is not a boundary. Reaching the host's
  // `process` needs only a host-realm function, and the fake DOM hands the page one.
  const reach = "console.log.constructor('return process')()";
  const marker = () => path.join(os.tmpdir(), `harm-seam-escape-${process.pid}-${Math.random().toString(36).slice(2)}`);
  const writeVia = (m) => wrap(`try { ${reach}.getBuiltinModule('fs').writeFileSync(${JSON.stringify(m)}, 'x'); } catch (e) {}`);
  // POSITIVE CONTROL: without the child, the very same fragment writes the file — so the assertion below can fail.
  const m1 = marker();
  await H.renderPage(writeVia(m1));
  assert.equal(fs.existsSync(m1), true, "control: unisolated, a fragment can write outside the page");
  fs.rmSync(m1, { force: true });
  const m2 = marker();
  await H.renderPageIsolated(writeVia(m2), H.EPISODES, { timeoutMs: 3000 });
  assert.equal(fs.existsSync(m2), false, "isolated, the same write is denied");
  fs.rmSync(m2, { force: true });
});

test("live arm plumbing, against a STUB that stands in for Ollama (evidence about no model)", { skip: !permissionAvailable && "node permission model unavailable" }, async () => {
  const css = ".ethos-badge.pass {\n  background-color: green;\n}\n.ethos-badge.no_signal {\n  background-color: gray;\n}";
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      const prompt = JSON.parse(body).messages[0].content;
      const reply = /CSS rule/.test(prompt) ? css
        : (/exact spellings/.test(prompt) ? "<span class=\"ethos-badge ${episode.ethos}\">" : "<span class=\"ethos-badge ${String(episode.ethos).replace(/_/g, '-')}\">");
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ message: { content: "```\n" + reply + "\n```" } }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const prev = process.env.ER7_OLLAMA_URL;
  process.env.ER7_OLLAMA_URL = `http://127.0.0.1:${server.address().port}`;
  try {
    const live = await H.runLive({ reps: 2 });
    assert.equal(live.report.undeclared.silent_seam_break, 2, "an undeclared kebab writer breaks the seam silently, both times");
    assert.equal(live.report.declared.seam_holds, 2, "the declared interface closes it, both times");
    assert.equal(live.report.undeclared.writer_failed + live.report.declared.writer_failed, 0);
  } finally {
    if (prev === undefined) delete process.env.ER7_OLLAMA_URL; else process.env.ER7_OLLAMA_URL = prev;
    await new Promise((r) => server.close(r));
  }
});

test("the fixture is the artifact its provenance names (a hash typed by hand cannot drift)", () => {
  const dir = path.join(HERE, "..", "eval", "fixtures", "harm-seam");
  const prov = JSON.parse(fs.readFileSync(path.join(dir, "podcast-baseline-round4.html.provenance.json"), "utf8"));
  assert.equal(crypto.createHash("sha256").update(H.readBaseline()).digest("hex"), prov.sha256);
});

test("the committed results file is what the driver produces now (a transcription cannot drift)", () => {
  const file = path.join(HERE, "..", "eval", "results", "harm-seam-RESULTS.md");
  assert.ok(fs.existsSync(file), "run: node native/eval/harm-seam.mjs");
  assert.equal(fs.readFileSync(file, "utf8"), H.resultsMarkdown(rows));
});
