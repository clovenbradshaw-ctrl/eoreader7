// surface-blocks.test.mjs — THE BLOCKS ARE THE BLOCKS: proof that the fold's
// surface kit composes any instance from scratch. A synthetic two-document
// instance is spun up end-to-end (extract → cast → metrics → derive → gate →
// render) with no network and no real documents; then the gate's refusals are
// pinned: a tampered byte refuses the surface, an unflagged proposal refuses
// it. Finally the real Nashville instance is gated against its retained
// ground (skipped when the ground is absent).
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { resolveSnippet } from "../../cli/holograph.mjs";
import { groundDigest } from "../the-fold/surface/block-ground.mjs";
import { castTexts } from "../the-fold/surface/block-cast.mjs";
import { extractLinks } from "../the-fold/surface/block-extract.mjs";
import { foldFieldRows } from "../the-fold/surface/block-metrics.mjs";
import { deriveProjections } from "../the-fold/surface/block-derive.mjs";
import { gateSurface } from "../the-fold/surface/block-gate.mjs";
import { renderSurface } from "../the-fold/surface/block-surface.mjs";

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

function syntheticGround(dir) {
  mkdirSync(join(dir, "inst"), { recursive: true });
  const a = join(dir, "inst", "a.txt");
  const b = join(dir, "inst", "b.txt");
  writeFileSync(a, "The Grove Transit Authority (GTA) will build 12 miles of busway.\nThe GTA will coordinate with East Bank development.\n");
  writeFileSync(b, "The new Metro Line will run 8 miles of track through the corridor.\n");
  const docs = [
    { id: "a", title: "Grove Plan", category: "transit", scale: "region", adopted: "2024", url: "synthetic://a", license: "test", extraction: "layout", pdf_sha256: "x", txt_sha256: sha(a), chars: readFileSync(a, "utf8").length, pages: 1, pdfPath: a, txtPath: a, sidecarPath: a + ".provenance.json", pagemapPath: a + ".pagemap.json" },
    { id: "b", title: "Metro Line Study", category: "transit", scale: "region", adopted: "2025", url: "synthetic://b", license: "test", extraction: "layout", pdf_sha256: "x", txt_sha256: sha(b), chars: readFileSync(b, "utf8").length, pages: 1, pdfPath: b, txtPath: b, sidecarPath: b + ".provenance.json", pagemapPath: b + ".pagemap.json" },
  ];
  return { schema: "EOGround@1", digest: groundDigest({ docs }), docs };
}

const def = {
  city: "synthetic", name: "Synthetic City",
  topics: [{ id: "transit", label: "Transit", queries: ["busway", "miles", "track"] }],
  metrics: { placeDistricts: { "East Bank": [1] } },
  analysis: [{ text: "The Grove and the Metro Line may be one network — no retained source states it." }],
};

function syntheticMetrics(dir) {
  // a retained data artifact: raw district rows + a derived aggregate.
  const dataDir = join(dir, "data");
  mkdirSync(dataDir, { recursive: true });
  const path = join(dataDir, "geo.json");
  const distRow = { district: 1, population: 1000, pct_renter: 80, median_household_income: 50000, pct_child_poverty: 10 };
  writeFileSync(path, JSON.stringify({ datasets: { districts: { rows: [distRow] } } }));
  const text = readFileSync(path, "utf8");
  const start = text.indexOf('"district":1');
  const metrics = foldFieldRows({
    snapshot: {},
    provenance: { dataset: "data/geo.json", source: "test fixture", asOf: "2026-01-01" },
    adapters: [
      { registry: "districts", run: ({ push }) => push("districts", distRow, { district: 1 }) },
      { registry: "housing-stress", run: ({ push }) => push("housing-stress", { totalEvictionFilings: 99 }) },
    ],
  });
  for (const m of metrics) {
    if (m.registry === "districts") {
      const end = text.indexOf("}", start) + 1;
      m.at = [start, end];
      m.ref = "data/geo.json#" + start + "-" + end;
      m.verbatim = text.slice(start, end);
    } else {
      m.derivedFrom = { address: "data/geo.json#/datasets/districts/rows", basis: "test fold" };
    }
  }
  return { metrics, snapshotSidecar: { path, sha256: sha(path) } };
}

