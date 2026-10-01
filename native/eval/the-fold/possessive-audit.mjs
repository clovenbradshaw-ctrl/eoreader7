// eval/the-fold/possessive-audit.mjs — does the enclitic route (organs/identity-routes.js) do what it is for, and only that, measured on
// real prose, per corpus, beside two alternatives that do more?
//
// The question, from the direction that opened it (user, 2026-09-30: "figure out the possessives … signal Chomsky and Sullivan"):
// cast.js::resolve compared a name to an established surface as written, so a question's "Anna's" reached nothing and a person the
// material names only with the mark ("Anna's dog barked.", a sentence-opener — extraction strips the mark from every other mention) was
// unreachable by "Anna". The E6 harness fixed both by folding the apostrophe clitic off every token of both sides. This driver asks
// what each way of doing that JOINS — because a merge route is judged on its marginal joins and never on its hits (live_priors LP11).
//
// Sullivan's discipline: a sign is connected to a thing by evidence earned per language and re-measured per corpus, so this is a driver
// anyone points at a corpus (`--root`), not a number in a document. Chomsky's: the route is a declared language's prior
// (`--language`), and the driver reports the typed gap when there is none.
//
// Four indexes are built over each document, the way app.js builds its own (leading surfaces, optical fold, near-miss spelling,
// furniture blanking):
//   A  the index as it stood (no route)
//   R  A + the last-token enclitic fold as RECOVERY — consulted only when the name asked as written resolved to nothing. The shipped route.
//   T  A + the same fold applied ALWAYS to both sides. Measured, not shipped: it joins two referents the index kept apart.
//   E  A + the clitic stripped off EVERY token through `nameFold` (what the E6 harness did). The control, built to show the failure the
//      last-token fold exists to avoid.
//
// A fifth index exists only when `--learned <iso|file>` is given (READING-SPEC S139):
//   L  A + the LEARNED route (organs/identity-routes.js::learnedNameFold, a NameFormPrior@1 a treebank taught) as RECOVERY — the route that
//      replaces R for the page. The query families are generated exactly as for the typed route (the bare form of an F2 query comes from the
//      typed fold), so both routes answer the SAME queries, and every query the two answer differently is kept in `diffs`. Without the flag
//      the record is byte-identical to the one S137 committed.
//
// Three query families, each against ITS OWN baseline, so what the bare name already reached is never counted as a join the route made:
//   F1  every established surface, asked as written.                baseline: A.resolve(s)        extra = X.resolve(s) \ A.resolve(s)
//   F2  the bare form of a surface that ends in the mark.           baseline: A.resolve(bare)     extra = X.resolve(bare) \ A.resolve(bare)
//       (recovered = the referent that WORE the mark is now reachable by the bare name)
//   F3  a question's possessive of an established bare surface.    baseline: A.resolve(bare)     extra = X.resolve(s') \ A.resolve(bare)
//       (gain = the possessive query resolved to nothing before and something now)
// A join is an `extra`: a referent the variant made reachable that the baseline did not. The pair — (the referent the name was asked as,
// the referent it now also reaches) — is what a person labels (`--judge`): same being / different / cannot tell. `--summarize` folds
// the labels into the rate. Labels are keyed by the pair, so one judgement covers every variant and every query that produced it.
//
// MONOTONE CHECK. For R the driver also counts every query whose answer CHANGED although the index had answered it (A non-empty):
// the recovery fold promises not to change those, apart from the one-edit spelling fallback it pre-empts, and this is where that is
// tested on real material rather than asserted.
//
// Usage:
//   node eval/the-fold/possessive-audit.mjs --raw out.json [--root <dir>] [--cats a,b] [--n 8] [--cap 120000] [--seed 31] [--language eng] [--learned eng] [--update-doc results/possessive-audit-learned-RESULTS.md]
//   node eval/the-fold/possessive-audit.mjs --summarize out.json [--labels labels.json[,more-labels.json]] [--update-doc doc.md]
//   node eval/the-fold/possessive-audit.mjs --judge out.json [--variant R|T-only|E-only] [--limit 400]      (REL=same-name|partial, CTX=1)
import fs from "node:fs";
import path from "node:path";
import { summarizeAudit } from "./lib/possessive-audit-summary.mjs";

