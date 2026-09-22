// skeleton-arms.mjs — THE EXPERIMENT'S STEP 2 (plans/generation-terrain-stance.md):
// every skeleton arm, on every source, measured the same way, with no model.
//
//   node native/eval/the-fold/skeleton-arms.mjs --source NAME=TASK=FILE[,FILE] [--source …] [--out DIR]
//
// Arms:
//   A0 control          the committed arrangement (arrange.js)
//   A1 kinds first      each induced kind is one section (its members, wherever they
//                       sit); every other statement stays in its author's paragraph
//   A2 stance moves     statements grouped by their rarity-weighted top stance,
//                       groups in the form's order of moves
//   A3 terrain roles    statements grouped by their top terrain, groups in order of
//                       first appearance
//   A4 terrain × stance   A1's kinds first-class, the rest grouped by their
//                         dominant terrain role AND stance move jointly
// (A5, mouth-led, needs the model and runs with the flesh arms.)
//
// Measures, per arm (plans/generation-terrain-stance.md):
//   sections, largest share (statements in the biggest section / all),
//   split paragraphs (author paragraphs whose statements land in 2+ sections),
//   inversions (a section whose dates all precede the one before it),
//   kind fold (statements inside a kind section / all),
//   coherence (mean claim-word Jaccard within sections / across sections; >1
//   means sections hold together more than chance pairs do),
//   asked (how many of the ask's questions the skeleton still covers),
//   declared + vsForm (section count against the declared form).

import fs from "node:fs";
import path from "node:path";
import { buildDraft, drawnParts, draftWords } from "../../the-fold/eot-draft.js";
import { buildReferents, attachReferents } from "../../the-fold/referents.js";
import { loadEotParser, attachEot } from "../../the-fold/eot-notation.js";
import { arrangeEssay, extentOf } from "../../the-fold/arrange.js";
import { statementKinds, kindSentence } from "../../the-fold/kinds.js";
import { profileStatements } from "../../the-fold/profile.js";
import { isFunctionWord } from "../../the-fold/pos-prior.js";
import { declareVoidSpec } from "../../the-fold/void-spec.js";
import { askQuestions } from "../../the-fold/steer.js";

const MOVES = ["Binding", "Tending", "Clearing", "Dissecting", "Cultivating", "Making", "Unraveling", "Tracing", "Composing"];

export function armsFor(draft) {
  const points = drawnParts(draft).flatMap((p) => p.children.map((pt) => ({ ...pt, part: p.id })));
  const order = new Map(points.map((pt, i) => [pt.id, i]));
  const byOrder = (a, b) => order.get(a) - order.get(b);
  const K = statementKinds(draft);
  const pr = profileStatements(draft);
  // A kind that holds most of the source is its ground, not a section (the
  // 83-statement OHS basin): kept out of the kind arms by the same majority
  // rule the subject uses.
  const kinds = K.kinds.filter((k) => k.members.length * 2 <= points.length);
  const arms = {};

  // A0 control
  const o = arrangeEssay({ draft });
  arms.A0 = o.slots.filter((s) => s.statements.length).map((s) => ({ name: s.slot, ids: s.statements }));

  // A1 kinds first
  const inKind = new Map();
  kinds.forEach((k, i) => k.members.forEach((id) => { if (!inKind.has(id)) inKind.set(id, i); }));
  const a1 = [];
  const kindSec = new Map();
  for (const pt of points) {
    if (inKind.has(pt.id)) {
      const k = inKind.get(pt.id);
      if (!kindSec.has(k)) { const sec = { name: `kind: ${kindSentence(kinds[k]) ?? `${kinds[k].members.length} alike`}`, ids: [], kind: true }; kindSec.set(k, sec); a1.push(sec); }
      kindSec.get(k).ids.push(pt.id);
    } else {
      const last = a1.at(-1);
      if (last && !last.kind && last.part === pt.part) last.ids.push(pt.id);
      else a1.push({ name: `paragraph ${pt.part}`, ids: [pt.id], part: pt.part });
    }
  }
  arms.A1 = a1;

  // A2 stance moves
  const topStance = (id) => pr.byId.get(id)?.stance.top ?? "unparsed";
  const group = (ids, keyOf, keyOrder) => {
    const m = new Map();
    for (const id of ids) { const k = keyOf(id); if (!m.has(k)) m.set(k, []); m.get(k).push(id); }
    const keys = [...m.keys()].sort((a, b) => keyOrder(a) - keyOrder(b));
    return keys.map((k) => ({ name: k, ids: m.get(k).sort(byOrder) }));
  };
  const moveRank = (k) => (MOVES.includes(k) ? MOVES.indexOf(k) : MOVES.length);
  arms.A2 = group(points.map((p) => p.id), topStance, moveRank);

  // A3 terrain roles
  const topTerrain = (id) => pr.byId.get(id)?.terrain.top ?? "unparsed";
  const firstSeen = new Map();
  for (const pt of points) { const t = topTerrain(pt.id); if (!firstSeen.has(t)) firstSeen.set(t, order.get(pt.id)); }
  arms.A3 = group(points.map((p) => p.id), topTerrain, (k) => firstSeen.get(k));

  // A4 terrain × stance, kinds folded inside (the plan's A4: A2 and A3
  // combined — each statement's dominant terrain role AND stance move jointly)
  const rest4 = points.map((p) => p.id).filter((id) => !inKind.has(id));
  const pairKey = (id) => `${pr.byId.get(id)?.terrain.top ?? "?"}·${pr.byId.get(id)?.stance.top ?? "unparsed"}`;
  const pairStance = (id) => pr.byId.get(id)?.stance.top ?? "unparsed";
  const firstSeen4 = new Map();
  for (const id of rest4) { const k = pairKey(id); if (!firstSeen4.has(k)) firstSeen4.set(k, order.get(id)); }
  const pairRank = (k) => moveRank(String(k).split("·").pop()) * 10000 + (firstSeen4.get(k) ?? 0);
  const kindSecs4 = kinds.map((k, i) => ({ name: `kind: ${kindSentence(k) ?? `${k.members.length} alike`}`, ids: k.members, kind: true }));
  const kindMove = (s) => moveRank(topStance(s.ids[0])) * 10000 + order.get(s.ids[0]);
  arms.A4 = [...kindSecs4, ...group(rest4, pairKey, pairRank)].sort((a, b) => (a.kind ? kindMove(a) : pairRank(a.name)) - (b.kind ? kindMove(b) : pairRank(b.name)));
  return { arms, points, kinds, profile: pr };
}

