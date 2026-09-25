// build-harm-graph.mjs — harm referents attached to departments through typed edges.
//
// Reads the responsibilities ledger, defines a set of measurable harm referents,
// and attaches each harm referent to every department whose extracted responsibilities
// bear on it, through a typed hyperedge (EOHyperedge@1) built with the eoreader7 kernel
// hypergraph. Every edge carries a witness: the ledger row ids (obs: refs) that ground it.
//
// Determinism: same ledger in, same graph out. The harm->department mapping is a
// declared matrix (this file) plus keyword corroboration against the ledger text.

import fs from "node:fs";
import { hyperedge, buildHypergraph, indexHypergraphEntries } from "/Users/mlacy/Documents/3.0/eoreader7/native/kernel/hypergraph.js";

const ROOT = new URL("./", import.meta.url);
const rows = fs.readFileSync(new URL("./ledger/metro-code-departments.jsonl", import.meta.url), "utf8")
  .trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

// Department -> canonical id. Derived from the ledger's fields.department.
const deptIds = {};
const deptNames = new Set();
for (const r of rows) {
  const name = r.fields.department;
  deptNames.add(name);
  if (!deptIds[name]) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    deptIds[name] = `ref:dept:${slug}`;
  }
}

// Measurable harm referents. Each: id, label, keywords used to corroborate witness rows.
const HARMS = [
  { id: "harm:roadway-injury-fatality", label: "Roadway injury and fatality",
    keywords: ["traffic", "vehicle", "highway", "road", "crossing", "driver", "street", "pedestrian", "parking"] },
  { id: "harm:use-of-force-and-police-killing", label: "Police use-of-force harm and police-involved death",
    keywords: ["force", "arrest", "police", "weapon", "firearm", "deadly", "officer", "special police", "reserve"] },
  { id: "harm:fire-injury-and-death", label: "Fire injury and death",
    keywords: ["fire", "firefighting", "fire prevention", "burn", "hazardous material", "rescue"] },
  { id: "harm:emergency-response-delay", label: "Emergency response delay harm",
    keywords: ["emergency", "ambulance", "rescue", "911", "dispatch", "communications", "response"] },
  { id: "harm:structural-and-code-enforcement-harm", label: "Structural / building-code enforcement harm",
    keywords: ["building", "structure", "code", "inspection", "electrical", "plumbing", "mechanical", "construction", "occupancy"] },
  { id: "harm:water-contamination-illness", label: "Water contamination and waterborne illness",
    keywords: ["water", "sewer", "sewage", "drainage", "pollution", "backflow", "stormwater"] },
  { id: "harm:environmental-pollution-exposure", label: "Environmental pollution and toxic exposure",
    keywords: ["environment", "pollution", "emission", "waste", "air", "soil", "noise", "hazardous"] },
  { id: "harm:food-and-sanitation-illness", label: "Food and sanitation illness",
    keywords: ["food", "sanitation", "rodent", "pest", "restaurant", "meat", "inspection"] },
  { id: "harm:infectious-disease-outbreak", label: "Infectious disease outbreak",
    keywords: ["disease", "infectious", "epidemic", "vaccin", "quarantine", "health", "illness", "contagious"] },
  { id: "harm:maternal-and-infant-mortality", label: "Maternal and infant mortality",
    keywords: ["maternal", "infant", "pregnancy", "birth", "mother", "prenatal"] },
  { id: "harm:child-welfare-harm", label: "Child welfare harm",
    keywords: ["child", "juvenile", "minor", "family", "youth", "abuse", "neglect"] },
  { id: "harm:custodial-death", label: "Custodial death and detention harm",
    keywords: ["jail", "custody", "detention", "confinement", "prison", "probation", "parole", "court"] },
  { id: "harm:homelessness-and-exposure-death", label: "Homelessness-related and exposure death",
    keywords: ["homeless", "shelter", "encampment", "exposure", "housing", "outreach"] },
  { id: "harm:drug-overdose-death", label: "Drug overdose death",
    keywords: ["drug", "overdose", "narcotic", "substance", "alcohol", "opioid"] },
  { id: "harm:workplace-injury", label: "Workplace injury and occupational harm",
    keywords: ["employee safety", "occupational", "worker", "workplace", "employment", "safety"] },
  { id: "harm:animal-caused-harm", label: "Animal-caused harm and zoonotic risk",
    keywords: ["animal", "dog", "rabies", "livestock", "veterinary", "bite"] },
  { id: "harm:financial-misappropriation", label: "Financial misappropriation and procurement corruption",
    keywords: ["finance", "purchase", "procurement", "audit", "budget", "account", "contract", "revenue", "debt", "bond"] },
  { id: "harm:surveillance-privacy-harm", label: "Surveillance and privacy harm",
    keywords: ["surveillance", "camera", "license plate", "privacy", "data", "recording", "photograph", "signal", "drone"] },
  { id: "harm:unsafe-housing-nuisance", label: "Unsafe housing, nuisance and property-standards harm",
    keywords: ["nuisance", "property", "landlord", "rental", "vacant", "weed", "rubbish", "sanitary"] },
  { id: "harm:aviation-safety-harm", label: "Aviation safety harm",
    keywords: ["airport", "aircraft", "aviation", "flight", "runway", "aeronautical"] },
  { id: "harm:justice-delay-denial", label: "Justice delay and denial-of-access harm",
    keywords: ["court", "judge", "appeal", "legal", "defender", "attorney", "trial", "records", "public defender"] },
  { id: "harm:mental-health-crisis-harm", label: "Mental-health crisis harm",
    keywords: ["mental", "psychiatric", "behavioral", "counseling"] },
  { id: "harm:air-quality-harm", label: "Air quality harm",
    keywords: ["air", "smoke", "emission", "asbestos", "dust"] },
];

