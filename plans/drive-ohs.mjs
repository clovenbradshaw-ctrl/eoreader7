// drive-ohs.mjs — the OHS custody corpus through the fold's surface blocks.
// Chain: ground → cast → metrics → derive → gate → surface, the same
// pipeline drive-metro-code.mjs uses. Run plans/derive-ohs.mjs first: it
// rebuilds ground/ and ledger/ from the ohs-custody repo.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../cli/holograph.mjs";
import { groundDigest } from "../native/the-fold/surface/block-ground.mjs";
import { castTexts } from "../native/the-fold/surface/block-cast.mjs";
import { deriveProjections } from "../native/the-fold/surface/block-derive.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { renderSurface } from "../native/the-fold/surface/block-surface.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OHS = join(HERE, "ohs");
const GROUND = join(OHS, "ground");

const sd = JSON.parse(readFileSync(join(OHS, "ohs.surfacedef.json"), "utf8"));

// ── ground: every retained document, hashed and page-bridged ─────────────
const docs = readdirSync(GROUND).filter((f) => f.endsWith(".txt")).map((f) => {
  const id = f.replace(/\.txt$/, "");
  const txtPath = join(GROUND, f);
  const prov = JSON.parse(readFileSync(`${txtPath}.provenance.json`, "utf8"));
  return {
    id,
    title: prov.title,
    category: prov.doctype || "record",
    scale: prov.tier || "",
    publisher: "",
    adopted: String(prov.retrieved_at || "").slice(0, 10),
    url: prov.source_url,
    license: prov.license,
    extraction: prov.extraction,
    pdf_sha256: prov.capture?.[0]?.sha256 ?? "n/a",
    txt_sha256: prov.txt.sha256,
    chars: prov.txt.chars,
    pages: prov.pages ?? 1,
    pdfPath: txtPath,
    txtPath,
    sidecarPath: `${txtPath}.provenance.json`,
    pagemapPath: `${txtPath}.pagemap.json`,
  };
});
const ground = { schema: "EOGround@1", digest: groundDigest({ docs }), docs };

// ── cast: the beings the retained text names ─────────────────────────────
const texts = docs.map((d) => ({ name: d.title, text: readFileSync(d.txtPath, "utf8") }));
const cast = castTexts({ texts });

// ── links: the anchored rows derive-ohs.mjs located ──────────────────────
const links = readFileSync(join(OHS, "ledger", "plans-ohs.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map((l) => {
    const r = JSON.parse(l);
    return { schema: "PlanLedgerObservation@1", supersedes: null, giver: null, ...r };
  });

// ── metrics: what the custody record says about its own standing ─────────
// Not an outside dataset — a deterministic fold over the corpus's own tiers,
// statuses and doctypes, so the surface can show how well evidenced it is.
const count = (pick) => {
  const m = {};
  for (const d of docs) { const k = pick(d) || "—"; m[k] = (m[k] ?? 0) + 1; }
  return m;
};
const metrics = [];
const pushReg = (registry, obj, keyName) => {
  for (const [k, n] of Object.entries(obj)) {
    metrics.push({
      schema: "MetricRow@1", id: `${registry}:${k}`, registry,
      fields: { [keyName]: k, documents: n },
      derivedFrom: { address: "ohs/ground/*.provenance.json", basis: "deterministic fold over the retained provenance" },
      provenance: { dataset: "ohs-custody", source: sd.case_label ?? "OHS custody", asOf: new Date().toISOString().slice(0, 10) },
    });
  }
};
pushReg("evidence-tier", count((d) => d.scale), "tier");
pushReg("document-type", count((d) => d.category), "doctype");
const statusCount = {};
for (const l of links) { const k = l.fields?.status || "—"; statusCount[k] = (statusCount[k] ?? 0) + 1; }
for (const [k, n] of Object.entries(statusCount)) {
  metrics.push({
    schema: "MetricRow@1", id: `anchor-status:${k}`, registry: "anchor-status",
    fields: { status: k, anchors: n },
    derivedFrom: { address: "ohs/ledger/plans-ohs.jsonl", basis: "deterministic fold over the located anchors" },
    provenance: { dataset: "ohs-custody", source: sd.case_label ?? "OHS custody", asOf: new Date().toISOString().slice(0, 10) },
  });
}

// ── def ───────────────────────────────────────────────────────────────────
const def = {
  city: "OHS",
  name: sd.name ?? "OHS custody",
  title: sd.case_label ?? "Office of Homeless Services — the custody record",
  sub: sd.sub ?? "Every source retained for the OHS standby record — captured bytes, hashed, and each claim's anchor located in the retained text. Nothing here is confirmed until the bytes confirm it.",
  mark: "custody → claim",
  projLabel: "projection state — one constraint set, read by all nine surfaces:",
  verbs: [
    { word: "sources", text: `${docs.length} retained captures · ohs-custody` },
    { word: "anchors", text: `${links.length} located in the retained text` },
    { word: "tiers", text: Object.keys(count((d) => d.scale)).join(" · ") },
  ],
  topics: (sd.lenses ?? []).map((t) => ({ id: t.id, label: t.label, queries: t.queries ?? [] })),
  metrics: { placeDistricts: {} },
  analysis: [],
};

const projections = deriveProjections({ links, cast, def, metrics });

const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar: null });
console.log("gate:", gate.ok ? "PASS" : "REFUSE");
for (const c of gate.checks) console.log(`  ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
if (!gate.ok) { console.error("\nrefusing to render — the surface is ungrounded."); process.exit(1); }

const html = renderSurface({ def, ground, links, metrics, projections, gate, nativePages: {}, geoPoints: null });
const out = join(dirname(HERE), "native", "the-fold", "ohs-surface-holograph.html");
writeFileSync(out, html);
console.log("\nwrote", out, (html.length / 1e6).toFixed(2), "MB");
console.log("docs:", docs.length, "· links:", links.length, "· metrics:", metrics.length, "· lenses:", def.topics.length);
