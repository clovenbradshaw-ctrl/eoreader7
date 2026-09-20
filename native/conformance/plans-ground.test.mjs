// plans-ground.test.mjs — conformance gates for the Nashville plans surface.
// The whole point: nothing appears on the surface that isn't byte-traceable
// to a retained document or a provenance-stamped metric snapshot.
//
// Gate list (nashville-plans-surface.md §7):
//   1. every ground sidecar's pdf_sha256/txt_sha256 matches on-disk bytes;
//   2. every PlanLedgerObservation@1 `.at` ref resolves via resolveSnippet to
//      verbatim-exact text, and `page` matches the pagemap;
//   3. zero surfaced source-lane rows carry kind proposal or a giver (a
//      proposal may not reach the source lane unflagged);
//   4. every MetricRow@1 rendered carries dataset + source + asOf;
//   5. the alternating ground digest re-derives — the gate refuses a surface
//      that references ground outside the digest.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../../cli/holograph.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NASH = join(HERE, "../../plans/nashville");
const GROUND = join(NASH, "ground");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));
const ledger = readFileSync(join(NASH, "ledger", "plans-nashville.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map(JSON.parse);
const metrics = JSON.parse(readFileSync(join(NASH, "metrics", "metrics-nashville.json"), "utf8"));
const digestFile = JSON.parse(readFileSync(join(NASH, "ground-digest.json"), "utf8"));

test("G1: provenance sidecars pin the on-disk bytes", () => {
  for (const d of manifest.docs) {
    const s = JSON.parse(readFileSync(join(GROUND, `${d.id}.txt.provenance.json`), "utf8"));
    assert.equal(s.pdf_sha256, sha(join(GROUND, `${d.id}.pdf`)), `${d.id} pdf_sha256`);
    assert.equal(s.txt_sha256, sha(join(GROUND, `${d.id}.txt`)), `${d.id} txt_sha256`);
    assert.ok(s.url && s.license, `${d.id} carries url + license`);
  }
});

test("G2: every ledger ref resolves verbatim and its page matches the pagemap", () => {
  assert.ok(ledger.length > 0, "ledger is not empty");
  for (const r of ledger) {
    const ref = `${r.doc}#${r.at[0]}-${r.at[1]}`;
    const s = resolveSnippet(ref, [join(HERE, "../../plans")]);
    assert.ok(s && s.resolved && s.verbatim, `ref resolves: ${r.id} ${ref}`);
    assert.equal(s.verbatim, r.verbatim, `verbatim-exact: ${r.id}`);
    const id = r.doc.split("/").pop().replace(".txt", "");
    const pagemap = JSON.parse(readFileSync(join(GROUND, `${id}.txt.pagemap.json`), "utf8"));
    const pg = pagemap.find((p) => r.at[0] >= p.byteStart && r.at[0] < p.byteEnd);
    assert.ok(pg, `${r.id} byte in pagemap`);
    assert.equal(r.page, pg.page, `${r.id} page matches pagemap`);
  }
});

test("G3: no source-lane row is an unflagged proposal", () => {
  const bad = ledger.filter((r) => r.kind === "proposal" || r.giver);
  assert.deepEqual(bad, [], "no proposal/giver rows may reach the surfaced ledger");
});

test("G4: every metric row rendered carries dataset + source + asOf", () => {
  assert.ok(metrics.length > 0, "metrics not empty");
  for (const m of metrics) {
    assert.equal(m.schema, "MetricRow@1");
    assert.ok(m.provenance, `${m.id} has provenance`);
    assert.ok(m.provenance.dataset && m.provenance.source && m.provenance.asOf, `${m.id} provenance complete`);
  }
});

test("G5: the alternating ground digest re-derives; the ledger stays inside it", () => {
  const parts = [];
  for (const d of manifest.docs) {
    const txt = readFileSync(join(GROUND, `${d.id}.txt`));
    parts.push(`${d.id}\n${createHash("sha256").update(txt).digest("hex")}\n`);
  }
  const digest = createHash("sha256").update(parts.join("")).digest("hex");
  assert.equal(digest, digestFile.digest, "ground digest unchanged");
  const digestDocs = new Set(digestFile.docs);
  for (const r of ledger) {
    const id = r.doc.split("/").pop().replace(".txt", "");
    assert.ok(digestDocs.has(id), `ledger row ${r.id} references digest-included ground ${id}`);
  }
});

test("the extractor is deterministic: same layer in, same rows out", async () => {
  const { extractPlanRows } = await import("../organs/plans/extract.mjs");
  for (const d of manifest.docs) {
    const text = readFileSync(join(GROUND, `${d.id}.txt`), "utf8");
    const a = extractPlanRows({ text, doc: d.id, mode: d.extraction ?? "layout" });
    const b = extractPlanRows({ text, doc: d.id, mode: d.extraction ?? "layout" });
    assert.deepEqual(a, b, `${d.id} deterministic`);
  }
});

test("the extractor is deterministic under a discovery vocab: same vocab in, same rows out", async () => {
  const { extractPlanRows } = await import("../organs/plans/extract.mjs");
  const vocab = { agencies: ["MTA", "MDHA", "Housing Division"], places: ["East Bank", "Antioch"], quantities: ["$"], goals: ["Goal", "Action"] };
  for (const d of manifest.docs) {
    const text = readFileSync(join(GROUND, `${d.id}.txt`), "utf8");
    const a = extractPlanRows({ text, doc: d.id, mode: d.extraction ?? "layout", vocab });
    const b = extractPlanRows({ text, doc: d.id, mode: d.extraction ?? "layout", vocab });
    assert.deepEqual(a, b, `${d.id} vocab-deterministic`);
  }
});

test("the extractor resolves a captured match to the VOCAB's canonical spelling, never the raw case", async () => {
  const { extractPlanRows } = await import("../organs/plans/extract.mjs");
  const vocab = { agencies: ["WeGo", "MTA"], places: ["East Bank"], quantities: ["$"], goals: ["Goal"] };
  const text = "Goal: WEGO will expand service and EAST BANK will grow.\nGoal: WeGo and east bank are the same beings again.";
  const rows = extractPlanRows({ text, doc: "case-test", mode: "layout", vocab });
  const agencies = rows.map((r) => r.fields?.agency).filter(Boolean);
  const places = rows.map((r) => r.fields?.place).filter(Boolean);
  assert.deepEqual([...new Set(agencies)], ["WeGo"], `"WEGO" and "WeGo" collapse to the vocab spelling — got ${JSON.stringify([...new Set(agencies)])}`);
  assert.deepEqual([...new Set(places)], ["East Bank"], `"EAST BANK" and "east bank" collapse to the vocab spelling — got ${JSON.stringify([...new Set(places)])}`);
  // without a vocab the received patterns' own match stands
  const bare = extractPlanRows({ text: "WEGO expands EAST BANK service.", doc: "case-test", mode: "layout" });
  const bareA = bare.map((r) => r.fields?.agency).filter(Boolean);
  assert.deepEqual([...new Set(bareA)], ["WEGO"], "no vocab: the received match stands as captured");
});

test("layout rules: a columned page is merged mechanically, a margin reads flat, CV is only escalated", async () => {
  const { layoutRead, midGutterOf, resetLayoutLibrary, recLayoutRule } = await import("../the-fold/surface/block-layout.mjs");
  resetLayoutLibrary();
  try {
    // a real two-column page: mid-line gutter, content on both sides
    const twoCol = [
      "Policy 1: Expand housing            Strategy A: Preserve existing stock",
      "opportunities for all.              through acquisition and rehab.",
      "This is the left column text.       This is the right column text.",
      "It continues down the page.         It also continues down the page.",
      "Action 2.1: fund 1,500 units.       Action 3.1: establish a land bank.",
      "More left column content here.      More right column content here.",
      "Left column keeps going.            Right column keeps going.",
    ].join("\n");
    assert.ok(midGutterOf(twoCol.split("\n")[0]) !== null, "a columned line carries a mid-line gutter");
    const r1 = layoutRead(twoCol);
    assert.equal(r1.shape, "column_merge", "columned page settles mechanically");
    assert.equal(r1.demandsCV, false, "no CV call for a mechanically-settled column page");
    assert.ok(r1.columns?.length >= 2, "the columns are recovered");

    // a margin-only page: whitespace on one side only — must NOT be split
    const margin = [
      "      This is just indented prose.",
      "      It has a wide left margin.",
      "      Nothing on the right side.",
      "      The margin is not a gutter.",
      "      So it should read flat.",
      "      Repeated indent everywhere.",
      "      Seven lines in total here.",
    ].join("\n");
    const r2 = layoutRead(margin);
    assert.equal(r2.shape, "prose", "margin-only page reads flat");

    // a box-drawing page: the rule set demands the visual sense (escalates)
    const diagram = "┌──────┐    ┌──────┐\n│  A   │───▶│  B   │\n└──────┘    └──────┘\n".repeat(6) + "x\n";
    const r3 = layoutRead(diagram);
    assert.equal(r3.demandsCV, true, "box-drawing page escalates to CV");

    // REC: the CV verdict becomes a rule, so the same shape is mechanical
    // next time — a CV call is not always needed.
    const rec = recLayoutRule({ signals: ["box_drawing", "wide_whitespace_runs"], settle: "column_merge", note: "conformance test" });
    assert.ok(rec.rec, "the settled shape is REC'd into the library");
    const colish = "┌──────┐ text left                      text right here\n".repeat(8);
    const r4 = layoutRead(colish);
    assert.equal(r4.demandsCV, false, "after REC the same shape is mechanical");
  } finally {
    resetLayoutLibrary();
  }
});