const NATIVE = new URL("../../", import.meta.url).pathname;
const here = (p) => `${NATIVE}${p}`;
const argv = process.argv.slice(2);
const arg = (name, dflt = null) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? (argv[i + 1] ?? true) : dflt; };

const DEFAULT_CATS = "01-literature-books,02-encyclopedic,05-academic-papers,06-government-legal,14-holy-texts,15-western-canon,18-childrens-books";
const JOIN_VARIANTS = ["R", "T-only", "E-only"];

const readLabels = (labelsPath) => {
  const files = String(labelsPath ?? "").split(",").filter((f) => f && fs.existsSync(f)).map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
  return files.length ? { ...files[0], labels: Object.assign({}, ...files.map((f) => f.labels ?? {})) } : null;
};
const summarize = (rawPath, labelsPath) => summarizeAudit(JSON.parse(fs.readFileSync(rawPath, "utf8")), readLabels(labelsPath));

function judge(rawPath, variant, limit) {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const seen = new Map();
  for (const x of raw.extras) if (x.variant === variant) { if (!seen.has(x.id)) seen.set(x.id, { ...x, fams: new Set() }); seen.get(x.id).fams.add(x.fam); }
  const lines = [];
  for (const x of [...seen.values()].slice(0, limit)) {
    if (process.env.REL && x.relation !== process.env.REL) continue;
    lines.push(`${x.id} [${x.cat.slice(0, 5)}] ${x.relation === "same-name" ? "SAME" : "part"} ${[...x.fams].join("+")} q="${x.q}" | asked-as ${JSON.stringify(x.ownerReps)} | also reaches ${x.added[0].rep}  {${x.added[0].surfaces.slice(0, 4).join(" / ")}}`);
    if (process.env.CTX) lines.push(`      ctx(asked): …${x.ctxSource}…\n      ctx(added): …${x.ctxAdded}…`);
  }
  return lines.join("\n");
}

function updateDoc(docFile, md) {
  // the generated block of a results document is a pure function of the raw record and the labels; the reader test regenerates it
  const doc = fs.readFileSync(docFile, "utf8");
  const block = /<!-- audit:begin -->\n[\s\S]*?\n<!-- audit:end -->/;
  if (!block.test(doc)) throw new Error(`${docFile}: no audit:begin / audit:end block to update`);
  fs.writeFileSync(docFile, doc.replace(block, () => `<!-- audit:begin -->\n${md}\n<!-- audit:end -->`));
}

if (arg("summarize")) {
  const md = summarize(arg("summarize"), arg("labels"));
  if (arg("update-doc")) updateDoc(arg("update-doc"), md);
  console.log(md);
  process.exit(0);
}
if (arg("judge")) { console.log(judge(arg("judge"), arg("variant", "R"), Number(arg("limit", 400)))); process.exit(0); }

const root = arg("root", new URL("../../../../live_priors/", import.meta.url).pathname).replace(/\/?$/, "/");
const cats = String(arg("cats", DEFAULT_CATS)).split(",");
const N = Number(arg("n", 8)), CAP = Number(arg("cap", 120000)), SEED = Number(arg("seed", 31)), SAMPLE3 = Number(arg("sample3", 150));
const language = String(arg("language", "eng"));
const rawOut = arg("raw", null);

const S = await import(here("adapters/text/surfaces.js"));
const { makeReferentIndex } = await import(here("organs/cast.js"));
const { terminalEncliticFold, learnedNameFold } = await import(here("organs/identity-routes.js"));
const { splitSentences } = await import(here("adapters/text/spans.js"));
const { blankLabelRows } = await import(here("organs/source.js"));
const { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm, opticalReferentForm, isNearMissSpelling, stripPossessive, isRomanNumeral } = S;

