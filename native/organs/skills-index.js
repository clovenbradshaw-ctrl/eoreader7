// organs/skills-index.js — THE PATHS THIS INSTANCE CAN TAKE, WHEN EACH APPLIES, AND WHETHER IT IS ON.
//
// Fold invariant: A SKILL IS A PATH TAKEN ONLY FOR SOME CONTENT. What applies to everything is the pipeline;
// a skill carries its trigger (`appliesWhen`), what it does (`route`), what it needs, where it came from and
// whether it is switched on. Two origins:
//   received  handed to this instance: live_priors' derived priors (each enables a path for one language or
//             one book — its trigger is read off its own `language` / `read.title`) and the received layout
//             rules. Standing = the giver it declares.
//   learned   earned here by reading: hard-read rules, form priors, the fold's skill library. Standing = the
//             evidence it names, and a concession if it has been conceded.
// Every description is COPIED from the artifact's own fields or README (this module writes none) except the
// tiny route table in organs/skill-routes.js, which is code and says so. Every item carries the sha256 of the
// file it was read from. Pure of the network.

import { library as analysisLibrary, skillId, ANALYSIS_ROUTE } from "./analysis-store.js";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ROUTES } from "./skill-routes.js";
import { foldToggles, stateOf, loadToggles, ladderOf } from "./skill-toggles.js";
import { define, ans } from "./skill-definition.js";
import { foldUsage, loadUsage } from "./skill-usage.js";
import { codeIndex, usedBy, importsOf, coApplies } from "./skill-relations.js";

export const SKILLS_SCHEMA = "EOSkills@3";
const sha = (b) => createHash("sha256").update(b).digest("hex").slice(0, 12);
const readJson = (f) => { try { const raw = fs.readFileSync(f); return { j: JSON.parse(raw), sha: sha(raw) }; } catch { return null; } };
const cap = (s, n = 320) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

// A prior declares its giver in one of the places live_priors' artifacts use: `giver`, or a `provenance` object
// holding `giver` / `source` / `resource`. (An earlier version looked only at `giver` and reported 14 of 31
// priors as giverless — a claim that grounding the listing against the files themselves refuted.)
const giverOf = (j) => {
  const g = j?.giver ?? j?.provenance?.giver ?? j?.provenance?.source ?? j?.provenance?.resource ?? j?.declared_giver ?? j?.source;
  if (!g) return null;
  const lic = j?.provenance?.license ?? j?.provenance?.resourceLicense ?? j?.giver?.resourceLicense ?? j?.giver?.license ?? null;
  const base = typeof g === "string" ? g : [g.resource ?? g.name, g.resourceLicense ?? g.license, g.url].filter(Boolean).join(" · ");
  return [base || JSON.stringify(g).slice(0, 120), lic && !String(base).includes(lic) ? lic : null].filter(Boolean).join(" · ");
};

/** The first paragraph of a kind's own README (what the artifact's authors say the kind is for), or null. */
function kindDescription(root, dir) {
  try {
    const t = fs.readFileSync(path.join(root, dir, "README.md"), "utf8");
    const para = t.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith("#") && p.length > 40);
    return para ? cap(para) : null;
  } catch { return null; }
}

/** When does a prior apply? Read off its OWN fields: a language, or the one book it was built from.
 *  `from` is the field it came from — null means the artifact does not say (a gap, not a guess). */
function appliesWhenOf(j, dir) {
  if (j.read?.title) return { text: `reading the text “${j.read.title}”`, from: "read.title" };
  const lang = j.language ?? j.lang ?? j.declared?.language;
  if (lang) return { text: `text in ${lang}`, from: "language" };
  if (dir === "code-priors") return { text: "source code", from: "kind" };
  return { text: "content its own fields do not restrict — its README says when", from: null };
}

/** The mechanical name: what a skill is called before anyone (or any model) names it. */
export const mechanicalName = (s) => `${s.kind.replace(/-priors?$/, "").replace(/-/g, " ")}${s.appliesShort ? ` · ${s.appliesShort}` : ""}`;