// relation vocabulary (typed edges)
const RELS = ["mitigates", "regulates", "enforces_against", "responds_to", "investigates", "monitors", "may_cause"];

// Declared matrix: which departments bear on which harm, and the primary relation.
// Covers the executive departments + boards/commissions/agencies found in the ledger.
const MATRIX = {
  "POLICE DEPARTMENT": [["harm:use-of-force-and-police-killing", "may_cause"], ["harm:roadway-injury-fatality", "enforces_against"], ["harm:emergency-response-delay", "responds_to"]],
  "DEPARTMENT OF METROPOLITAN POLICE": [["harm:use-of-force-and-police-killing", "may_cause"], ["harm:roadway-injury-fatality", "enforces_against"]],
  "FIRE DEPARTMENT": [["harm:fire-injury-and-death", "responds_to"], ["harm:emergency-response-delay", "responds_to"]],
  "DEPARTMENT OF FIRE": [["harm:fire-injury-and-death", "responds_to"]],
  "HEALTH DEPARTMENT": [["harm:infectious-disease-outbreak", "regulates"], ["harm:food-and-sanitation-illness", "regulates"], ["harm:environmental-pollution-exposure", "regulates"], ["harm:air-quality-harm", "regulates"], ["harm:workplace-injury", "regulates"]],
  "PUBLIC HEALTH": [["harm:infectious-disease-outbreak", "regulates"], ["harm:maternal-and-infant-mortality", "mitigates"], ["harm:mental-health-crisis-harm", "mitigates"]],
  "PUBLIC HOSPITALS": [["harm:emergency-response-delay", "responds_to"], ["harm:mental-health-crisis-harm", "mitigates"]],
  "MEDICAL EXAMINER'S OFFICE": [["harm:custodial-death", "investigates"], ["harm:use-of-force-and-police-killing", "investigates"], ["harm:drug-overdose-death", "investigates"]],
  "DEPARTMENT OF CODES ADMINISTRATION": [["harm:structural-and-code-enforcement-harm", "enforces_against"], ["harm:unsafe-housing-nuisance", "enforces_against"]],
  "DEPARTMENT OF PUBLIC WORKS": [["harm:roadway-injury-fatality", "regulates"], ["harm:environmental-pollution-exposure", "regulates"]],
  "DEPARTMENT OF TRANSPORTATION AND MULTIMODAL INFRASTRUCTURE": [["harm:roadway-injury-fatality", "regulates"]],
  "DEPARTMENT OF WATER AND SEWER SERVICES": [["harm:water-contamination-illness", "regulates"]],
  "DEPARTMENT OF WATER AND SEWERAGE SERVICES": [["harm:water-contamination-illness", "regulates"]],
  "DEPARTMENT OF EMERGENCY COMMUNICATIONS": [["harm:emergency-response-delay", "responds_to"]],
  "OFFICE OF EMERGENCY MANAGEMENT": [["harm:emergency-response-delay", "responds_to"]],
  "OFFICE OF HOMELESS SERVICES": [["harm:homelessness-and-exposure-death", "mitigates"], ["harm:mental-health-crisis-harm", "mitigates"]],
  "OFFICE OF FAMILY SAFETY": [["harm:use-of-force-and-police-killing", "investigates"], ["harm:child-welfare-harm", "mitigates"]],
  "METROPOLITAN COURTS": [["harm:custodial-death", "regulates"], ["harm:justice-delay-denial", "regulates"], ["harm:roadway-injury-fatality", "enforces_against"]],
  "PUBLIC DEFENDER": [["harm:justice-delay-denial", "mitigates"], ["harm:custodial-death", "mitigates"]],
  "DEPARTMENT OF LAW": [["harm:financial-misappropriation", "investigates"], ["harm:surveillance-privacy-harm", "regulates"], ["harm:justice-delay-denial", "regulates"]],
  "DEPARTMENT OF METROPOLITAN FINANCE": [["harm:financial-misappropriation", "regulates"]],
  "DEPARTMENT OF FINANCE": [["harm:financial-misappropriation", "regulates"], ["harm:surveillance-privacy-harm", "monitors"]],
  "METROPOLITAN NASHVILLE AIRPORT AUTHORITY": [["harm:aviation-safety-harm", "regulates"]],
  "DEPARTMENT OF AVIATION": [["harm:aviation-safety-harm", "regulates"]],
  "METROPOLITAN GENERAL SESSIONS COURT": [["harm:custodial-death", "regulates"], ["harm:justice-delay-denial", "regulates"]],
  "METROPOLITAN ANIMAL CARE AND CONTROL COMMISSION": [["harm:animal-caused-harm", "regulates"]],
  "BOARD OF MECHANICAL, PLUMBING, AND ELECTRICAL EXAMINERS AND APPEALS": [["harm:structural-and-code-enforcement-harm", "regulates"]],
  "BOARD OF FIRE AND BUILDING CODE APPEALS": [["harm:structural-and-code-enforcement-harm", "regulates"], ["harm:fire-injury-and-death", "regulates"]],
  "BOARD OF PROPERTY STANDARDS AND APPEALS": [["harm:unsafe-housing-nuisance", "regulates"]],
  "METROPOLITAN TRANSPORTATION LICENSING COMMISSION": [["harm:roadway-injury-fatality", "regulates"]],
  "METROPOLITAN TRAFFIC AND PARKING COMMISSION": [["harm:roadway-injury-fatality", "regulates"]],
  "METROPOLITAN HIGHWAY AND TRANSPORTATION SAFETY COORDINATING COUNCIL": [["harm:roadway-injury-fatality", "monitors"]],
  "METROPOLITAN HUMAN RELATIONS COMMISSION": [["harm:surveillance-privacy-harm", "investigates"], ["harm:unsafe-housing-nuisance", "investigates"]],
  "COMMUNITY REVIEW BOARD": [["harm:use-of-force-and-police-killing", "investigates"]],
  "COMMUNITY OVERSIGHT BOARD": [["harm:use-of-force-and-police-killing", "investigates"]],
  "METROPOLITAN SOCIAL SERVICES COMMISSION": [["harm:homelessness-and-exposure-death", "mitigates"], ["harm:child-welfare-harm", "mitigates"]],
  "SOCIAL SERVICES COMMISSION": [["harm:homelessness-and-exposure-death", "mitigates"]],
  "METROPOLITAN BOARD OF PARKS AND RECREATION": [["harm:roadway-injury-fatality", "regulates"], ["harm:animal-caused-harm", "regulates"]],
  "METROPOLITAN NASHVILLE GENERAL HOSPITAL": [["harm:emergency-response-delay", "responds_to"], ["harm:mental-health-crisis-harm", "mitigates"]],
  "HISTORICAL COMMISSION": [["harm:structural-and-code-enforcement-harm", "regulates"]],
  "URBAN FORESTER": [["harm:environmental-pollution-exposure", "mitigates"]],
  "PUBLIC RECORDS COMMISSION": [["harm:justice-delay-denial", "mitigates"], ["harm:surveillance-privacy-harm", "regulates"]],
  "METROPOLITAN HUMAN RELATIONS COMMISSION*": [["harm:surveillance-privacy-harm", "investigates"]],
  "BOARD OF LICENSING FOR ADULT ENTERTAINMENT AND SAFETY": [["harm:use-of-force-and-police-killing", "regulates"]],
  "BEER PERMIT BOARD": [["harm:food-and-sanitation-illness", "regulates"]],
};