const route = terminalEncliticFold({ language, stripEnclitic: stripPossessive, isNumeral: isRomanNumeral });
if (!route.fold) { console.log(`no route for language "${language}": ${route.gap.type} — ${route.gap.detail}`); process.exit(2); }
const learnedArg = arg("learned", null);
let learned = null, learnedFile = null;
if (learnedArg) {
  learnedFile = fs.existsSync(String(learnedArg)) ? String(learnedArg) : here(`priors/name-forms-${learnedArg}.json`);
  learned = learnedNameFold({ language, prior: JSON.parse(fs.readFileSync(learnedFile, "utf8")), isNumeral: isRomanNumeral });
  if (!learned.fold) { console.log(`no learned route for language "${language}": ${learned.gap.type} — ${learned.gap.detail}`); process.exit(2); }
}
const everyToken = (t) => String(t ?? "").split(/\s+/).map(stripPossessive).join(" ");
const blankFurniture = (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 });
const mk = (extra) => makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, blankFurniture, leadingSurfaces: extractLeadingSurfaces, nameFold: opticalReferentForm, nameVariant: isNearMissSpelling, ...extra });
const VARIANTS = {
  A: () => mk({}),
  A0: () => mk({ nameVariant: null }), // A without the one-edit spelling fallback: what the index answered by an exact match alone
  R: () => mk({ surfaceFold: route.fold }),
  T: () => mk({ surfaceFold: route.fold, surfaceFoldMode: "always" }),
  E: () => mk({ nameFold: (t, o) => opticalReferentForm(everyToken(t), o) }),
  ...(learned ? { L: () => mk({ surfaceFold: learned.fold }) } : {}),
};