export function receivedSkills({ livePriors, layoutRules }) {
  const out = []; const notes = [];
  const root = path.join(livePriors ?? "", "derived-priors");
  if (!livePriors || !fs.existsSync(root)) notes.push(livePriors ? "no derived-priors directory here" : "no live_priors checkout given");
  else for (const dir of fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const desc = kindDescription(root, dir);
    for (const f of fs.readdirSync(path.join(root, dir)).filter((x) => x.endsWith(".json") && !/lock/.test(x)).sort()) {
      const r = readJson(path.join(root, dir, f)); if (!r) continue;
      const giver = giverOf(r.j); const when = appliesWhenOf(r.j, dir);
      const lang = r.j.language ?? r.j.lang ?? r.j.declared?.language ?? null;
      out.push({ id: `received:${dir}/${f.replace(/\.json$/, "")}`, title: f.replace(/\.json$/, ""), kind: dir, origin: "received",
        route: desc, caveat: r.j.known_limitation ?? null, appliesWhen: when.text, appliesFrom: when.from, appliesShort: lang ?? (r.j.read?.title ? cap(r.j.read.title, 24) : null),
        needs: r.j.schema ? [r.j.schema] : [], address: `live_priors/derived-priors/${dir}/${f} · sha256 ${r.sha}`, giver, schema: r.j.schema ?? null, language: lang,
        standing: giver ? "received — giver declared" : "received — NO giver declared; listed, not trusted", honored: false,
        facts: { builtAt: r.j.builtAt ?? r.j.provenance?.builtAt ?? null, builtBy: r.j.provenance?.built_by ?? null, builtFrom: r.j.provenance?.builtFrom ?? null, history: Array.isArray(r.j.history) ? r.j.history.length : null,
          refusals: r.j.refusals ?? null, declared: r.j.declared ?? null, evidenceCounts: r.j.counts ?? { tokens_read: r.j.provenance?.tokens_read, sentences: r.j.provenance?.sentences, distinct_forms: r.j.provenance?.distinct_forms } } });
    }
  }
  // received layout rules: each is a path taken for pages showing a set of signals
  if (layoutRules && fs.existsSync(layoutRules)) {
    const r = readJson(layoutRules);
    for (const rule of r?.j.rules ?? []) if ((rule.signals ?? []).length) out.push({ id: `layout:${rule.name}`, title: rule.name, kind: "layout rule", origin: rule.foundVia === "received" ? "received" : "learned",
      route: cap(rule.note ?? `settle: ${rule.settle}`), appliesWhen: `pages showing ${rule.signals.join(" + ")}`, appliesShort: rule.signals.join("+"), needs: [], address: `layout-conventions.json#${rule.name} · sha256 ${r.sha}`,
      evidence: `settle: ${rule.settle}; found via ${rule.foundVia}`, standing: rule.foundVia === "received" ? "received — declared with the library" : "earned — settled by the visual sense on a real page", honored: false });
  }
  return { items: out, notes };
}

