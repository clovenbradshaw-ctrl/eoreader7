// tests/reason-surface.test.mjs — cli/reason-surface.mjs's rows report, run as
// a real process on real grounds (this repo's own files, a real commit, a
// fabricated path, a fabricated hash, a non-file ground) — never a stub.
// Each test is an attempt to break one thing the report promises.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gfpClaim } from "../native/kernel/gfp-claim.js";
import { citeGround } from "../native/organs/ground-cite.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
// Overridable so a deliberately broken copy can be run against this suite, to check the suite can fail.
const SURFACE = process.env.REASON_SURFACE_UNDER_TEST ?? path.join(ROOT, "cli", "reason-surface.mjs");
const SELF = path.join(ROOT, "native", "organs", "ground-cite.js");
const REAL_COMMIT = "bb97e4b";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "reason-surface-"));

let n = 0;
const render = (spec) => {
  const specPath = path.join(TMP, `spec-${++n}.json`);
  const outPath = path.join(TMP, `out-${n}.html`);
  fs.writeFileSync(specPath, JSON.stringify(spec));
  const r = spawnSync("node", [SURFACE, specPath, "--out", outPath], { cwd: ROOT, encoding: "utf8" });
  return { status: r.status, stderr: r.stderr, wrote: fs.existsSync(outPath), html: fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : "" };
};
// dotAll: a row's copy-for-chat reference is multi-line, so a row spans lines.
const rowsOf = (html) => html.match(/<tr data-filter="[^"]*">.*?<\/tr>/gs) ?? [];

const CITED = {
  ground: SELF, rel: "walks", roles: { ARG0: "resolveGroundFile", ARG1: "a grounds holon ancestry deepest first" }, force: "strict",
  said: "resolveGroundFile walks a ground's holon ancestry deepest-first and returns the first segment that is a real file on disk",
};

test("every verdict the citer can return renders as exactly one row, with the engine's own glyph and word", () => {
  const { status, html } = render({ claims: [
    CITED,
    { ground: SELF, rel: "bakes", roles: { ARG0: "sourdough", ARG1: "on tuesdays" }, said: "sourdough bread baking rituals observed by penguins in the antarctic circle" },
    { ground: path.join(ROOT, "native", "organs", "NO-SUCH-FILE-XYZ.js"), rel: "exports", roles: { ARG0: "x", ARG1: "y" }, said: "a made-up module exports a made-up function" },
    { ground: `/commit${ROOT}#${REAL_COMMIT}`, rel: "committed", roles: { ARG0: "x", ARG1: "y" }, said: "a real commit happened" },
    { ground: `/commit${ROOT}#${"0".repeat(40)}`, rel: "committed", roles: { ARG0: "x", ARG1: "y" }, said: "a fabricated commit happened" },
    { ground: "/p3", rel: "has-type", roles: { ARG0: "x", ARG1: "int" }, said: "a claim with no file or commit behind it" },
  ] });
  assert.equal(status, 0);
  const rows = rowsOf(html);
  assert.equal(rows.length, 6, "one row per declared claim, no more, no fewer");
  assert.match(rows[0], /✓ cited/);
  assert.match(rows[0], /native\/organs\/ground-cite\.js:\d+/, "a cited row names the file and the real line");
  assert.match(rows[1], /\? unattributed/);
  assert.match(rows[2], /✗ missing/);
  assert.match(rows[3], /✓ event/);
  assert.match(rows[3], new RegExp(`${REAL_COMMIT} · \\d+ file\\(s\\)`), "an event row names the commit and its real file count");
  assert.match(rows[4], /✗ missing/, "a fabricated hash is missing, never an event");
  assert.match(rows[5], /· unaddressed/);
  assert.match(html, /6 claim\(s\) — 1 cited, 1 event, 1 unattributed, 2 missing, 1 unaddressed/, "the summary line counts by the same verdict words the rows use");
});

