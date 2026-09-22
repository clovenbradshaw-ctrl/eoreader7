#!/usr/bin/env node
// pipeline-run.mjs — THE ARBITRARY GENERATION PIPELINE, END TO END, EVERY
// STAGE ON THE RECORD.
//
//   prompt → register → void → ground → EOT draft (recursive) → floor
//          → prosified pass (recursive) → the piece
//
// Each stage appends its own work product to an append-only ledger before the
// next stage runs, so a run killed at any boundary leaves everything up to
// that boundary readable, and `phase-report.mjs` lays the stages out in order.
// The floor stage matters most for that: once the draft exists, the piece
// already exists as the material's own sentences in the piece's order, and
// every model call after it can only improve on a product that is already
// true. Nothing here is specific to essays — the register decides the voice,
// the ground decides the parts, the ask decides which parts are drawn.
//
// Model calls go through the engine's own gated wire (`streamOllamaChat`),
// never a raw fetch: the safety-and-ethics gate sees every one.
//
//   node native/the-fold/pipeline-run.mjs --task "…" --ground FILE [--model gemma2:2b]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeVoiceFor, voiceIsDeclaredFor } from "../kernel/register.js";
import { createDocumentLedger, appendLedgerLine } from "./document-ledger.js";
import { buildDraft, draftLines, floorProjection, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { declareVoidSpec, declareForm, voidSpecLines, topicOf } from "./void-spec.js";
import { surfLines, liveWeb } from "./surf.js";
import { surfForShape, shapeLines } from "./shape.js";
import { loadEotParser, attachEot, notationOf, clauseComplete, clauseCore } from "./eot-notation.js";
import { arrangeEssay, arrangedDraft, outlineLines, selectToBudget } from "./arrange.js";
import { steerOutline } from "./steer.js";
import { floorPiece, measurePiece, judgeLoop, loopLine } from "./loop-check.js";
import { prosify, anchorsFor, carries } from "./prosify.js";
import { tightenPiece, turnPass } from "./finish.js";
import { flesh2 } from "./flesh2.js";
import { readPiece } from "./revision-spiral.js";
import { gebserArrival } from "./archon-rules.js";
import { renderPhaseReport } from "./phase-report.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.join(HERE, "..", "..", "documents");

const arg = (name, dflt = null) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };

