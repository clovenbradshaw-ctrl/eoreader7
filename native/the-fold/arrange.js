// arrange.js — THE FIRST PASS AT AN ESSAY'S SHAPE, COMPOSED FROM THE SOURCES
// RATHER THAN COPIED FROM THEM (2026-09-21).
//
// The user: "have it try, on its first pass, to mimic the best practice of
// structure of an essay using the holographic information we have, but using
// reasoning linking to make sure that we are not saying something illogical."
//
// Until now the draft's outline was the source's own paragraphs, in the
// source's own order — which looked right only because the test source was a
// tidy summary already shaped like an essay. Real research is several
// documents that overlap, disagree in order, and are laid out for their own
// purposes. This module composes an outline instead, with no model:
//
//   THESIS   the general statement — no date, no figure — whose words recur
//            across the most parts of the material. It is the one claim the
//            whole is holographically about: every part carries some of it.
//   BODY     the statements regrouped by the BEINGS they name beyond the
//            subject, across sources (a being two sources both name belongs to
//            one group), each group ordered by its EXTENT — the dates it
//            carries — with undated groups kept where the material put them.
//   TENSION  a group the material itself marks as a turn (a contrastive
//            connective opens one of its statements). Where the material marks
//            none, the slot is a declared gap, never invented.
//   RETURN   a slot for the close, which must come back to the thesis.
//
// And the REASONING CHECKS, each attributed to the organ or archon that owns
// the kind of error:
//   - every body group must bear on the thesis (shares a being or a word with
//     it), or it is a part with no job in this argument (Clark);
//   - consecutive groups are linked as SUCCESSION (the later begins where the
//     earlier ends), OVERLAP, or flagged as an INVERSION (it goes back in time
//     with nothing marking the return) — the extent is the Ground;
//   - two statements giving DIFFERENT figures for the same relation between
//     the same beings are a conflict, never silently merged (Kelsen);
//   - a circular chain of claims is found by Kelsen's own cycle finder over
//     notes built from the parse trees (organs/reasoning-lint.js).
//
// It works with or without the parsed EOT trees and the referent resolver on
// the draft; each absent input weakens a check and the outline says which.

import { drawnParts, draftWords } from "./eot-draft.js";
import { findClaimCycle } from "../organs/reasoning-lint.js";
import { isProperReferent } from "./referents.js";
import { measureVariance } from "./admission.js";
import { findDuplicateStatements } from "./restatement.js";
import { askedExtent as askedExtentOf } from "./void-spec.js";
import { isFunctionWord } from "./pos-prior.js";

export const OUTLINE_SCHEMA = "EOEssayOutline@1";

const THIS_YEAR = new Date().getUTCFullYear();

/** The dates a statement carries: four-digit years and decades ("1850s",
 *  "the 1920s"), and "today"/"now" read as the present. Its EXTENT. */
export function extentOf(text) {
  const t = String(text ?? "");
  const years = [];
  for (const m of t.matchAll(/\b(1[0-9]{3}|20[0-9]{2})(s)?\b/g)) years.push(Number(m[1]) + (m[2] ? 5 : 0));
  if (/\b(today|now|nowadays|currently)\b/i.test(t)) years.push(THIS_YEAR);
  return years;
}
// A FIGURE is a quantity or a date, not an ordinal inside a word ("the
// 20th-century physics" — the falsifier's case disqualified a real thesis).
const hasFigure = (t) => /\d/.test(String(t ?? "").replace(/\b\d+(st|nd|rd|th)\b/gi, ""));
// A turn the material itself marks: a contrastive connective at a statement's
// start. English-scoped, and a closed grammatical class, not a topic list.
const CONTRAST = /^\s*(but|however|yet|still|although|though|even though|even so|nevertheless|despite|in contrast|on the other hand)\b/i;

/** Relation notes from the parse trees: the root's subject, the root, and its
 *  object or oblique — the claim graph Kelsen's cycle finder walks. */
function notesOf(pt) {
  const out = [];
  for (const r of pt.eot ?? []) {
    const m = r.meaning;
    if (!m?.nodes?.length) continue;
    const byKey = new Map(m.nodes.map((n) => [n.key, n]));
    const rootArc = (m.arcs ?? []).find((a) => a.from == null);
    const root = rootArc ? byKey.get(rootArc.to) : null;
    if (!root) continue;
    const arcs = (m.arcs ?? []).filter((a) => a.from === root.key);
    const subj = arcs.find((a) => /^nsubj/.test(a.rel));
    const obj = arcs.find((a) => a.rel === "obj") ?? arcs.find((a) => a.rel === "obl");
    if (subj && obj) out.push({ id: `${pt.id}:${root.key}`, end1: byKey.get(subj.to)?.lemma, label: root.lemma, end2: byKey.get(obj.to)?.lemma, witness: pt.id });
  }
  return out;
}