const harmById = Object.fromEntries(HARMS.map((h) => [h.id, h]));

// Keyword corroboration: does any responsibility row for this dept mention the harm keywords?
function corroboratingRows(deptName, harm) {
  const out = [];
  for (const r of rows) {
    if (r.fields.department !== deptName) continue;
    const v = (r.verbatim + " " + (r.fields.section ?? "")).toLowerCase();
    if (harm.keywords.some((k) => v.includes(k))) out.push(r.id);
  }
  return out;
}

// Build nodes + edges.
const nodes = [];
const edges = [];
const edgeSet = new Set();

const addDeptNode = (deptName) => {
  const ref = deptIds[deptName];
  nodes.push({ id: ref, schema: "EOGraphNode@1", kind: "department", label: deptName, source: "metro-code" });
};

for (const h of HARMS) {
  nodes.push({ id: h.id, schema: "EOGraphNode@1", kind: "harm-referent", label: h.label, source: "analysis" });
}

let edgeSeq = 0;
for (const deptName of deptNames) {
  addDeptNode(deptName);
  const mapped = MATRIX[deptName] ?? [];
  for (const [harmId, relation] of mapped) {
    const witness = corroboratingRows(deptName, harmById[harmId]);
    if (witness.length === 0) continue; // only attach when the ledger actually corroborates
    const key = `${deptName}|${harmId}|${relation}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edgeSeq += 1;
    edges.push(hyperedge({
      id: `edge:harm:${String(edgeSeq).padStart(4, "0")}`,
      relation,
      participants: [
        { ref: deptIds[deptName], surfaceKey: deptIds[deptName] },
        { ref: harmId, surfaceKey: harmId },
      ],
      witness: witness.slice(0, 8),
      scope: { sequencePosition: edgeSeq },
      meta: { basis: "declared matrix + ledger keyword corroboration", witnessCount: witness.length },
    }));
  }
}

const graph = buildHypergraph([...nodes, ...edges]);
const graphJson = {
  schema: "EOHypergraph@1",
  productId: "14214",
  builtAt: new Date().toISOString(),
  departments: Object.keys(deptIds).length,
  departmentNames: Object.keys(deptIds),
  harmReferentIds: HARMS.map((h) => h.id),
  harmReferentsById: Object.fromEntries(HARMS.map((h) => [h.id, { label: h.label }])),
  edges: edges.length,
  nodes: [...nodes],
  edgesList: edges.map((e) => ({
    id: e.id, relation: e.relation, participants: e.participants.map((p) => p.ref),
    witness: e.witness, scope: e.scope, meta: e.meta,
  })),
};
fs.writeFileSync(new URL("./harm-graph.json", import.meta.url), JSON.stringify(graphJson, null, 2));
console.log("departments:", Object.keys(deptIds).length);
console.log("harm referents:", HARMS.length);
console.log("typed edges:", edges.length);
console.log("edges by relation:");
const byRel = {};
for (const e of edges) byRel[e.relation] = (byRel[e.relation] ?? 0) + 1;
console.log(byRel);
console.log("graph.byId size:", graph.byId.size, "| relation index keys:", graph.relation.size);