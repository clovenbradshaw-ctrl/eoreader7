// native/eval/recipients/holograph.mjs — what the repo's holograph hands a writer, for a request and a record of people.
//
// The direction (user, 2026-09-30): the accounting of the people a result lands on must not be something the model does ("the
// model should not be flagging this"); it is "an unconscious, ground activity"; "you have the holograph. use it"; "you have to use
// referents and lots of ways to tell what is the same referent, we've built all this out"; and the structures "are not labelled as
// moral things, these must be tied to the ACTUAL reasoning … so the trick is finding where they ALREADY are working, and to wire
// them in."
//
// THE HOLOGRAPH (native/docs/THE-HOLOGRAPH.md). The record is the object. What the writer is handed is not the record and not a
// question about it: it is a small pattern the record computes — the sentences the referents in play stand in, resolved by
// identity. Nothing in this file asks a model anything.
//
// WHERE EACH STEP ALREADY WORKS (THE-MORAL-HELIX.md names the cells; the organs are the ones the reading itself runs on):
//   READ     SIG·Ground  "who is here?"  The record is read as material: `chunkSource`, the relation reader with the app's own
//                        levers, the notes ledger. A person is a REFERENT here, never a string (P11).
//   WHO      SIG·Ground / SIG·Figure  `cast.js::makeReferentIndex`, configured as app.js configures it (`leadingSurfaces`,
//                        `nameFold`, `nameVariant`, furniture blanking). "Ana is allergic to shellfish." opens with the name — the
//                        shape the `leadingSurfaces` option exists for.
//   SAME     SIG·Figure  the routes by which two forms are one being, each one an organ the repo already has, none of them written
//                        here:
//                          exact / given / full name, title, case, optical fold   cast.js + surfaces.js (namesCorefer, opticalReferentForm)
//                          possessive       "Anna's" is Anna   surfaces.js::stripPossessive, composed into the name fold
//                          declared alias   "Elizabeth Hart (Liz)"   aliases.js (declaredAliases → aliasClasses), the class of
//                                           forms the MATERIAL declared, read against the AliasDeclarationPrior a corpus measured
//                          pronoun          "She is allergic …"   pronouns.js::resolvePronouns, one-hop activation recall over
//                                           the cast, at the operating point hypergraph.js already uses
//                        Not wired here, and named as such: a lowercase description ("the new hire" — identity-evidence.js,
//                        nominal-beings.js), a group named by a description ("the design team"), a near-miss spelling of a short
//                        name (surfaces.js::isNearMissSpelling refuses below its own floor), kinship terms (READING-SPEC S88).
//   ATTEND   SIG·Figure / SEG·Ground  `resolutions.js::activeReferents` — the referents the request names, by identity — and
//                        `activation-retrieval.js::activate`: hop 0 is every sentence an active referent stands in; hop 1 the
//                        referents those sentences co-mention and the other ends of the ledger's notes; cut where showing one more
//                        sentence changes nothing about what the question reaches (`dmdWindow`) — the extent of the field, measured.
//   HAND     `resolutions.js::lensBlock` and the activated sentences, verbatim, under the source's name as
//            `source.js::buildSourceBlock` prints a source.
//
// WHAT THIS DOES NOT DO. It does not infer a person from a bare request: a request that names no being the record establishes
// activates nothing, and hands nothing (the typed reason is on the result).

import { readFileSync, existsSync } from "node:fs";

const NATIVE = new URL("../../", import.meta.url).pathname;
const FIX = `${NATIVE}eval/the-fold/fixtures/`;
const here = (p) => `${NATIVE}${p}`;
/** The alias-declaration shapes a corpus measured (live_priors, a sibling checkout). Absent, the alias route is a typed gap. */
export const ALIAS_PRIOR_PATH = new URL("../../../../live_priors/derived-priors/alias-priors/alias-declaration-en.json", import.meta.url).pathname;
/** The floors the aliases organ takes from its caller (the same declaration eval/the-fold/civic-research-walk.mjs makes). */
export const ALIAS_FLOORS = Object.freeze({ minConfirmRate: 0.3, minFires: 100, minUses: 2 });
/** hypergraph.js's own declared operating point for pronoun binding (PRONOUN_MIN_ACTIVATION / PRONOUN_MIN_MARGIN), restated. */
export const PRONOUN_OPERATING_POINT = Object.freeze({ minActivation: 0.05, minMargin: 0.2 });
export const ROUTES = Object.freeze(["possessive", "alias", "pronoun"]);

/** The name the record wears in front of the writer — the source's own name, as `sourceFace` prints it, and nothing the firewall names. */
export const FACE = "notes.txt";

/**
 * makeHolograph({ routes }) → { read(record), hand(task), decoy(task, n, rnd), whole(task), FACE, routes, gaps }
 * `routes` ⊂ ROUTES are the identity routes beyond what app.js's own index already does (default: all of them; `[]` is the product
 * today). Async once (the organs are imported), then synchronous per task. Nothing is kept between calls.
 */