export function arrangeEssay({ draft, spec = null, exclude = null } = {}) {
  const parts = drawnParts(draft);
  // RECOMPOSITION (skeleton-loop.js, stage 7): a statement a finding licensed
  // out of the skeleton is left out of the material the next loop composes
  // from — the outline is rebuilt, never patched.
  const left = exclude instanceof Set ? exclude : new Set(exclude ?? []);
  const points = parts.flatMap((p) => (p.children ?? []).filter((pt) => !left.has(pt.id)).map((pt) => ({ ...pt, part: p.id })));
  // ONE FACT, ONE STATEMENT: two sources stating the same fact (an agenda and
  // its minutes both giving the meeting's date, time and room) would be said
  // twice. The poorer statement leaves the outline (restatement.js,
  // containment of figures AND names, bare numbers null-filtered).
  const duplicates = findDuplicateStatements(points.map((pt) => ({ text: pt.text, id: pt.id })));
  // FETCHED MATERIAL NEVER OUTRANKS THE OPERATOR'S (hunt.js, tier 0 vs 1):
  // where the richer of two duplicate statements is the fetched one, the
  // operator's stands and the fetched one leaves — however much richer.
  const tierOf = new Map(parts.flatMap((p) => (p.children ?? []).map((pt) => [pt.id, p.tier ?? 0])));
  for (const d of duplicates) {
    if ((tierOf.get(d.keep) ?? 0) > (tierOf.get(d.drop) ?? 0)) {
      [d.keep, d.drop, d.keepText, d.dropText] = [d.drop, d.keep, d.dropText, d.keepText];
      d.tiered = true;
    }
  }
  const dropped = new Set(duplicates.map((d) => d.drop));
  const R = draft?.referents ?? null;
  const subject = draft?.subjectRefs ?? new Set();
  const weakened = [];
  if (!R) weakened.push("no referent resolver on the draft: groups are formed from words, not beings");
  if (!points.some((pt) => (pt.eot ?? []).length)) weakened.push("no parse trees on the draft: the cycle check has no claim graph");

  // ── features of every statement
  const partWords = new Map(parts.map((p) => [p.id, new Set(draftWords(p.text))]));
  // A month or a present-time word is EXTENT, not a being ("May" in "May
  // 2010", "Today" opening a sentence) — a closed grammatical class.
  const EXTENT_WORD = /^(today|now|yesterday|tomorrow|january|february|march|april|may|june|july|august|september|october|november|december)$/i;
  const isBeing = (id) => !EXTENT_WORD.test(String(R?.represent(id) ?? "").trim());
  const feat = points.filter((pt) => !dropped.has(pt.id)).map((pt) => {
    const all = R ? [...R.resolveText(pt.text)].filter(isBeing) : [];
    const beings = all.filter((id) => !subject.has(id));
    const words = [...new Set(draftWords(pt.text))];
    const years = extentOf(pt.text);
    return { pt, beings, all, words, years, general: !hasFigure(pt.text), contrast: CONTRAST.test(pt.text), notes: notesOf(pt) };
  });

  // ── THESIS: the general statement whose words recur across the most parts
  const recur = (f) => {
    if (!f.words.length) return 0;
    const reach = f.words.map((w) => parts.filter((p) => partWords.get(p.id).has(w)).length / parts.length);
    return reach.reduce((a, b) => a + b, 0) / reach.length;
  };
  // A thesis is GENERAL: no figure, not itself a turn (a "But …" sentence is
  // the tension, not the claim), and it names no proper being beyond the
  // subject — a sentence about the protagonist is a Figure of the story, not
  // its Ground (falsifier: "General Elena Marsh led the besieging force" beat
  // the real thesis because Marsh recurs).
  // THE MATERIAL'S GROUND, MEASURED (the same exact null admission.js uses
  // for words): a being named in k statements, scattered at random over N
  // parts, would occupy N·(1−(1−1/N)^k) of them. A being occupying at least
  // that many is spread as widely as chance allows — the whole material is
  // about it, so it joins no section and may stand in the thesis. Only a
  // CONCENTRATED being is one section's figure. (OHS, 2026-09-21: "Office of
  // Homeless Services" and "Homeless Impact Division" chained 69 of 78
  // sentences into one section.)
  const N = parts.length;
  const kOf = new Map(), partsOf = new Map();
  for (const f of feat) for (const id of new Set(f.beings)) {
    kOf.set(id, (kOf.get(id) ?? 0) + 1);
    if (!partsOf.has(id)) partsOf.set(id, new Set());
    partsOf.get(id).add(f.pt.part);
  }
  // Not the expectation alone — a TEST: the exact occupancy distribution
  // gives P(D ≤ seen) for k mentions over N parts, and a being is
  // concentrated only when that is at most 1/N, the level at which about one
  // chance join is expected across the whole material. (Measured: with the
  // bare expectation "Metropolitan" — 10 mentions, 8 of 22 parts, chance
  // 8.2 — counted as concentrated and chained seven parts.)
  const pAtMost = (k, n, seen) => {
    let dp = new Array(n + 1).fill(0); dp[0] = 1;
    for (let t = 0; t < k; t++) {
      const nx = new Array(n + 1).fill(0);
      for (let j = 0; j <= n; j++) if (dp[j]) { nx[j] += dp[j] * (j / n); if (j < n) nx[j + 1] += dp[j] * ((n - j) / n); }
      dp = nx;
    }
    return dp.slice(0, seen + 1).reduce((a, b) => a + b, 0);
  };
  // A SECOND WITNESS: WHERE the being appears. Named once per paragraph, its
  // mentions never cluster (k = seen, P = 1 for every N — falsifier), yet a
  // local figure sits in CONSECUTIVE paragraphs. The runs test is exact:
  // choosing `seen` of N ordered parts at random forms exactly r runs in
  // C(seen−1, r−1)·C(N−seen+1, r) of C(N, seen) ways. Same level, 1/N.
  // ("EPA" in 3 adjacent of 26 paragraphs: P ≈ 0.009 — concentrated.)
  const lnC = (n, r) => { if (r < 0 || r > n) return -Infinity; let x = 0; for (let i = 1; i <= r; i++) x += Math.log(n - r + i) - Math.log(i); return x; };
  const partIndex = new Map(parts.map((p, i) => [p.id, i]));
  const runsAtMost = (idxs) => {
    const sorted = [...idxs].sort((a, b) => a - b);
    const m = sorted.length;
    let runs = m ? 1 : 0; for (let i = 1; i < m; i++) if (sorted[i] !== sorted[i - 1] + 1) runs++;
    const total = lnC(N, m);
    let p = 0; for (let r = 1; r <= runs; r++) p += Math.exp(lnC(m - 1, r - 1) + lnC(N - m + 1, r) - total);
    return p;
  };
  // Each null licenses what it measured. Concentrated by MENTIONS (clustered
  // beyond chance) → may join parts anywhere in the material. Concentrated
  // only by POSITION (the runs test) → joins ADJACENT parts only: a being
  // filling long consecutive runs is the ground of one document ("Homeless
  // Impact Division" through the whole 2023 audit), and letting it join at a
  // distance made one 105-statement section (measured, OHS).
  const byMentions = (id) => { const k = kOf.get(id) ?? 0; return N >= 2 && k >= 2 && pAtMost(k, N, partsOf.get(id)?.size ?? 0) <= 1 / N; };
  const byPosition = (id) => { const k = kOf.get(id) ?? 0; const seen = partsOf.get(id)?.size ?? 0; return N >= 2 && k >= 2 && seen >= 2 && seen < N && runsAtMost([...partsOf.get(id)].map((p) => partIndex.get(p))) <= 1 / N; };
  const concentrated = (id) => byMentions(id) || byPosition(id);
  const spread = new Set([...kOf.keys()].filter((id) => !concentrated(id)));
  const namesBeyondSubject = (f) => R ? f.beings.some((id) => isProperReferent(R, id) && !spread.has(id)) : false;
  const strict = feat.filter((f) => f.general && !f.contrast && !namesBeyondSubject(f));
  // Low before high: when no statement meets the strict bar (a weak subject
  // leaves every general sentence naming "someone else"), the bar relaxes to
  // general-and-not-a-turn, and the outline says so rather than going empty.
  const pool = strict.length ? strict : feat.filter((f) => f.general && !f.contrast);
  if (!strict.length && pool.length) weakened.push("no general statement names only the subject; the thesis was chosen among general statements that name other beings");
  const candidates = pool.map((f) => ({ f, score: recur(f) })).sort((a, b) => b.score - a.score || a.f.pt.span.start - b.f.pt.span.start);
  const thesis = candidates[0]?.f ?? null;

  // ── BODY: regroup by shared beings (union-find), across sources
  const parent = new Map(feat.map((f) => [f.pt.id, f.pt.id]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  // AN AUTHOR'S PARAGRAPH IS ONE GROUP: the seam is the writer's own grouping
  // (measured: splitting a paragraph by the beings each sentence names broke
  // the Cumberland's geography paragraph in two).
  for (const p of parts) {
    const ids = (p.children ?? []).map((c) => c.id).filter((id) => !thesis || id !== thesis.pt.id);
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }
  // ACROSS PARAGRAPHS AND SOURCES, ONLY A SHARED PROPER BEING JOINS GROUPS.
  // A common-noun referent ("warehouses") would chain the 1850s port to the
  // present-day parkland; a proper name ("Old Hickory Dam") names one thing.
  // AND ONLY A BEING THE PART IS ABOUT. A name said once in passing is not
  // what a paragraph is about: "Lake Cumberland" named once in the naming
  // paragraph chained it to the dams paragraph, and the geography paragraph
  // came along through "Cumberland River" (measured 2026-09-21: one body
  // spanning 1750–1954). A part is about a being when it opens on it (the
  // topic-sentence position) or returns to it in a second statement —
  // positions and counts the material gives, no threshold set here.
  const aboutness = new Map();
  for (const p of parts) {
    const own = feat.filter((f) => f.pt.part === p.id && !(thesis && f === thesis));
    const n = new Map();
    for (const f of own) for (const id of new Set(f.beings)) n.set(id, (n.get(id) ?? 0) + 1);
    const opening = new Set(own[0]?.beings ?? []);
    aboutness.set(p.id, new Set([...n.entries()].filter(([id, c]) => c > 1 || opening.has(id)).map(([id]) => id)));
  }
  const byBeing = new Map();
  const prevPart = new Map(feat.map((f) => [f.pt.id, f.pt.part]));
  for (const f of feat) {
    if (thesis && f === thesis) continue;
    for (const id of f.beings) {
      if (R && !isProperReferent(R, id)) continue;
      if (spread.has(id)) continue;
      if (!aboutness.get(f.pt.part)?.has(id)) continue;
      const prev = byBeing.get(id);
      const near = prev && Math.abs(partIndex.get(prevPart.get(prev)) - partIndex.get(f.pt.part)) <= 1;
      if (prev && (byMentions(id) || near)) union(prev, f.pt.id);
      byBeing.set(id, f.pt.id);
    }
  }
  const groupsMap = new Map();
  for (const f of feat) {
    if (thesis && f === thesis) continue;
    const g = find(f.pt.id);
    if (!groupsMap.has(g)) groupsMap.set(g, []);
    groupsMap.get(g).push(f);
  }
  const order = new Map(points.map((pt, i) => [pt.id, i]));
  let groups = [...groupsMap.values()].map((fs) => {
    fs.sort((a, b) => order.get(a.pt.id) - order.get(b.pt.id));
    const years = fs.flatMap((f) => f.years);
    return {
      statements: fs,
      first: order.get(fs[0].pt.id),
      from: years.length ? Math.min(...years) : null,
      to: years.length ? Math.max(...years) : null,
      beings: [...new Set(fs.flatMap((f) => f.beings))],
      contrast: fs.some((f) => f.contrast),
      sources: [...new Set(fs.map((f) => f.pt.part))],
    };
  });

  // ── SIZE: NO SECTION LARGER THAN THE MATERIAL'S LARGEST PARAGRAPH. Each
  // section becomes ONE part the mouth writes; the author's own largest
  // paragraph is the most the material shows one part carrying (measured,
  // not chosen). A larger section is split between its paragraphs at the
  // weakest seam — the adjacent pair sharing the fewest claim words —
  // recursively. (OHS: adjacency chained a whole document into 74
  // statements.)
  const maxPart = Math.max(1, ...parts.map((p) => (p.children ?? []).length));
  const cw = (fs) => new Set(fs.flatMap((f) => f.words).filter((w) => !isFunctionWord(w)));
  const jac = (a, b) => { const A = cw(a), B = cw(b); let n = 0; for (const w of A) if (B.has(w)) n++; const u = A.size + B.size - n; return u ? n / u : 0; };
  const splitGroup = (fs) => {
    if (fs.length <= maxPart) return [fs];
    const blocks = [];
    for (const f of fs) { const last = blocks.at(-1); if (last && last[0].pt.part === f.pt.part) last.push(f); else blocks.push([f]); }
    if (blocks.length < 2) return [fs];
    let at = 1, low = Infinity;
    for (let i = 1; i < blocks.length; i++) { const sm = jac(blocks.slice(0, i).flat(), blocks.slice(i).flat()); if (sm < low) { low = sm; at = i; } }
    return [...splitGroup(blocks.slice(0, at).flat()), ...splitGroup(blocks.slice(at).flat())];
  };
  const rebuild = (fs) => {
    const years = fs.flatMap((f) => f.years);
    return { statements: fs, first: order.get(fs[0].pt.id), from: years.length ? Math.min(...years) : null, to: years.length ? Math.max(...years) : null, beings: [...new Set(fs.flatMap((f) => f.beings))], contrast: fs.some((f) => f.contrast), sources: [...new Set(fs.map((f) => f.pt.part))] };
  };
  groups = groups.flatMap((g) => splitGroup(g.statements).map(rebuild));

  // ── ORDER: THE MATERIAL'S ORDER, REPAIRED ONLY WHERE IT GOES BACK IN TIME.
  // Group A must precede group B only when A ends strictly before B begins;
  // overlapping or undated groups keep the order the material gave them. So
  // a cause-and-response order the writer chose (the floods, then the dams
  // built against them) survives, and only a true inversion is repaired.
  groups.sort((a, b) => a.first - b.first);
  const before = (a, b) => a.to != null && b.from != null && a.to < b.from;
  const placed = [];
  const pending = [...groups];
  while (pending.length) {
    const i = pending.findIndex((g) => !pending.some((h) => h !== g && before(h, g)));
    placed.push(pending.splice(i < 0 ? 0 : i, 1)[0]);
  }
  groups = placed;

  // ── SECTIONS: MERGE NEIGHBOURS THAT BELONG TOGETHER, BY A MEASURED RULE.
  // Beings alone left the OHS material at 17 sections — its paragraphs, not
  // an essay's parts. Two ADJACENT groups merge when each is the other's
  // nearest group and their similarity beats the material's background (the
  // mean similarity over all pairs of groups). Similarity is the Jaccard
  // overlap of claim words — material words less the variance words spread
  // through the whole (admission.js measureVariance, an exact null). No
  // constant; when the ask names a number of parts, merging continues down
  // to it (the void's cardinality).
  const variance = measureVariance(drawnParts(draft).map((p) => p.text).join("\n\n"));
  const claimWords = (g) => new Set(g.statements.flatMap((f) => f.words).filter((w) => !variance.has(w) && !isFunctionWord(w)));
  const sim = (a, b) => { const A = claimWords(a), B = claimWords(b); let n = 0; for (const w of A) if (B.has(w)) n++; const u = A.size + B.size - n; return u ? n / u : 0; };
  const mergeTwo = (a, b) => {
    const statements = [...a.statements, ...b.statements].sort((x, y) => order.get(x.pt.id) - order.get(y.pt.id));
    const years = statements.flatMap((f) => f.years);
    return { statements, first: Math.min(a.first, b.first), from: years.length ? Math.min(...years) : null, to: years.length ? Math.max(...years) : null, beings: [...new Set([...a.beings, ...b.beings])], contrast: a.contrast || b.contrast, sources: [...new Set([...a.sources, ...b.sources])] };
  };
  const asked = spec?.levels?.whole?.cardinality?.basis === "asked" ? spec.levels.whole.cardinality.value : null;
  for (;;) {
    if (groups.length < 2) break;
    const S = groups.map((a) => groups.map((b) => (a === b ? -1 : sim(a, b))));
    const pairs = []; for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++) pairs.push(S[i][j]);
    const background = pairs.reduce((x, y) => x + y, 0) / pairs.length;
    const nearest = (i) => S[i].indexOf(Math.max(...S[i]));
    let best = -1, bestSim = -1;
    for (let i = 0; i + 1 < groups.length; i++) {
      const mutual = nearest(i) === i + 1 && nearest(i + 1) === i;
      const need = asked != null && groups.length > asked ? true : mutual && S[i][i + 1] > background;
      if (need && S[i][i + 1] > bestSim) { bestSim = S[i][i + 1]; best = i; }
    }
    if (best < 0) break;
    groups.splice(best, 2, mergeTwo(groups[best], groups[best + 1]));
  }

  // ── TENSION: a group the material marks as a turn, else a declared gap
  const tension = groups.find((g) => g.contrast) ?? null;

  // ── REASONING CHECKS
  const findings = [];
  // Bearing on the thesis COUNTS THE SUBJECT: the thesis is about the subject,
  // so a group naming the subject's beings bears on it. (Measured false alarm:
  // the present-day port, which names Nashville, was called off-thesis.)
  const thesisWords = new Set(thesis?.words ?? []);
  const thesisBeings = new Set([...(thesis?.all ?? []), ...subject]);
  // WHAT A FINDING LICENSES (stage 7, skeleton-loop.js): an off-thesis group
  // that also answers none of the ask's questions may leave the skeleton
  // (Clark: every section earns its place); one that answers a question
  // stays and is only reported — the ask outranks the thesis.
  const askWords = new Set(draftWords(String(draft?.task ?? "").match(/\b(?:on|about|of|regarding|concerning)\s+(.+?)[.?!]*$/i)?.[1] ?? "").filter((w) => !isFunctionWord(w)));
  groups.forEach((g, i) => {
    const bears = g.statements.some((f) => f.all.some((id) => thesisBeings.has(id)) || f.words.some((w) => thesisWords.has(w)));
    if (thesis && !bears) {
      const answers = g.statements.some((f) => f.words.some((w) => askWords.has(w)));
      findings.push({ kind: "off_thesis", owner: "Roy Peter Clark", group: i, statements: g.statements.map((f) => f.pt.id), licenses: answers ? null : "leave-out", detail: `group ${i + 1} shares no being or word with the thesis — a part with no job in this argument${answers ? "; it answers the ask, so it stays" : ""}` });
    }
  });
  const links = [];
  for (let i = 1; i < groups.length; i++) {
    const a = groups[i - 1], b = groups[i];
    let kind = "unmarked";
    if (a.to != null && b.from != null) kind = b.from >= a.to ? "succession" : b.to != null && b.to >= a.from ? "overlap" : "inversion";
    links.push({ from: i - 1, to: i, kind });
    if (kind === "inversion") findings.push({ kind: "inversion", owner: "the extent (Ground)", group: i, detail: `group ${i + 1} (${b.from}–${b.to}) goes back before group ${i} (${a.from}–${a.to}) with nothing marking the return` });
  }
  // Conflicting figures: same beings + same root relation, different numbers.
  const claims = new Map();
  for (const f of feat) {
    for (const n of f.notes) {
      const key = `${String(n.end1).toLowerCase()}|${String(n.label).toLowerCase()}`;
      const nums = (f.pt.text.match(/\d[\d,.]*/g) ?? []).map((x) => x.replace(/[,.]$/, ""));
      if (!nums.length) continue;
      if (claims.has(key)) {
        const prev = claims.get(key);
        const differ = nums.some((x) => !prev.nums.includes(x));
        if (differ && prev.id !== f.pt.id) {
          // Across tiers the operator's figure stands (hunt.js: fetched
          // material never outranks it) — the fetched statement may leave.
          // Within one tier both stand and the conflict is reported.
          const ta = tierOf.get(prev.id) ?? 0, tb = tierOf.get(f.pt.id) ?? 0;
          const fetched = ta !== tb ? (ta > tb ? prev.id : f.pt.id) : null;
          findings.push({ kind: "conflicting_figures", owner: "Kelsen (reasoning-lint.js)", statements: fetched ? [fetched] : [prev.id, f.pt.id], licenses: fetched ? "prefer-operator" : null, detail: `"${n.end1} ${n.label}" is given ${prev.nums.join(", ")} in ${prev.id} and ${nums.join(", ")} in ${f.pt.id}${fetched ? ` — ${fetched} is fetched material and may leave` : " — both are the operator's; reported, not resolved"}` });
        }
      } else claims.set(key, { nums, id: f.pt.id });
    }
  }
  const allNotes = feat.flatMap((f) => f.notes);
  const cycle = allNotes.length ? findClaimCycle(allNotes) : null;
  if (cycle) findings.push({ kind: "circular_claim", owner: "Kelsen (reasoning-lint.js)", detail: `a chain of claims returns to its start: ${cycle.cycle.join(" → ")}` });

  const slots = [
    { slot: "thesis", statements: thesis ? [thesis.pt.id] : [], basis: thesis ? `the general statement whose words recur across the most parts (recurrence ${candidates[0].score.toFixed(2)})` : "no general statement in the material — the thesis is a gap" },
    ...groups.map((g, i) => ({ slot: g === tension ? "tension" : `body ${i + 1}`, statements: g.statements.map((f) => f.pt.id), extent: g.from != null ? [g.from, g.to] : null, beings: g.beings.filter((id) => !R || isProperReferent(R, id)).map((id) => R?.represent(id) ?? id), sources: g.sources, basis: g === tension ? "the material marks this group as a turn" : `grouped by shared beings${g.from != null ? `, ordered by extent ${g.from}–${g.to}` : ", undated, kept in the material's place"}` })),
    { slot: "return", statements: [], basis: thesis ? `the close comes back to the thesis (${thesis.pt.id})` : "no thesis to return to" },
  ];
  for (const d of duplicates) findings.push({ kind: "duplicate_across_sources", owner: "Tracy Kidder & Richard Todd", detail: `${d.drop} states what ${d.keep} states (${[...d.sharedFigures, ...d.sharedNames].slice(0, 4).join(", ")}): said once, from ${d.keep}${d.tiered ? " — the operator's material, though the fetched statement was richer" : ""}` });
  if (!tension) findings.push({ kind: "no_tension", owner: "the void (arrangement)", detail: "the material marks no turn, so the tension slot is a declared gap rather than an invented counterpoint" });

  return {
    schema: OUTLINE_SCHEMA,
    thesis: thesis ? { id: thesis.pt.id, text: thesis.pt.text } : null,
    thesisCandidates: candidates.slice(0, 4).map((c) => ({ id: c.f.pt.id, score: Number(c.score.toFixed(2)), text: c.f.pt.text })),
    slots, links, findings, weakened,
    basis: `${groups.length} body group(s) from ${parts.length} source part(s); ${links.filter((l) => l.kind === "succession").length} succession, ${links.filter((l) => l.kind === "overlap").length} overlap, ${links.filter((l) => l.kind === "inversion").length} inversion link(s); ${findings.length} reasoning finding(s)`,
  };
}

/** The outline as readable lines. */
export function outlineLines(outline, draft) {
  const text = new Map(drawnParts(draft).flatMap((p) => p.children.map((pt) => [pt.id, pt.text])));
  const out = [];
  for (const s of outline.slots) {
    out.push(`${s.slot.toUpperCase()}${s.extent ? `  [${s.extent[0]}–${s.extent[1]}]` : ""}${s.beings?.length ? `  beings: ${s.beings.slice(0, 5).join(", ")}` : ""}   ← ${s.basis}`);
    for (const id of s.statements) out.push(`    ${id}  ${text.get(id) ?? ""}`);
  }
  if (outline.links.length) out.push(`LINKS  ${outline.links.map((l) => `${l.from + 1}→${l.to + 1} ${l.kind}`).join(" · ")}`);
  for (const f of outline.findings) out.push(`FINDING [${f.kind}] ${f.owner}: ${f.detail}`);
  for (const w of outline.weakened) out.push(`WEAKENED: ${w}`);
  return out;
}

/**
 * arrangedDraft(draft, outline) → a draft whose parts ARE the outline: the
 * thesis opens the piece as its own part, then each body group (its
 * statements in the material's order, their ids and byte spans unchanged),
 * in the outline's order. Every later stage — floor, prose, fold, turns —
 * reads this draft, so the piece follows the composed shape, not the
 * source's paragraphing. The original draft is not touched (append-only:
 * the ledger keeps both). The return slot has no statement: the close is
 * written by the arrival stage and read against the thesis there.
 */
export function arrangedDraft(draft, outline) {
  if (!draft?.root || !outline?.slots) return draft;
  const byId = new Map(drawnParts(draft).flatMap((p) => p.children.map((pt) => [pt.id, pt])));
  const pervasive = new Set(draft.pervasive ?? []);
  const parts = [];
  for (const s of outline.slots) {
    const pts = s.statements.map((id) => byId.get(id)).filter(Boolean);
    if (!pts.length) continue;
    const id = s.slot === "thesis" ? "a0" : `a${parts.length}`;
    parts.push({
      id, path: `whole/${id}`, depth: 1, kind: "part", slot: s.slot, relevant: true, ...(s.answers ? { answers: s.answers } : {}),
      text: pts.map((pt) => pt.text).join(" "),
      span: { ...pts[0].span }, spans: pts.map((pt) => ({ ...pt.span })),
      children: pts, from: [...new Set(pts.map((pt) => pt.path.split("/")[1]))],
      names: [...new Set(pts.flatMap((pt) => pt.names ?? []))],
      words: [...new Set(pts.flatMap((pt) => pt.words ?? []))],
    });
  }
  let prev = null;
  for (const p of parts) {
    if (prev) {
      const shared = p.names.filter((n) => prev.names.includes(n) && !pervasive.has(n));
      p.bridge = shared.length ? { from: prev.id, name: shared[0] } : { from: prev.id, name: null };
    } else p.bridge = null;
    prev = p;
  }
  const root = { ...draft.root, children: parts };
  return {
    ...draft, root, arrangedFrom: outline.schema,
    basis: `${parts.length} part(s) composed by the outline (${outline.basis}); ${parts.filter((p) => p.bridge && !p.bridge.name).length} transition(s) have no shared name and must be written`,
  };
}

/**
 * selectToBudget({ outline, draft, task }) → { outline, dropped, budget }.
 * SELECTION, MECHANICAL BASE: when the ask states a length ("a five-paragraph
 * essay", "600 words"), the body sections closest to the ask fill it, kept in
 * outline order; the rest leave the piece, each on the record. Closeness is
 * the being the ask names and the words of its topic phrase that a section
 * carries. With no stated length nothing is cut on size — the void's extent
 * is then the material's own, and only relevance (the mouth's "neither",
 * licensed by the mechanics) removes sections.
 * A paragraph budget of n spends one paragraph on the thesis and one on the
 * close, the form's own shape, and the rest on body sections.
 */
export const DECLARED_FORM = Object.freeze({ paragraphs: 5, basis: "declared: the essay's received form — a thesis paragraph, three body sections, a close; any length the ask states overrides it" });
export function selectToBudget({ outline, draft, task = "", shape = null } = {}) {
  // SELECT HARD (user, 2026-09-21: "don't write everything in the dossier").
  // The ask's stated length first; else the shape LEARNED from the sources
  // (shape.js, stage 4 — "we dont want a set of shapes pre-set"); only then
  // the received default, disclosed as a default.
  const learned = (shape?.agreedUnits ?? []).find((a) => ["paragraph", "section", "part", "word", "sentence"].includes(a.unit));
  const asked = askedExtentOf(task)
    ?? (learned ? { n: learned.n, unit: learned.unit, learned: `${learned.support}/${shape.hosts} host(s)` } : null)
    ?? { n: DECLARED_FORM.paragraphs, unit: "paragraph", declared: true };
  if (!outline?.slots) return { outline, dropped: [], budget: null };
  const text = new Map(drawnParts(draft).flatMap((p) => p.children.map((pt) => [pt.id, pt.text])));
  const bodies = outline.slots.filter((s) => s.slot !== "thesis" && s.slot !== "return");
  const words = (s) => s.statements.map((id) => text.get(id) ?? "").join(" ").split(/\s+/).filter(Boolean).length;
  let budget = null;
  if (["paragraph", "section", "part"].includes(asked.unit)) budget = { sections: Math.max(1, asked.n - 2) };
  else if (asked.unit === "word") budget = { words: asked.n };
  else if (asked.unit === "sentence") budget = { statements: asked.n };
  if (!budget) return { outline, dropped: [], budget: null };
  const R = draft?.referents ?? null;
  const askBeings = R ? R.resolveText(task) : new Set();
  const topic = new Set(draftWords(String(task).match(/\b(?:on|about|of)\s+(.+?)[.?!]*$/i)?.[1] ?? "").filter((w) => !isFunctionWord(w)));
  const close = (s) => {
    const t = s.statements.map((id) => text.get(id) ?? "").join(" ");
    const b = R ? [...R.resolveText(t)].filter((id) => askBeings.has(id)).length : 0;
    return b + draftWords(t).filter((w) => topic.has(w)).length / Math.max(1, s.statements.length);
  };
  const ranked0 = bodies.map((s, i) => ({ s, i, c: close(s) })).sort((a, b) => b.c - a.c || a.i - b.i);
  // Every question the ask coordinates gets its closest section first (the
  // mouth's steered `answers`), then the rest fill by closeness.
  const qs = [...new Set(bodies.map((s) => s.answers).filter(Boolean))];
  const firsts = qs.map((q) => ranked0.find((r) => r.s.answers === q)).filter(Boolean);
  const ranked = [...firsts, ...ranked0.filter((r) => !firsts.includes(r))];
  const keep = new Set();
  let used = 0;
  for (const r of ranked) {
    const cost = budget.sections ? 1 : budget.words ? words(r.s) : r.s.statements.length;
    const cap = budget.sections ?? budget.words ?? budget.statements;
    if (used + cost > cap && keep.size) continue;
    keep.add(r.s); used += cost;
  }
  const dropped = bodies.filter((s) => !keep.has(s));
  const slots = outline.slots.filter((s) => !dropped.includes(s));
  const whose = asked.declared ? "the declared form's" : asked.learned ? `the learned shape's (${asked.learned})` : "the asked";
  return {
    outline: { ...outline, slots, basis: `${outline.basis}; ${dropped.length} section(s) left out to fit ${whose} ${asked.n} ${asked.unit}(s)` },
    dropped: dropped.map((s) => ({ slot: s.slot, statements: s.statements, why: `over ${whose} length (${asked.n} ${asked.unit}s); closer sections kept` })),
    budget: { ...budget, basis: asked.declared ? DECLARED_FORM.basis : asked.learned ? `measured: the shape learned from ${asked.learned} (shape.js)` : "asked" },
  };
}