test("a negated claim says so — the engine's own notation drops polarity, the row must not", () => {
  const { html } = render({ claims: [{ ground: "/p1", rel: "equals", roles: { ARG0: "X", ARG1: "3" }, polarity: "-", said: "X is not 3" }] });
  assert.match(rowsOf(html)[0], /\[default, negated\]/);
});

test("a direct contradiction is shown as an error in the summary and as its own row, not dropped by the simpler layout", () => {
  const { status, html } = render({ claims: [
    { ground: "/p1", rel: "equals", roles: { ARG0: "X", ARG1: "3" }, polarity: "+", force: "strict", said: "X is 3" },
    { ground: "/p1", rel: "equals", roles: { ARG0: "X", ARG1: "3" }, polarity: "-", force: "strict", said: "X is not 3" },
  ] });
  assert.equal(status, 0);
  assert.match(html, /<span class="bad">1 error\(s\)<\/span>/);
  assert.match(html, /<td class="v bad">✗ polarity_contradiction<\/td>/);
});

test("claim text cannot inject markup or break out of an attribute", () => {
  const { html } = render({ claims: [{ ground: "/p1", rel: "says", roles: { ARG0: "<b>x</b>", ARG1: "y" }, said: `<script>alert(1)</script> " onmouseover="alert(2)` }] });
  assert.equal((html.match(/<script>/g) ?? []).length, 1, "only the page's own script tag");
  assert.ok(!html.includes("<script>alert"), "the claim's script is escaped, never live");
  assert.ok(!html.includes("<b>x</b>"), "role values are escaped too");
  assert.ok(!/ onmouseover="alert/.test(html), "a quote in the claim cannot close the data-filter attribute");
});

test("no text from a cited source reaches the page — only the claim's own words and the address", () => {
  const { html } = render({ claims: [CITED] });
  const cited = citeGround(gfpClaim(CITED), CITED.said);
  assert.equal(cited.verdict, "cited", "precondition: this claim must actually cite, or there is no excerpt to leak");
  const own = [CITED.said, CITED.roles.ARG0, CITED.roles.ARG1, CITED.rel].join(" ");
  const excerpt = cited.excerpt.replace(/\s+/g, " ").trim();
  const leaked = [];
  for (let i = 0; i + 50 <= excerpt.length; i += 25) {
    const w = excerpt.slice(i, i + 50);
    if (!own.includes(w) && html.replace(/\s+/g, " ").includes(w)) leaked.push(w);
  }
  assert.deepEqual(leaked, [], "no 50-character window of the cited chunk appears on the page");
});

test("an empty run says so instead of rendering an empty table", () => {
  const { status, html } = render({ claims: [] });
  assert.equal(status, 0);
  assert.match(html, /no claims declared this run/);
  assert.ok(!html.includes("<table>"));
});

test("the page declares utf-8 on its first line, so ✓ and · survive a server that sends no charset", () => {
  const { html } = render({ claims: [CITED] });
  assert.equal(html.split("\n")[0], `<meta charset="utf-8">`);
});

test("hundreds of claims render as hundreds of filterable rows", () => {
  const claims = Array.from({ length: 300 }, (_, i) => ({ ground: `/p${i}`, rel: "is", roles: { ARG0: `item-${i}`, ARG1: "listed" }, said: `item ${i} is listed` }));
  const t0 = Date.now();
  const { status, html } = render({ claims });
  const ms = Date.now() - t0;
  assert.equal(status, 0);
  assert.equal(rowsOf(html).length, 300);
  assert.match(html, /id="q"/, "the filter input is present");
  test.diagnostic?.(`300 rows rendered in ${ms} ms`);
});

test("a malformed claim fails loudly and writes nothing — never a half page that looks current", () => {
  const { status, stderr, wrote } = render({ claims: [{ ground: "/p1" }] });
  assert.notEqual(status, 0);
  assert.match(stderr, /needs a relation/);
  assert.equal(wrote, false);
});