const rnd = (seed) => { let s = seed >>> 0; return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function walk(dir, out = []) {
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".git", "digested"].includes(e.name)) walk(p, out); }
    else if (/\.(txt|md)$/i.test(e.name) && !/\.eot\./.test(e.name)) out.push(p);
  }
  return out;
}
const markTok = /['’]s?$/i;
const hasTerminalMark = (s) => markTok.test(String(s).split(/\s+/).pop());
const hasMidMark = (s) => String(s).split(/\s+/).slice(0, -1).some((x) => markTok.test(x));
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
const ctxAround = (text, needle) => { const i = text.indexOf(needle); return i < 0 ? null : text.slice(Math.max(0, i - 90), i + needle.length + 110).replace(/\s+/g, " "); };
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

const config = { root, cats, n: N, cap: CAP, seed: SEED, sample3: SAMPLE3, language, route: { fold: "last-token", mode: "recover", giver: route.prior.giver }, variants: Object.keys(VARIANTS),
  ...(learned ? { learned: { prior: path.relative(NATIVE, learnedFile), giver: learned.prior.provenance.giver, source: learned.prior.provenance.source, operatingPoint: { ...learned.prior.operatingPoint, lineage: undefined } } } : {}) };
console.error("config:", JSON.stringify(config));
const result = { config, perCorpus: {}, extras: [], changed: [], ...(learned ? { diffs: [] } : {}) };
const t0 = Date.now();
for (const cat of cats) {
  const files = walk(root + cat).sort();
  const R = rnd(SEED);
  const pick = files.map((f) => [R(), f]).sort((a, b) => a[0] - b[0]).slice(0, N).map((x) => x[1]);
  const acc = { docs: 0, referents: 0, surfaces: 0, markTerminal: 0, markOnlyReferents: 0, changedExactByR: 0, preemptedGuessByR: 0, joins: { R: 0, T: 0, E: 0 },
    F1: { q: 0 }, F2: { q: 0, recoveredR: 0, alreadyReached: 0 }, F3: { q: 0, gainR: 0, lossR: 0, hadAnswer: 0, hadAnswerDiffers: 0 },
    ...(learned ? { L: { queries: 0, differsFromR: 0, joins: 0, changedExact: 0, preemptedGuess: 0, F2recovered: 0, F3gain: 0, F3loss: 0 } } : {}) };
  for (const f of pick) {
    let text = ""; try { text = fs.readFileSync(f, "utf8").slice(0, CAP); } catch { continue; }
    const idx = {}; let ok = true;
    for (const [k, make] of Object.entries(VARIANTS)) { try { idx[k] = make()([{ text }]); } catch { ok = false; } }
    if (!ok || !idx.A.events?.length) continue;
    acc.docs += 1;
    const events = idx.A.events;
    const surfacesOf = new Map(), ownersOf = new Map();
    for (const e of events) {
      if (!surfacesOf.has(e.referent_id)) surfacesOf.set(e.referent_id, new Set());
      surfacesOf.get(e.referent_id).add(e.surface);
      if (!ownersOf.has(e.surface)) ownersOf.set(e.surface, new Set());
      ownersOf.get(e.surface).add(e.referent_id);
    }
    acc.referents += surfacesOf.size;
    const surfaces = [...ownersOf.keys()];
    acc.surfaces += surfaces.length;
    acc.markTerminal += surfaces.filter(hasTerminalMark).length;
    for (const ss of surfacesOf.values()) if ([...ss].every(hasTerminalMark)) acc.markOnlyReferents += 1;
    const repOf = (id) => idx.A.represent(id);
    const surfList = (id) => [...(surfacesOf.get(id) ?? [])].slice(0, 6);
    const rel = path.relative(root, f);
    // How the two referents of a join relate. "same-name": some surface of one, with the mark folded, is the very string some surface
    // of the other wears — two fragments of one written name, one wearing the mark. "partial": they meet only through the engine's
    // ordinary sub-form rule ("Dashwood's" and "Mr John Dashwood" both contain "Dashwood") — set semantics the bare name already had.
    const nameKey = (x) => opticalReferentForm(route.fold(x)).toLowerCase().replace(/\s+/g, " ").trim();
    const keysOf = (id) => new Set([...(surfacesOf.get(id) ?? [])].map(nameKey));
    const relation = (ownerIds, id) => {
      const ys = keysOf(id);
      for (const o of ownerIds) for (const k of keysOf(o)) if (ys.has(k)) return "same-name";
      return "partial";
    };
    const record = (fam, variant, q, s, ids) => {
      const ownerIds = [...(ownersOf.get(s) ?? [])];
      const owners = ownerIds.map(repOf).sort();
      // A referent reached by the very surface the query was made from is a RECOVERY (counted under F2), not a join of two referents.
      for (const id of ids.filter((x) => !ownerIds.includes(x))) {
        result.extras.push({
          id: fnv([rel, owners.join("/"), repOf(id)].join("|")), fam, variant, cat, file: rel, q, source: s,
          ownerReps: owners, relation: relation(ownerIds, id),
          added: [{ rep: repOf(id), surfaces: surfList(id) }],
          ctxSource: ctxAround(text, s), ctxAdded: ctxAround(text, surfList(id)[0] ?? ""),
        });
      }
    };
    // One query, all four indexes. `baseline` is the set each variant is measured against (see the header); `s` is the surface the
    // query was made from. Records R's extras, T's extras R did not make, E's extras T did not make; counts A→R changes.
    const probe = (fam, q, s, baseline) => {
      const a = idx.A.resolve(q), r = idx.R.resolve(q), t = idx.T.resolve(q), e = idx.E.resolve(q);
      if (a.size > 0 && !sameSet(a, r)) {
        // Two kinds of "the index had answered": by an exact/prefix match (the fold must not change it), or only by the one-edit
        // spelling guess (the fold is consulted first, since an exact answer outranks a guessed spelling).
        const exact = idx.A0.resolve(q).size > 0;
        if (exact) acc.changedExactByR += 1; else acc.preemptedGuessByR += 1;
        result.changed.push({ cat, file: rel, fam, q, kind: exact ? "exact-answer-changed" : "spelling-guess-preempted", before: [...a].map(repOf), after: [...r].map(repOf) });
      }
      const owned = ownersOf.get(s) ?? new Set();
      const xr = [...r].filter((id) => !baseline.has(id) && !owned.has(id));
      const xt = [...t].filter((id) => !baseline.has(id) && !owned.has(id));
      const xe = [...e].filter((id) => !baseline.has(id) && !owned.has(id));
      if (xr.length) { acc.joins.R += 1; record(fam, "R", q, s, xr); }
      const tOnly = xt.filter((id) => !r.has(id));
      if (xt.length) acc.joins.T += 1;
      if (tOnly.length) record(fam, "T-only", q, s, tOnly);
      const eOnly = xe.filter((id) => !t.has(id));
      if (xe.length) acc.joins.E += 1;
      if (eOnly.length) record(fam, "E-only", q, s, eOnly);
      let l = null;
      if (idx.L) {
        l = idx.L.resolve(q);
        acc.L.queries += 1;
        if (a.size > 0 && !sameSet(a, l)) { if (idx.A0.resolve(q).size > 0) acc.L.changedExact += 1; else acc.L.preemptedGuess += 1; }
        const xl = [...l].filter((id) => !baseline.has(id) && !owned.has(id));
        if (xl.length) { acc.L.joins += 1; record(fam, "L", q, s, xl); }
        if (!sameSet(r, l)) {
          acc.L.differsFromR += 1;
          result.diffs.push({ cat, file: rel, fam, q, source: s, baseline: [...a].map(repOf), typed: [...r].map(repOf), learned: [...l].map(repOf) });
        }
      }
      return { a, r, t, e, l };
    };
    // F1 — a surface asked as written
    for (const s of surfaces) { acc.F1.q += 1; probe("F1", s, s, idx.A.resolve(s)); }
    // F2 — the bare form of a surface that ends in the mark
    for (const s of surfaces.filter(hasTerminalMark)) {
      const q = route.fold(s);
      if (q === s || q.length < 3) continue;
      acc.F2.q += 1;
      const owners = ownersOf.get(s);
      const { a, r, l } = probe("F2", q, s, idx.A.resolve(q));
      if ([...r].some((id) => owners.has(id)) && ![...a].some((id) => owners.has(id))) acc.F2.recoveredR += 1; else if ([...owners].some((id) => a.has(id))) acc.F2.alreadyReached += 1;
      if (l && [...l].some((id) => owners.has(id)) && ![...a].some((id) => owners.has(id))) acc.L.F2recovered += 1;
    }
    // F3 — a question's possessive of an established bare surface; the baseline is what the BARE name reaches
    const R2 = rnd(SEED + 1);
    const plain = surfaces.filter((s) => !hasTerminalMark(s) && !hasMidMark(s) && s.length > 2).map((s) => [R2(), s]).sort((a, b) => a[0] - b[0]).slice(0, SAMPLE3).map((x) => x[1]);
    for (const s of plain) {
      acc.F3.q += 1;
      const q = `${s}'s`;
      const bare = idx.A.resolve(s);
      const { a, r, l } = probe("F3", q, s, bare);
      if (a.size === 0 && r.size > 0) acc.F3.gainR += 1;
      if (a.size > 0 && r.size === 0) acc.F3.lossR += 1;
      if (l && a.size === 0 && l.size > 0) acc.L.F3gain += 1;
      if (l && a.size > 0 && l.size === 0) acc.L.F3loss += 1;
      if (a.size > 0) { acc.F3.hadAnswer += 1; if (!sameSet(a, bare)) acc.F3.hadAnswerDiffers += 1; }
    }
  }
  result.perCorpus[cat] = acc;
  console.error(cat.padEnd(22), ((Date.now() - t0) / 1000).toFixed(0) + "s", JSON.stringify({ docs: acc.docs, changedExactByR: acc.changedExactByR, preemptedGuessByR: acc.preemptedGuessByR, joins: acc.joins, F2: acc.F2, F3: acc.F3, ...(acc.L ? { L: acc.L } : {}) }));
}
if (!rawOut) console.log(JSON.stringify(result.perCorpus, null, 1));
else {
  fs.writeFileSync(rawOut, JSON.stringify(result));
  const md = summarize(rawOut, arg("labels"));
  if (arg("update-doc")) updateDoc(arg("update-doc"), md);
  console.log(md);
}