export function learnedSkills({ learnedDir, foldSkillsDir, formPriors } = {}) {
  const out = []; const notes = [];
  const hr = learnedDir && readJson(path.join(learnedDir, "hard-read.json"));
  if (hr) for (const r of hr.j.rules?.rules ?? []) out.push({ id: `learned:hard-read/${r.name}`, title: r.name, kind: "reading rule", origin: "learned",
    route: `read by ${r.textRoute}${r.imageRoute ? ` and ${r.imageRoute}` : ""}, with no ants and no image — the earned shortcut`, appliesWhen: `a measurement written in the shape ${r.head}`, appliesShort: r.head, needs: [],
    address: `hard-read.json#rules/${r.name} · sha256 ${hr.sha}`, evidence: `${r.evidence?.regions ?? "?"} regions agreed across two senses; found via ${r.foundVia}`,
    standing: r.conceded ? `CONCEDED — ${r.conceded.because}` : "earned — two senses agreed on a recurring shape", conceded: Boolean(r.conceded), honored: true, parent: "route:hard-read",
    facts: { foundAt: r.at ?? null, foundVia: r.foundVia, regions: r.evidence?.regions ?? null, textRoute: r.textRoute, imageRoute: r.imageRoute, head: r.head } });
  else notes.push(learnedDir ? "no hard-read rules learned yet" : "no learned directory given");
  if (learnedDir) for (const a of analysisLibrary(learnedDir)) out.push({ id: skillId(a.id), title: a.name, kind: "analysis", origin: "learned",
    route: `answer: ${a.claim.replaceAll("{{COL}}", "<column>")} — by running its check and its control`, appliesWhen: `a question whose words overlap: ${a.name} — ${a.desc}`, appliesShort: a.name, needs: ["an ingested table with numeric columns"],
    address: `analyses.jsonl#${a.id} · code sha256 ${a.codeSha}`, evidence: `${(a.evidence?.runs ?? []).length} admission runs (${(a.evidence?.runs ?? []).map((r) => `${r.role}:${r.col}=${r.result}`).join(", ")}); ${a.evidence?.generalisation ?? ""}`,
    standing: a.conceded ? `CONCEDED — ${a.conceded.because}` : `admitted — ran twice alike, its control failed; learned from ${a.lineage?.mouth ?? "?"}`, conceded: Boolean(a.conceded), honored: true, parent: ANALYSIS_ROUTE,
    facts: { learnedAt: a.learnedAt, mouth: a.lineage?.mouth ?? null, question: a.lineage?.question ?? null, uses: a.uses, codeSha: a.codeSha } });
  if (foldSkillsDir && fs.existsSync(foldSkillsDir)) for (const f of fs.readdirSync(foldSkillsDir).filter((x) => x.endsWith(".json")).sort()) {
    const r = readJson(path.join(foldSkillsDir, f)); if (!r) continue;
    out.push({ id: `learned:fold-skill/${f.replace(/\.json$/, "")}`, title: r.j.name ?? f, kind: "procedure", origin: "learned", route: r.j.description ?? "a saved procedure (code with declared slots)",
      appliesWhen: (r.j.anchors ?? []).length ? `a task whose own words contain: ${r.j.anchors.join(", ")}` : "a task its anchors claim", appliesShort: r.j.name ?? null, needs: r.j.needs ?? [], address: `skills/${f} · sha256 ${r.sha}`,
      evidence: r.j.check ? "carries its own passing check (admission gate)" : "no check recorded", standing: r.j.check ? "admitted — its own check passed" : "listed — no check", honored: false });
  } else notes.push("no fold skill library (the-fold skills/) on this instance");
  if (formPriors && fs.existsSync(formPriors)) {
    const raw = fs.readFileSync(formPriors, "utf8"); const h = sha(raw);
    // Append-only and test/eval runs append too, so one form can appear many times: folded by form, the entry
    // with the most support shown, with how many entries stand behind the name.
    const byForm = new Map();
    raw.split("\n").filter(Boolean).forEach((l, i) => { try {
      const j = JSON.parse(l); const support = (j.vocabulary ?? []).map((v) => v.corroboratedBy ?? 0);
      const score = (j.pagesUsed ?? 0) * 1000 + support.reduce((a, b) => a + b, 0);
      const cur = byForm.get(j.form) ?? { n: 0, best: null, bestScore: -1 };
      cur.n++; if (score > cur.bestScore) { cur.best = { j, i }; cur.bestScore = score; } byForm.set(j.form, cur);
    } catch { /* a bad line is skipped, not fatal */ } });
    for (const [form, { n, best }] of byForm) {
      const { j, i } = best; const support = (j.vocabulary ?? []).map((v) => v.corroboratedBy ?? 0).filter(Boolean);
      out.push({ id: `learned:form/${form}`, title: form, kind: "form", origin: "learned", route: `shape a document as ${(j.vocabulary ?? []).map((v) => v.role).join(" → ")}`,
        appliesWhen: `an ask that names the form “${form}”`, appliesShort: form, needs: [], address: `form-priors.jsonl#line ${i + 1} · sha256 ${h}`,
        evidence: `${j.pagesUsed ?? 0} pages from ${j.hostsUsed ?? 0} hosts; parts corroborated by ${support.length ? Math.min(...support) + "–" + Math.max(...support) : "none"}; ${n} entr${n === 1 ? "y" : "ies"} in the log`,
        standing: support.length && Math.min(...support) >= 2 ? "earned — every part corroborated by ≥ 2" : "provisional — a part stands on one reading", honored: false });
    }
  } else notes.push("no form-priors file on this instance");
  return { items: out, notes };
}