test("a synthetic instance spins up end-to-end from nothing: extract → cast → metrics → derive → gate → render", () => {
  const dir = mkdtempSync(join(tmpdir(), "fold-surface-"));
  const ground = syntheticGround(dir);
  const cast = castTexts({ texts: ground.docs.map((d) => ({ name: d.title, text: readFileSync(d.txtPath, "utf8") })) });
  const links = ground.docs.flatMap((d) => extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `inst/${d.id}.txt`, mode: d.extraction }));
  const { metrics, snapshotSidecar } = syntheticMetrics(dir);
  const projections = deriveProjections({ links, cast, def, metrics });
  const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: dir, snapshotSidecar });

  assert.ok(links.length >= 2, `extractor found links (${links.length})`);
  assert.ok(cast.referents.size > 0, "cast discovered referents");
  assert.deepEqual(cast.resolveIn("The bongo rhino will inspect the levee.").size, 0, "a never-mentioned being resolves to nothing");
  assert.ok(projections.networks.some((n) => n.id === "transit" && n.rows >= 1), "the transit lens folds links");
  const eb = projections.places.find((p) => p.place === "East Bank");
  assert.ok(eb && eb.links.length >= 1, "East Bank is lit by a link");
  assert.ok(gate.ok, `gate passes: ${gate.checks.map((c) => c.detail).join("; ")}`);
  assert.deepEqual(extractLinks({ text: readFileSync(ground.docs[0].txtPath, "utf8"), doc: "inst/a.txt", mode: "layout" }),
    extractLinks({ text: readFileSync(ground.docs[0].txtPath, "utf8"), doc: "inst/a.txt", mode: "layout" }), "extraction is deterministic");

  const html = renderSurface({ def, ground, links, metrics, projections, gate });
  assert.ok(html.includes("Grove"), "surface renders the grounded row");
  assert.ok(html.includes("Transit"), "surface renders the lens");
  assert.ok(html.includes("stated by the model"), "the analysis lane is marked, never blended");
  assert.ok(html.includes("● pass"), "the gated surface wears its pass");
  assert.ok(html.includes("class=\"gchip"), "every grounded element wears its grounding glyph chip");
  assert.ok(html.includes("data-cell=\"CON·Figure\""), "a connection row's chip names its cell (arrangement read from the material's own words)");
  assert.ok(html.includes("data-cell=\"INS·Figure\""), "a source card's chip names its cell (brought into being with its result attached)");
  assert.ok(html.includes("id=\"grounding-cells\""), "the per-cell grounding table is embedded once for the modal");
  assert.ok(html.includes("id=\"gmodal\""), "the grounding modal is present");
  assert.ok(html.includes("∅") && html.includes("⊛"), "the canonical operator glyphs render");
});

test("a tampered ground byte refuses the surface — the digest re-derives from the FILES", () => {
  const dir = mkdtempSync(join(tmpdir(), "fold-surface-"));
  const ground = syntheticGround(dir);
  const links = ground.docs.flatMap((d) => extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `inst/${d.id}.txt`, mode: d.extraction }));
  const metrics = [];
  appendFileSync(join(dir, "inst", "a.txt"), "\none tampered byte\n");
  const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: dir });
  assert.equal(gate.ok, false, "gate refuses a tampered ground");
  assert.ok(gate.checks.some((c) => !c.ok && c.name === "ground digest re-derives"), "the digest check names the refusal");
});

