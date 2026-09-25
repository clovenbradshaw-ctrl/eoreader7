// drive-metro-code.mjs — the Metropolitan Code instance through the fold's
// surface blocks (the same pipeline that renders plans-surface-holograph.html).
// Chain: ground → cast → extract(read) → metrics → derive → gate → surface.
// The gate is a hard precondition: an ungrounded surface is refused.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../cli/holograph.mjs";
import { groundDigest } from "../native/the-fold/surface/block-ground.mjs";
import { castTexts } from "../native/the-fold/surface/block-cast.mjs";
import { deriveProjections } from "../native/the-fold/surface/block-derive.mjs";
import { gateSurface } from "../native/the-fold/surface/block-gate.mjs";
import { renderSurface } from "../native/the-fold/surface/block-surface.mjs";

const HERE = dirname(fileURLToPath(import.meta.url)); // .../plans
const MC = join(HERE, "metro-code");
const GROUND = join(MC, "ground");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// ── def: the surface definition with the 23 harm referents as lenses ─────
const HARMS = [
  ["harm:roadway-injury-fatality", "Roadway injury and fatality", ["traffic", "vehicle", "highway", "road", "crossing", "driver", "street", "pedestrian", "parking"]],
  ["harm:use-of-force-and-police-killing", "Police use-of-force and police-involved death", ["force", "arrest", "police", "weapon", "firearm", "deadly", "officer"]],
  ["harm:fire-injury-and-death", "Fire injury and death", ["fire", "firefighting", "fire prevention", "burn", "hazardous material", "rescue"]],
  ["harm:emergency-response-delay", "Emergency response delay", ["emergency", "ambulance", "rescue", "911", "dispatch", "communications", "response"]],
  ["harm:structural-and-code-enforcement-harm", "Structural and building-code enforcement harm", ["building", "structure", "code", "inspection", "electrical", "plumbing", "mechanical", "construction", "occupancy"]],
  ["harm:water-contamination-illness", "Water contamination and waterborne illness", ["water", "sewer", "sewage", "drainage", "pollution", "backflow", "stormwater"]],
  ["harm:environmental-pollution-exposure", "Environmental pollution and toxic exposure", ["environment", "pollution", "emission", "waste", "air", "soil", "noise", "hazardous"]],
  ["harm:food-and-sanitation-illness", "Food and sanitation illness", ["food", "sanitation", "rodent", "pest", "restaurant", "meat", "inspection"]],
  ["harm:infectious-disease-outbreak", "Infectious disease outbreak", ["disease", "infectious", "epidemic", "vaccin", "quarantine", "health", "illness", "contagious"]],
  ["harm:maternal-and-infant-mortality", "Maternal and infant mortality", ["maternal", "infant", "pregnancy", "birth", "mother", "prenatal"]],
  ["harm:child-welfare-harm", "Child welfare harm", ["child", "juvenile", "minor", "family", "youth", "abuse", "neglect"]],
  ["harm:custodial-death", "Custodial death and detention harm", ["jail", "custody", "detention", "confinement", "prison", "probation", "parole", "court"]],
  ["harm:homelessness-and-exposure-death", "Homelessness-related and exposure death", ["homeless", "shelter", "encampment", "exposure", "housing", "outreach"]],
  ["harm:drug-overdose-death", "Drug overdose death", ["drug", "overdose", "narcotic", "substance", "alcohol", "opioid"]],
  ["harm:workplace-injury", "Workplace injury and occupational harm", ["employee safety", "occupational", "worker", "workplace", "employment", "safety"]],
  ["harm:animal-caused-harm", "Animal-caused harm and zoonotic risk", ["animal", "dog", "rabies", "livestock", "veterinary", "bite"]],
  ["harm:financial-misappropriation", "Financial misappropriation and procurement corruption", ["finance", "purchase", "procurement", "audit", "budget", "account", "contract", "revenue", "debt", "bond"]],
  ["harm:surveillance-privacy-harm", "Surveillance and privacy harm", ["surveillance", "camera", "license plate", "privacy", "data", "recording", "photograph", "signal", "drone"]],
  ["harm:unsafe-housing-nuisance", "Unsafe housing, nuisance and property-standards harm", ["nuisance", "property", "landlord", "rental", "vacant", "weed", "rubbish", "sanitary"]],
  ["harm:aviation-safety-harm", "Aviation safety harm", ["airport", "aircraft", "aviation", "flight", "runway", "aeronautical"]],
  ["harm:justice-delay-denial", "Justice delay and denial-of-access harm", ["court", "judge", "appeal", "legal", "defender", "attorney", "trial", "records", "public defender"]],
  ["harm:mental-health-crisis-harm", "Mental-health crisis harm", ["mental", "psychiatric", "behavioral", "counseling"]],
  ["harm:air-quality-harm", "Air quality harm", ["air", "smoke", "emission", "asbestos", "dust"]],
];

const def = {
  title: "Metropolitan Code — Department Responsibilities and Measurable Harm",
  sub: "Every responsibility of every department, office, board, commission and agency of the Metropolitan Government of Nashville and Davidson County — byte-anchored in the Code of Ordinances and the Charter, then attached to the measurable harms they bear on through typed edges.",
  mark: "metro code → harm",
  projLabel: "projection state — one constraint set, read by all nine surfaces:",
  verbs: [
    { word: "relations", text: "responds_to · regulates · mitigates · enforces_against · investigates · monitors · may_cause" },
    { word: "ground", text: "68 chapters · Code of Ordinances + Charter (Municode 14214)" },
    { word: "definitions", text: "Wiktionary, pulled on the fly" },
  ],
  topics: HARMS.map(([id, label, queries]) => ({ id, label, queries })),
  metrics: { placeDistricts: {} },
  analysis: [],
};