export function measureArm(sections, points, { task = "", ground = "" } = {}) {
  const all = points.length || 1;
  const text = new Map(points.map((p) => [p.id, p.text]));
  const partOf = new Map(points.map((p) => [p.id, p.part]));
  const secOf = new Map(); sections.forEach((s, i) => s.ids.forEach((id) => secOf.set(id, i)));
  const paraSecs = new Map(); for (const [id, i] of secOf) { const p = partOf.get(id); if (!paraSecs.has(p)) paraSecs.set(p, new Set()); paraSecs.get(p).add(i); }
  const split = [...paraSecs.values()].filter((s) => s.size > 1).length;
  let inversions = 0;
  const span = (s) => { const ys = s.ids.flatMap((id) => extentOf(text.get(id))); return ys.length ? [Math.min(...ys), Math.max(...ys)] : null; };
  for (let i = 1; i < sections.length; i++) { const a = span(sections[i - 1]), b = span(sections[i]); if (a && b && b[1] < a[0]) inversions++; }
  const cw = new Map(points.map((p) => [p.id, new Set(draftWords(p.text).filter((w) => !isFunctionWord(w)))]));
  const jac = (a, b) => { const A = cw.get(a), B = cw.get(b); let n = 0; for (const w of A) if (B.has(w)) n++; const u = A.size + B.size - n; return u ? n / u : 0; };
  let wi = 0, wn = 0, bi = 0, bn = 0;
  const ids = points.map((p) => p.id);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const same = secOf.get(ids[i]) === secOf.get(ids[j]);
    const v = jac(ids[i], ids[j]);
    if (same) { wi += v; wn++; } else { bi += v; bn++; }
  }
  const within = wn ? wi / wn : 0, across = bn ? bi / bn : 0;
  // The ask's questions covered: a question is covered while some kept section
  // carries one of its content words. No arm drops statements, so every arm
  // covers what the source holds — stated, and measured so a future drop is caught.
  const questions = askQuestions(task);
  const said = new Map(points.map((p) => [p.id, cw.get(p.id)]));
  const askedCovered = questions.filter((q) => {
    const own = draftWords(q).filter((w) => !isFunctionWord(w));
    if (!own.length) return true;
    return sections.some((s) => s.ids.some((id) => [...(said.get(id) ?? [])].some((w) => own.includes(w))));
  }).length;
  const spec = declareVoidSpec({ task, ground });
  const c = spec.levels.whole.cardinality;
  const declared = c.basis === "asked" ? c.value : 5;
  return {
    sections: sections.length,
    largest: +(Math.max(...sections.map((s) => s.ids.length)) / all).toFixed(2),
    split,
    inversions,
    kindFold: +(sections.filter((s) => s.kind).reduce((n, s) => n + s.ids.length, 0) / all).toFixed(2),
    coherence: across ? +(within / across).toFixed(2) : null,
    asked: questions.length ? `${askedCovered}/${questions.length}` : "—",
    declared,
    vsForm: sections.length - declared,
  };
}

export function skeletonLines(sections, points, { perSection = 1 } = {}) {
  const text = new Map(points.map((p) => [p.id, p.text]));
  return sections.map((s, i) => `${i + 1}. [${s.name}] (${s.ids.length}) ${s.ids.slice(0, perSection).map((id) => `“${text.get(id).slice(0, 110)}”`).join(" ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const sources = []; let out = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--source") { const [name, task, files] = args[++i].split("="); sources.push({ name, task, files: files.split(",") }); }
    else if (args[i] === "--out") out = args[++i];
  }
  const P = await loadEotParser();
  const rows = [];
  const samples = [];
  for (const src of sources) {
    const ground = src.files.map((f) => fs.readFileSync(f, "utf8")).join("\n\n");
    const d = attachReferents(buildDraft({ task: src.task, ground }), buildReferents(ground));
    if (P.ok) attachEot(drawnParts(d).flatMap((p) => p.children), P.parse(ground, src.name));
    const { arms, points, kinds } = armsFor(d);
    for (const [arm, secs] of Object.entries(arms)) {
      const m = measureArm(secs, points, { task: src.task, ground });
      rows.push({ source: src.name, arm, statements: points.length, kinds: kinds.length, ...m });
      samples.push(`### ${src.name} · ${arm}\n\n${skeletonLines(secs, points).join("\n")}\n`);
    }
  }
  console.table(rows);
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "skeleton-arms.json"), JSON.stringify(rows, null, 2));
    fs.writeFileSync(path.join(out, "skeleton-samples.md"), samples.join("\n"));
    console.log(`wrote ${path.join(out, "skeleton-arms.json")} and skeleton-samples.md`);
  }
}