/** concedeLearned(learnedDir, name, because) — a concession is a flag on the rule, kept; nothing is deleted. */
export function concedeLearned(learnedDir, name, because, now = Date.now()) {
  const f = path.join(learnedDir, "hard-read.json"); const r = readJson(f);
  if (!r) return { error: "no learned file" };
  if (!String(because ?? "").trim()) return { error: "a concession needs a reason" };
  const rule = (r.j.rules?.rules ?? []).find((x) => x.name === name);
  if (!rule) return { error: `no learned rule named ${name}` };
  rule.conceded = { because: String(because), at: now };
  const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(r.j, null, 1)); fs.renameSync(tmp, f);
  return { ok: true, rule };
}

import { fileURLToPath } from "node:url";
import { definitionOf, governanceOf } from "./skill-enrich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, ".."); const REPO = path.resolve(NATIVE, "..");

/** collectSkills(opts) -> { routes, received, learned, notes }. Every skill carries its switch, its definition
 *  (eight parameters, gaps visible), its governance (Ostrom), and its relations (derived from the code). */
export function collectSkills(opts) {
  const dir = opts.learnedDir;
  const folded = foldToggles(dir ? loadToggles(dir) : []);
  const usage = foldUsage(dir ? loadUsage(dir) : []);
  const rec = receivedSkills(opts); const lrn = learnedSkills(opts);
  const routes = ROUTES.map((r) => ({ ...r, origin: "code", appliesShort: null, address: r.organ, standing: r.honored ? "code — the pipeline honours this switch" : "code — listed; the pipeline does not yet read this switch", evidence: r.evidence }));
  const all = [...routes, ...rec.items, ...lrn.items];
  const parentOf = (id) => all.find((x) => x.id === id)?.parent ?? null;
  const index = codeIndex((opts.codeRoots ?? ["organs", "adapters", "kernel", "the-fold"].map((d) => path.join(NATIVE, d)).concat(path.join(REPO, "proxy-runner.mjs"))), opts.codeBase ?? REPO);
  const co = coApplies(all);
  const memo = new Map();
  const consumers = (needles) => { const k = needles.join("|"); if (!memo.has(k)) memo.set(k, usedBy(needles, index)); return memo.get(k); };
  const enrich = (s) => {
    const needles = s.origin === "received" && s.schema ? [s.schema, s.kind] : s.kind === "layout rule" ? ["layout-conventions"] : s.kind === "form" ? ["form-priors"] : s.id === "route:hard-read" ? ["organs/hard-read.js"] : s.id === "route:look" ? ["organs/look.js"] : [];
    const rel = { uses: s.origin === "code" ? importsOf(path.join(REPO, s.organ)).map((p) => ({ path: p })) : [], usedBy: needles.length ? consumers(needles) : [],
      parent: s.parent ?? null, children: all.filter((x) => x.parent === s.id).map((x) => x.id), coApplies: co.get(s.id) ?? [] };
    const state = stateOf(folded, s.id, { parentOf });
    const withState = { ...s, ...state, name: s.origin === "code" ? s.title : mechanicalName(s) };
    return { ...withState, relations: rel, definition: definitionOf(withState, rel), governance: governanceOf(withState, { state, usage: usage.get(s.id) ?? null, rel, children: rel.children }) };
  };
  const done = all.map(enrich);
  return { schema: SKILLS_SCHEMA, routes: done.filter((x) => x.origin === "code"), received: done.filter((x) => x.origin === "received"), learned: done.filter((x) => x.origin === "learned"), notes: [...rec.notes, ...lrn.notes] };
}