export async function runPipeline({ task, groundFiles = [], model = "gemma2:2b", id = null, draw = null, arrange = null, flesh = "prosify", web = null, onStage = null } = {}) {
  const docId = `${id ?? `pipe-${Date.now()}`}:1`;
  const ledger = createDocumentLedger({ docId, title: task.slice(0, 80) });
  const write = (role, title, text, basis, giver = "eoreader7:pipeline", supersedes = null) => {
    const line = appendLedgerLine(ledger, { role, title, text: String(text ?? ""), giver, basis, ...(supersedes ? { supersedes } : {}) }, { dir: DOCS });
    if (onStage) onStage({ role, title });
    return line;
  };
  // THE FOLDED EOT IS THE CURRENT STATE (user direction, 2026-09-21: "we're
  // interested in the Folded version… we'll see things change as we
  // recursively alter it"). Every statement's CURRENT ledger line is tracked,
  // so an alteration supersedes it rather than sitting beside it. The ledger
  // keeps every version; the fold shows the one that stands.
  const current = new Map();

  // 1. PROMPT — the ask exactly as given.
  write("prompt", "The ask", task, "the operator's words, unedited");

  // 2. REGISTER — what kind of thing is asked for, and in whose voice. The
  // form is a gate (void-spec.js declareForm): an anaphor in the ask ("again")
  // points at this engine's own last piece; else a received sign; else the
  // form-word is carried unresolved for SURF. Never a silent default.
  const form = declareForm(task, { documentsDir: DOCS, excludeDocId: docId });
  const register = form.register;
  const field = form.field;
  const topic = topicOf(task);
  const spoken = topic ?? form.token ?? task;
  const voiceRaw = writeVoiceFor(register, spoken);
  let voice = { opening: typeof voiceRaw.opening === "function" ? voiceRaw.opening(spoken) : voiceRaw.opening, body: typeof voiceRaw.body === "function" ? voiceRaw.body(spoken) : voiceRaw.body };
  write("register", `Register: ${field ?? "unresolved"}`, `field: ${field} [${form.basis}] — ${form.source}\nform-word: ${form.token ?? "(none)"}${form.cue ? `\nanaphor: "${form.cue}"${form.referent ? ` → ${form.referent.docId}: "${form.referent.prompt}"` : " (unresolved)"}` : ""}\nmode: ${register?.mode}\ntenor: ${register?.tenor?.tenor}\ntopic: ${topic ?? "(none stated)"}\nvoice declared for this field: ${voiceIsDeclaredFor(register)}\n\nopening voice:\n${voice.opening}\n\nbody voice:\n${voice.body}`, register?.basis ?? "derived from the ask");


  // 3. SURF — seek across multiple sources for material shaped like the void
  // (surf.js): exemplars of the form-word, sources about the subject. The web
  // is injected; without one the stage is recorded as not run, never as "the
  // web had nothing". What comes back is CANDIDATE material with provenance —
  // stage 4 judges it, and it never outranks the operator's ground.
  let surfed = null, shape = null;
  if (web) {
    // 3 → 4 → (NO) → 3: surfForShape runs the surf, learns the shape from what
    // came back, and goes back to the web once with structure queries when
    // nothing was agreed — bounded, then stops with the gap stated.
    const r = await surfForShape({ spec: declareVoidSpec({ task, form }), web });
    surfed = r.surfed; shape = r.shape;
    write("surf", `Surf: ${surfed.fetched} source(s) from ${surfed.hosts.length} host(s)${surfed.multiple ? "" : " — not multiple"}${r.rounds > 1 ? ` · ${r.rounds} rounds` : ""}`, surfLines(surfed).join("\n"), surfed.basis, "eoreader7:surf");
    // 4. SHAPE-MATCH — the form's shape, as more hosts than not state it.
    write("shape", `Shape: ${shape.learned ? shape.agreedUnits.map((a) => `${a.n} ${a.unit}${a.n === 1 ? "" : "s"}`).join(", ") || `${shape.parts.length} named part(s)` : "not learned"}`, shapeLines(shape).join("\n") || "(no claim on any source)", shape.basis, "eoreader7:shape");
  } else {
    write("surf", "Surf: not run", "no web given — the ground is the operator's material only", "unmeasured: stage 3 needs a web (surf.js liveWeb); nothing was sought, so nothing was found", "eoreader7:surf");
    write("shape", "Shape: not learned", "no surf, so no sources to learn the form's shape from", "unmeasured: stage 4 reads stage 3's sources", "eoreader7:shape");
  }

  // 4. GROUND — exactly the material given, with its sources named.
  const ground = groundFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n\n");
  write("ground", `Ground: ${groundFiles.map((f) => path.basename(f)).join(", ")}`, `${groundFiles.map((f) => `${path.basename(f)} — ${fs.statSync(f).size} bytes`).join("\n")}\n\ntotal: ${ground.length} characters`, "the operator's material only; nothing fetched");

  // 5. EOT DRAFT — the piece as witnessed spans, before prose.
  let draft = buildDraft({ task, ground, sourceId: groundFiles.map((f) => path.basename(f)).join("+") });
  // WHO, NOT WHICH STRING: one resolver over the material, carried by the
  // draft, asked by every later stage (referents.js).
  const R = buildReferents(ground);
  attachReferents(draft, R);
  write("eot-draft", `EOT draft: ${drawnParts(draft).length} part(s)`, draftLines(draft).join("\n"), draft.basis, "eoreader7:eot-draft");
  // ONE LINE PER STATEMENT, so a surface can show the draft forming line by
  // line and every later line can point back at a statement by its id.
  // THE DRAFT IN EOT NOTATION (eot-notation.js): each statement's meaning,
  // parsed by the in-house English parser, as a cube-addressed tree beside its
  // witnessed bytes. Optional — without the parser the statement stands as its
  // span, and the ledger says why.
  const parser = await loadEotParser();
  if (parser.ok) {
    const records = parser.parse(ground, groundFiles.map((f) => path.basename(f)).join("+"));
    const fit = attachEot(drawnParts(draft).flatMap((p) => p.children), records);
    write("eot-draft", "EOT notation attached", `${records.length} parsed record(s); ${fit.exact} statement(s) match one record exactly, ${fit.split} span several, ${fit.none} have none`, `parser: ${parser.provenance?.treebank ?? "UD_English-EWT"}, held-out LAS ${parser.provenance?.heldOut?.LAS ?? parser.provenance?.scores?.LAS ?? "see provenance"} — the parse is the engine's, errors included`, "eoreader7:eot-notation");
  } else {
    write("eot-draft", "EOT notation not attached", parser.reason, "the draft stands as witnessed spans", "eoreader7:eot-notation");
  }
  for (const part of drawnParts(draft)) {
    write("eot", `${part.id}${part.bridge ? (part.bridge.name ? ` ← ${part.bridge.name}` : " ← (transition to write)") : ""}`, `part ${part.id} [${part.span.start}–${part.span.end}]`, part.bridge?.name ? `planned turn: takes up "${part.bridge.name}" from ${part.bridge.from}` : (part.bridge ? `planned turn: none shared with ${part.bridge.from}` : "opens the piece"), "eoreader7:eot-draft");
    for (const pt of part.children) {
      const notation = (pt.eot ?? []).map((r) => notationOf(r)).join("\n\n");
      current.set(pt.id, write("eot", pt.id, notation ? `${notation}\n\n“${pt.text}”` : pt.text, `witness ${pt.span.sourceId} ${pt.span.start}–${pt.span.end}`, "eoreader7:eot-draft").id);
    }
  }

  // THE VOID, DECLARED ON EVERY LEVEL — whole, part, sentence, verbiage,
  // grounding — each operator with its value and its basis, before any prose.
  const spec = declareVoidSpec({ task, ground, draft, form });
  write("void", `Void: declared on every level`, voidSpecLines(spec).join("\n"), spec.basis, "eoreader7:void-spec");
  write("referents", `Referents: ${R.size}`, [...(draft.subjectRefs ?? [])].map((id) => `subject: ${R.represent(id)}`).join("\n") || "(no being named in most parts)", "the engine's referent organ over the material; a fact names beings, not strings", "eoreader7:referents");
  const draftText = new Map(drawnParts(draft).flatMap((p) => p.children.map((pt) => [pt.id, pt.text])));

  // THE ARRANGEMENT (arrange.js) — the first pass at the essay's shape,
  // composed from the material rather than copied from its paragraphing:
  // thesis, body groups by the beings they are about, ordered by extent, a
  // tension slot taken from the material or declared a gap, a return. The
  // reasoning checks (off-thesis, inversion, conflicting figures, circular
  // claim) are written as findings. No model call. Every later stage reads
  // the arranged draft; the source-ordered one stays on the ledger above.
  // `arrange` may be injected (a skeleton arm: plans/generation-terrain-stance.md).
  const gatedDraw = draw ?? (async (messages, maxTokens) => {
    const { streamOllamaChat } = await import("../../proxy-runner.mjs");
    let out = "";
    for await (const chunk of streamOllamaChat(model, messages, { maxTokens })) if (typeof chunk === "string") out += chunk;
    return out;
  });
  let outline = (arrange ?? arrangeEssay)({ draft, spec });
  write("arrange", `Arrangement: ${outline.slots.length} slot(s)`, outlineLines(outline, draft).join("\n"), outline.basis, "eoreader7:arrange");
  // THE MOUTH STEERS SOME PHYSICS (steer.js): it votes on which of the ask's
  // questions each section answers and whether neighbours are one section;
  // the mechanics license or refuse each vote, and every vote is recorded.
  const steered = await steerOutline({ outline, draft, task, draw: gatedDraw, onVote: (v) => write("arrange", `Mouth vote · ${v.force} · ${v.kept ? "licensed" : "refused"}`, v.reply, v.why, `model:${model}`) });
  if (steered.outline !== outline) {
    outline = steered.outline;
    write("arrange", `Arrangement, steered: ${outline.slots.length} slot(s)`, outlineLines(outline, draft).join("\n"), outline.basis, "eoreader7:steer", null);
  }
  // SELECTION: the sections closest to the ask fill the length the ask states,
  // or the essay form's declared shape; everything else stays in the sources.
  const sel = selectToBudget({ outline, draft, task });
  if (sel.dropped.length) {
    outline = sel.outline;
    write("arrange", `Selection: ${sel.dropped.length} section(s) left out`, sel.dropped.map((d) => `${d.slot}: ${d.statements.map((id) => draftText.get(id)).join(" ").slice(0, 160)}…`).join("\n"), `${sel.budget?.basis} — ${sel.dropped[0].why}`, "eoreader7:select");
    write("arrange", `Arrangement, selected: ${outline.slots.length} slot(s)`, outlineLines(outline, draft).join("\n"), outline.basis, "eoreader7:select");
  }
  draft = arrangedDraft(draft, outline);
  // THE VOICE, AS INFORMATION ONLY (Gary: information, not prohibition; the
  // model is the mouth). The shared register voice told the mouth "open with
  // a surprising thesis … never a description" and "do not discuss the
  // essay"; the arrangement has now COMPUTED the thesis, so the mouth is
  // handed it as a fact, and nothing tells it what not to say.
  const thesisText = outline.thesis?.text ?? null;
  // The form-word is the ask's own ("sonnet", "essay", "piece"), never "essay"
  // for everything; the subject only when one was stated.
  const named = form.token ?? "piece";
  const what = `This is ${/^[aeiou]/i.test(named) ? "an" : "a"} ${named}${topic ? ` on ${topic}` : ""}.${thesisText ? ` Its claim: "${thesisText}"` : ""}`;
  voice = { opening: what, body: what };
  // EVERY LOOP LEAVES SOMETHING USEFUL (loop-check.js): each loop's piece is
  // measured against the last; a loop that lost ground is undone.
  let lastPiece = null, lastMeasure = null;
  const checkLoop = (name, candidate, opts = {}) => {
    const m = measurePiece(candidate, { draft, ground, task, parse: parser.ok ? parser.parse : null });
    const j = judgeLoop(lastMeasure, m, opts);
    write("check", `Loop · ${name} · ${j.verdict}${j.keep ? "" : " · undone"}`, loopLine(name, m, j), j.why, "eoreader7:loop-check");
    if (j.keep) { lastPiece = candidate; lastMeasure = m; return candidate; }
    return lastPiece;
  };
  checkLoop("floor (the selected source sentences, in outline order)", floorPiece(draft));
  write("register", "Voice, as information", `opening:\n${voice.opening}\n\nbody:\n${voice.body}`, "the thesis computed by the arrangement, handed to the mouth as a fact; no instruction about what not to say (Gary)", "eoreader7:steer");
  for (const part of drawnParts(draft)) {
    write("arrange", `${part.id} (${part.slot})${part.bridge ? (part.bridge.name ? ` ← ${part.bridge.name}` : " ← (transition to write)") : ""}`, part.children.map((pt) => pt.id).join(" "), `from ${part.from.join(", ")}`, "eoreader7:arrange");
  }

  // 6. FLOOR — the piece, already, as the material's own sentences.
  const floor = floorProjection(draft);
  write("floor", "Floor projection", floor.join("\n\n"), "no model call: true and grounded by construction — every later stage must beat this", "eoreader7:eot-draft");

  // 7. PROSIFIED PASS — flesh on the draft, recursively.
  // Every record and every finished part is written the moment it exists, so
  // the ledger — and any surface reading it — grows line by line.
  const fleshLine = new Map();
  const emitRecord = (rec) => {
    const lines = [
      `level: ${rec.level} · node ${rec.node}`,
      rec.error ? `draw refused: ${rec.error}` : "",
      `\nasked:\n${rec.prompt}`,
      `\nthe mouth said:\n${rec.raw || "(nothing)"}`,
      `\nadmitted:\n${rec.survivors.map((x, i) => `[${rec.roads[i]}] ${x}`).join("\n") || "(none)"}`,
      rec.refusals.length ? `\nrefused:\n${rec.refusals.map((r) => `[${r.kind}${r.basis ? `: ${r.basis}` : ""}] ${r.sentence}`).join("\n")}` : "",
      rec.floor ? `\nfloor: ${rec.floor}` : "",
    ].filter(Boolean).join("\n");
    write("prosify", `Prose ${rec.level} ${rec.node}: ${rec.carried.length ? `carried ${rec.carried.join(", ")}` : "carried nothing"}${rec.missing.length ? `; missing ${rec.missing.join(", ")}` : ""}`, lines, `${rec.survivors.length} admitted, ${rec.refusals.length} refused${rec.floor ? ", fell to the floor" : ""}`, `model:${model}`);
    // THE FLESH, AND WHAT IT TEACHES THE EOT. A rewrite or a floor that
    // replaces a partial sentence supersedes that sentence's flesh line; two
    // statements said in one sentence become one joined statement that
    // supersedes both; a floored statement is superseded by its floor.
    const replaced = rec.replaces ? fleshLine.get(rec.replaces) ?? null : null;
    for (const ps of rec.perSentence ?? []) {
      const l = write("flesh", `${rec.node} → ${ps.carries.join(", ") || "(carries no statement on its own)"}`, ps.sentence, `${ps.carries.length ? `carries ${ps.carries.join(", ")}` : "admitted, but anchors no single statement: connective prose"}${replaced ? " — rewritten from a sentence that carried it only in part" : ""}`, `model:${model}`, replaced);
      fleshLine.set(ps.sentence, l.id);
      if (ps.carries.length >= 2) {
        const ids = [...new Set(ps.carries.map((id) => current.get(id)).filter(Boolean))];
        const texts = ps.carries.map((id) => draftText.get(id)).filter(Boolean);
        const joined = write("eot", ps.carries.join(" + "), texts.join(" ⟷ "), `joined by the flesh; witness: "${ps.sentence.slice(0, 160)}"`, "eoreader7:flesh→eot", ids.length ? ids : null);
        for (const id of ps.carries) current.set(id, joined.id);
      }
    }
    if (rec.floor) {
      const fl = write("flesh", `${rec.node} → ${rec.node} (floor)`, rec.floor, `the source sentence itself${replaced ? ", in place of a sentence that carried it only in part" : ""}`, "eoreader7:floor", replaced);
      fleshLine.set(rec.floor, fl.id);
      const prev = current.get(rec.node);
      const line = write("eot", `${rec.node} (floor)`, rec.floor, "the mouth could not carry this statement; it stands in the piece as its own source sentence", "eoreader7:flesh→eot", prev ?? null);
      current.set(rec.node, line.id);
    }
  };
  const partLine = new Map();
  const emitPart = (p) => partLine.set(p.id, write("part", p.id, p.prose, `${p.status}: ${p.carriedWhole} of ${p.of} fact(s) carried by the whole-part draw, ${p.recursed} by a finer draw, ${p.floored} at the floor`, `model:${model}`).id);
  const t0 = Date.now();
  // HORA, NOT TEMPUS (Koestler's retelling of Simon's two watchmakers, in
  // The Ghost in the Machine): every loop above the floor is a stable whole in
  // itself and a part of the next. If a level fails — the mouth goes away, a
  // stage throws — the piece is the last loop's stable whole, the run still
  // completes, and the ledger says where it stopped. Tempus loses the watch;
  // Hora loses only the subassembly in hand.
  let piece = lastPiece;
  let failedAt = null, stage = "prose", result = null;
  const spiral = async () => {
    // F1 (prosify.js): each section drawn whole, finer draws and floors where
    // the coarse draw fell short. F2 (flesh2.js): the same material at three
    // measured levels — one sentence per section, then a paragraph with the
    // section's kind and spans, then the remaining spans woven in — every level
    // loop-checked against the one below (plans/generation-terrain-stance.md).
    result = flesh === "flesh2"
      ? await flesh2({ draft, draw: gatedDraw, voice, ground, task, onRecord: emitRecord })
      : await prosify(draft, { draw: gatedDraw, voice, ground, task, onRecord: emitRecord, onPart: emitPart });
    // ── 8–12. THE ARCHONS READ, THEIR REVISIONS RUN, THEY READ AGAIN ────────
    // Every rule here was taught to the archon whose charge it serves
    // (archon-rules.js). The pipeline only carries out what a finding licenses,
    // in the order a writer would: fold what has no job, tighten what oversells,
    // then earn the transitions between what remains.
    piece = checkLoop("prose", result.parts.map((p) => ({ id: p.id, pieces: (p.pieces ?? []).map((x) => ({ ...x })) })), { addsFindings: true });
    const ctx = () => ({ piece, draft, ground, task, parse: parser.ok ? parser.parse : null });
    const archonLines = new Map();
    stage = "archons";
    const read1 = readPiece(ctx());
    for (const f of read1.findings) {
      const l = write("archon", `${f.editor} · ${f.kind}${f.part ? ` · ${f.part}` : ""}`, f.sentence ?? f.detail, `${f.cell} — ${f.licenses ? `licenses ${f.licenses}` : "reported"}: ${f.detail}`, `archon:${f.cell}`);
      (archonLines.get(f.cell) ?? archonLines.set(f.cell, []).get(f.cell)).push(l.id);
    }
    write("archon", "Untaught archons", read1.untaught.map((u) => `${u.editor} (${u.cell}): ${u.charge}`).join("\n"), "no probe yet — named rather than faked");

    // FOLD: what Clark and Caro found has no job leaves the piece.
    const toFold = new Map(read1.findings.filter((f) => f.licenses === "fold" && f.sentence).map((f) => [f.sentence, f]));
    piece = piece.map((p) => ({ ...p, pieces: p.pieces.filter((pc) => !toFold.has(pc.text)) }));
    for (const [sentence, f] of toFold) write("flesh", `(folded by ${f.editor})`, "", `${f.detail} — folded out of the piece`, `archon:${f.cell}`, fleshLine.get(sentence) ?? null);
    write("fold", `Fold: ${toFold.size} sentence(s)`, [...toFold.keys()].join("\n") || "(nothing had no job)", "licensed by Clark (restatement) and Caro (unverified)", "eoreader7:finish");

    // RESTORE: a sentence Kidder & Todd found linking what the material keeps
    // apart is replaced by the source sentences of the statements it carries —
    // true by construction; the prose's voice is the price, the truth is not.
    const toRestore = new Map(read1.findings.filter((f) => f.licenses === "restore" && f.sentence).map((f) => [f.sentence, f]));
    piece = piece.map((p) => ({ ...p, pieces: p.pieces.flatMap((pc) => {
      const f = toRestore.get(pc.text);
      if (!f) return [pc];
      return pc.carries.map((id) => ({ text: draftText.get(id), carries: [id] })).filter((x) => x.text && !p.pieces.some((o) => o !== pc && o.text === x.text));
    }) }));
    for (const [sentence, f] of toRestore) {
      const back = f.carries.map((id) => draftText.get(id)).filter(Boolean).join(" ");
      const l = write("flesh", `(restored by ${f.editor})`, back, `${f.detail} — the source sentence(s) stand in its place`, `archon:${f.cell}`, fleshLine.get(sentence) ?? null);
      for (const id of f.carries) if (draftText.get(id)) fleshLine.set(draftText.get(id), l.id);
    }

    // REPAIR: Clark's splice — a sentence glued to its own source — is replaced
    // by its most verbatim half, only if every fact it carried survives.
    const anchorsNow = anchorsFor(draft);
    for (const f of read1.findings.filter((x) => x.licenses === "repair" && x.sentence && x.repair)) {
      piece = piece.map((p) => ({ ...p, pieces: p.pieces.map((pc) => {
        if (pc.text !== f.sentence) return pc;
        const ok = pc.carries.every((id) => carries(anchorsNow.get(id), [f.repair]).ok);
        const l = write("flesh", `${p.id} (repaired by ${f.editor})`, ok ? f.repair : pc.text, ok ? `${f.detail} — the verbatim half stands` : `${f.detail} — repair refused: it would drop a fact`, `archon:${f.cell}`, fleshLine.get(pc.text) ?? null);
        if (!ok) return pc;
        fleshLine.set(f.repair, l.id);
        return { ...pc, text: f.repair };
      }) }));
    }

    // FLOOR WHAT WAS DROPPED: Kidder & Todd's statement_dropped licenses the
    // source sentence itself, placed at its statement's position in the part.
    // (Run 11: "p5.2 is not carried — missing 1927" was found on both reads and
    // nothing acted on it.)
    const dropped = read1.findings.filter((f) => f.licenses === "floor" && f.statement && f.part);
    for (const f of dropped) {
      const dp = drawnParts(draft).find((x) => x.id === f.part);
      const i = piece.findIndex((x) => x.id === f.part);
      if (!dp || i < 0) continue;
      const ids = dp.children.map((c) => c.id);
      const at = ids.indexOf(f.statement);
      const pieces = [...piece[i].pieces];
      let pos = 0;
      pieces.forEach((pc, k) => { if (pc.carries.some((id) => ids.indexOf(id) >= 0 && ids.indexOf(id) < at)) pos = k + 1; });
      pieces.splice(pos, 0, { text: draftText.get(f.statement), carries: [f.statement] });
      piece = piece.map((x, k) => (k === i ? { ...x, pieces } : x));
      const l = write("flesh", `${f.statement} (floor, by ${f.editor})`, draftText.get(f.statement), `${f.detail} — the source sentence stands at its statement's place`, `archon:${f.cell}`);
      fleshLine.set(draftText.get(f.statement), l.id);
    }

    piece = checkLoop("archons (fold, restore, repair, floor)", piece);

    // TIGHTEN: every sentence Zinsser flagged, rewritten plainly, kept only if
    // its facts keep their anchors.
    const targets = new Map();
    for (const f of read1.findings.filter((x) => x.licenses === "rewrite" && x.sentence)) {
      targets.set(f.sentence, [...new Set([...(targets.get(f.sentence) ?? []), ...(f.words ?? [])])]);
    }
    stage = "tighten";
    const tight = await tightenPiece(piece, { draft, draw: gatedDraw, ground, task, voice, targets, complete: parser.ok ? (t) => clauseComplete(parser, t) : null, core: parser.ok ? (t) => clauseCore(parser, t) : null });
    for (const c of tight.changes) {
      write("tighten", `${c.kept ? "Rewritten" : "Kept as it was"} · ${c.part} · ${c.tics.join(", ")}`, c.kept ? `${c.from}\n→ ${c.to}` : c.from, c.by === "lish-cut" ? "Lish's cut: decoration with no fact in it removed, no model call; every anchor kept" : c.kept ? "Zinsser's finding, rewritten plainly; every anchor kept" : `rewrite refused: ${c.reasons.join("; ")}`, c.by === "lish-cut" ? "archon:micro.pathos" : `model:${model}`);
      if (c.kept) {
        const l = write("flesh", `${c.part} (tightened)`, c.to, "rewritten plainly for Zinsser; every anchor kept", `model:${model}`, fleshLine.get(c.from) ?? null);
        fleshLine.set(c.to, l.id);
      }
    }
    piece = checkLoop("tighten", tight.parts);

    // TURNS: Clark's unearned transitions, one bridging sentence each.
    let bridges = [];
    stage = "turns";
    if (read1.findings.some((f) => f.kind === "missing_transition")) {
      const tp = await turnPass(piece, { draft, draw: gatedDraw, ground, voice });
      bridges = tp.bridges;
      for (const b of tp.bridges) {
        write("turn", `${b.kept ? "Bridge kept" : "Bridge refused"} · ${b.part}`, b.sentence ?? "(none)", b.kept ? "takes up the last part and hands on to this one" : b.reasons.join("; "), `model:${model}`);
        if (b.kept) fleshLine.set(b.sentence, write("flesh", `${b.part} (bridge)`, b.sentence, "a transition Clark's finding licensed", `model:${model}`).id);
      }
      piece = checkLoop("turns", tp.parts);
    }

    // RE-READ: each archon's second reading supersedes its first, so the fold
    // shows what each editor still finds.
    stage = "arrival";
    const read2 = readPiece(ctx());
    const cells = new Set([...read1.findings.map((f) => f.cell), ...read2.findings.map((f) => f.cell)]);
    for (const cell of cells) {
      const now = read2.findings.filter((f) => f.cell === cell);
      const editor = (now[0] ?? read1.findings.find((f) => f.cell === cell)).editor;
      write("archon", `${editor} · re-read`, now.length ? now.map((f) => `[${f.kind}${f.part ? ` ${f.part}` : ""}] ${f.sentence ?? f.detail}`).join("\n") : "nothing left to find", `${cell} — ${now.length} finding(s) after the revisions`, `archon:${cell}`, archonLines.get(cell) ?? null);
    }
    const licensed = read2.findings.filter((f) => f.licenses);
    const byEditor = {};
    for (const f of licensed) byEditor[f.editor] = (byEditor[f.editor] ?? 0) + 1;
    // ARRIVAL IS GEBSER'S READING: the origin present in every part, none of it
    // lost, and no single editor's perspective with the last word.
    const g = gebserArrival({ piece, draft, findings: read2.findings });
    write("arrive", `Gebser · ${g.arrived ? "Arrived" : "Not yet arrived"}`,
      [g.basis, ...Object.entries(byEditor).map(([e, n]) => `${e}: ${n} finding(s) still licensing a revision`)].join("\n"),
      `diaphaneity ${g.diaphaneity} · untaught, and so unable to object: ${read2.untaught.map((u) => u.editor).join(", ") || "none"}`, "archon:gebser");
    stage = "summary";

    const secs = Math.round((Date.now() - t0) / 1000);
    const calls = result.calls ?? result.records.length;
    const floored = result.parts.reduce((s, p) => s + p.floored, 0);
    const facts = result.parts.reduce((s, p) => s + p.of, 0);
    const tightCalls = tight.changes.filter((c) => c.by !== "lish-cut").length; const lishCuts = tight.changes.filter((c) => c.by === "lish-cut").length; const bridgeCalls = bridges.length;
    write("summary", "Run summary", `model calls: ${calls + tightCalls + bridgeCalls + steered.votes.length} (steer ${steered.votes.length}, prose ${calls}, tighten ${tightCalls}, turns ${bridgeCalls})\nmouth votes licensed: ${steered.votes.filter((v) => v.kept).length} of ${steered.votes.length}\nseconds from prose to arrival: ${secs}\nfacts in the draft: ${facts}\nfacts at the floor: ${floored}\nparts carried whole: ${result.parts.filter((p) => p.status === "carried whole").length} of ${result.parts.length}\narchon findings, first read: ${read1.findings.length}\nsentences folded: ${toFold.size}\nLish cuts (no model): ${lishCuts}\nrewrites kept: ${tight.changes.filter((c) => c.kept && c.by !== "lish-cut").length} of ${tightCalls}\nbridges kept: ${bridges.filter((b) => b.kept).length} of ${bridgeCalls}\nfindings still licensing a revision: ${licensed.length}`, "measured on this run");


  };
  try { await spiral(); }
  catch (e) {
    failedAt = stage;
    piece = lastPiece;
    write("check", `Loop · failed at ${stage} · the piece stands at the last stable loop`, `${String(e?.message ?? e).slice(0, 300)}`, "Hora's rule: the subassembly in hand is lost, the wholes below it stand", "eoreader7:loop-check");
  }
  // THE PIECE, AS IT NOW STANDS: each part's line supersedes its earlier one.
  for (const p of piece ?? []) write("part", p.id, p.pieces.map((x) => x.text).join(" "), failedAt ? `the last stable loop's piece (the run failed at ${failedAt})` : "after the archons' fold, tighten and turns", "eoreader7:finish", partLine.get(p.id) ?? null);

  const report = path.join(DOCS, `${docId.replace(/:1$/, "")}.phases.html`);
  fs.writeFileSync(report, renderPhaseReport(docId.replace(/:1$/, "")));
  return { docId, report, result };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const task = arg("task");
  const groundArg = arg("ground");
  if (!task || !groundArg) { console.error('usage: pipeline-run.mjs --task "…" --ground FILE[,FILE] [--model gemma2:2b] [--id NAME] [--web]'); process.exit(1); }
  const out = await runPipeline({ task, groundFiles: groundArg.split(","), model: arg("model", "gemma2:2b"), id: arg("id"), web: process.argv.includes("--web") ? liveWeb() : null, onStage: (s) => console.error(`  · ${s.role}: ${s.title}`) });
  console.log(out.report);
  process.exit(0);
}