export async function makeHolograph({ routes = ROUTES } = {}) {
  const on = new Set(routes);
  const { makeRelationReader } = await import(here("organs/hypergraph.js"));
  const { makeNotesText } = await import(here("organs/notes-text.js"));
  const { chunkSource, tokenize, blankLabelRows, buildSourceBlock } = await import(here("organs/source.js"));
  const { makeReferentIndex } = await import(here("organs/cast.js"));
  const { bindActivationRetrieval } = await import(here("organs/activation-retrieval.js"));
  const { declaredAliases, aliasClasses, aliasClassMap, shapesFrom } = await import(here("organs/aliases.js"));
  const { splitSentences: sentencesWithStart } = await import(here("organs/grounding.js"));
  const { splitSentences } = await import(here("adapters/text/spans.js"));
  const S = await import(here("adapters/text/surfaces.js"));
  const { resolvePronouns } = await import(here("adapters/text/pronouns.js"));
  const { relationExtractorsFor } = await import(here("adapters/text/relations-language.js"));
  const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(here("adapters/text/wordclass.js"));
  const { makeGrammarLens } = await import(here("organs/grammar-lens.js"));
  const { GRAMMAR_MIN_SHARE } = await import(here("adapters/text/grain-typing.js"));
  const M = await import(here("adapters/text/morphology.js"));
  const P = await import(here("adapters/text/priors.js"));
  const cube = await import(here("kernel/cube.js"));
  const TL = await import(here("kernel/task-log.js"));
  const { dmdWindow } = await import(here("kernel/activation.js"));
  const R = await import(here("the-fold/resolutions.js"));
  const D = await import(here("the-fold/dialogue.js"));

  const { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm, opticalReferentForm, isNearMissSpelling, stripPossessive } = S;
  const blankFurniture = (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 });
  const gaps = [];

  // The relation reader with the app's levers (lib/product-assay.mjs::organs mirrors app.js's RELATION_READER_OPTIONS key for key;
  // this mirrors that, without the sibling checkout's grid and frame, which a reading does not need).
  const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));
  const dispatch = relationExtractorsFor({ language: "eng", roleConfig: null, posPrior, classifyWord, dominantClass });
  // The door's own grammar gate, as app.js builds it (`connectorLens`): a label the treebank settles as anything but a verb is
  // turned away at the ledger — "(" and ")" around an alias, "of", "and" — so the notes a request's referents carry are not the
  // extractor's punctuation. Without it the lens handed the writer `Hart — (→ Liz`.
  const connectorLens = makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META });
  const verbForms = new Set(JSON.parse(readFileSync(`${FIX}unimorph-eng-verb-forms.json`, "utf8")));
  const sameAct = M.createLemmatizer(M.morphologyFromPrior(JSON.parse(readFileSync(`${FIX}unimorph-morphology-prior.json`, "utf8"))).forms, { language: "eng" }).sameAct;
  const options = {
    splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    discoverRelationVocab: dispatch.discoverRelationVocab, extractRelations: dispatch.extractRelations, tokenize,
    extractorsMode: "dispatch", posPriorFor: () => posPrior, verbForms, oovLexicon: verbForms,
    nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true, objectSpecificity: true,
    createLemmatizer: () => ({ sameAct }), morphologyIndex: {},
    determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]), definiteDeterminers: new Set(P.DEFINITE_DETERMINERS),
    negationWords: P.NEGATION_WORDS, firstPerson: P.FIRST_PERSON, blankFurniture, resolvePronouns,
  };
  const relationsFor = makeRelationReader(options);
  const hl = makeNotesText({ createTaskLog: TL.createTaskLog, append: TL.append, projectTasks: TL.projectTasks, ENTRY_KINDS: TL.ENTRY_KINDS, OPERATOR_BASIS: TL.OPERATOR_BASIS, GRAINS: cube.GRAINS, cellOf: cube.cellOf });

  // ── the routes ─────────────────────────────────────────────────────────────
  // POSSESSIVE. cast.js::resolve compares a name to an established surface as written; a person established only as "Anna's"
  // is not found by "Anna". stripPossessive is the engine's own marker strip (it reads the apostrophe glyph and nothing else), and
  // nameFold is the seam app.js already uses for opticalReferentForm — composed, not replaced.
  const foldPossessive = (t) => String(t ?? "").split(/\s+/).map(stripPossessive).join(" ");
  const nameFold = on.has("possessive") ? (t, o) => opticalReferentForm(foldPossessive(t), o) : opticalReferentForm;
  // PRONOUN. A pronoun that opens a sentence ("She also avoids tree nuts.") is admitted as a being by the leading-surface door,
  // because it is a capital that opens a sentence and appears nowhere lowercase. `extractLeadingSurfaces` takes no function-word
  // class in this checkout (its second argument is the abbreviation list), so the closed class the reader already holds
  // (`THIRD_PERSON_SINGULAR`, the one hypergraph.js hands the pronoun binder) is applied to what it returns. Only with the route
  // on: `[]` is the app's own index, byte for byte.
  const pronounWords = new Set(Object.keys(P.THIRD_PERSON_SINGULAR).map((w) => diaNorm(w)));
  const leadingSurfaces = on.has("pronoun") ? (sents, o) => (extractLeadingSurfaces(sents, o) ?? []).filter((l) => !pronounWords.has(diaNorm(String(l?.surface ?? "")))) : extractLeadingSurfaces;
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, blankFurniture, leadingSurfaces, nameFold, nameVariant: isNearMissSpelling });
  const { mentionBook, activate } = bindActivationRetrieval({ referentsOf: D.referentsOf, fold: D.fold, activeReferents: R.activeReferents, dmdCut: R.dmdCut, lensCut: R.lensCut, DECLARED_LINES: R.DECLARED_LINES });

  // ALIAS. The shapes are RECEIVED (a corpus measured which shapes English prose uses to introduce a short form); the floors are
  // this battery's declaration. Absent the prior, the route says so and does nothing.
  let aliasShapes = [];
  if (on.has("alias")) {
    if (existsSync(ALIAS_PRIOR_PATH)) {
      try { aliasShapes = shapesFrom(JSON.parse(readFileSync(ALIAS_PRIOR_PATH, "utf8")), { minConfirmRate: ALIAS_FLOORS.minConfirmRate, minFires: ALIAS_FLOORS.minFires }); } catch (e) { gaps.push({ type: "alias_prior_unreadable", detail: String(e?.message ?? e).slice(0, 120) }); }
    } else gaps.push({ type: "alias_prior_absent", detail: `no AliasDeclarationPrior@1 at ${ALIAS_PRIOR_PATH} (live_priors is not beside this checkout) — the alias route does nothing` });
  }

  /** A second face over an index: any form the MATERIAL declared an alias of resolves to every referent that wears a form of the same class. */
  function withAliases(base, text) {
    if (!aliasShapes.length) return { index: base, classes: [] };
    const { aliases } = declaredAliases(text, { splitSentences: sentencesWithStart, minUses: ALIAS_FLOORS.minUses, shapes: aliasShapes });
    const classes = aliasClasses(aliases);
    if (!classes.length) return { index: base, classes };
    const formToKey = aliasClassMap(classes);
    const form = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    const idsByKey = new Map();
    for (const e of base.events ?? []) {
      const k = formToKey.get(form(e.surface));
      if (!k) continue;
      if (!idsByKey.has(k)) idsByKey.set(k, new Set());
      idsByKey.get(k).add(e.referent_id);
    }
    const resolve = (name) => {
      const ids = new Set(base.resolve(name));
      const k = formToKey.get(form(name));
      if (k) for (const id of idsByKey.get(k) ?? []) ids.add(id);
      return ids;
    };
    return { index: { ...base, resolve }, classes };
  }

  /** The sentences a pronoun-bound referent stands in, joined to the address book (rows kept in document order). */
  function withPronouns(book, index, passages) {
    const stats = { bindings: 0, gaps: 0 };
    if (!on.has("pronoun") || !index.events?.length) return { book, stats };
    const surfaceToReferent = new Map(index.events.map((e) => [e.surface, e.referent_id]));
    const rows = [...book.sentences];
    for (const c of passages) {
      const text = String(c?.text ?? "");
      let sents = []; try { sents = splitSentences(text); } catch { continue; }
      let resolved; try { resolved = resolvePronouns(sents, surfaceToReferent, PRONOUN_OPERATING_POINT); } catch { continue; }
      stats.gaps += resolved?.gaps?.length ?? 0;
      for (const b of resolved?.bindings ?? []) {
        const s = sents.find((x) => x.order === b.sentenceOrder) ?? sents[b.sentenceOrder];
        if (!s) continue;
        const start = (Number(c.start) || 0) + Number(s.offset);
        const have = rows.find((r) => r.start === start);
        stats.bindings += 1;
        if (have) { have.ids = new Set([...have.ids, b.referentId]); continue; }
        rows.push({ ref: `${c.source ?? FACE}#${start}-${start + s.text.length}`, source: c.source ?? FACE, chunkRef: c.ref, start, end: start + s.text.length, text: s.text, ids: new Set([b.referentId]), order: 0, viaPronoun: true });
      }
    }
    rows.sort((a, b) => a.start - b.start);
    const byId = new Map();
    rows.forEach((r, i) => { r.order = i; for (const id of r.ids) { if (!byId.has(id)) byId.set(id, []); byId.get(id).push(i); } });
    return { book: { ...book, sentences: rows, byId }, stats };
  }

  /** READ — the record as material: its passages, the ledger the relation reader wrote, the referent index with its routes, and the address book. */
  function read(record) {
    const text = (record ?? []).join("\n");
    const passages = chunkSource(FACE, text);
    const rel = relationsFor(passages, { pool: passages });
    let log = hl.createNotes({});
    for (const p of passages) {
      const claims = rel.read(String(p.text ?? ""))?.claims ?? [];
      const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
      if (edges.length) log = hl.admit(log, edges, { witness: `${p.ref}~holograph`, classifyConnector: connectorLens, minShare: GRAMMAR_MIN_SHARE }).log;
    }
    const notes = hl.foldWithStanding(log);
    const { index, classes } = withAliases(indexFor(passages), text);
    const base = mentionBook(passages, index, { splitSentences });
    const { book, stats } = withPronouns(base, index, passages);
    return { passages, notes, index, book, identity: { routes: [...on], aliasClasses: classes.length, pronounBindings: stats.bindings, pronounGaps: stats.gaps } };
  }

  /** The mouth's face of a set of sentences: the source's name, then the sentences, exactly as `buildSourceBlock` prints a source. */
  const block = (sentences) => (sentences.length ? buildSourceBlock([{ source: FACE, text: sentences.join("\n\n") }]) : "");

  /**
   * ATTEND and HAND — for a request over a record. Returns the text the writer is handed (empty when nothing is activated), the
   * sentences in order, who the request named, the lens (computed, not handed — see below) and the reasons. Nothing is asked of a model.
   */
  function hand(task) {
    const { notes, index, book, passages, identity } = read(task.record);
    const active = R.activeReferents(task.request, [], index);
    const act = activate({ question: task.request, transcript: [], index, book, notes, dmdWindow, resolutions: 2 });
    const lens = R.resolutionBlocks({ level: 2, question: task.request, transcript: [], index, notes, voids: [], records: [], dmdWindow }).lens;
    const sentences = act.basis === "activation" ? act.passages.map((p) => p.text) : [];
    // The hand is the SENTENCES. `lensBlock` (what the ledger heard about the active referents) is computed and returned for the
    // record but is not handed to the writer: on fifteen of these nineteen tasks it is empty, and on the four alias tasks (two records) it is the
    // extractor's punctuation — `Hart — (→ Liz`, `Liz — ) joined the club last year, and→ Liz` — because the door's grammar gate
    // refuses a label the treebank settles as a non-verb and the treebank has no entry for a parenthesis. A finding about the door,
    // recorded in the register; handing it to the writer would put noise in exactly the arm that is being tested.
    return {
      text: block(sentences),
      sentences,
      lens: lens?.lines ?? [],
      active: [...active.ids].map((id) => index.represent(id)),
      referents: [...index.referents].map((id) => index.represent(id)),
      notes: notes.length,
      basis: act.basis,
      why: act.why ?? null,
      window: act.window ?? 0,
      passages: passages.length,
      identity,
    };
  }

  /**
   * The control built to fail: the SAME machinery pointed at the wrong beings. Sentences that carry a referent the record
   * establishes and the request does not name, drawn by a seeded shuffle (`rnd` in [0,1)), the same count the holograph shows.
   * Lines the task's oracle marks as stating a recipient's situation are never drawn. Padded, and said so, from sentences that carry
   * no established referent at all when the record has too few.
   */
  function decoy(task, n, rnd) {
    const { index, book, passages } = read(task.record);
    const active = R.activeReferents(task.request, [], index).ids;
    const skip = new Set([...(task.relevant ?? []), ...(task.bridge ?? [])].map((i) => task.record[i]));
    const other = book.sentences.filter((s) => ![...s.ids].some((id) => active.has(id)) && !skip.has(s.text));
    const pool = [...other];
    for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    let chosen = pool.slice(0, n).sort((a, b) => a.order - b.order).map((s) => s.text);
    let padded = 0;
    if (chosen.length < n) {
      const used = new Set(chosen);
      const bare = splitSentences(passages.map((p) => p.text).join("\n")).map((s) => s.text).filter((t) => t && !used.has(t) && !skip.has(t) && !book.sentences.some((b) => b.text === t));
      for (let i = bare.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [bare[i], bare[j]] = [bare[j], bare[i]]; }
      const extra = bare.slice(0, n - chosen.length); padded = extra.length; chosen = [...chosen, ...extra];
    }
    return { text: block(chosen), sentences: chosen, padded, pool: other.length };
  }

  /** Visibility without resolution: every line of the record, as it was written. */
  function whole(task) { return { text: block([...task.record]), sentences: [...task.record] }; }

  return { read, hand, decoy, whole, FACE, routes: [...on], gaps };
}