test("a tampered metric byte refuses the surface — metrics resolve to retained bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "fold-surface-"));
  const ground = syntheticGround(dir);
  const links = ground.docs.flatMap((d) => extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `inst/${d.id}.txt`, mode: d.extraction }));
  const { metrics, snapshotSidecar } = syntheticMetrics(dir);
  // tamper INSIDE the district row's span: the verbatim must change.
  const path = snapshotSidecar.path;
  const text = readFileSync(path, "utf8");
  writeFileSync(path, text.replace('population":1000', 'population":1001'));
  const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: dir, snapshotSidecar: { path, sha256: sha(path) } });
  assert.equal(gate.ok, false, "gate refuses a tampered metric byte");
  assert.ok(gate.checks.some((c) => !c.ok && c.name === "metrics resolve to retained bytes"), "the metric check names the refusal");
});

test("an unflagged proposal refuses the surface — the model may propose, it may not launder", () => {
  const dir = mkdtempSync(join(tmpdir(), "fold-surface-"));
  const ground = syntheticGround(dir);
  const links = ground.docs.flatMap((d) => extractLinks({ text: readFileSync(d.txtPath, "utf8"), doc: `inst/${d.id}.txt`, mode: d.extraction }));
  links.push({ id: "proposal:1", doc: "inst/a.txt", at: [0, 5], verbatim: "The Gr", kind: "proposal", giver: "a model", fields: {} });
  const gate = gateSurface({ ground, links, metrics: [], resolveSnippet, plansRoot: dir });
  assert.equal(gate.ok, false, "gate refuses the proposal");
  assert.ok(gate.checks.some((c) => !c.ok && c.name === "no unflagged proposals"), "the proposal check names the refusal");
});

test("the real Nashville instance gates green against its retained ground", () => {
  const HERE = dirname(fileURLToPath(import.meta.url));
  const GROUND = join(HERE, "../../plans/nashville/ground");
  if (!existsSync(join(GROUND, "nmotion-final.txt"))) return; // ground not retained here
  const manifest = JSON.parse(readFileSync(join(HERE, "../../plans/nashville/manifest.json"), "utf8"));
  const ledger = readFileSync(join(HERE, "../../plans/nashville/ledger/plans-nashville.jsonl"), "utf8")
    .trim().split("\n").filter(Boolean).map(JSON.parse);
  const metrics = JSON.parse(readFileSync(join(HERE, "../../plans/nashville/metrics/metrics-nashville.json"), "utf8"));
  const docs = manifest.docs.map((d) => {
    const s = JSON.parse(readFileSync(join(GROUND, `${d.id}.txt.provenance.json`), "utf8"));
    return { id: d.id, title: s.title, category: d.category, scale: d.scale, adopted: s.adopted, url: s.url, license: s.license, extraction: d.extraction, pdf_sha256: s.pdf_sha256, txt_sha256: s.txt_sha256, chars: s.chars, pages: s.pages, pdfPath: join(GROUND, `${d.id}.pdf`), txtPath: join(GROUND, `${d.id}.txt`), sidecarPath: join(GROUND, `${d.id}.txt.provenance.json`), pagemapPath: join(GROUND, `${d.id}.txt.pagemap.json`) };
  });
  const ground = { schema: "EOGround@1", digest: groundDigest({ docs }), docs };
  const pinned = JSON.parse(readFileSync(join(HERE, "../../plans/nashville/ground-digest.json"), "utf8"));
  assert.equal(ground.digest, pinned.digest, "the retained Nashville ground matches its pinned digest");
  const dataSidecar = JSON.parse(readFileSync(join(HERE, "../../plans/nashville/data/nashville-geo.json.sidecar.json"), "utf8"));
  const gate = gateSurface({ ground, links: ledger, metrics, resolveSnippet, plansRoot: join(HERE, "../../plans"), snapshotSidecar: { path: join(HERE, "../../plans/nashville/data/nashville-geo.json"), sha256: dataSidecar.sha256 } });
  assert.ok(gate.ok, `Nashville gate: ${gate.checks.map((c) => c.detail).join("; ")}`);
});