// ── ground (Void): the retained chapters, hashed, page-bridged ───────────
const manifest = JSON.parse(readFileSync(join(MC, "manifest.json"), "utf8"));
mkdirSync(GROUND, { recursive: true });
const docs = manifest.chapters.map((ch) => {
  const prov = JSON.parse(readFileSync(join(GROUND, `${ch.slug}.txt.provenance.json`), "utf8"));
  const txtPath = join(GROUND, `${ch.slug}.txt`);
  const pmPath = join(GROUND, `${ch.slug}.txt.pagemap.json`);
  if (!existsSync(pmPath)) {
    const chars = readFileSync(txtPath, "utf8").length;
    writeFileSync(pmPath, JSON.stringify([{ page: 1, byteStart: 0, byteEnd: chars }]));
  }
  return {
    id: ch.slug,
    title: prov.title,
    category: ch.slug.startsWith("charter-") ? "charter" : "code",
    scale: "city",
    publisher: "Metropolitan Government of Nashville and Davidson County",
    adopted: "",
    url: "https://library.municode.com/tn/metro_government_of_nashville_and_davidson_county/codes/code_of_ordinances",
    license: prov.license,
    extraction: "layout",
    pdf_sha256: prov.capture[0]?.sha256 ?? "n/a",
    txt_sha256: prov.txt.sha256,
    chars: prov.txt.chars,
    pages: 1,
    pdfPath: join(MC, "raw", ch.captures[0]),
    txtPath,
    sidecarPath: `${txtPath}.provenance.json`,
    pagemapPath: pmPath,
  };
});
const ground = { schema: "EOGround@1", digest: groundDigest({ docs }), docs };

// ── cast (Entity/Kind): beings of the retained corpus ─────────────────────
const texts = docs.map((d) => ({ name: d.title, text: readFileSync(d.txtPath, "utf8") }));
const cast = castTexts({ texts });

// ── links (Link): the byte-anchored responsibility register ───────────────
const ledger = readFileSync(join(MC, "ledger", "metro-code-departments.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const links = ledger.map((r) => ({
  schema: "PlanLedgerObservation@1",
  id: r.id,
  doc: r.doc,
  at: r.at,
  verbatim: r.verbatim,
  kind: r.kind,
  page: 1,
  supersedes: null,
  giver: null,
  basis: r.fields.basis,
  fields: {
    agency: r.fields.department,
    place: "",
    amount: "",
    year: "",
    section: r.fields.section ?? "",
    chapter: r.fields.chapter ?? "",
  },
}));

// ── metrics (Field): the harm graph, provenance-stamped ────────────────────
const graph = JSON.parse(readFileSync(join(MC, "harm-graph.json"), "utf8"));
const relCount = {};
for (const e of graph.edgesList) relCount[e.relation] = (relCount[e.relation] ?? 0) + 1;
const metrics = [];
for (const e of graph.edgesList) {
  const harmId = e.participants[1];
  const label = graph.harmReferentsById?.[harmId]?.label ?? harmId;
  metrics.push({
    schema: "MetricRow@1", id: `harm:metric:${e.id}`, registry: "harm-edges",
    fields: { relation: e.relation, harm: label, department: e.participants[0].replace(/^ref:dept:/, "").replace(/-/g, " "), witnesses: e.meta?.witnessCount ?? e.witness.length },
    derivedFrom: { address: "harm-graph.json#edgesList", basis: "deterministic fold over the harm graph" },
    provenance: { dataset: "plans/metro-code/harm-graph.json", source: "metro-code harm analysis", asOf: graph.builtAt },
  });
}
for (const [rel, n] of Object.entries(relCount)) {
  metrics.push({
    schema: "MetricRow@1", id: `rel:metric:${rel}`, registry: "harm-relations",
    fields: { relation: rel, edges: n },
    derivedFrom: { address: "harm-graph.json#edgesList", basis: "deterministic fold over the harm graph" },
    provenance: { dataset: "plans/metro-code/harm-graph.json", source: "metro-code harm analysis", asOf: graph.builtAt },
  });
}

// ── derive (Network/Paradigm/Atmosphere) ───────────────────────────────────
const projections = deriveProjections({ links, cast, def, metrics });

// ── gate (Paradigm): refuse an ungrounded surface ──────────────────────────
const gate = gateSurface({ ground, links, metrics, resolveSnippet, plansRoot: HERE, snapshotSidecar: null });
console.log("gate:", gate.ok ? "PASS" : "REFUSE");
for (const c of gate.checks) console.log(`  ${c.ok ? "●" : "✗"} ${c.name} · ${c.detail}`);
if (!gate.ok) { console.error("\nrefusing to render — the surface is ungrounded."); process.exit(1); }

// ── surface (Lens): render only a gated surface ───────────────────────────
const html = renderSurface({ def, ground, links, metrics, projections, gate, nativePages: {}, geoPoints: null });
const out = join(dirname(HERE), "native", "the-fold", "metro-code-surface-holograph.html");
writeFileSync(out, html);
console.log("\nwrote", out, (html.length / 1e6).toFixed(2), "MB");
console.log("docs:", docs.length, "· links:", links.length, "· metrics:", metrics.length, "· networks:", projections.networks.length);