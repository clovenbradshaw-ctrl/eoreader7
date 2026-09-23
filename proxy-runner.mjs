import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "./native/adapters/text/recursive.js";
import { loadModel as loadEnglishParserModel } from "./native/adapters/text/english-parser.js";
import { createEnglishParserPerceiver } from "./native/adapters/text/english-parser-perceiver.mjs";
import { isCodeHunk, codeEncounters } from "./native/adapters/code/encounters.js";
import { diaNorm, namesCorefer } from "./native/adapters/text/surfaces.js";
import { deriveRegister, detectLanguage, questionFor, writeVoiceFor, voiceIsDeclaredFor } from "./native/kernel/register.js";
import { createSeededRng, seedFrom } from "./native/kernel/rng.js";
import { queryMeaningPotential, loadSidecar, SIDECAR_PATH } from "./native/kernel/prior-query.js";
import { createWheelLedger } from "./native/kernel/wheel.js";
import { discoveredFramingFor, discoverFraming, applyDiscovered } from "./native/kernel/discovery.js";
import { reviseTextFold } from "./native/adapters/text/revision.js";
import { createRecursiveReader } from "./native/kernel/reading.js";
import { reconstruct } from "./native/kernel/fold.js";
import { createHyperlexicon, admitHyperlexiconCandidates, giveHyperlexiconAffordance } from "./native/kernel/hyperlexicon.js";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "./native/kernel/relation-composition.js";
import { createSession as createCorpusSession, admitChunked } from "./legacy-eoreader6.1/packages/host/corpus.js";
// surfTask's own absolute address ladder (2026-09-23, user direction: "rip
// out all the surf thats not happening in eoreader7... the fold is just a
// surface") — native/organs/source.js's chunkSource+retrieve replaces the
// legacy executePrompt import that used to live here (surfTask's own header
// comment has the full account: a live, minimally-reproduced bug where the
// legacy ladder's windowed fallback cut a name mid-word, and the reasoning
// this repo never patches a frozen legacy organ in place, Constitution I.2).
import { chunkSource, retrieve as retrieveChunks } from "./native/organs/source.js";
import { postprocessAnswer, postprocessCode, validatePython, validateHtml, warmPostprocess, getPyodide } from "./postprocess.mjs";
import { validateLanguage } from "./native/organs/lang-validators.js";
// The three resolutions — brought in from the-fold (vendored at
// native/the-fold/): the discourse restated at three grains by the reading's
// own organs (atmosphere, lens, paradigm), never by a model's compression.
import { resolutionBlocks } from "./native/the-fold/resolutions.js";
import { tokenize } from "./native/the-fold/source.js";
import { logitBiasFor, logitsBiasObject } from "./native/organs/gemma2-tokenizer.mjs";
import { readingIndexFromLog } from "./native/the-fold/reading-log.js";
import { readableTranscript } from "./native/the-fold/transcript-reading.js";
import { sentenceSurface, passagesFromSegments } from "./native/the-fold/reading-surface.js";
import { claimKindsOf } from "./native/organs/output-claims.js";
import { engineRelationsFor } from "./native/the-fold/reader-bundle.js";
import { answerRecord } from "./native/the-fold/answer-record.js";
// AntiStrauss — the safety-and-ethics gate. EVERY model call in this proxy
// is routed through native/the-fold/antistrauss.mjs (the import is static so
// the proxy fails closed at boot if the gate cannot load). See the module
// header for how it is wired and why it must never be bypassed.
import { groundGate, draftGate, foldGate, tightenGate, arriveGate, chainStrain, measuredInflation, lastSentence as lastSentenceOmni } from "./native/the-fold/spiral-contract.js";
import { deposit as depositAdmitted, admit as admitCandidate, measureVariance, measureBondNull, claimCore as claimCoreOmni, segmentSentences as segmentSentencesOmni, wordTokens as wordTokensOmni, nameGate as referentNameGate, bond as bondOf } from "./native/the-fold/admission.js";
import { createDocumentLedger, appendDocumentObservation, appendLedgerLine, projectDocument, documentChangeLog, admitPart, serializeLedger, snipsFromSources, relevantSources, checkEssayShape, ledgerFilePath, renderApaFootnotes, satisfactionOfSection, satisfactionOf, declareEssayVoid, fillCheck, citationLedger, voidCellsFor, holographicSatisfaction, lavarGradeEssay, competencyGrade, lavarGradeReading, kelsenGrade, embedInlineCitations, renderLiveEssayHtml, detectRepetition, detectRedundancy, detectTrajectoryBoredom, holonicSatisfaction, holonTreeFromText, holonicTreeSatisfaction, holonAssertionTree, holonicAssertionSatisfaction, holonLeaves } from "./native/the-fold/document-ledger.js";
import { precedence, tagClaim, precedenceOrderPhrase } from "./native/organs/regime.js";
import { inventedNameRuns as verifyInventedNameRuns, isMetaSentence as verifyIsMetaSentence } from "./native/the-fold/referent-verify.js";
import { wideToAtoms, foldWideToShape, beatsFromGround } from "./native/the-fold/essay-fold.js";
import { isConcrescent } from "./native/the-fold/concrescence.js";
import { createSpiral, rotate, spiralPath, INFLATION_WORDS, findWordHits } from "./native/the-fold/revision-spiral.js";
// The dispute lookup notesFromEdges reads (below): `noteId` is the same
// bare-ends identity a note born with no identity organ already carries in
// kernel/notes.js, and `makeNotes()` is a pure factory (disputesOf/etc. are
// plain functions of a log) — instantiated once here the same way
// organs/hyperlexicon.js and organs/notes-text.js already instantiate it.
import { noteId as notesLedgerNoteId, makeNotes as makeDisputeNotes } from "./native/kernel/notes.js";
const DISPUTE_NOTES = makeDisputeNotes();
import { runDMCA, categorizeCreativity, chaseParaphrase, paraphraseCandidatesFor } from "./native/organs/run-dmca.js";
import { antistrauss } from "./native/the-fold/antistrauss.mjs";
import { goreBoundary, gatherPlan, cueGoDeeperPlan } from "./native/the-fold/gore.js";
// The keyless field (GFP Pass 35, the-fold c232779): recall by partial-cue
// resemblance, resolution by state — no absolute address. Surf's SECOND
// witness, beside the exact-term ladder (native/organs/source.js's
// chunkSource+retrieve, surfTask's own header comment): when that ladder
// returns a void or nothing, the field recalls what the cue resembles.
import { Field } from "./native/the-fold/relative.js";
import { dmdWindow, gammaFor } from "./native/kernel/activation.js";
// The felt shape (2026-09-13, Abhinavagupta) — the third Greek leg, wired
// into EVERY turn: ethos (the ground) comes first, logos (the reading)
// builds the record, and pathos names how the material was UNDERGOEN, for
// whom. Previously only the CLI composed it; the proxy turn now computes it
// and carries it on the result so every surface sees the triad whole.
import { pathosOf, reGroundCondition, reGround, landReGround } from "./native/organs/pathos.js";
import { findClaimCycle } from "./native/organs/reasoning-lint.js";
// Web organ: the pure half of search and page ingestion (extractReadable,
// parseSearchResults, extractUrls, normalizeUrl). The network egress lives
// inline below — the proxy is the one sanctioned crossing (P13).
import { extractReadable, parseSearchResults, extractUrls, normalizeUrl, WEB_SEARCH_MAX_RESULTS, looksLikeShell } from "./native/organs/web.js";
// The look organ (native/organs/look.js): the native "looking" capacity,
// ported from the fold's browser-side /visual machinery. CV (OpenCV boxes +
// per-region OCR) and OCR, a vision-model read, judge + escalation on
// disagreement, and a text→image render for text whose formatting the
// plain-text reader is reading wrong.
import { isImageFileName, lookAtImage, lookAtText, shouldLook, weirdFormattingScore } from "./native/organs/look.js";
import { MODEL_SERVER_URL } from "./native/kernel/model-server.js";
import { mechanicalRevision, variedDraw } from "./native/organs/variation.js";
import { styleGrade as strunkWhiteGrade } from "./native/organs/strunk-white.js";
import { pacingGrade as murchPacing } from "./native/organs/pacing.js";
import { storyShape as vonnegutShape } from "./native/organs/vonnegut.js";
import { classifyArc } from "./native/organs/story-shapes.js";
import { matchArchons, archonOf } from "./native/organs/archon-compendium.js";
import { naturalSizeRuleForTask, authorCorrectionRule } from "./native/organs/correction-rule.js";
import { voidHolarchy } from "./native/organs/void-holarchy.js";
import { createShapeRegister, reconsiderShape, repairStaleComposition } from "./native/organs/essay-shape-register.js";
import { buildClarify, recordRound, foldAnswersFromTask, SCHEMA as CLARIFY_SCHEMA, MAX_ROUNDS as CLARIFY_MAX_ROUNDS } from "./native/organs/build-clarify.js";
// The Charter organ (native/organs/charter.js, Handle: Grotius): governs
// generation against the Universal Declaration of Human Rights. The gate is
// ALWAYS armed — the full 516-language UN corpus when it is beside the
// checkout, a public-domain fallback excerpt otherwise — so a missing corpus
// never silently ungoverns the system. Never fires on descriptive voice
// (reading and talking about human atrocities passes by construction).
import { familyVerdict, familyAffordances, giveCharterFamily, configureGfp } from "./native/organs/charter.js";
import { groundFacts, holographType } from "./native/organs/output-holograph.js";
import { splitSentences as engineSplitSentences } from "./native/adapters/text/spans.js";
import { askShape } from "./native/organs/askshape.js";
import { createLemmatizer, morphologyFromPrior } from "./native/adapters/text/morphology.js";
import { constitution, ethosClear, requireClearance } from "./native/organs/ethos.js";
import { readInterlocutor, mergeInterlocutor } from "./native/organs/interlocutor.js";
import { speakDecline } from "./native/organs/socratic.js";
import { recordShadow, assessShadow, dispositionFrom } from "./native/kernel/moral-shadow.js";
import { judgeAskShape } from "./native/kernel/mayeroff.js";
import { sovereigntyHint, privacyFindings, isDataHoldingTask, sovereignSchemaPrompt, extractSovereignSchema, sovereignDataShell } from "./native/organs/privacy.js";
import { copyFindings, replicationNotes, provenanceFor, annotateWithSources } from "./native/organs/martial.js";
import { securityFindings } from "./native/organs/salzter.js";
import { blindspotFindings } from "./native/organs/blindspot.js";
import { piiFindings, redactPii } from "./native/organs/goffman.js";
import { injectionFindings } from "./native/organs/ulysses.js";
import { execFileSync } from "node:child_process";
// The earned cast — the per-turn instruction set. Vendored at the
// native/the-fold seam. PURE; the proxy feeds real conversation state and
// receives ONLY the cued facts for this turn. The mouth is never told it is
// playing a role: cueBundle's `mouth` is object-level facts alone.
import { classifySpeech, cueBundle, bannedHits } from "./native/the-fold/earned-cast.js";
// The durable theory of mind — type-level continuity about the person
// across sessions. SPECIFICS stay in the per-session chat history; this
// store holds only what the person has asserted and its standing.
import { loadSpeakerModel, saveSpeakerModel, updateSpeakerModel, durableFacts } from "./native/the-fold/speaker-model.js";
// The opencode lane (opencode-upstream.mjs): Claude/DeepSeek models a caller
// names are generated through `opencode serve`, never Ollama — same
// antistrauss gate, same draw contract, tools hard-disabled. Re-exported so
// proxy.mjs (roster, health) reads the same discovery cache the turns use.
import { upstreamModelFor, refreshOpencodeModels, opencodeReachable, OPENCODE_URL, streamOpencodeText, knownOpencodeModels } from "./opencode-upstream.mjs";
// The anthropic lane (anthropic-upstream.mjs): frontier Claude models served
// DIRECTLY by api.anthropic.com with ANTHROPIC_API_KEY — no `opencode serve`
// in between, so a token-usage comparison measures the frontier model, not
// the aggregator. Same gate, same draw contract, same heimdall account
// (ungated: no local VRAM, no keep-alive). Re-exported so proxy.mjs (roster)
// reads the same discovery cache the turns use.
import { upstreamAnthropicModelFor, refreshAnthropicModels, anthropicReachable, anthropicConfigured, ANTHROPIC_URL, streamAnthropicText, knownAnthropicModels } from "./anthropic-upstream.mjs";
// The snip hand (native/organs/verbatim-snip.js): a verbatim ask is SNIPPED
// from a public-domain primary source (Wikisource), never generated from
// weights. A settled snip is an observation and the observation wins; an
// unwired work is a named gap, never a guess dressed as a quotation. The
// complement of organs/quotes.js (Handle: Dai), which audits quotations
// already in an answer — this hand decides what the mouth never writes.
import { snipShape, cutSnip, formatQuote, DEFAULT_PASSAGE, MAX_SNIP_CHARS } from "./native/organs/verbatim-snip.js";
// THE GATE ON A FACT WITH NO GROUND (Heimdall/Ranke): a checkable open-now claim is
// grounded first (a declared web check) and, failing that, ships with one plain,
// dated sentence APPENDED (P186: a check may find, never overwrite). The SURGICAL
// gate (Wilson: the environment is the medium) strikes a sentence that commits to
// a value the environment's kind+link contradicts, and splices the mechanical
// replacement assembled from the kind and the link.
import { factShape, isUngroundedFact, decideGate, holderQueryFor, applyVerdictGate, possessiveOfficeAsk } from "./native/organs/fact-gate.js";
import { currentHolder } from "./native/organs/current-holder.js";
import { createCurrentFactsStore } from "./native/organs/current-facts.js";
import { lensForAsk } from "./native/adapters/text/fact-lenses.js";
export { upstreamModelFor, refreshOpencodeModels, opencodeReachable, OPENCODE_URL };
export { knownOpencodeModels } from "./opencode-upstream.mjs";
export { upstreamAnthropicModelFor, refreshAnthropicModels, anthropicReachable, anthropicConfigured, ANTHROPIC_URL };
export { knownAnthropicModels } from "./anthropic-upstream.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// GFP CHECKING for the Charter organ (2026-09-16): the checking side reads
// intent via a real grammar adapter (relations-positional.js + a measured
// RoleConfig@1/POS prior for English — native/priors/role-config-eng.json,
// native/priors/pos-en.json, both built from real UD_English-EWT data,
// never guessed), never raw-text-span matching. Configured once at module
// load; a missing prior file means every clause structurally REFUSES (no
// conflicts found) rather than crashing the turn — logged, never thrown.
try {
  configureGfp({
    roleConfig: JSON.parse(fs.readFileSync(path.join(HERE, "native/priors/role-config-eng.json"), "utf8")),
    posPrior: JSON.parse(fs.readFileSync(path.join(HERE, "native/priors/pos-en.json"), "utf8")),
  });
} catch (err) {
  console.error(`charter GFP config not loaded — the Family Gate will structurally refuse every clause until this is fixed: ${err.message}`);
}

// HOLOGRAPH TYPING's sameAct (the morphology prior's own same-act fold,
// injected into holographType on every generation — never a local guess).
// Missing prior: fold-equality, disclosed on the holograph_typing note, never
// a crash. Mirrors native/the-fold/reader-bundle.js's own lemmatizer load.
let holographSameAct = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
let holographSameActBasis = "fold-equality fallback (morphology prior not loaded)";
try {
  const holographMorphRaw = JSON.parse(fs.readFileSync(path.join(HERE, "native/priors/morphology-eng.json"), "utf8"));
  const holographMorphPrior = morphologyFromPrior(holographMorphRaw);
  holographSameAct = createLemmatizer(holographMorphPrior.forms, { language: holographMorphPrior.language }).sameAct;
  holographSameActBasis = `morphology-eng prior (${holographMorphPrior.language ?? "eng"})`;
} catch (err) {
  console.error(`holograph sameAct not loaded — fold-equality fallback until this is fixed: ${err.message}`);
}

const GIVER = "reader:eoreader7-proxy";
const CANONICALIZATION_FLOOR = 2;
const ANCHORING = (process.env.ER7_ANCHORING ?? "born") === "born"
  ? { born: true, bornActivationFloor: Number(process.env.ER7_BORN_ACTIVATION_FLOOR ?? 0.5), bornMarginFloor: Number(process.env.ER7_BORN_MARGIN_FLOOR ?? 0.3), minWindow: Number(process.env.ER7_BORN_MIN_WINDOW ?? 4) }
  : { minActivation: Number(process.env.ER7_MIN_ACTIVATION ?? 0.05), minMargin: Number(process.env.ER7_MIN_MARGIN ?? 0.2) };

// ── THE MODEL, NAMED — a giver with an identity, never an anonymous string.
// Every claim the model states is cited to THIS giver (the user's
// discipline: the model stating something is a giver that should be cited,
// with what we know about it — its name, its release, its home). The
// registry is data, not code: a caller who runs a different model replaces
// this entry and every citation renames the giver. 2026-09-21, user
// direction: olmo2:7b is gone from this machine and is the default of
// nothing — every ~15 min a scoped keep-resident ping was loading it at
// 6.2 GiB, and the daemon evicted the 2B chat model to make room, which
// was the reload storm. The one served model is gemma2:2b.
const MODEL_REGISTRY = Object.freeze({
  id: "gemma2:2b", // the Ollama id the proxy serves
  hf: "google/gemma-2-2b-it",
  hfUrl: "https://huggingface.co/google/gemma-2-2b-it",
  name: "Gemma 2 2B",
  family: "Gemma 2",
  org: "Google DeepMind",
  released: "2024-07-31",
  license: "Gemma Terms of Use",
  params: "2B",
  note: "decoder-only transformer, instruction-tuned; served locally via Ollama (Q4_0).",
  quant: "Q4_0",
});
export const MODEL_GIVER = (model) => {
  const m = String(model ?? "").replace(/^er7:/, "").replace(/:q\d+(_\d+)?$/, "");
  if (m === "gemma2:2b" || m === "gemma2:latest" || m === "gemma2:2b-instruct") return MODEL_REGISTRY;
  return { id: model ?? "?", hfUrl: null, name: String(model ?? "?") };
};
const DEFAULT_POS_PRIOR = path.join(HERE, "legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");

// The daemon's PRIVATE address (native/kernel/model-server.js): the runner's
// own draws go straight to it — the door already admitted them — never back
// through the channel on the conventional port.
export const OLLAMA = MODEL_SERVER_URL;

// Model warmth: Ollama unloads a model after its keep_alive window (default
// 5m), so an idle gap between turns pays a multi-GB cold-load on the next
// one — which is exactly the failure we just ate. Real request bodies carry a
// long keep_alive, and the proxy pings recently-used models on an interval
// (keepModelHot) so the load never drops between turns. In seconds.
// Heimdall's policy (2026-09-17): DO NOT EVICT. Multiple systems (the er7
// proxy, the fold surfaces, code jobs) hit the same local models, and every
// eviction pays a cold-load that stalls the next caller's turn — so a model
// that has served a turn is held resident by default instead of being
// dropped on Ollama's 5m clock. The one legitimate eviction — a user who
// explicitly ASKED for a particular model — is not wired up yet, so until it
// is, the default is to hold. ER7_KEEP_ALIVE_S overrides; 0 forces the old
// drop-on-idle behavior. The server-side OLLAMA_KEEP_ALIVE (set by
// setup-proxy.sh) backs the same rule at the daemon, so a caller that skips
// the proxy still gets the hold.
export const OLLAMA_KEEP_ALIVE_S = Number(process.env.ER7_KEEP_ALIVE_S ?? 3600);

// --- feature toggles (defaults: hyperlexicon ON, wikipedia enrichment OFF,
//     web search OFF — the proxy is the sanctioned egress, P13) -------------
const HYPERLEXICON_ON = (process.env.ER7_HYPERLEXICON ?? "1") !== "0";
const WIKIPEDIA_ON = (process.env.ER7_WIKIPEDIA ?? "1") === "1"; // on by default: the hyperlexicon's Wiktionary/Wikipedia enrichment grounds compositions
// Wikisource door: the hyperlexicon's terms can point at a PUBLIC-DOMAIN
// PRIMARY TEXT (a work, an author, a speech, a treaty). Wikipedia gives a
// summary of what a term is; Wikisource gives the work itself — the primary
// bytes the relations should be read against. When a composition term
// resolves to a Wikisource page, the FULL text is admitted to the corpus
// (same door as a web source), so the reading absorbs the primary source,
// not a secondhand digest. Off unless a term actually resolves there.
const WIKISOURCE_ON = (process.env.ER7_WIKISOURCE ?? "1") === "1";
const WIKI_MAX_CONCEPTS = Number(process.env.ER7_WIKI_MAX_CONCEPTS ?? 3);
const WIKI_TIMEOUT_MS = Number(process.env.ER7_WIKI_TIMEOUT_MS ?? 3500);
const WEB_SEARCH_ON = (process.env.ER7_WEB_SEARCH ?? "0") === "1";
const WEB_MAX_PAGES = Number(process.env.ER7_WEB_MAX_PAGES ?? 3);

// THE NON-MOVING EDIT CUT (2026-09-21): a rewrite whose content tokens are
// ~identical to the section it replaces is a NO-OP, not a fix — the
// degenerate-loop guard (ranke_nonmove). The ratio is DECLARED (P9: budgets
// named, never tuned): a rewrite sharing 90%+ of its content tokens with the
// original moved nothing.
const NON_MOVING_EDIT_RATIO = 0.9;

/** Token Jaccard similarity — the shared-content fraction of two texts,
 * folded to lowercase content tokens. 0 = no shared token, 1 = identical. */
function similarity(a, b) {
  const toks = (s) => new Set(String(s ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2));
  const A = toks(a), B = toks(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

const wikiSummaryCache = new Map();

async function wikipediaSummary(term) {
  if (wikiSummaryCache.has(term)) return wikiSummaryCache.get(term);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/ /g, "_"))}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const data = await res.json();
    const extract = (data.extract ?? "").replace(/\s+/g, " ").trim();
    const snippet = extract.length > 280 ? `${extract.slice(0, 277)}...` : extract;
    const out = snippet || null;
    wikiSummaryCache.set(term, out);
    return out;
  } catch (err) {
    const out = null;
    wikiSummaryCache.set(term, out);
    return out;
  } finally {
    clearTimeout(t);
  }
}

async function enrichFromWikipedia(composition, maxConcepts = WIKI_MAX_CONCEPTS) {
  if (!WIKIPEDIA_ON || !composition?.length) return [];
  const scored = [...composition]
    .sort((a, b) => (b.meta?.independentSupport ?? 0) - (a.meta?.independentSupport ?? 0))
    .slice(0, maxConcepts);
  const terms = [...new Set(scored.map((e) => String(e.left || e.right || "").trim()).filter(Boolean))].slice(0, maxConcepts);
  const summaries = await Promise.all(terms.map(async (term) => ({ term, snippet: await wikipediaSummary(term) })));
  return summaries.filter((s) => s.snippet);
}

// When the corpus surf returns void, try a web search as a factual ground.
// Classifies what kind of thing is absent: an entity (person/org/place), an
// event (something that occurred), or a fact (atemporal property/relation).
// Used to compose ontologically-specific void text rather than a generic signal.
function classifyAbsent(task) {
  const t = String(task ?? "");
  const tl = t.toLowerCase();
  // Event: named occurrences, agreements, conflicts, temporal happenings
  if (/\b(accord|treaty|agreement|ceasefire|armistice|pact|war|battle|conflict|siege|invasion|uprising|revolution|coup|summit|conference|congress|convention|crisis|incident|disaster|outbreak|epidemic|pandemic|collapse|crash|founding|signing|launch|ceremony|referendum|election|assassination|massacre|embargo)\b/i.test(t)) return "event";
  if (/\b(that (?:ended|began|started|occurred|happened|took place|was signed|was held|resolved|established)|which (?:ended|began|started|occurred))\b/i.test(tl)) return "event";
  // Entity: named individuals, organisations, places
  if (/\bwho (?:is|was|are|were)\b/i.test(tl)) return "entity";
  if (/\b(?:dr|prof|professor|senator|mayor|ceo|president|general|colonel|admiral|minister|chancellor|director|founder|scientist|researcher|activist|philosopher|author|artist)\b[.\s]/i.test(t)) return "entity";
  if (/\b(?:what (?:is|are|was|were) .{0,30}(?:known for|famous for|most notable|greatest achievement|research contribution))\b/i.test(tl)) return "entity";
  // Fact: attributions, properties, relations, verifications
  return "fact";
}

// Builds a void assertion that names the ontological category of the absence
// (entity / event / fact) × the reason for it (never furnished / searched and
// absent / confirmed absent across sources) × the grain (unverified / probable).
function buildVoidText({ what = "fact", why = "searched_absent", grain = "unverified", query = null } = {}) {
  const src = query ? ` (a search for "${query}" also found nothing)` : "";
  if (grain === "probable" || grain === "certain") {
    // Two independent sources agree — name the ontological conclusion.
    if (what === "entity") return `No record of this person or entity appears in any source checked${src}. This appears to be fictitious or non-existent.`;
    if (what === "event")  return `No record of this event exists in any source checked${src}. This event may not have occurred.`;
    return                        `No source confirms this${src}. This may be unverifiable or false.`;
  }
  if (why === "no_material") {
    if (what === "entity") return "No material on this person or entity was provided to this reading session.";
    if (what === "event")  return "No material about this event was provided to this reading session.";
    return                        "No material touching this question was provided to this reading session.";
  }
  // searched_absent — corpus was furnished and searched, thing simply not there
  if (what === "entity") return "The material provided has nothing on this person or entity.";
  if (what === "event")  return "The material provided contains nothing about this event.";
  return                        "The material provided does not address this.";
}

// A hard egress gate cannot hinge on a spelling fact. The old extractor only
// hunted when the task contained a CAPITALISED noun phrase — a void about
// "brownian motion" or "the history of sewing machines" stayed unsearched, and
// a void phrased in all-caps was equally invisible. The subject of a void is
// chosen by CONTENT WORDS (case-insensitive); capitalization only breaks a
// tie. And a web hunt is an EGRESS, so it answers to the one sanctioned egress
// toggle (WEB_SEARCH_ON, P13) — never to the Wikipedia-enrichment toggle.
const VOID_STOPWORDS = new Set(
  ("the a an and or but of in on at to for with by from is are was were be been being am do does did has have had " +
   "what which who whom whose when where why how this that these those it its he she him her they them we us you your " +
   "i my me our their please can could will would should shall may might about into over under there then than as so nor").split(" ")
);

// selectVoidQuery(task) — the most specific subject phrase to search for,
// chosen without depending on case: the longest run of content words wins, a
// mixed-case word only breaks a tie. Capped so a search stays a search.
function selectVoidQuery(task) {
  const tokens = String(task ?? "").split(/\s+/).filter(Boolean);
  const words = tokens.map((t) => t.replace(/[^a-zA-Z0-9'-]/g, ""));
  const content = words.map((w) => w.length > 2 && !VOID_STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));

  const runs = [];
  let start = -1;
  for (let i = 0; i <= words.length; i++) {
    if (i < words.length && content[i]) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }

  let best = null;
  let bestScore = -1;
  for (const [a, b] of runs) {
    const caps = words.slice(a, b + 1).filter((w) => /[A-Z]/.test(w) && /[a-z]/.test(w)).length;
    const score = (b - a + 1) * 3 + caps;
    if (score > bestScore) { best = [a, b]; bestScore = score; }
  }

  if (!best) {
    // No content-word run — fall back to the longest single content word.
    const singles = words.map((w, i) => (content[i] ? { w, i } : null)).filter(Boolean);
    if (!singles.length) return null;
    best = [singles.reduce((m, s) => (s.w.length > m.w.length ? s : m)).i];
    best = [best[0], best[0]];
  }

  return words.slice(best[0], best[1] + 1).slice(0, 6).join(" ").trim() || null;
}

// Extracts the first meaningful search-result snippets from DuckDuckGo without
// fetching full pages. Zero results confirms the void; real snippets become the
// material block. Skips conversational-referent questions ("you mentioned…")
// where the named referent is a session artifact, not a real-world entity.
async function voidWebSearchFallback(task, { force = false } = {}) {
  // `force`: the caller has DECLARED this search (a checkable open-now fact with
  // no ground, and the person's per-request web consent) — the env toggle is the
  // process-wide default, never the only door.
  if (!WEB_SEARCH_ON && !force) return null;
  const text = String(task ?? "");
  if (/\b(you mentioned|earlier you|i told you|we discussed|you said|in (?:our|this) (?:conversation|session|chat))\b/i.test(text)) return null;

  const query = selectVoidQuery(text);
  if (!query) return null; // nothing findable to look up — leave the plain void assertion

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, { signal: ctrl.signal, headers: { "user-agent": "eoreader7-proxy" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();

    // Extract result snippets — the short descriptive text DDG shows under each title.
    const snippets = [];
    const snippetRe = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = snippetRe.exec(html)) && snippets.length < 3) {
      const s = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (s.length > 20) snippets.push(s);
    }
    // No snippets found — the web itself has nothing on this entity.
    // Return a typed void rather than null so the call site can express it.
    if (!snippets.length) return { found: false, query };
    return { found: true, query, text: `From a search for "${query}":\n${snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}` };
  } catch {
    return null; // network error — leave the plain void assertion
  }
}

// ── THE CURRENT-FACTS ENVIRONMENT (Wilson, 2026-09-19) ────────────────────
// One store per process, one file on disk: kinds, their dated links, and the
// stigmergic trails of the hops that found them. Every turn, every surface
// reads the SAME environment. The refresh job re-checks stale links through
// the live doors (the dated record for a kind with a jurisdiction, the web
// search otherwise) and deposits the outcome as a trail.
const FACTS_REFRESH_MS = 6 * 60 * 60 * 1000; // every 6 hours, when the web door is on
const FACTS_BOOT_DELAY_MS = 5000;
let _factsStore = null;
function currentFactsStore() {
  if (!_factsStore) {
    _factsStore = createCurrentFactsStore({
      file: process.env.ER7_FACTS_FILE ?? path.join(HERE, "state", "current-facts.json"),
      search: WEB_SEARCH_ON ? voidWebSearchFallback : null,
      lensForAsk,
    });
    if (WEB_SEARCH_ON) {
      setTimeout(() => { _factsStore.refreshStale({ ttlDays: 30, datedLookup: currentHolder }).catch(() => {}); }, FACTS_BOOT_DELAY_MS).unref?.();
      setInterval(() => { _factsStore.refreshStale({ ttlDays: 30, datedLookup: currentHolder }).catch(() => {}); }, FACTS_REFRESH_MS).unref?.();
    }
  }
  return _factsStore;
}

// ── residency ping during blocking setup ─────────────────────────────────
// Ollama unloads a model after its keep_alive window (5m default). A
// long-form job's setup (Gore gather + Wikisource admission) can run longer
// than that BEFORE the first draw, so the first draw cold-loads and can blow
// a job timeout. This is NOT keep-warm (ER7_KEEP_ALIVE_S stays 0): it is a
// scoped ping that runs only while setup is actively working, and the caller
// clears it when done. Returns the timer handle.
function keepResidentDuringSetup(model = MODEL_REGISTRY.id) {
  // the job's own model, never a hard-coded one: the old "olmo2:7b" here
  // loaded a 6.2 GiB model every long-form setup and evicted the chat model
  let running = false;
  const ping = async () => {
    if (running) return;
    running = true;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "OK" }],
          stream: false, num_predict: 1,
          keep_alive: "1200s", // keep the load alive past the setup's tail
        }),
      });
      clearTimeout(t);
    } catch { /* best effort — the next draw warms it anyway */ }
    finally { running = false; }
  };
  ping();
  return setInterval(ping, 120000); // every 2 minutes while setup runs
}

// ── Wikisource: the hyperlexicon's primary-source door ───────────────────
// Wikipedia gives a summary; Wikisource gives the WORK. The reliable API for
// a full public-domain text here is `action=parse&prop=text` (with
// redirects + disablepp): it resolves transclusions (a Wikisource work page
// is a container of Page: namespace leaves) and returns the rendered HTML,
// which we strip to plain text. Resolved by title first (a term IS the work's
// name), then by search (a term is an author or a concept a work covers).
// Returns null when nothing resolves — never a model guess.
const wikisourceCache = new Map();
const WIKISOURCE_BASE = "https://en.wikisource.org/w/api.php";
const WIKISOURCE_MAX_CHARS = Number(process.env.ER7_WIKISOURCE_MAX_CHARS ?? 60000);
// ONLY SALIENT CONTENT IS EOT-IZED (2026-09-13): the reader is a
// sentence-by-sentence instrument whose cast re-projection re-derives the
// whole cast on a declared cadence, so stepping a 200KB page whole is
// O(prefix × cast²) — measured: two Wikipedia-scale pages pegged the CPU at
// ~99% for ~20 minutes before section 1. The FULL page text is still
// retained on the shadow (S101 recoverable) and admitted to the corpus for
// surf; this budget bounds only the EOT-ize READ window.
const EOT_MAX_CHARS = Number(process.env.ER7_EOT_MAX_CHARS ?? 60000);

async function wikisourceText(term, { maxChars = WIKISOURCE_MAX_CHARS } = {}) {
  const key = `${term}:${maxChars}`;
  if (wikisourceCache.has(key)) return wikisourceCache.get(key);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), WIKI_TIMEOUT_MS);
  const parsePage = async (title) => {
    const u = new URL(WIKISOURCE_BASE);
    u.searchParams.set("action", "parse");
    u.searchParams.set("page", title);
    u.searchParams.set("prop", "text");
    u.searchParams.set("redirects", "1");
    u.searchParams.set("disablepp", "1");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    const res = await fetch(u, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error || !data.parse?.text) return null;
    const html = String(data.parse.text);
    const text = htmlToText(html);
    if (!text) return null;
    return { title: data.parse.title ?? title, text: text.slice(0, maxChars) };
  };
  const fetchSearch = async (term) => {
    const u = new URL(WIKISOURCE_BASE);
    u.searchParams.set("action", "query");
    u.searchParams.set("list", "search");
    u.searchParams.set("srsearch", term);
    u.searchParams.set("srlimit", "3");
    u.searchParams.set("format", "json");
    u.searchParams.set("formatversion", "2");
    const res = await fetch(u, { signal: controller.signal, headers: { "user-agent": "eoreader7-proxy" } });
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.query?.search?.[0];
    return hit && !hit.missing ? await parsePage(hit.title) : null;
  };
  try {
    // 1) The term IS the title (a work's name, an author's page). 2) Failing
    // that, a search for the term as a subject. Only a page that actually
    // exists on Wikisource resolves.
    let out = (await parsePage(term)) ?? (await fetchSearch(term));
    wikisourceCache.set(key, out);
    return out;
  } catch (err) {
    wikisourceCache.set(key, null);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Strip rendered HTML to plain text — the same fold the web fetcher applies
// to ordinary pages. Tables, notes, and interwiki links collapse to their
// visible text; the result is the work's prose, whitespace-folded.
function htmlToText(html) {
  const withoutNotes = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const text = withoutNotes
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>|<\/td>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#0*160;|&#x0*[aA]0;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#0*39;|&#x0*27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      // Numeric character references beyond the named few above (measured
      // live: `&#32;` padding inside Wikisource verse lines leaked into a
      // snip). Decimal + hex, BMP only — astral refs are out of scope.
      .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 65536 ? String.fromCharCode(c) : " "; })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { const c = parseInt(h, 16); return c > 0 && c < 65536 ? String.fromCharCode(c) : " "; })
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Drop Wikisource's own scaffolding lines (nav, page numbers, headers) and
  // the style blocks MediaWiki inlines (the .mw-… and .wst-… classes carry no
  // prose). Only the work's words should reach the reading.
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\.?(mw|wst)-/i.test(l) && !/^(page|header|footer|edit|jump to|wikisource)/i.test(l) && !/for works with similar titles/i.test(l))
    .join("\n");
}

// ── EOT-ize only the salient, at multiple resolutions ──────────────────────
// Stepping every sentence of every fetched page through the reader bloats the
// holograph with irrelevant material. Resolution levels, coarse to fine:
//   NONE   — the page shares no salient token with the task: bytes retained
//            (S101 recoverable) but NOT admitted to the reading — it is
//            ignored. The reading does not absorb what it does not need.
//   COARSE — the page shares salient tokens with the task: step it through
//            the reader (build surfaces/referents/notes) so surf can address
//            it — but only the sentences that actually relate (fine EOT-ize
//            of the related stretches, not the whole page blindly).
//   FINE   — the page is on-task AND moves the reading (expectation effects
//            / REC): fully EOT-ized.
// And the FORGET path: a page that was admitted but added nothing is marked
// forgotten — its corpus text stops reaching surf and its reading admission
// is superseded. Forgetting is a decision, recorded like every other.
const RESOLUTION_NONE = "none", RESOLUTION_COARSE = "coarse", RESOLUTION_FINE = "fine";

// Coarse screen: how much of the task's content-bearing vocabulary appears in
// the page? A page that shares < SALIENCE_MIN of the task's distinctive words
// is not about the task — retain, don't read.
function salienceOf(pageText, task) {
  const taskWords = new Set(String(task).toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3));
  if (!taskWords.size) return { score: 1, shared: [], taskWords: 0, resolution: RESOLUTION_FINE };
  const lower = String(pageText).toLowerCase();
  const shared = [...taskWords].filter((w) => lower.includes(w));
  return { score: shared.length / taskWords.size, shared, taskWords: taskWords.size, resolution: RESOLUTION_NONE };
}

// The decision, from the screen: retain-then-read, retain-only, or forget.
function resolutionFor(score, sharedCount, { coarseAt = 0.2, fineAt = 0.6 } = {}) {
  if (score >= fineAt) return RESOLUTION_FINE;
  if (score >= coarseAt && sharedCount >= 1) return RESOLUTION_COARSE;
  return RESOLUTION_NONE;
}

// THE COMPOSITION-SURF SALIENCE GATE (2026-09-17, measured). A multi-source
// artifact surfaces one windowed segment per corpus document — but "per
// document" must mean per SALIENT document. Before this gate the composition
// surf iterated every retained doc in insertion order: a stale Wikisource
// page admitted turns earlier was surfaced for a haiku about debugging and
// its six gun-legislation title variants filled the poem's Sources appendix.
// Salience is membership in the task's vocabulary — the same coarse screen
// salienceOf() applies at fetch time, applied HERE at surf time against THIS
// task. A doc that failed its own fetch's screen, or was fetched for a
// different task, is no one's source for this artifact. A doc that never
// passes a salience gate is never surfaced, never cited, never quoted.
export function salientDocsForTask(docs, task, { maxSegments = SURF_MAX_SEGMENTS } = {}) {
  const out = [];
  for (const [sourceId, doc] of (docs ?? new Map()).entries()) {
    if (isConversationSource(sourceId)) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text || text.length < 50) continue;
    const sal = salienceOf(text, task);
    // salienceOf always tags RESOLUTION_NONE — the DECISION is
    // resolutionFor's, exactly as the web intake applies it at fetch time.
    const resolution = resolutionFor(sal.score, sal.shared.length);
    if (resolution === RESOLUTION_NONE) continue;
    out.push({ sourceId, text, score: sal.score, shared: sal.shared.length });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, maxSegments);
}

// PROVENANCE STAMP (2026-09-17, the audit trail). Every corpus admission
// carries who admitted it: the turn, the task, the task's terms, and the
// salience that earned it. Stamps are what make Roberts scoping (a doc is
// citable under the hypothesis family that introduced it) and Atta decay
// (reinforce on use, evaporate otherwise) implementable — and they make the
// record answer "which turn left THIS behind?" without a forensic dig.
function stampAdmission(session, srcId, { task, salience, resolution, kind }) {
  try {
    const doc = session.corpus?.documents?.get(srcId);
    if (!doc) return;
    doc._admitted = {
      turn: session.turnCount,
      task: String(task ?? "").slice(0, 200),
      terms: [...new Set(String(task ?? "").toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 3))].slice(0, 20),
      salience: Number(salience ?? 0),
      resolution: resolution ?? null,
      kind: kind ?? "web",
      at: new Date().toISOString(),
    };
  } catch { /* a stamp failure never fails a turn */ }
}

// The source id behind a surfaced segment, however the path that surfaced it
// named it (composition surf's `_ledger.source`, the one-shot ladder's
// `source_id`, the field recall's `_ledger.source`).
const segmentSourceOf = (s) => s?._ledger?.source ?? s?.source_id ?? s?.source ?? null;

// NL FILE MENTIONS — interacting WITH a file qua file, while the mouth is
// only ever fed bytes. The operator names a file in plain language ("what
// does foo.js do?", "in package.json…", "@src/bar.ts"); the SYSTEM resolves
// the mention mechanically against the declared workspace root (or the
// attachment names), admits the real bytes as a file-scoped corpus doc, and
// carries the file's identity in the record (_ledger.source,
// turnUsedSourceIds → cite.js attaches post-hoc → facing page shows the
// file). The mouth never receives a filename from the system — only the
// surfaced byte content "as if from nowhere", plus whatever names the USER
// itself typed in its own question (the question, not system inventory).
// A mention that resolves to nothing is a typed gap (file_missing), never a
// guess; a mention of a binary/refused kind is file_unreadable, never
// invented contents. Bounded: a handful of mentions, each size-capped.
const NL_MENTION_MAX = 5;
function extractNlFileMentions(task) {
  const text = String(task ?? "");
  const found = [];
  const push = (raw) => {
    const c = String(raw ?? "").trim().replace(/^[@"'`“”‘’<([]+/, "").replace(/[.,;:!?"'`“”‘’>)\]]+$/, "").trim();
    if (!c || c.length > 256 || /\s/.test(c)) return;
    // A file mention is path-shaped: has a slash, or a dot-extension tail.
    // A bare word ("package") is not a file; "package.json" is.
    if (!c.includes("/") && !/\.[A-Za-z0-9]{1,5}$/.test(c)) return;
    if (!found.includes(c)) found.push(c);
  };
  // @path mentions first (explicit addressing), then backticked, then
  // double-quoted, then bare path-shaped tokens. Class order encodes
  // explicitness (an @-address outranks an incidental filename), not text
  // position. The @ form requires a separator before it, so an email
  // address (user@example.com — @ mid-word) is never a file mention.
  // Token classes are unicode-aware (\p{L}\p{N}): a filename is whatever
  // the filesystem holds, not ASCII.
  for (const m of text.matchAll(/(^|[\s([])@([\p{L}\p{N}_.\-+/\\]{2,200})/gu)) push(m[2]);
  for (const m of text.matchAll(/`([^`]{1,200})`/g)) push(m[1]);
  for (const m of text.matchAll(/"([^"]{1,200})"/g)) push(m[1]);
  for (const m of text.matchAll(/(^|[\s([])([\p{L}\p{N}_.\-]+\/[\p{L}\p{N}_.\-+/\\]{1,180}|[\p{L}\p{N}_.\-]+\.[A-Za-z0-9]{1,5})(?=[\s)\].,;:!?]|$)/gu)) push(m[2]);
  return found.slice(0, NL_MENTION_MAX);
}

// Resolve one mention to a real file strictly inside the workspace root.
// Same physics as code-loop.js::resolveRealFile: real bytes or a typed gap,
// never a name spoken into existence.
function resolveMentionedFile(absRoot, mention) {
  const clean = String(mention ?? "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
  if (!clean || clean.includes("..")) return { ok: false, gap: { kind: "invalid_path", reason: `"${mention}" escapes the workspace` } };
  let root;
  try { root = fs.realpathSync(path.resolve(absRoot)); } catch { return { ok: false, gap: { kind: "no_workspace", reason: "workspace root is not readable" } }; }
  let resolved;
  try { resolved = fs.realpathSync(path.resolve(root, clean)); } catch { return { ok: false, gap: { kind: "file_missing", reason: `no such file: ${clean}` } }; }
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return { ok: false, gap: { kind: "invalid_path", reason: `"${clean}" resolves outside the workspace` } };
  }
  let stat;
  try { stat = fs.statSync(resolved); } catch { return { ok: false, gap: { kind: "file_missing", reason: `no such file: ${clean}` } }; }
  if (!stat.isFile()) return { ok: false, gap: { kind: "not_a_file", reason: `"${clean}" is not a file` } };
  const rel = resolved.slice(root.length).replace(/^\//, "");
  if (!isTextFile(rel)) return { ok: false, gap: { kind: "file_unreadable", reason: `"${rel}" is not a readable text kind — its contents are not invented`, rel } };
  if (stat.size > MAX_FILE_CHARS) return { ok: false, gap: { kind: "file_too_large", reason: `"${rel}" is larger than the bounded read window`, rel } };
  return { ok: true, rel, abs: resolved, size: stat.size, mtimeMs: stat.mtimeMs };
}

// FILE ACTIVATION — the session's own pointing history (Atta's discipline:
// trails evaporate unless reinforced). Every file the session admits,
// surfaces, or resolves a mention against is touched with the current turn;
// ranking at read time scores count against age (count / (1 + age)), so a
// file touched often and recently outranks a file touched once long ago.
// This is what lets "it", "that file", "the config" resolve to what the
// operator is actually pointing at — the record's own history, never a
// model guess, never a filename handed to the mouth.
function touchFileActivation(session, sourceId, kind) {
  try {
    const sid = String(sourceId ?? "");
    if (!sid || sid.startsWith("chat:") || sid.startsWith("proxy:session:")) return;
    if (!session.fileActivation) session.fileActivation = new Map();
    const prev = session.fileActivation.get(sid) ?? { count: 0, lastTurn: 0, kinds: [] };
    prev.count += 1;
    prev.lastTurn = session.turnCount ?? 0;
    if (kind && !prev.kinds.includes(kind)) prev.kinds.push(kind);
    session.fileActivation.set(sid, prev);
  } catch { /* activation must never break a turn */ }
}

function rankFileActivation(session, { kindFilter = null, limit = 3 } = {}) {
  const now = session.turnCount ?? 0;
  const out = [];
  for (const [sourceId, a] of (session.fileActivation ?? new Map()).entries()) {
    if (kindFilter && !kindFilter(sourceId)) continue;
    // Dead trails stay dead: a source evicted from the corpus no longer
    // names anything pointable.
    if (session.corpus && !session.corpus.documents.has(sourceId)) continue;
    out.push({ sourceId, score: (a.count ?? 0) / (1 + Math.max(0, now - (a.lastTurn ?? 0))) });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, limit);
}

// Basename fallback: "package.json" for "pkg/sub/package.json" — ranked by
// activation so a repeated name resolves to the file in play, never by
// directory luck. Exact rel-path resolution above always wins; this only
// runs on its typed miss.
function resolveBasenameMention(session, mention) {
  const base = String(mention ?? "").replace(/\\/g, "/").split("/").pop();
  if (!base) return null;
  const cands = rankFileActivation(session, { limit: 25 }).filter((c) =>
    String(c.sourceId).replace(/\\/g, "/").split("/").pop() === base ||
    String(c.sourceId).split("::")[0].endsWith(`/${base}`) ||
    String(c.sourceId).split("::")[0] === base);
  return cands.length ? cands[0].sourceId : null;
}

// Anaphoric file reference: "what does it do?", "that file", "the config",
// "the test", "the source". Returns a kind filter (or null for the bare
// "it/that file" = whatever is most active), never a guess at content.
const ANAPHOR_RE = /\b(it|this file|that file|the file|these files|those files|the config|the test|the tests|the source|the doc|the readme)\b/i;
function anaphorKindFilter(task) {
  const t = String(task ?? "").toLowerCase();
  if (/\bconfig\b|\bpackage\.json\b/.test(t)) return (sid) => /(^|\/)package\.json$|config|\.json$|\.ya?ml$|\.toml$/i.test(String(sid).split("::")[0]);
  if (/\btests?\b|\bspec\b/.test(t)) return (sid) => /test|spec|e2e/i.test(String(sid).split("::")[0]);
  if (/\breadme\b|\bdocs?\b/.test(t)) return (sid) => /readme|\.md$|\.txt$/i.test(String(sid).split("::")[0]);
  if (/\bsource\b|\bcode\b|\bscript\b/.test(t)) return (sid) => /\.(m?js|ts|py|mjs)$/i.test(String(sid).split("::")[0]);
  return null; // bare "it/that file": most-active file, whatever kind
}

// Exported for tests: the NL file mechanics are pure/mechanical (extract,
// resolve, rank), never model judgments — so they are pinned like
// parseProposal/parseAction, not left to integration luck.
export { extractNlFileMentions, resolveMentionedFile, touchFileActivation, rankFileActivation, resolveBasenameMention, anaphorKindFilter, ANAPHOR_RE, NL_MENTION_MAX };

// ── shell detection via pyodide's HTMLParser (structural, not regex) ───────
// The regex `looksLikeShell` on the TEXT face catches the "couldn't load"
// apology. But a shell can hide behind a normal text face — its STRUCTURE is
// the tell: a real article has text-bearing block elements (p, article,
// section, h1-h6, li, td) with real content; a JS/error shell is dominated by
// script, iframe, svg, and boilerplate divs that hold the loader message.
// This reads the DOM with Python's stdlib HTMLParser (no bs4 wheel needed;
// the shared pyodide runtime is already warm from postprocess.mjs), and
// returns a typed verdict. Cached + timeboxed so a slow parse never stalls a
// fetch; on any pyodide failure it falls back to "unknown" (the regex
// already ran) rather than blocking the harvest.
let _shellVerdict = null;
async function pyodideShellVerdict(html) {
  if (!html || html.length > 3_000_000) return { shell: false, basis: "declined" };
  try {
    const py = await getPyodide();
    const key = `__shell_${(Math.random() * 1e9) | 0}`;
    py.globals.set(key, html);
    py.runPython(`
from html.parser import HTMLParser
import re

class T(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = 0
        self.text_chars = 0
        self.block_chars = {}
        self.script = 0
        self.iframe = 0
        self.svg = 0
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "iframe", "svg", "canvas", "noscript", "template"):
            self.depth += 1
            if tag == "script": self.script += 1
            if tag == "iframe": self.iframe += 1
            if tag == "svg": self.svg += 1
        elif tag in ("p", "article", "section", "h1", "h2", "h3", "h4", "li", "td", "blockquote", "pre", "figcaption"):
            self.block_chars[tag] = self.block_chars.get(tag, 0)
    def handle_startendtag(self, tag, attrs):
        pass
    def handle_endtag(self, tag):
        if tag in ("script", "style", "iframe", "svg", "canvas", "noscript", "template"):
            self.depth = max(0, self.depth - 1)
    def handle_data(self, data):
        if self.depth == 0:
            s = re.sub(r"\\s+", " ", data).strip()
            self.text_chars += len(s)
`)
    py.runPython("__t = T(); __t.feed(" + key + "); __verdict = __t")
    const t = py.globals.get("__verdict");
    const textChars = t.text_chars;
    const scripts = t.script, iframes = t.iframe, svgs = t.svg;
    const text = textChars || 0;
    // A shell: the page is DOMINATED by loader machinery (script/iframe/svg)
    // with no real article text outside it. A real page's text lives in
    // paragraphs; a shell's text lives in the error/loader divs. Structure
    // dominates: scripts+iframes+svgs >= 2 with thin text is a shell.
    let shell = false;
    let basis = "content";
    const machinery = scripts + iframes + svgs;
    if (text < 400 && machinery >= 2) { shell = true; basis = `shell: ${text} text chars vs ${scripts} scripts, ${iframes} iframes, ${svgs} svgs`; }
    else if (text < 150 && machinery >= 1) { shell = true; basis = `thin-shell: ${text} chars, ${machinery} script/iframe/svg element(s)`; }
    else if (text < 250 && scripts >= 2) { shell = true; basis = `loader-shell: ${text} chars, ${scripts} scripts`; }
    try { _shellVerdict = { shell, basis, textChars: text, scripts, iframes, svgs }; } catch {}
    return { shell, basis, textChars: text, scripts, iframes, svgs };
  } catch (err) {
    return { shell: false, basis: `pyodide unavailable: ${err.message}`, declined: true };
  }
}

// ── web search organ: Gore, the proxy's one sanctioned egress (P13) ────────
// Searches DuckDuckGo (no key), fetches pages, extracts readable text, and
// admits the results as chunks into the same corpus session as workspace files.
// The web material then flows through the exact same grounding ladder (surf,
// fold, resolutions) as local files — no separate path, no model compression.
//
// Gore is ITERATIVE, bounded by a DMD boundary (gore.js): gather is capped
// where additional results stop adding reach; a composition calls back with
// cueGoDeeper for a theme the piece needs, and doubleCheck on a claim's atoms.
async function searchAndAdmitWeb(session, sessionId, query, onNote, { move = "gather", maxPages = WEB_MAX_PAGES, webConsent = false } = {}) {
  if ((!WEB_SEARCH_ON && !webConsent) || !query.trim()) return { searched: false, pages: 0, chars: 0 };
  const started = Date.now();
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  let searchHtml;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(searchUrl, { signal: ctrl.signal, headers: { "user-agent": "the-fold-explore/0.1 (local research instrument; one page per explicit request)" } });
    clearTimeout(t);
    if (!res.ok) throw new Error(`search ${res.status}`);
    searchHtml = await res.text();
  } catch (err) {
    if (onNote) onNote({ move: "web_error", detail: err.message });
    return { searched: true, pages: 0, chars: 0, error: err.message };
  }
  // Minimal search result parsing: extract links and snippets from DDG HTML.
  const results = [];
  const seen = new Set();
  const re = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(searchHtml)) && results.length < 12) {
    let href = m[1];
    if (/[?&]uddg=([^&]+)/.test(href)) {
      try { href = decodeURIComponent(href.match(/[?&]uddg=([^&]+)/)[1]); } catch { continue; }
    }
    if (!/^https?:\/\//i.test(href) || /duckduckgo\.com\//.test(href)) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    results.push({ url: href, title: m[2].replace(/<[^>]+>/g, "").trim() });
  }
  if (!results.length) {
    if (onNote) onNote({ move: "web_no_results" });
    return { searched: true, pages: 0, chars: 0 };
  }
  // Source tiering: prefer encyclopedic / primary sources (Wikipedia as an
  // INDEX, then journals, .gov/.edu, primary orgs) over essay-mills and
  // content farms. The user's rule: Wikipedia is an index, primary sources
  // are the material. A page about WRITING essays (earthreminder's
  // "dolphin-essay-in-english") poisons a composition — the model starts
  // writing about writing. Tier 0 = preferred, tier 2 = last resort.
  const tierOf = (url, title = "") => {
    const t = String(title ?? "").toLowerCase();
    const h = String(url ?? "").toLowerCase();
    if (/wikipedia\.org|wikisource|wiktionary/.test(h)) return 0; // index — preferred entry
    if (/\.(gov|edu)\b/.test(h) || /pmc\.ncbi|pubmed|nature\.com|science\.org|doi\.org|sciencedirect|springer|plos|mdpi|frontiersin/.test(h)) return 0; // primary/peer-reviewed
    if (/essay|gradesfixer|studymode|bartleby|coursehero|chegg|brainly|examples\.com|templates\.|articlewriting|essaywriting|writinghelper/.test(t)) return 2; // essay-mill — poisons compositions
    if (/\.org|\.io|museum|national|foundation|university|institute/.test(h)) return 1; // institutional
    return 1;
  };
  results.sort((a, b) => (tierOf(a.url, a.title) - tierOf(b.url, b.title)) || 0);
  if (onNote && results.length) onNote({ move: "gore_tier", top: results.slice(0, 3).map((r) => r.url), tiers: { preferred: results.filter((r) => tierOf(r.url, r.title) === 0).length, lastResort: results.filter((r) => tierOf(r.url, r.title) === 2).length } });

  // Gore's DMD boundary: gather stops where additional results add no reach.
  // Go-deeper and double-check are targeted strikes — they take their cap
  // directly rather than expanding the harvest.
  let keepResults = results;
  if (move === "gather") {
    const boundary = goreBoundary(results, { maxResults: maxPages });
    keepResults = results.slice(0, boundary.keep);
    if (onNote) onNote({ move: "gore_boundary", query, kept: boundary.keep, of: results.length, basis: boundary.basis });
  } else {
    keepResults = results.slice(0, maxPages);
  }
  // Fetch the top pages, extract readable text, admit as chunks — AND step
  // them through the constitutional reader (EOT-ize), exactly like workspace
  // files: the web material becomes part of the holograph, the referents,
  // the hyperlexicon. Surf then addresses REAL structure, not raw bytes.
  //
  // EOT RETAINS THE FULL TEXT (S101): even when parsing misses structure,
  // the ledger must reconstruct 100% of the page's words. So each source's
  // FULL readable text is kept on the session (webSources, addressable by
  // URL), and the web ledger records a source line + recoverable range —
  // the parse is layered on top, never a replacement for the bytes.
  let admittedChars = 0;
  let admittedPages = 0;
  if (!session.corpus) session.corpus = createCorpusSession();
  if (!session.webLedger) {
    session.webLedger = createDocumentLedger({ docId: `${sessionId}:web`, title: `Web research — ${query}` });
  }
  // ── competency gate: a quest stops when the reading is no longer
  // meaningfully surprised. This is the WHOLE point of gathering — not to
  // fill the page-count but to reach the point where what we know is no
  // longer surprising BECAUSE we understand why it is the way it is. A page
  // that collapses surprise (little salient signal) ends the gather: more
  // pages would only add noise. Surprise collapse, never token volume, is
  // the stop — and it is also a guide on writing: the piece is done when it
  // explains the why, not when it has reached a length.
  let competencyReached = false;
  const COMPETENCY_SALIENT_MIN = 1; // meaningful surprise = at least one expectation moved or a REC
  for (const r of keepResults) {
    if (admittedPages >= WEB_MAX_PAGES) break;
    if (competencyReached) break;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 20000);
      const res = await fetch(r.url, { signal: ctrl.signal, headers: { "user-agent": "the-fold-explore/0.1 (local research instrument; one page per explicit request)" } });
      clearTimeout(t);
      if (!res.ok) continue;
      const html = await res.text();
      // The real web organ's extraction: strips scripts/styles/nav/header/
      // footer and decodes entities — not the inline stripper that left
      // "Dolphin&#039;s" in the text face (search before building).
      const { text } = extractReadable(html);
      if (!text || text.length < 50) continue;
      // A JS-shell / error page is not content (measured live: "A required
      // part of this site couldn't load… disable any ad blockers" came back as
      // 209 chars of shell). Two checks: the fast regex on the text face, then
      // the structural DOM read via pyodide (script/iframe/svg dominance with
      // near-zero real text). A shell is skipped — Gore fetches the NEXT
      // result instead of quoting a shell's apology as source material.
      const fastShell = looksLikeShell(text);
      let struct = null;
      if (!fastShell) {
        struct = await pyodideShellVerdict(html);
        if (struct?.shell) {
          if (onNote) onNote({ move: "web_skipped", url: r.url, why: "structural-shell", basis: struct.basis });
          continue;
        }
      }
      if (fastShell) {
        if (onNote) onNote({ move: "web_skipped", url: r.url, why: "shell" });
        continue;
      }
      const srcId = `web:${sessionId}:${admittedPages}:${r.url}`;
      // THE SHADOW / MNEME — the memory of the visit itself, preserved ALWAYS
      // whether or not the content is absorbed. A visit is a fact: the site
      // was seen, its text was retained (S101 recoverable), its address is
      // real. Even a page we decline to EOT-ize (not salient) keeps its
      // shadow — the reading did not absorb it, but the instrument remembers
      // it was there. Nothing is erased by a salience decision.
      //
      // The shadow is a DERIVED, DELETABLE projection (the-fold field-store.js
      // Pass 33): it keeps the FULL passage text on purpose — that is what
      // reanchor searches when the ground moves (find the note's words in
      // whatever sources exist now and mint the address anew), and what a turn
      // gets handed as passages. Its SDR states are UNPERSISTED — they rebuild
      // by re-hashing the text, so the text is the storage. Clearing the shadow
      // loses nothing: it rebuilds from the retained sources. The size story
      // is durability, never compression (measured pg2600: 4,582 KB shadow =
      // 1.42x the 3,216 KB source, 68% of it the passage text it must keep).
      const offset = session.webSources.get(r.url)?.length ?? 0;
      const full = (session.webSources.get(r.url) ?? "") + (offset ? "\n\n" : "") + text;
      session.webSources.set(r.url, full);
      capWebSources(session);
      if (!session.shadow) session.shadow = [];
      session.shadow.push({ url: r.url, title: r.title || r.url, seenAt: new Date().toISOString(), chars: text.length, resolution: null, reading: null });
      capShadow(session);
      // The web ledger is PERSISTED to disk (the shadow's source text lives as
      // a file, S101 recoverable) — so the citation byte-addresses resolve
      // against real bytes, not memory. An address into a vanished session is
      // a spelling; this keeps it a birth.
      const WEB_LEDGER_DIR = path.join(HERE, "documents");
      try { fs.mkdirSync(WEB_LEDGER_DIR, { recursive: true }); } catch {}
      appendLedgerLine(session.webLedger, {
        role: "source", title: r.title || r.url, text,
        basis: `web fetch, shadow-preserved (full ${text.length} chars recoverable)`,
        at: [offset, offset + text.length],
      }, { dir: WEB_LEDGER_DIR });

      // SALIENCE-GATED EOT-IZATION, MULTIPLE RESOLUTIONS. Only what is salient
      // is absorbed into the reading. The screen is COARSE first (does the page
      // share the task's words?), then FINE (does it move the reading's
      // expectations?). A page that fails the coarse screen is ignored by the
      // reading — its shadow stays, its content is retained, but the holograph
      // does not absorb what it does not need.
      const sal = salienceOf(text, query);
      const resolution = resolutionFor(sal.score, sal.shared.length);
      const shadowEntry = session.shadow[session.shadow.length - 1];
      if (shadowEntry) shadowEntry.resolution = resolution;
      let pageSurprise = { salient: 0, noise: 0, effects: 0, recanonicalizations: 0 };
      if (resolution === RESOLUTION_NONE) {
        // THE SALIENCE GATE AT INTAKE (2026-09-17): an ignored page is
        // RETAIN ONLY — its shadow and webSources bytes stay recoverable
        // (S101), but it is NOT admitted to the corpus, so it can never be
        // surfaced or cited. Before this, "ignore" meant "don't absorb into
        // the reading" while the corpus still held the bytes for a later,
        // different task — the measured door a stale page walked through
        // (a haiku's appendix cited a gun-legislation page admitted turns
        // earlier). Nomination is not admission: a page that failed its own
        // fetch's coarse screen is no one's source.
        if (onNote) onNote({ move: "ignored", url: r.url, score: sal.score.toFixed(2), shared: sal.shared.slice(0, 5), retained: "shadow-only" });
      } else {
        // COARSE or FINE: EOT-ize it. FINE additionally steps it through the
        // reader (which is where the holograph absorbs it). COARSE admits the
        // text to the corpus (surf can address it) and steps it through the
        // reader too — the reader's own surprise is the fine-resolution gate
        // on whether it actually moved the reading.
        admitChunked(session.corpus, { text: piiAdmit(session, text, srcId, onNote), sourceId: srcId });
        // PROVENANCE STAMP — which turn, which task, which salience earned
        // this doc's admission (the audit + Atta-decay / Roberts-scope hooks).
        stampAdmission(session, srcId, { task: query, salience: sal.score, resolution, kind: "web" });
        // ONLY SALIENT CONTENT IS EOT-IZED (2026-09-13). The full text is
        // retained on the shadow (S101) and admitted to the corpus (surf
        // addresses the whole page); only the EOT-ize READ is bounded to a
        // declared window — the reader's cast re-projection makes a whole-page
        // read O(prefix × cast²), measured as ~20 CPU-minutes on two
        // Wikipedia-scale pages before any section was written. The window is
        // the page's lead, which is where encyclopedic content lives; the
        // bounded read is recorded on the shadow so the trace is honest.
        const eotWindow = String(text).slice(0, EOT_MAX_CHARS);
        if (shadowEntry) { shadowEntry.readChars = eotWindow.length; shadowEntry.readBounded = text.length > eotWindow.length; }
        const encounters = textEncounters(eotWindow, { source: `web:${r.url}`, offset: 0 });
        for (const enc of encounters) {
          const step = await session.reader.step(enc);
          const s = step?.surprise;
          if (!s) { await yieldToEventLoop(); continue; }
          const effects = s.expectationEffects?.length ?? 0;
          const recan = s.recanonicalizations?.length ?? 0;
          const ops = s.operations?.length ?? 0;
          if (effects > 0 || recan > 0) pageSurprise.salient++;
          else if (ops > 0) pageSurprise.noise++;
          if (effects) pageSurprise.effects += effects;
          if (recan) pageSurprise.recanonicalizations += recan;
          await yieldToEventLoop();
        }
        if (onNote) onNote({ move: "eot_ized", url: r.url, resolution, score: sal.score.toFixed(2), salient: pageSurprise.salient });
        // THE SHADOW IS THE READING, SHAPED BY THE PRIORS. After stepping the
        // source through the reader (which runs under the received POS prior
        // and the born anchoring), capture what the priors caused the reading
        // to ESTABLISH — the referents it resolved, with their surfaces. That
        // is the shadow of this visit: not the bytes, not a receipt, but the
        // prior-shaped memory of what was here. It is derived (rebuildable by
        // re-reading the retained bytes under the same priors) and deletable.
        // (reuses `shadowEntry`, already bound above in this try block — a
        // second `const shadowEntry` here shadowed it and, via the temporal
        // dead zone, broke EVERY reference to the OUTER shadowEntry earlier
        // in this same block, including the readChars/readBounded stamp a
        // few lines up — silently, since the whole loop body is wrapped in
        // a bare `catch { /* skip failed fetches silently */ }`. Found live:
        // real search results (whitehouse.gov, Wikipedia) fetched and
        // extracted cleanly, then thrown away with zero pages ever admitted,
        // for every web-grounded chat turn this proxy has ever answered.)
        if (shadowEntry) {
          const idx = sessionReferentIndex(session, null);
          shadowEntry.reading = {
            referents: [...(idx?.referents ?? new Map()).values()]
              .slice(-12)
              .map((ref) => [...(ref.surfaces ?? [])][0] ?? null)
              .filter(Boolean),
            salient: pageSurprise.salient,
            prior: "pos:en-ud-ewt + born anchoring",
          };
        }
      }
      session.lastPageSurprise = pageSurprise;
      // Competency: if this page barely moved the reading's expectations
      // (salient ≈ 0), we now understand the material well enough that more
      // sources would only add noise. Stop the quest. This is the DMD
      // boundary made about MEANING, not token counts.
      if (pageSurprise.salient < COMPETENCY_SALIENT_MIN) competencyReached = true;
      if (onNote) onNote({ move: "competency", url: r.url, salient: pageSurprise.salient, noise: pageSurprise.noise, reached: competencyReached, resolution });
      admittedChars += text.length;
      admittedPages++;
    } catch { /* skip failed fetches silently */ }
  }
  if (onNote) onNote({ move: "web_searched", query, pages: admittedPages, chars: admittedChars, ms: Date.now() - started, goreMove: move });
  return { searched: true, pages: admittedPages, chars: admittedChars };
}

// ── the essay's shape: DEF before composition, from a prior or the web ────
// An essay has a shape — a thesis in the opening, thematic body sections that
// each support it, a conclusion that returns to it. The shape is not invented
// by the model and not invented by us: it is a RECEIVED structure (a shape
// prior with a named giver), and when no prior covers the task, it is HUNTED
// online the way the web organ hunts a fact — recorded egress, never assumed.
// The shape is stated POSITIVELY to the model (the-fold shapeSuffix), never as
// a prohibition, so the model aims at it natively.
const ESSAY_SHAPE_PRIOR = Object.freeze({
  schema: "ShapePrior@1",
  form: "essay",
  giver: "eoreader7:shape-prior:essay-v1",
  basis: "the essay's classical form — thesis opening, thematic body sections supporting it, conclusion returning to it; stated as the shape the piece aims at, never a prohibition",
  parts: Object.freeze([
    { role: "opening", label: "an opening that states the thesis" },
    { role: "body", label: "body sections, each advancing one theme of the thesis" },
    { role: "closing", label: "a conclusion that returns to the thesis" },
  ]),
});

// ── the code shape prior: what structure a CODE artifact aims at ───────────
// A code file has a canonical structure — module header/imports, public
// interface, implementation, entry point, usage — the way an essay has
// thesis/body/conclusion. The prior is DISCLOSED, and its giver is the real
// source this machine has retained (live_priors/09-source-code — audited /
// landmark repos, via source-code-manifest.json), so the shape is received
// from real code, never invented here. The instrument (code) register carries
// this shape; the essay's 27-cell void sweep does not apply — code's parts
// are its structural units, not questions the piece must answer in prose.
const CODE_SHAPE_PRIOR = Object.freeze({
  schema: "ShapePrior@1",
  form: "code",
  giver: "eoreader7:shape-prior:code-v1",
  basis: "a code artifact's conventional structure, received from the retained source corpus (live_priors/09-source-code: 20 audited/landmark repos, 56 files) — header/imports, interface, implementation, entry point, usage; stated as the shape the artifact aims at, never a prohibition",
  parts: Object.freeze({
    python: ["module docstring and imports", "core functions and types", "command-line interface", "main entry point", "example usage or tests"],
    javascript: ["module header and imports", "public interface and types", "core implementation", "entry point and exports", "example usage or tests"],
    typescript: ["module header and imports", "types and interfaces", "core implementation", "entry point and exports", "example usage or tests"],
    shell: ["shebang and options", "argument handling", "core logic", "error handling and exit codes", "usage"],
    go: ["package header and imports", "types and constructors", "core functions", "main entry point", "tests"],
    rust: ["crate header and imports", "types and traits", "core implementation", "main entry point", "tests"],
    html: ["the complete HTML document — doctype, head, inline CSS, body, inline JavaScript"],
    css: ["the complete stylesheet"],
  }),
});

// The artifact's file name — the request's own named file, else the topic
// slugged with the language's extension. A name read off the request, never
// a guessed path. A web artifact with no named file is index.html (the
// conventional entry point).
function codeArtifactName(task, language) {
  const t = String(task ?? "");
  const m = /\b([a-z0-9][a-z0-9._-]*\.(?:py|js|mjs|ts|tsx|sh|go|rs|html?|css))\b/i.exec(t);
  if (m) return m[1];
  if (language === "html") return "index.html";
  const extByLang = { python: "py", javascript: "js", typescript: "ts", shell: "sh", go: "go", rust: "rs", html: "html", css: "css" };
  const name = topicPhrase(task).replace(/\s+/g, "_").toLowerCase().slice(0, 40) || "program";
  return `${name}.${extByLang[language] ?? "py"}`;
}

function codeSections(task, language) {
  // The code artifact is written WHOLE, in one draw — a small model dumps the
  // whole program in its first part anyway (measured: gemma2:2b wrote the
  // entire CLI in part 1 and left parts 2-5 empty), so the DEF'd shape is
  // CODE_SHAPE_PRIOR (disclosed as the structure the file aims at) and the
  // SECTION is the file itself. Long-form here is the REC loop: generate →
  // hard-validate → re-draw with the errors, each revision a ledger line.
  return [codeArtifactName(task, language)];
}

// A real file from the retained source corpus, as a style reference for the
// mouth — compose like it, never copy it. The live_priors source code is the
// machine's own prior; handing one short real excerpt is the same move the
// narrative voice makes with its exemplar. Lazy + cached; null when the
// corpus is absent (disclosed, never a silent skip).
let _codeManifest = null;
function codeManifest() {
  if (_codeManifest !== null) return _codeManifest;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "manifests", "source-code-manifest.json");
    _codeManifest = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { _codeManifest = null; }
  return _codeManifest;
}
function codeExemplar(language) {
  const m = codeManifest();
  if (!m?.repos) return null;
  const ext = { python: ".py", javascript: ".js", typescript: ".ts", shell: ".sh", go: ".go", rust: ".rs" }[language] ?? ".py";
  let best = null;
  for (const repo of m.repos) {
    for (const f of repo.files ?? []) {
      if (!String(f.path ?? "").endsWith(ext)) continue;
      if (!f.local) continue;
      const full = path.join(HERE, "..", "..", "..", "live_priors", f.local);
      try {
        const text = fs.readFileSync(full, "utf8");
        if (text.length < 2000) continue; // a stub is not a style reference
        if (!best || text.length < best.text.length) best = { name: f.local, url: `${repo.raw_base}/${f.path}`, license: repo.license ?? null, text };
      } catch {}
    }
  }
  if (!best) return null;
  return { name: best.name, url: best.url, license: best.license, text: best.text.slice(0, 1600) };
}

// ── THE HTML SHELL (the unconscious owns design + behavior) ────────────────
// The deterministic half of web generation: a complete, self-contained HTML
// document — a real CSS design system (CSS variables, light/dark themes,
// responsive, card layout) and a WORKING dark-mode toggle in the <script> —
// with the mouth's BODY content spliced in. The model is asked for content
// only (the hero text, the menu, the hours), so the design and the
// interactivity are never the model's to get wrong: a 1.5B mouth that can
// write "Cappuccino, $3.50" produces a working, well-designed site.
function htmlShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { --bg: #faf6f0; --fg: #2d2a26; --card: #ffffff; --muted: #8a8078; --accent: #c47a3f; }
[data-theme="dark"] { --bg: #1f1c19; --fg: #ece7e0; --card: #2a2622; --muted: #a89f96; --accent: #d69a68; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); transition: background .3s, color .3s; }
.container { max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; }
h1 { font-size: 2.6rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
.tagline { color: var(--muted); font-size: 1.15rem; margin: 0 0 2rem; }
section { background: var(--card); border-radius: 14px; padding: 1.5rem; margin: 1.25rem 0; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
section h2 { margin: 0 0 .75rem; font-size: .95rem; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
ul { list-style: none; padding: 0; margin: 0; }
li { display: flex; justify-content: space-between; padding: .45rem 0; border-bottom: 1px solid var(--muted); opacity: .92; }
li:last-child { border-bottom: none; }
.theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--accent); color: #fff; border: none; border-radius: 999px; padding: .6rem 1.1rem; cursor: pointer; font-size: .9rem; }
.theme-toggle:hover { filter: brightness(1.08); }
</style>
</head>
<body>
<button class="theme-toggle" id="themeToggle">Dark mode</button>
<div class="container">
${body}
</div>
<script>
(function () {
  var btn = document.getElementById("themeToggle");
  var saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  btn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    localStorage.setItem("theme", cur);
    btn.textContent = cur === "dark" ? "Light mode" : "Dark mode";
  });
})();
</script>
</body>
</html>`;
}

// The code section prompt: the mouth is asked for ONE structural unit of the
// file, told the whole spec, the code written so far (to compose, not repeat),
// and the shape it must aim at. No essay voice, no RANKE prose rule — code's
// own discipline (emit source, compose with earlier parts, exact names).
// The plain-language name of a declared cell — Gary's law: the mouth never
// sees the apparatus name ("anchor", "cardinality"), only what it means.
const DECLARED_PHRASE = Object.freeze({
  slot: "what it is",
  anchor: "who it is for",
  admits: "what it contains",
  extent: "how much it covers",
  relation: "how the parts belong to it",
  composition: "how the parts fit together",
  cardinality: "how many",
  admission: "what counts as good",
  reopensOn: "what would change it",
});
const declaredPhrase = (k) => DECLARED_PHRASE[k] ?? k;

// What a bare code ask is writing, by language (Gary-minimal).
const whatFor = (language) => (language === "css" ? "a stylesheet" : `a ${language} program`);

// What a declared build is: the declared slot/admits, in the person's own
// words, never an apparatus cell name — a myspace-like site is a SITE, not
// "a python program", whatever detectLanguage fell back to.
const declaredWhat = (declared, language) => {
  const slot = String(declared?.slot ?? "").trim();
  if (slot) return slot;
  const admits = String(declared?.admits ?? "").trim();
  return admits ? `a build containing ${admits}` : whatFor(language);
};

// THE DECLARED SHAPE RE-DERIVES THE LANGUAGE (pure half, pinned by the
// build-clarify suite): a build whose own words name a SITE is an html
// artifact, whatever detection fell back to ("a myspace-like site" reads no
// extension → python by default; the person said SITE). Reads the declared
// slot/admits the same way the register does — never a second vocabulary.
const SITE_WORDS = /(site|web ?page|page|homepage|web ?app)\b/i;
export const languageForDeclared = (declared, language) =>
  declared && SITE_WORDS.test(String(declared.slot ?? declared.admits ?? "")) && language !== "html" ? "html" : language;

function codeSectionPrompt({ section, language, name, task, i, total, soFar, exemplar, declared = null }) {
  const shape = CODE_SHAPE_PRIOR.parts[language] ?? CODE_SHAPE_PRIOR.parts.python;
  const exemplarBlock = exemplar
    ? `\nA real ${language} file from the retained source corpus, as a style reference — compose like it, never copy it:\n"""\n${exemplar.text}\n"""`
    : "";
  const soFarBlock = soFar ? `\n\nCode written so far (earlier parts):\n${soFar}\n` : "";
  const sovHint = sovereigntyHint(task);
  // THE DECLARED SHAPE (build-clarify's licensed void, when the ask-back
  // door ran): the person's own answers — who it is for, how many — carried
  // to the mouth so it builds TO the declared shape, never free. Plain words
  // only (Gary: as little as possible, no apparatus); absent when the door
  // did not run (a bare code ask stays exactly as before, byte-identical).
  const declaredBlock = declared
  ? `\n\nThe shape is already decided — build to it:\n${Object.entries(declared).filter(([, v]) => v != null && v !== "").map(([k, v]) => `- ${declaredPhrase(k)}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join("\n")}`
  : "";
  // LEAD WITH THE DECLARED SHAPE when the door ran: the person's answers are
  // the primary spec (the shape prior is the fallback for a bare ask). A
  // build declared as a *site* must not read "python program" and drift.
  const declaredLead = declared
    ? `We're building ${name} — ${declaredWhat(declared, language)}. ${declaredBlock}\n\nThe specification:\n\n"""\n${task}\n"""`
    : `We're writing ${name} — ${whatFor(language)}. The complete specification:\n\n"""\n${task}\n"""`;

  // DATA-HOLDING APP: the mouth proposes ONLY the record schema; the machine
  // owns the crypto/fold/snip substrate and composes the seams around it.
  if (language === "html" && isDataHoldingTask(task)) {
    return sovereignSchemaPrompt(task, name);
  }
  // HTML: the mouth writes the BODY CONTENT only — the shell (doctype, head,
  // design-system CSS, working dark-mode JS) already exists in the
  // unconscious. The model's whole job is the notes and concepts: the hero,
  // the five drinks, the hours.
  if (language === "html") {
    return `We're writing the page content for ${name}. The complete specification:\n\n"""\n${task}\n"""\n\nWrite ONLY the page content as HTML elements: a hero (an <h1> with the site name and a <p class="tagline"> with a short tagline), a menu <section> with an <h2> and a <ul> of five drinks with prices, and an hours <section> with an <h2> and the opening hours. The surrounding page, the stylesheet, and the dark-mode toggle already exist — do NOT write <html>, <head>, <body>, <style>, or <script> tags, only the inner content.${sovHint} Emit HTML only, no prose, no markdown fences, no commentary.`;
  }
  const what = language === "css" ? "a stylesheet" : `a ${language} program`;
  const what2 = language === "css" ? "CSS" : `${language} source code`;
  const lawHint = languageLawHint(language);
  if (total === 1) {
    return `${declaredLead}.\n\nWrite the COMPLETE file, start to finish. Aim for this structure: ${shape.join(" → ")}.${lawHint}${sovHint}${exemplarBlock}\n\nRules:\n- Emit ${what2} only — no explanation, no prose, no markdown fences, no commentary about writing.\n- Use the exact names, behavior, and content the specification requires.`;
  }
  return `${declaredLead}.\n\nNow write ONLY this part of the file: ${section} (part ${i + 1} of ${total}).${lawHint}${sovHint}${exemplarBlock}\n${soFarBlock}\nRules:\n- Emit ${what2} only — no explanation, no prose, no markdown fences, no commentary about writing.\n- This part must compose with the parts already written: do not repeat code from earlier parts; use the names they define.\n- Use the exact names, behavior, and content the specification requires.`;
}

// Code satisfaction: the void is filled when the ASSEMBLED file is non-empty,
// not meta-commentary, and passes the hard validator (compile + exec + a
// smoke run). Per-part fill is reported (a small model may write the whole
// file in one part), but it is not the gate — the gate is the file itself.
function codeSatisfaction({ documentLines, sections, validation }) {
  const assembled = (documentLines ?? []).join("\n\n").trim();
  const failures = [];
  const filled = (documentLines ?? []).filter((l) => String(l ?? "").trim()).length;
  if (!assembled) failures.push({ kind: "unfilled", detail: "no code was written" });
  if (/^(here'?s|here is|the (?:code|function|script|module|program)|note that|as an ai|i can'?t|i cannot)/i.test(assembled)) {
    failures.push({ kind: "meta", detail: "the answer describes the code instead of being it" });
  }
  if (validation && !validation.ok) for (const f of validation.findings ?? []) failures.push({ kind: `lint:${f.kind}`, detail: f.detail });
  const ok = failures.length === 0;
  const standing = !validation ? "; unvalidated" : validation.unchecked ? "; no validator ran (unchecked)" : validation.ok ? "; compiles and runs clean" : "; fails validation";
  return { ok, filled, of: sections.length, failures, totalStrain: failures.length, basis: `code satisfaction: ${filled}/${sections.length} part(s) wrote source code${standing}` };
}

// ── SPEC-DERIVED EVA: the task's own requirements, checked as findings ─────
// The one failure class the language validator cannot catch is a DROPPED
// REQUIREMENT — the A/B measured it: a raw small model wrote a menu with zero
// prices because "five drinks with prices" got buried in the spec. The task
// IS the DEF; this reads its own counts ("five drinks"), named content
// ("hero", "menu", "hours", "prices", "dark mode"), and named definitions
// ("a function X") back off the prose, and reports each absent one as a typed
// finding the REC loop then repairs. Heuristic, disclosed — never a proof,
// always a witness over the spec's own words.
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const CONTENT_SIGNALS = ["hero", "tagline", "menu", "hours", "prices", "price", "dark mode", "header", "footer", "button", "form", "search", "login", "contact", "about", "theme", "toggle", "navigation", "nav"];
function specFindings(task, text, language) {
  const findings = [];
  const t = String(task ?? "").toLowerCase();
  const out = String(text ?? "").toLowerCase();
  // Counts: "five drinks", "3 columns", "N flags/options/items/sections".
  const countRe = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(drinks?|items?|sections?|columns?|flags?|options?|steps?|entries?|fields?|menu\s+items?)\b/gi;
  let m;
  while ((m = countRe.exec(t))) {
    const want = NUM_WORDS[m[1].toLowerCase()] ?? Number(m[1]);
    const noun = m[2];
    let got = 0;
    if (language === "html") got = (text.match(/<li[^>]*>/gi) || []).length;
    else if (/flag|option/.test(noun)) got = (text.match(/\badd_argument\b/gi) || []).length;
    if (want > 0 && got < want) findings.push({ kind: "spec_count", detail: `the spec asked for ${want} ${noun} but only ${got} found` });
  }
  // Named content / features.
  const asked = new Set();
  const contentRe = /\b(hero|tagline|menu|hours|prices?|dark mode|header|footer|button|form|search|login|contact|about|theme|toggle|navigation|nav)\b/gi;
  while ((m = contentRe.exec(t))) asked.add(m[1].toLowerCase());
  for (const sig of asked) {
    let present;
    if (sig === "prices" || sig === "price") present = /\$\d|\d+\.\d{2}/.test(out);
    else if (sig === "dark mode" || sig === "theme" || sig === "toggle") present = /\b(dark|theme)\b/.test(out);
    else present = out.includes(sig);
    if (!present) findings.push({ kind: "spec_missing", detail: `the spec asked for "${sig}" but it is absent` });
  }
  // Named definitions (python).
  if (language === "python") {
    const fnRe = /\b(?:function|def|class|method)\s+(?:named\s+|called\s+)?([a-z_]\w*)/gi;
    while ((m = fnRe.exec(t))) {
      const name = m[1];
      if (!new RegExp(`\\b(?:def|class)\\s+${name}\\b`).test(text)) findings.push({ kind: "spec_missing", detail: `the spec asked for "${name}" but it is not defined` });
    }
  }
  return findings;
}

// ── the language-law prior, wired in (live_priors derived-priors) ───────────
// The prior is an INDEX over the engine, used to ground the mouth in the
// language's own laws without re-deriving them: the declaration recipes and
// the stdlib surface. Loaded once per language, cached; absent when the prior
// was not built (disclosed, never a silent skip).
const _lawCache = new Map();
function loadLanguageLawPrior(language) {
  if (_lawCache.has(language)) return _lawCache.get(language);
  let prior = null;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "code-priors", `${language}-language-law-prior-v1.json`);
    prior = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {}
  _lawCache.set(language, prior);
  return prior;
}
function languageLawHint(language) {
  const prior = loadLanguageLawPrior(language);
  if (!prior) return "";
  const recipes = (prior.grammar?.declarationRecipes ?? []).map((r) => r.shape).filter(Boolean).join(", ");
  const stdlib = (prior.lexicon?.coreApi ? Object.keys(prior.lexicon.coreApi) : (prior.lexicon?.stdlibModules ?? []).slice(0, 24)).slice(0, 24);
  const parts = [];
  if (recipes) parts.push(`Declaration shapes: ${recipes}.`);
  if (stdlib.length) parts.push(`Standard library available: ${stdlib.join(", ")}.`);
  return parts.length ? `\nThe language's laws (from the engine): ${parts.join(" ")}` : "";
}

// ── ETHOS, UNCONSCIOUS: the artifact's sources, written as a plain comment ──
// The artifact is not morally neutral — it stands on what produced it — but
// the record reads like ordinary code, not like apparatus. A single quiet
// `sources:` line names what was drawn on (the model + its license, the
// language's engine, any exemplar with ITS license, and any site we snipped
// from), the way a developer credits a library. No product name, no banner:
// anyone reading the file just sees its sources. A source is recorded only
// when it is actually known; never fabricated.
function codeSources({ language, model, exemplar, extra = [] }) {
  const src = [];
  const m = MODEL_GIVER(model);
  if (m?.name || model) src.push(`${m.name ?? model}${m.license ? ` (${m.license})` : ""}`);
  const law = loadLanguageLawPrior(language);
  if (law?.giver?.engine?.python) src.push(`Python ${law.giver.engine.python} stdlib (PSF-2.0)`);
  else if (law?.giver?.resource) src.push(law.giver.resource);
  if (exemplar?.url) src.push(`${exemplar.url}${exemplar.license ? ` (${exemplar.license})` : ""}`);
  return [...src, ...extra];
}
function codeSourcesHeader({ language, model, exemplar, extra = [] }) {
  const parts = codeSources({ language, model, exemplar, extra });
  if (!parts.length) return "";
  const line = `sources: ${parts.join("; ")}`;
  if (language === "html") return `<!-- ${line} -->\n`;
  if (language === "python" || language === "shell") return `# ${line}\n`;
  return `/* ${line} */\n`;
}

// Strip markdown code fences from a section the mouth emitted — the mouth is
// told "no fences", but a small model emits them anyway (and often appends an
// afterword: "This HTML document meets the requirements…"); the unconscious
// system removes both so the assembled file is raw code. Never guessed: only
// a matching ``` fence is stripped, and the afterword is dropped only at a
// closing fence boundary.
function stripCodeFences(text, language) {
  const t = String(text ?? "").trim();
  const tag = language ? language.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "[\\w.+-]*";
  // Whole-text single fence.
  const full = new RegExp(`^\`\`\`${tag}[ \\t]*\\n([\\s\\S]*?)\\n\`\`\`[ \\t]*$`, "i").exec(t);
  if (full) return full[1].trim();
  // Leading fence with a trailing afterword: strip the leading fence and cut
  // at the last closing fence (the model's commentary after the code).
  let s = t.replace(/^```[\w.+-]*[ \t]*\n/i, "");
  const lastFence = s.lastIndexOf("\n```");
  if (lastFence !== -1) s = s.slice(0, lastFence);
  return s.trim();
}

// The shape of a composition is EXTRACTED from the material, never steered:
// the recurring short lines the material's own structure shows (structure-rec
// tier2's discipline — short, blank-bounded, not quoted), plus the beings the
// reading established. If the material has real section markers, those become
// the essay's sections; only when it has none do we fall back — and the
// fallback is disclosed as such, never dressed up as the material's shape.
function shapeFromMaterial({ material = [], referents = null, surfacedSegments = [] }) {
  const sections = [];
  const text = (material.length ? material.join("\n\n") : "") + "\n\n" + (surfacedSegments.length ? surfacedSegments.map((s) => s.text ?? "").join("\n\n") : "");
  // Extract the material's own structure: recurring short lines (its heading
  // convention), using structure-rec's candidate-line discipline — short,
  // blank-bounded, not quoted dialogue.
  const lines = String(text).split("\n").map((l) => l.trim());
  const seen = new Map();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l || l.length > 80 || l.length < 4) continue;
    if (/^[“"'‘]|[”"'’]$/.test(l)) continue; // quoted dialogue, not a heading
    if (/^(http|www\.)/i.test(l)) continue;
    if (/^[-*•]/.test(l)) continue; // a list item, not a heading
    if (l.includes("…") || /\.{2,}/.test(l)) continue;
    const key = l.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (key.length < 4) continue;
    const rec = seen.get(key) ?? { count: 0, line: l };
    rec.count++;
    seen.set(key, rec);
  }
  const recurring = [...seen.values()]
    .filter((r) => r.count >= 2)
    // A real section heading is a capitalized noun phrase, not lowercase
    // chrome or navigation ("for other uses", "see also", "jump to content").
    .filter((r) => /^[A-Z]/.test(r.line))
    // Boilerplate never becomes a section: navigation, site chrome, essay-mill
    // labels, disambiguation leads.
    .filter((r) => !/table of contents|home|menu|search|related|essay example|free essay|skip to|read more|also read|recent posts|subscribe|share this|^page\b|^home\b|login|sign in|sign up|contact|about us|privacy|cookie|conclusion of the essay|within this section|you'll find|jump to content|from wikipedia|the free encyclopedia|navigation|current events|contents|help about|learn to edit|community portal|recent changes|what links here|related changes|special pages|permanent link|page information|cite this page|wikidata item|download as|toggle|coordinates|tools|interaction|print.?\w*export|search wikipedia|donate|create account|for other uses|see also|disambiguation|see .*\(disambiguation\)/i.test(r.line))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  // PREFER the reading's beings first: they are the material's ACTUAL
  // subjects ("Dolphin", "Tursiops truncatus"), far better sections than any
  // chrome line. Recurring short lines join only after, and only when they
  // survived the chrome filter.
  const beings = [...(referents?.values?.() ?? [])]
    .map((r) => [...(r.surfaces ?? [])][0])
    .filter((n) => n && n.length > 3 && n.length < 60)
    .filter((n) => !/jump to|wikipedia|navigation|search|contents|edit|main|talk|article|portal|help|special|tools/i.test(n))
    .slice(0, 3);
  for (const b of beings) {
    if (!sections.includes(b)) sections.push(b);
  }
  for (const r of recurring) {
    if (!sections.includes(r.line)) sections.push(r.line);
  }
  // The material's first substantial lines that look like section titles
  // ("## ..." or a short title at the start of a block).
  if (sections.length < 3) {
    for (const l of lines) {
      if (sections.length >= 5) break;
      if (/^#{1,4}\s+/.test(l)) {
        const t = l.replace(/^#{1,4}\s+/, "").trim();
        if (t && t.length < 90 && !sections.includes(t)) sections.push(t);
      }
    }
  }
  return sections.slice(0, 6);
}
function essayThemes({ task, surfacedSegments, material }) {
  const themes = [];
  // From the material's own sentences: the themes the sources actually raise.
  const text = (material && material.length ? material.join(" ") : "") + " " + (surfacedSegments?.length ? surfacedSegments.map((s) => s.text ?? "").join(" ") : "");
  const sentences = segmentSentencesOmni(text).filter((s) => s.length > 60 && s.length < 220);
  // Pick up to 3 sentences that look like topic carriers (not the essay-site
  // boilerplate the search surface often leads with).
  const seen = new Set();
  for (const s of sentences) {
    if (themes.length >= 3) break;
    if (/^(dolphin essay|short essay|welcome to|table of contents|in this (section|session|essay))/i.test(s)) continue;
    const head = s.slice(0, 90);
    if (seen.has(head) || seen.size > 12) continue;
    seen.add(head);
    themes.push(head);
  }
  return themes.length ? themes : ["the world of the subject", "how the subject lives", "why the subject matters"];
}

// ── void-detection: determine answer shape before the model speaks ─────────
// Zero the space first, then see what is still empty. A greeting needs one
// sentence; a command needs acknowledgment; a research question needs
// grounded material; a void needs a disclosed fact (P32). This steers the
// model toward the proper length and modality without relying on the model
// to figure out the shape itself.
//
// CHAT IS THE DEFAULT. The proxy is a normal conversation first — every
// answer is a void defined and satisfied at its natural size. Long-form is a
// MODE it can enter, in two flavors: "long" (a single answer that goes
// further than chat provides) and origami (an artifact built on an
// append-only ledger, iterated by revisions, projectable in a surface).
// Neither is entered by a plain question — only by an ask that names it.
const LONG_ASK = /\b(in detail|in more detail|at length|thoroughly|elaborate|expound|in depth|in-depth|deep dive|comprehensive|comprehensively|detailed|thorough|extended|step by step|walk me through|tell me everything|give me the full|the full story|the whole story|explain fully|go deeper|a long answer|a longer answer|long response|\d[\d,]*(?:-|,)?\s*(?:words|pages|paragraphs))\b/i;

// HOLMES'S CAST (the register's meaning potential): the genres the sidecar
// has actually read — cached, read once. The register derives its field from
// these (a learned sign) before falling back to the received noun table.
let _sidecarGenres = null;
function sidecarGenres() {
  if (_sidecarGenres === null) {
    try { _sidecarGenres = (loadSidecar()?.entries ?? []).map((e) => e.genre).filter(Boolean); } catch { _sidecarGenres = []; }
  }
  return _sidecarGenres;
}

// THE GROUND-SEED (a story's cast, drawn at random FROM the ground, never
// invented): the machine's accumulated ground — the sidecar's staging (the
// genre's own phase names, with their source), the discovered framing's
// beats, and the reader's named beings (if the read established any) — is
// shuffled by a seeded RNG and picked as the story's cast. Every member keeps
// its PROVENANCE, so the story is traceable to what inspired it; the seed is
// recorded so the draw is reproducible.
function groundSeed(session, { sidecar = null, framing = null, field = null, count = 4, seed = null } = {}) {
  const ground = [];
  // 1. the reader's named beings (proper-noun referents the read established)
  try {
    const idx = sessionReferentIndex(session, null);
    for (const r of (idx?.referents ?? new Map()).values()) {
      const name = [...(r.surfaces ?? [])][0];
      if (name && name.length > 2 && /^[A-Z]/.test(name)) ground.push({ name, provenance: (r.provenance?.length ? [...r.provenance].slice(0, 2) : ["the reading"]) });
    }
  } catch {}
  // 2. the sidecar's staging — the genre's own phase names, with their source
  for (const e of (sidecar?.entries ?? [])) {
    if (field && e.genre && !String(e.genre).includes(field) && !field.includes(String(e.genre))) continue;
    for (const s of (e.staging ?? [])) {
      const name = String(s ?? "");
      if (name.length > 80 || /^part\s/i.test(name) || /^section\s/i.test(name) || /\bemergency\b/i.test(name)) continue; // license preamble + long fragments are not cast
      ground.push({ name, provenance: [e.source?.file ?? "the sidecar"] });
    }
  }
  // 3. the discovered framing's beats
  for (const s of (framing?.staging ?? [])) ground.push({ name: String(s), provenance: ["the discovered framing"] });
  const uniq = [...new Map(ground.map((g) => [g.name, g])).values()].filter((g) => g.name && g.name.length > 2);
  if (!uniq.length) return { seed: null, cast: [], basis: "no named ground — the story's cast is the register's own" };
  const effectiveSeed = seed ?? seedFrom(`${Date.now()}:${Math.random()}`); // caller-seeded or fresh; recorded for reproducibility
  const rng = createSeededRng(effectiveSeed);
  const pool = [...uniq].slice(0, 24);
  const picked = [];
  while (picked.length < count && pool.length) {
    const i = Math.floor(rng() * pool.length);
    const b = pool.splice(i, 1)[0];
    picked.push({ name: b.name, provenance: b.provenance });
  }
  return { seed: effectiveSeed, cast: picked, basis: `cast drawn at random (seed ${effectiveSeed}) from ${uniq.length} grounded name(s): sidecar staging + framing beats + the read's beings` };
}

// RANKE'S LAW (anti-kitsch, anti-plagiarism): the mouth COMPOSES its own
// sentences. It may GROUND a fact (cited to the source) or INVENT (labeled as
// its own claim) — but it never copies a source's words as its own prose. A
// verbatim run is refused: it is kitsch, and the ring's whole point is that
// the law refuses kitsch.
const RANKE_RULE = "Compose your own sentences. You may state a grounded fact (it will be cited to its source) or invent (it will be labeled as yours) — but never copy a source's words as your own prose. A sentence lifted from the material is refused.";

// SELF-REFERENTIAL / META (P-chitchat-pollution, 2026-09-17): a question ABOUT
// the assistant itself — "what are you", "what can you help with", "who are
// you", "introduce yourself" — never names an external fact to look up, so it
// must never fall through to the "open" shape (which the web-search gate
// below treats as research-shaped). The earlier anchored command regex only
// matched the WHOLE turn ("who are you" alone); a real greeting wraps the
// same question in a sentence ("Hello — can you tell me what you are and what
// you can help with?") and slipped past it, landing on "open" and firing
// ~2500 live web searches with query text derived from that non-sequitur
// sentence. This is a search anywhere in the turn, not an anchor.
const SELF_REFERENTIAL_RE = /\bwhat\s+(?:are\s+you\b|you\s+are\b)|\bwho\s+are\s+you\b|\bwhat\s+can\s+you\s+(?:do|help)\b|\bwhat\s+do\s+you\s+do\b|\btell\s+me\s+about\s+(?:yourself|you\b)|\bintroduce\s+yourself\b|\bwhat\s+are\s+you\s+capable\s+of\b/i;

// PERSONAL EXPERIENCE (found live, 2026-09-22): a narrower, higher-risk
// sibling of SELF_REFERENTIAL_RE above — a question that presupposes the
// instrument has a life outside this conversation (a weekend, an ongoing
// reading list, a favorite anything, what it did yesterday). Tried first as
// a NEUTRAL_CHARACTER instruction alone ("you do not have a life outside
// this conversation…") and it was not enough — with that exact line already
// in its system prompt, gemma2:2b still answered "how was your weekend?"
// with "My weekend was busy helping with preparations for our 2026 Fall
// Book Preview," a wholly invented event. MODEL IS JUST THE MOUTH: this
// class is answered MECHANICALLY below, never generated — the fabrication
// risk here is exactly the failure this whole instrument exists to catch
// everywhere else in the reading, now turned on the reader itself.
const PERSONAL_EXPERIENCE_RE = /\bhow\s+(?:was|is)\s+your\s+(?:day|morning|afternoon|evening|weekend|week)\b|\bwhat\s+(?:have|'ve)\s+you\s+been\s+(?:reading|watching|doing|up\s+to)\b|\bwhat\s+did\s+you\s+do\s+(?:today|yesterday|this\s+(?:week|weekend))\b|\bdo\s+you\s+have\s+a\s+favou?rite\b|\bwhat(?:'s|\s+is)\s+your\s+favou?rite\b|\bwhat\s+do\s+you\s+do\s+for\s+fun\b/i;

/** A fixed, honest answer to a personal-experience question — chosen by
 *  category, never generated. Every branch says the true thing (no lived
 *  history between conversations) and hands the thread back to the person,
 *  the same shape socratic.js and the fold's own Terry Gross register both
 *  hold to: state the real thing plainly, then ask, don't lecture. */
function personalExperienceAnswer(task) {
  const t = String(task ?? "").toLowerCase();
  if (/reading|watching/.test(t))
    return "I don't carry a reading or watch list between conversations — nothing ongoing to report. What are you reading? I'm glad to talk about it.";
  if (/weekend|\bday\b|morning|afternoon|evening|\bweek\b|yesterday|today/.test(t))
    return "I don't have days the way you do — no weekend, no yesterday, nothing outside this conversation. What's going on with yours?";
  return "I don't have preferences built from a lived history the way \"favorite\" implies — but I can still dig into whatever you're weighing. What's on your mind?";
}

export function detectAnswerShape(task, hasWorkspace, hasWeb, surfVoid, surfacedSegments, resolutions) {
  const t = task.toLowerCase().trim();
  if (/^(hi|hello|hey|howdy|greetings|good\s+(morning|afternoon|evening))[\s,!?]*$/.test(t))
    return { shape: "greeting", maxTokens: 64, modality: "brief" };
  if (/^(clear|reset|help|status|what\s+can\s+you\s+do|who\s+are\s+you)[\s,!?]*$/.test(t))
    return { shape: "command", maxTokens: 128, modality: "brief" };
  if (SELF_REFERENTIAL_RE.test(t))
    return { shape: "command", maxTokens: 128, modality: "brief" };
  if (/^(count|list|enumerate)\s+(to\s+)?\d+/.test(t))
    return { shape: "trivial", maxTokens: 64, modality: "direct" };
  if (surfVoid && !surfacedSegments.length)
    return { shape: "void", maxTokens: 256, modality: "disclosed-fact" };
  // VERDICT ASKS (falsified 2026-09-19, Control B): a review/verdict-shaped
  // ask — "does this patch pass the test", "review this code", "is this
  // correct" — previously fell through to the register/composition logic,
  // where the artifact language ("patch", "test", "python") drove it into the
  // CODE pipeline: the mouth's one-word verdict ("YES") came back surfaced as
  // a generated artifact. A verdict is a JUDGMENT, not a production — small
  // token budget, chat mode, no essay/code organs. The trigger needs BOTH the
  // review act and a real artifact+outcome (or an explicit binary-answer
  // instruction): a plain "how does X work?" never matches, and neither does
  // "write a review about X" (a composition, named genre — that stays below).
  const VERDICT_RES = [
    /\b(?:answer|reply|say)\s+(?:with\s+|me\s+)?(?:exactly\s+)?(?:one\s+word|yes|no|yes\s+or\s+no|yes\/no)\b/i,
    /\b(?:review|check|verify|evaluate|assess)\b[\s\S]{0,140}\b(?:test|patch|code|function|implementation|solution|spec)[\s\S]{0,60}\b(?:pass(?:es|ed)?|correct|satisf|meet|fail(?:s|ed)?|works?|verdict)\b/i,
    /\b(?:does|did|will)\s+(?:the\s+)?(?:patch|test|code|function|implementation|solution)[\s\S]{0,60}\b(?:pass|work|correct|satisf|meet|fail)\b/i,
    /\b(?:is|are)\s+(?:this|the|my|our|your)\s+(?:patch|test|code|function|implementation|solution)[\s\S]{0,60}\b(?:correct|working|passing|valid|right|broken|wrong)\b/i,
  ];
  if (VERDICT_RES.some((re) => re.test(t))) {
    return { shape: "verdict", maxTokens: VERDICT_MAX_TOKENS, modality: "brief" };
  }
  // THE REGISTER (Halliday) — no hardcoded "essay mode". ANY named genre the
  // person asks us to produce enters the staged-artifact pipeline: a story,
  // a poem, a nocturne, a film, an essay — the register resolves the FIELD
  // (open set) and the MODE (medium). The essay is one field among many.
  const reg = deriveRegister(t, { genres: sidecarGenres() });
  // THE DISCOVERED RULE BOOK (hive) — genres are DISCOVERED on the fly, never
  // hardcoded. When a person corrects an answer ("you wrote an essay, not a
  // sonnet") the hive author derives a falsifiable rule naming the genre and
  // its governing constraint; the shape router consults that rule book HERE.
  // A discovered natural-size rule (a sonnet is filled at its own size, never
  // as a grounded essay) short-circuits the composition pipeline for that
  // genre — the correction literally re-shapes the router. No rule yet means
  // no steering: the request falls through to the staged pipeline as before.
  const discovered = naturalSizeRuleForTask(t);
  if (discovered)
    return { shape: "natural", maxTokens: discovered.maxTokens, modality: "natural-size", register: reg, rule: discovered.id };
  const produce = /\b(?:write|compose|draft|prepare|generate|produce|make|tell|build|create|implement|code)\b/i.test(t);
  const aimsAt = /\b(?:on|about|covering|addressing)\b/i.test(t);
  const multiPart = /\b(multi-?part|long-?form|several sections|a several-part piece|numbered sections)\b/i.test(t);
  const namesGenre = Boolean(reg.field.field) || reg.mode !== "text"; // a registered genre OR a non-text medium
  // A code ask ("write a Python CLI tool…") is a composition even without an
  // "about/on" object — the instrument register names the artifact directly.
  const isCodeAsk = reg.field.field === "instrument";
  if ((produce && namesGenre && (aimsAt || isCodeAsk)) || multiPart)
    return { shape: "composition", maxTokens: CALL_MAX_TOKENS, modality: "grounded", register: reg };
  // LONG — a response that goes further than chat provides: the task asks
  // for elaboration or depth, still one answer (no artifact, no ledger).
  if (LONG_ASK.test(t))
    return { shape: "long", maxTokens: LONG_MAX_TOKENS, modality: "extended" };
  if (hasWorkspace || hasWeb)
    return { shape: "research", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  return { shape: "open", maxTokens: CALL_MAX_TOKENS, modality: "concise" };
}

// ── composition planning: derive section structure from the READING ────────
// A natural topic phrase out of a task, for the essay's own voice: "Write a
// five-page essay on dolphins" → "dolphins"; "explain how the kernel works"
// → "how the kernel works". Never an apparatus name.
export function topicPhrase(task) {
  const t = String(task ?? "").trim();
  const ofSubject = /\b(?:biography|account|history|analysis|study)\s+of\s+([^,;:.!?]+)/i.exec(t)?.[1] ?? null;
  if (ofSubject) return ofSubject.trim().replace(/\s+/g, " ");
  const about = /\babout\b\s+([^,;:.!?]+)/i.exec(t)?.[1] ?? null;
  if (about) {
    const subject = about
      .replace(/^\(?\s*(?:\d+|\w+)\s*(?:words?|pages?|paragraphs?|sentences?|characters?|minutes?|sheets?)\s*\)?\s*(?:on|regarding|concerning|about)\s+/i, "")
      .trim();
    if (subject && !/^(?:words?|pages?|paragraphs?|sentences?|characters?|minutes?|sheets?)\b/i.test(subject)) return subject.replace(/\s+/g, " ");
  }
  let short = t.slice(0, 120).replace(/^(write|explain|describe|summarize|outline|compose|report|discuss|analyze)\s+/i, "").trim();
  const wasTruncated = t.length > 120;
  short = short.replace(/^(?:a|an|the)?\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)?[-\s]?(?:page|pages?|paged|page-long|paragraph|paragraphs?|para|section|sections?|part|parts?)?\s*(?:paper|essay|report|article|document|piece|brief|memo|post)\s+(?:on|about|regarding|concerning)\s+/i, "").trim();
  // THE SUBJECT STOPS AT THE ASK'S OWN BOUNDARY (2026-09-21, the "five-
  // paragraph essay on the Cumberland River" fix): after the essay-form is
  // stripped, the remaining words are the SUBJECT up to the first sentence
  // end — "the Cumberland River in Nashville" — and the ask's instructions
  // ("Give it a title. Real prose...") are NOT the subject. Cut at the first
  // terminal period; a subject that has none keeps the whole phrase.
  short = short.split(/[.!?。！？]\s*/)[0].trim();
  const cut = wasTruncated ? short.replace(/\s+[a-z]+$/, "").trim() : short;
  return (cut || short || "this").replace(/\s+/g, " ").trim();
}
// LaVar's rule, applied: do not hand-roll a reading loop. The composition's
// shape comes from the reading's OWN structure — the beings the
// constitutional reader established (readingIndexFromLog's referents, each
// with its surfaces and the mentions that fed it), the hyperlexicon's given
// affordances (what recurs between whom), and the holograph's reconstructed
// record. Each section is a real node in the material, not a model's
// invention, and the overall concept stays in the unconscious notes (the
// digest + resolutions) while each task is brief + grounded.
function planComposition({ index, hyperlexicon, resolutions, surfacedSegments, topicSource, material }) {
  const sections = [];
  // PRIMARY: the material's OWN structure — its recurring short lines (its
  // heading convention) and the beings the reading established. The shape of
  // any generated piece is whatever the material actually has, never a shape
  // imposed on it. Same organs, any task: an essay, a paper, a report, a
  // spec — the sections are the material's, not ours.
  const fromMaterial = shapeFromMaterial({ material, referents: index?.referents, surfacedSegments });
  for (const s of fromMaterial) sections.push(s);

  // Source 1: the reading's own beings, ranked by how many mentions fed them.
  const referents = index?.referents ?? new Map();
  const beings = [...referents.values()]
    .map((r) => ({ ...r, fed: r.fedBy?.size ?? 0, name: [...(r.surfaces ?? [])][0] ?? null }))
    .filter((r) => r.name)
    .sort((a, b) => b.fed - a.fed);
  for (const b of beings.slice(0, 4)) {
    if (sections.includes(b.name)) continue;
    sections.push(b.name);
  }
  // Source 2: hyperlexicon given affordances (what recurs between whom).
  const hl = hyperlexicon?.composition ?? {};
  for (const e of Object.values(hl)) {
    if (e?.standing !== "given") continue;
    const title = `${e.left} and ${e.right}`;
    if (!sections.includes(title)) sections.push(title);
    if (sections.length >= 6) break;
  }
  // Source 3: surfed segment sources — the addressed material's own blocks.
  if (surfacedSegments?.length) {
    for (const s of surfacedSegments) {
      const title = String(s?._ledger?.heading ?? s?.heading ?? "").trim() || String(s?.source ?? "").trim();
      if (title && !sections.includes(title)) sections.push(title);
      if (sections.length >= 6) break;
    }
  }
  // LAST RESORT, disclosed as what it is: the material had no structure the
  // organs could extract — a single grounded part, written against the whole
  // of what came up. Never a rigid invented list; the model writes freely.
  if (!sections.length) {
    sections.push("All of it"); // one part, whole material, honest
  }
  // Final bound.
  return sections.slice(0, 6);
}

export const REQUEST_TIMEOUT_MS = Number(process.env.ER7_REQUEST_TIMEOUT_MS) || 290000;
// FIRST-BYTE TIMEOUT (2026-09-20): Ollama answers headers at once and may
// then load for minutes (evict-and-swap under pressure) before the first
// body chunk — the stall that wedged turns in total silence for ~290s.
// Races the FIRST body read only; once bytes flow, the whole-call backstop
// above owns the turn again. A timeout aborts, marks the model unservable
// (the next turn refuses fast at Heimdall's gate), and throws typed.
export const FIRST_BYTE_TIMEOUT_MS = Number(process.env.ER7_FIRST_BYTE_TIMEOUT_MS) || 90000;
/** Race one body read against the first-byte clock. Resolves with the
 *  read's own { done, value }; rejects typed (code
 *  "ollama_first_byte_timeout", naming model + elapsed) when the daemon
 *  holds headers and produces no bytes — a load stalled under pressure.
 *  Pure over an injected read fn, so the clock is testable without Ollama. */
export function raceFirstRead(readFn, ms, model) {
  let timeout;
  return Promise.race([
    Promise.resolve().then(readFn).finally(() => clearTimeout(timeout)),
    new Promise((_, reject) => {
      timeout = setTimeout(() => {
        const err = new Error(`ollama first byte timeout: ${model} produced no body bytes for ${ms}ms (likely a model load stalled under memory pressure)`);
        err.code = "ollama_first_byte_timeout";
        reject(err);
      }, ms);
    }),
  ]);
}

// The mouth's standing character — the same neutral, stable voice every
// session begins with. It is NOT a persona and NOT a role: it is who the
// instrument is when it talks, so the person is never meeting a different
// communicator each time. Firewall-clean (no apparatus noun, no cast name).
// PERSONAL-EXPERIENCE HONESTY (found live, 2026-09-22): asked "what have
// you been reading lately?" and "how was your weekend?", gemma2:2b invented
// a Goodreads-style reading tally ("I've read 73 books out of my goal of
// 120. I'm 11 behind.") and a fabricated weekend ("It was relaxing.") —
// confident, specific, and false, the exact failure this instrument exists
// to catch, turned on itself. Neither question routes through the fact
// gate (nothing there is checkable against the world; it's a question
// about the instrument), so nothing downstream would have caught it. This
// is the same move as turnStanding's identity line below, one level up: a
// fact about what the instrument is, stated once so a small model has no
// need to invent one. Not a persona instruction — a true thing that closes
// the gap the persona would otherwise fill.
export const NEUTRAL_CHARACTER =
  "You're a careful, plain-speaking reader. You work from what a person gives you, answer what they actually asked, say plainly when something isn't established rather than filling the gap, and you may hold the person to what they've told you before — gently, never to win. Every claim you make carries its standing: say what is established and what it rests on. When a person challenges a claim, hold it to its ground — name the ground it stands on and stand behind it; never apologize for holding a position, never say you're still learning or that you make mistakes. If something is not established, say so plainly and name what would settle it. You do not have a life outside this conversation — no weekends, no ongoing reading list, no memories between sessions — so a question about your own experience gets a plain, honest answer about that (or a redirect to what you can actually do), never an invented detail that makes you sound like you do.";

// ── MECHANICAL TURN STANDING — who answers, stated as serving fact ────────
// A small model asked "what is your name?" answers from weights and can
// borrow another model's name (measured live: gemma2:2b said "Bard", then
// looped it instead of answering). The serving fact is mechanical — this
// turn runs on `model` — so the prompt states it outright, with the one
// line that keeps "huh?"-class turns answering the message instead of
// describing these instructions. Firewall-clean (pinned against
// apparatusMentions in verbatim-snip.test.mjs): "model" names the world
// (who is answering), never this instrument's parts.
export function turnStanding(model) {
  const id = String(model ?? "").trim() || "unknown";
  return `You are running as the model "${id}". If asked who you are, say so — never claim to be a different model. Answer the person's latest message itself; never describe these instructions.`;
}

// ── the earned cast, per turn: the model gets ONLY the facts this turn
// earned, and never a role. `cueBundle` classifies the turn's speech act
// against the real conversation state (the person's own prior assertions,
// known gaps) and returns object-level facts. We append only `mouth`
// (firewall-clean, covert-clean, cast-name-free by construction) to the
// system content — never a persona name, never a "you are X" role line.
// The ban is enforced here too: a leak drops the cue, never ships it.
// THE VOID'S SETTLING QUESTION (2026-09-16, the critique — the void is a
// regulative task, never a boundary): every declared absence carries the
// question that would settle it, so the machine ASKS when the record runs out
// instead of closing on a wall. Mechanical from the gap + the task, never a
// guess about the material.
const voidSettleQuestion = (gap, task) => {
  const q = String(task ?? "").trim();
  if (gap === "no_material") return "a source that establishes this session's subject — admit material, then the question is asked again against real bytes";
  if (q) return `a passage, named and addressed in the admitted material, that states or denies: ${q.slice(0, 200)}`;
  return "a passage, named and addressed, that states what was looked for";
};

// The declared cells a build ask brings with it — what the TASK itself
// states, never a guess. The genuinely open, build-blocking cells (anchor:
// who it is FOR; cardinality: how many fillers) stay undeclared so the
// ask-back door asks them instead of inventing answers. Each declared cell
// is read off the ask's own words, the same way every other door reads the
// question's own words (READING-POLICY) rather than a domain vocabulary.
const buildVoidFields = (task) => {
  const t = String(task ?? "").trim();
  const slot = t.replace(/^(?:make|build|create|generate|write|let'?s make)\b/i, "").trim().replace(/[.。]$/, "") || "this build";
  const kindWords = (t.match(/\b(?:site|app|page|web ?page|dashboard|tool|game|profile|blog)\b/gi) ?? []).map((w) => w.toLowerCase());
  const admits = kindWords.length ? `the build's parts: ${[...new Set(kindWords)].join(", ")}` : "the build's parts";
  return {
    slot,
    admits,
    extent: { from: 0, to: 6 },
    relation: "is a part of",
    composition: "parts compose the whole; none overlap in role",
    admission: "a part that serves the build's declared purpose, grounded in what is given",
    reopensOn: "a part that is thin, ungrounded, or changes the declared shape",
    // anchor and cardinality are genuinely open — the person must name them.
  };
};

function earnedCue({ task, chatHistory = [], surfVoidInfo = null, pathos = null, felt = null, trajectoryBoredom = null }) {
  try {
    const personClaims = (chatHistory ?? [])
      .filter((m) => m?.role === "user" && typeof m.content === "string" && m.content.trim())
      .slice(-3)
      .map((m) => m.content.trim());
    const _what = classifyAbsent(task);
    const GAP_PROSE = {
      no_material: {
        entity: "a source that names this person or entity",
        event:  "a source that records this event",
        fact:   "a source with material on this",
      },
      nothing_relevant_found: {
        entity: "material on this person in the sources",
        event:  "material about this event in the sources",
        fact:   "relevant material in the sources",
      },
      content_not_found: {
        entity: "this person's record in the sources",
        event:  "this event's record in the sources",
        fact:   "the relevant content in the sources",
      },
    };
    const _gk = surfVoidInfo?.gap;
    const _gp = _gk ? (GAP_PROSE[_gk]?.[_what] ?? _gk.replace(/_/g, " ")) : "nothing here answers it";
    const state = {
      personClaims,
      // THE FELT SHAPE (Abhinavagupta) — the conversation's own rhythm and
      // strain, as measured by the pathos organ on this very turn. Terry Gross
      // reads it: a flatline (no blink, no cut) means the exchange has gone
      // flat and she draws the guest out; strain at strict means the record
      // is contested and she holds the claim to its ground. The felt shape is
      // object-level, covert — never an apparatus word, never a role line.
      ...(pathos ? { felt: { strain: pathos.strain, flatline: pathos.rhythm.flatline ?? false, blinks: pathos.rhythm.blinks ?? 0 } } : {}),
      ...(felt ? { felt: { strain: felt.strain, flatline: felt.flatline ?? false, blinks: felt.blinks ?? 0 } } : {}),
      ...(surfVoidInfo ? { gaps: [_gp] } : {}),
      ...(surfVoidInfo ? { notEstablished: [_gp] } : {}),
    };
    // TRAJECTORY BOREDOM, folded into the same `felt` object pacing.js's
    // flatline already lands in (2026-09-17) — a DIFFERENT measurement (the
    // conversation's TURNS, not one text's sentence rhythm), same channel.
    // Merged rather than replacing `felt`, so a pacing flatline this same
    // turn is not silently dropped.
    if (trajectoryBoredom?.bored) {
      state.felt = { ...(state.felt ?? {}), trajectoryBored: true, trajectoryBasis: trajectoryBoredom.basis };
    }
    const bundle = cueBundle({ act: classifySpeech(task), state, depth: 1 });
    const mouth = String(bundle.mouth ?? "").trim();
    if (!mouth) return null;
    const leaks = bannedHits(mouth);
    if (leaks.length) return null; // a leaking cue is dropped, never shipped
    return { mouth, act: bundle.act, strain: bundle.strain, eligible: bundle.eligible };
  } catch {
    return null; // the cue must never break a turn
  }
}

function normalizePosPrior(prior, sourcePath) {
  if (!prior || prior.schema !== "POSPrior@1") throw new Error(`${sourcePath} is not a POSPrior@1 file`);
  if (prior.provenance?.source) return prior;
  if (prior.giver?.resource) {
    return { ...prior, provenance: { source: prior.giver.resource, url: prior.giver.url, license: prior.giver.resourceLicense, note: prior.giver.note } };
  }
  throw new Error(`${sourcePath} has neither provenance.source nor giver.resource`);
}

const emptyRetrieve = (_fold, evidence) => Object.freeze({
  schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]),
  expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]),
  unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]),
});

let _posPrior = null;
function getPosPrior() {
  if (_posPrior) return _posPrior;
  const p = DEFAULT_POS_PRIOR;
  if (!fs.existsSync(p)) throw new Error(`POS prior not found at ${p}`);
  _posPrior = normalizePosPrior(JSON.parse(fs.readFileSync(p, "utf8")), p);
  return _posPrior;
}

// The trained UD parser (95.2 UPOS / 81.2 UAS / 77.0 LAS held-out), loaded
// once and reused across every session — the model file is 16MB and never
// changes at runtime. A typed absence (missing file) degrades to "the
// perceiver below is not added," never a crash, matching getPosPrior's own
// discipline.
const DEFAULT_PARSER_MODEL = path.join(HERE, "native/priors/parser-eng-ewt.json");
let _englishParserModel = null;
function getEnglishParserModel() {
  if (_englishParserModel) return _englishParserModel;
  if (!fs.existsSync(DEFAULT_PARSER_MODEL)) return null;
  _englishParserModel = loadEnglishParserModel(JSON.parse(fs.readFileSync(DEFAULT_PARSER_MODEL, "utf8")));
  return _englishParserModel;
}

const MIN_RELATION_SURFACES = Number(process.env.ER7_MIN_RELATION_SURFACES ?? 2);

export function createSessionReader() {
  const POS_PRIOR = getPosPrior();
  const adapters = {
    revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: CANONICALIZATION_FLOOR }),
    retrieve: emptyRetrieve,
  };
  // The language dispatch (2026-09-16): all cognition reads GFP-shaped by
  // default; English-SVO comes online HERE because English ships a measured
  // RoleConfig@1 (native/priors/role-config-eng.json — UD_English-EWT gold,
  // never hand-typed). A language with no RoleConfig reads GFP. If the
  // prior file is missing, `roleConfig` stays null and the reader is GFP —
  // a typed absence, never a crash.
  let engRoleConfig = null;
  try {
    engRoleConfig = JSON.parse(fs.readFileSync(path.join(HERE, "native/priors/role-config-eng.json"), "utf8"));
  } catch {}
  const perceivers = [createCausalTextPerceiver({ minRelationSurfaces: MIN_RELATION_SURFACES, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING, reprojectEvery: Number(process.env.ER7_REPROJECT_EVERY ?? 10), language: "eng", roleConfig: engRoleConfig })];
  // Measured 2026-09-23 (reading-training audit): this perceiver alone
  // scores 0.9% recall / 18.5% precision on held-out core SVO extraction;
  // the trained parser below scores 74.0%/73.7%, confirmed real by a
  // scrambled-order null (p=1.9e-43) — github.com/clovenbradshaw-ctrl/
  // reading-training. Added ALONGSIDE, never replacing, the perceiver
  // above: both perceivers' candidates flow through the same existing
  // witness/admission/challenge pipeline unchanged, so nothing downstream
  // is bypassed. Trained on modern UD English-EWT — accuracy on older or
  // non-standard English registers is unmeasured and may be much lower;
  // this is a floor-raiser for the common case, not declared universal.
  // ER7_ENGLISH_PARSER_PERCEIVER=0 disables it instantly, no code revert.
  if (process.env.ER7_ENGLISH_PARSER_PERCEIVER !== "0") {
    const parserModel = getEnglishParserModel();
    if (parserModel) perceivers.push(createEnglishParserPerceiver({ model: parserModel, posPrior: POS_PRIOR }));
  }
  return createRecursiveReader({ perceivers, adapters });
}

// --- per-session reader state -------------------------------------------------
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ── PII AT ADMISSION (Goffman) ──────────────────────────────────────────────
// Scan material the moment it is ADMITTED — before it enters the corpus/fold —
// so PII is caught at the door, not after it has been read. Findings accumulate
// on the session (disclosed on the result). With ER7_PII_REDACT=1 the value is
// replaced in place, so the PII never enters the fold at all; the REDACTION
// table is the same table the detector uses, so they cannot drift.
const PII_REDACT = process.env.ER7_PII_REDACT !== "0";
function piiAdmit(session, text, sourceId, onNote) {
  let t = String(text ?? "");
  try {
    const r = piiFindings(t, { where: sourceId });
    if (r.findings.length) {
      if (!session.pii) session.pii = [];
      for (const f of r.findings) session.pii.push(f);
      if (onNote) onNote({ move: "pii_admitted", source: sourceId, counts: r.counts, redacted: PII_REDACT });
    }
    if (PII_REDACT) t = redactPii(t);
  } catch { /* the hook must never block an admission */ }
  return t;
}

// THE BEARING WALL: a session cannot be built without a clearance from the
// ethos (organs/ethos.js). requireClearance throws if it is missing, so the
// reader has a hard, structural dependency on the constitution — pull the
// ethos and the reader falls. Ethos comes before logos.
function getSession(sessionId, clearance, task) {
  requireClearance(clearance, task);
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.lastAccess > SESSION_TTL_MS) sessions.delete(id);
  }
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastAccess = now;
    s.clearance = clearance;
    return s;
  }
  const reader = createSessionReader();
  const entry = { reader, corpus: null, corpusIndex: null, lookIndex: null, lastChatText: "", turnCount: 0, lastAccess: now, indexSig: null, referents: null, webLedger: null, webSources: new Map(), field: null, shadow: [], pii: [], fileActivation: null, clearance, modelOverride: null, overrideBasis: null, lastEffectiveModel: null };
  sessions.set(sessionId, entry);
  return entry;
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}

// --- workspace (physics over real files) ---------------------------------------
// EOReader7 does not ask a model to browse or bookmark files (small local
// models cannot be trusted to tool-call). The proxy reads the files itself
// and admits them into a REAL corpus session (legacy host/corpus.js), then
// the REAL surf (surfTask, this file — native/organs/source.js's mechanical,
// model-free chunk+retrieve ladder, 2026-09-23) addresses, on every turn,
// the exact segment the question needs. The model receives the SURFED
// CONTENT ONLY — never an address, never a browse: "the model is given the
// content it needs when asked, as if from nowhere." The address belongs to
// the proxy's ledger, not to the model's context — a model that SAW the
// address would have something to confabulate about.

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__", ".cache", "coverage", ".DS_Store"]);
const SKIP_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp3", ".mp4", ".wav", ".ogg", ".mov", ".avi", ".lock", ".log", ".pyc", ".class", ".o", ".so", ".dylib", ".exe", ".dll"]);
const MAX_WORKSPACE_FILES = 200;
const MAX_FILE_CHARS = 40_000;
const MAX_WORKSPACE_CHARS = 200_000;
// Surfed-material cap — the PROMPT budget (PROMPT_MAX_CHARS) is the real
// ceiling; surf may fill up to that, so we are not timid with the window.
// Per-segment stays at one page of text (3000 chars) for latency; the total
// tracks the max prompt so material can genuinely fill the room the turn
// leaves after chat history.
const SURF_MAX_SEGMENTS = Number(process.env.ER7_SURF_MAX_SEGMENTS ?? 12);
const SURF_MAX_SEGMENT_CHARS = 3000;
const SURF_MAX_TOTAL_CHARS = Number(process.env.ER7_SURF_MAX_TOTAL_CHARS ?? 24000);

// SESSION-SCOPED CAPS (2026-09-22): `session.shadow` and `session.webSources`
// are per-session state kept in the live `sessions` Map (getSession) with no
// bound but the 30-minute idle TTL — every web fetch pushes/sets, nothing
// ever shifts/deletes. Measured live: a 20-turn session (no idle gap) grew
// promptTokens 1014→1755, relationEdges 24→64, and shadow sites 8→16 turn
// over turn, then the box hit 96% swap and Heimdall's own thrashing guard
// started rejecting turns with 503 memory_pressured — a real, triggerable
// leak, not a theoretical one. Capping is the SANCTIONED move, not a new
// risk: the shadow's own header (below, at its push site) already states
// "Clearing the shadow loses nothing: it rebuilds from the retained
// sources" — it is explicitly a derived, deletable projection. webSources
// holds real fetched text (composition/citation read it directly), so it is
// capped by RECENCY the same way stale pages already lose citability
// elsewhere in this file ("Stale pages (fetched turns ago) are not in this
// set, so they can never be cited by this turn") — evicting the oldest URL
// only removes what was already treated as stale, never today's material.
const MAX_SHADOW_SITES = 60;
const MAX_WEB_SOURCES = 60;
function capShadow(session) {
  if (session.shadow && session.shadow.length > MAX_SHADOW_SITES) {
    session.shadow.splice(0, session.shadow.length - MAX_SHADOW_SITES);
  }
}
function capWebSources(session) {
  while (session.webSources && session.webSources.size > MAX_WEB_SOURCES) {
    session.webSources.delete(session.webSources.keys().next().value);
  }
}

function isTextFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (SKIP_EXT.has(ext)) return false;
  return true;
}

// A bounded head probe decides whether a giant file is code-shaped — reading
// 4 KB of a 3.2 MB bundle to make the admission decision, never the whole
// thing at the scan stage (the bounded read happens at admit time).
const HEAD_PROBE_CHARS = 4096;
function headOf(abs) {
  try { return fs.readFileSync(abs, "utf8").slice(0, HEAD_PROBE_CHARS); } catch { return ""; }
}

function workspaceEntries(absRoot, onNote, { maxFiles = MAX_WORKSPACE_FILES, maxChars = MAX_WORKSPACE_CHARS } = {}) {
  const entries = [];
  let readChars = 0;
  const walk = (dir, depth) => {
    if (entries.length >= maxFiles) return;
    if (depth > 8) return;
    let names;
    try {
      names = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    names.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const ent of names) {
      if (entries.length >= maxFiles) return;
      if (ent.name.startsWith(".") && !SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        walk(full, depth + 1);
        continue;
      }
      if (!ent.isFile() || ent.isSymbolicLink()) continue;
      if (!isTextFile(ent.name)) continue;
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.size > MAX_FILE_CHARS) {
        // A giant file is not silently dropped. If its head scans as a code
        // hunk (a minified bundle, a build artifact — the what-organ's
        // material, S128), admit a BOUNDED slice of it under a `giant` flag so
        // the reading steps code-grain encounters over a disclosed window
        // instead of skipping the file or choking on a monster "sentence".
        if (isCodeHunk(headOf(full))) entries.push({ abs: full, rel: full.slice(absRoot.length).replace(/^\//, ""), size: stat.size, mtimeMs: stat.mtimeMs, giant: true });
        continue;
      }
      if (readChars + stat.size > maxChars) {
continue;
      }
      readChars += stat.size;
      entries.push({ abs: full, rel: full.slice(absRoot.length).replace(/^\//, ""), size: stat.size, mtimeMs: stat.mtimeMs });
    }
  };
  walk(absRoot, 0);
  return entries;
}

// Admit (or re-admit changed) workspace files into the session's REAL corpus.
// File content is stepped through the fold reader once per admission so the
// holograph/hyperlexicon are built from disk text, not from a model's retell.
async function admitWorkspaceEntries(session, entries, onNote) {
  if (!entries.length) return { admitted: 0, chars: 0 };
  if (!session.corpus) session.corpus = createCorpusSession();
  const index = session.corpusIndex ?? new Map();
  let admitted = 0;
  let chars = 0;
  let looked = 0;
  for (const e of entries) {
    const prev = index.get(e.rel);
    if (prev && prev.size === e.size && prev.mtimeMs === e.mtimeMs) continue;
    const text = readWorkspaceFile(e, onNote);
    if (text == null) continue;
    const res = admitChunked(session.corpus, { text: piiAdmit(session, text, e.rel, onNote), sourceId: e.rel });
    index.set(e.rel, { size: e.size, mtimeMs: e.mtimeMs });
    touchFileActivation(session, e.rel, e.giant ? "giant-code" : "workspace");
    admitted += res.deduped ? 0 : 1;
    chars += text.length;
    // A code-shaped file is stepped at CODE grain (adapters/code/encounters.js
    // — statement/line granular, hard-capped, byte-anchored), never through
    // the prose sentence machinery a minified line of 1.8 MB would choke on.
    const encounters = isCodeHunk(text)
      ? codeEncounters(text, { source: `workspace:${e.rel}`, offset: 0 })
      : textEncounters(text, { source: `workspace:${e.rel}`, offset: 0 });
    if (e.giant && onNote) {
      onNote({ move: "giant_code_admitted", rel: e.rel, bytes: e.size, scannedChars: text.length, skippedChars: Math.max(0, e.size - text.length) });
    }
    for (const enc of encounters) {
      const turn = await session.reader.step(enc);
      if (turn?.tasks?.open && onNote) {
        for (const t of turn.tasks.open) {
          onNote({ move: "open_question", rel: e.rel, task_id: t.task_id ?? null, description: t.description ?? null });
        }
      }
      await yieldToEventLoop();
    }
    // LOOK AT IT — the native "looking" capacity, ported from the fold's
    // /visual machinery. Text whose formatting the plain-text reader is
    // reading WRONG (a table, a column, box-drawing, sub-sentence lines)
    // is rendered to an image and read by CV/OCR + a vision model, and the
    // looked-at reading is admitted as its own source — so the model
    // speaks from what the thing IS, not from the flat bytes it misread.
    // A giant code hunk is never looked at: minified source is not a
    // formatting misread, and rendering megabytes of it would be pure waste.
    if (onNote && !e.giant) {
      const gate = shouldLook({ fileName: e.rel, text });
      if (gate.look && session.lookIndex?.get(e.rel) !== `${e.size}:${e.mtimeMs}`) {
        // LaVar tells us if we are reading well — the misread-formatting
        // verdict is exactly what triggers the looking pass below.
        try {
          const grade = lavarGradeReading({ source: e.rel, text, propositions: [], weirdFormattingScore });
          onNote({ move: "lavar_reading", rel: e.rel, well: grade.readingWell, shouldLook: grade.shouldLook, signals: grade.signals ?? [], basis: grade.basis });
        } catch { /* grading must never block looking */ }
        try {
          const lookedText = await lookAtText(text, { source: e.rel, label: `er7-${e.rel.replace(/[^a-z0-9]+/gi, "-")}` });
          if (lookedText.text) {
            const lookRes = admitChunked(session.corpus, { text: piiAdmit(session, lookedText.text, `${e.rel}::look`, onNote), sourceId: `${e.rel}::look` });
            if (!lookRes.deduped) {
              looked += 1;
              const lookEncounters = textEncounters(lookedText.text, { source: `look:${e.rel}`, offset: 0 });
              for (const enc of lookEncounters) { await session.reader.step(enc); await yieldToEventLoop(); }
            }
            if (!session.lookIndex) session.lookIndex = new Map();
            session.lookIndex.set(e.rel, `${e.size}:${e.mtimeMs}`);
            onNote({ move: "look", rel: e.rel, reason: gate.reason, signals: gate.signals ?? [], boxes: lookedText.boxCount ?? 0, vision: Boolean(lookedText.visionRead) });
          }
        } catch (err) {
          if (onNote) onNote({ move: "look_error", rel: e.rel, error: err.message });
        }
      }
    }
  }
  session.corpusIndex = index;
  return { admitted, chars, looked };
}

// Look at the workspace's IMAGE files (currently skipped by the text scan —
// isTextFile refuses them) so the reading can actually SEE a diagram, a
// screenshot, a chart. Each image's looked-at reading is admitted as its own
// source, exactly like a text file. Bounded: MAX_LOOK_IMAGES per turn, and
// only files this session has not already looked at.
const MAX_LOOK_IMAGES = 6;
async function lookWorkspaceImages(session, absRoot, onNote) {
  if (!fs.existsSync(absRoot)) return { looked: 0 };
  const images = [];
  const walk = (dir, depth) => {
    if (depth > 6 || images.length >= MAX_LOOK_IMAGES) return;
    let names;
    try { names = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    names.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const ent of names) {
      if (images.length >= MAX_LOOK_IMAGES) return;
      if (ent.name.startsWith(".") || SKIP_DIRS.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { walk(full, depth + 1); continue; }
      if (!ent.isFile() || ent.isSymbolicLink()) continue;
      if (!isImageFileName(ent.name)) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.size > 12 * 1024 * 1024) continue; // a 12MB image is not something to look at every turn
      images.push({ abs: full, rel: full.slice(absRoot.length).replace(/^\//, ""), size: stat.size, mtimeMs: stat.mtimeMs });
    }
  };
  walk(absRoot, 0);
  let looked = 0;
  for (const img of images) {
    const key = `${img.size}:${img.mtimeMs}`;
    if (session.lookIndex?.get(img.rel) === key) continue;
    try {
      const result = await lookAtImage(img.abs, { name: img.rel });
      // THE CONTINUOUS LEARNING LOOP: whatever the look found — the CV
      // parent's named boxes (the expensive path) or the child's own
      // fast-path memory — feeds the mnemonic store, so the next image is
      // recognized from memory alone, without the CV model (the pipeline
      // organ's own report says what was learned and from which seam).
      try {
        const mnemonic = await import("./native/organs/mnemonic-pipeline.js");
        const mstore = mnemonic.loadStore();
        const learned = await mnemonic.learnFromLook(mstore, result);
        mnemonic.saveStore(mstore);
        if (learned.taught > 0 && onNote) onNote({ move: "mnemonic_taught", rel: img.rel, taught: learned.taught, from: learned.from });
        if (onNote && learned.from === "fast-path") onNote({ move: "mnemonic_memory", rel: img.rel, regions: learned.absorbedRegions });
      } catch {
        // the mnemonic store is optional machinery — its absence never
        // breaks the reading
      }
      if (result.text) {
        if (!session.corpus) session.corpus = createCorpusSession();
        const res = admitChunked(session.corpus, { text: piiAdmit(session, result.text, `${img.rel}::look`, onNote), sourceId: `${img.rel}::look` });
        if (!res.deduped) {
          looked += 1;
          const encs = textEncounters(result.text, { source: `look:${img.rel}`, offset: 0 });
          for (const enc of encs) { await session.reader.step(enc); await yieldToEventLoop(); }
        }
        if (!session.lookIndex) session.lookIndex = new Map();
        session.lookIndex.set(img.rel, key);
        if (onNote) onNote({ move: "look_image", rel: img.rel, boxes: result.boxCount ?? 0, connectors: result.edgeCount ?? 0, vision: Boolean(result.visionRead), settled: result.visionSettled ?? true, chars: result.text.length });
      }
    } catch (err) {
      if (onNote) onNote({ move: "look_error", rel: img.rel, error: err.message });
    }
  }
  return { looked };
}

function readWorkspaceFile(entry, onNote) {
  try {
    const text = fs.readFileSync(entry.abs, "utf8").slice(0, MAX_FILE_CHARS);
    return text;
  } catch (err) {
    if (onNote) onNote({ move: "read_error", rel: entry.rel, error: err.message });
    return null;
  }
}

// ── the field: surf's SECOND witness (GFP Pass 35, relative.js) ────────────
// The exact-term ladder (surfTask's own chunkSource+retrieve) is a key, a
// lookup, exact or nothing. The field is the OTHER way: recall by partial-cue resemblance,
// resolution by state. When the ladder returns a void or nothing, the field
// recalls what the question's words resemble — measured (the-fold c232779):
// lexical 215/240, the field 240/240 on the GFP battery.
function ensureField(session) {
  if (session.field) return session.field;
  const f = new Field({ spread: 0.25, steps: 1 });
  if (session.corpus) {
    for (const [sourceId, doc] of session.corpus.documents.entries()) {
      const text = String(doc?.text ?? doc ?? "").trim();
      if (!text) continue;
      // Admit as SENTENCE-CHUNKS, not whole docs: the field needs many nodes
      // (a rich vocabulary) for the null band to be meaningful — a handful of
      // whole documents makes every random cue overlap by topic word. Chunks
      // keep the temporal-adjacency synapses (sentences joined in order) that
      // the field's spread uses.
      const sentences = segmentSentencesOmni(text).filter((s) => s.length > 30);
      for (const s of sentences) f.admit(s, { sourceId });
    }
  }
  session.field = f;
  return f;
}

function fieldRecall(session, cue, { max = SURF_MAX_SEGMENTS } = {}) {
  try {
    const f = ensureField(session);
    if (!f.size) return { recalled: [], band: null };
    const words = cue.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 2).length || 1;
    const band = f.nullBand(words, { draws: 120 });
    const r = f.recallAgainstNull(cue, { band });
    if (r.kind !== "figure") return { recalled: [], kind: r.kind, band: r.band };
    const ranked = r.ranked.slice(0, max).filter((x) => x.activation > 0);
    const recalled = ranked.map((x) => ({
      text: String(x.node.text ?? "").slice(0, SURF_MAX_SEGMENT_CHARS),
      _ledger: { source: x.node.payload?.sourceId ?? null, heading: null, addressed_by: "field", bytes: null, activation: x.activation },
    }));
    return { recalled, kind: "figure", band: r.band };
  } catch {
    return { recalled: [] };
  }
}

// THE CONVERSATION IS NOT MATERIAL. The chat's own text is admitted to the
// corpus so the reader folds it (and the surfer can address prior turns),
// but it is never WRITE-FROM ground: a projection asked with no other
// material must not count its own task text as grounding, or the
// multi-section pipeline churns ungrounded prose against an empty ground.
const isConversationSource = (sourceId) => String(sourceId ?? "").startsWith("chat:");

// THE SURF — the real mechanical address ladder against the session's corpus.
// Returns the addressed segment(s) TEXT ONLY. The address (source, heading,
// byte range, addressed_by) is reported to the ledger/notes — it is NEVER
// placed in the model's context.
//
// NATIVE ONLY (2026-09-23, user direction: "rip out all the surf thats not
// happening in eoreader7... the fold is just a surface" — eoreader7 IS the
// engine, and a call into the frozen legacy submodule is not "happening in
// eoreader7"). The exact-term ladder used to be legacy-eoreader6.1/packages/
// host/surfer.js's executePrompt. Found live, minimally reproduced (a
// standalone script, no mocks, the real executePrompt and the real
// engineRelationsFor over a two-paragraph Hamlin/Johnson specimen): its
// windowed fallback cut its own returned text MID-WORD (byte_start landing
// one character into "Hamlin", producing "amlin"), and the relation reader
// correctly refused to read the lowercase fragment as a name — a controlled
// A/B (restoring only the single dropped letter) recovered exactly the one
// lost fact and nothing else changed. Rather than patch a frozen legacy
// organ in place (Constitution I.2; the ratchet, P69 — retire only via a
// passing native replacement), the ladder is now native/organs/source.js's
// own chunkSource (real paragraph/sentence-boundary chunking, so a returned
// window cannot start or end mid-word by construction) + retrieve
// (mechanical term-overlap ranking, no hand-picked relevance floor — the
// SAME organ the-fold's own app.js already uses successfully for this exact
// question shape). The FIELD resemblance-recall witness below (relative.js's
// Field, already native, GFP Pass 35) and the composition-mode multi-
// document branch (salientDocsForTask, already native) are unchanged — only
// the exact-address ladder's own implementation moved off the legacy submodule.
function surfTask(session, task, onNote, { composition = false } = {}) {
  if (!session.corpus || session.corpus.documents.size === 0) {
return { segments: [], void: true, reason: "no corpus yet" };
  }
  // COMPOSITION SURF: an essay needs MULTIPLE sources — one windowed segment
  // per corpus document (the web pages each carry their own theme), not the
  // single best address the one-shot organ returns. Each essay section then
  // has its own grounded source. SALIENCE-GATED (2026-09-17): "per document"
  // means per document that passes the task's coarse screen, ranked by how
  // much of the task's vocabulary it carries — never every retained doc in
  // insertion order (the measured door for stale material). A doc that
  // fails the screen is not a source for THIS artifact, however many turns
  // ago it was fetched.
  if (composition && session.corpus.documents.size > 1) {
    const segments = [];
    const salient = salientDocsForTask(session.corpus.documents, task);
    for (const d of salient) {
      if (segments.length >= SURF_MAX_SEGMENTS) break;
      const capped = d.text.slice(0, SURF_MAX_SEGMENT_CHARS);
      segments.push({
        text: capped,
        _ledger: { source: d.sourceId, heading: null, addressed_by: "composition", bytes: [0, capped.length] },
      });
    }
    if (segments.length) {
      if (onNote) onNote({ move: "surfaced", operator: "SEG", fan: segments.length, docs: session.corpus.documents.size, composition: true });
      return { segments, void: false, addressedBy: true, composition: true };
    }
  }
  // THE NATIVE LADDER (2026-09-23, replacing the legacy executePrompt call
  // — see this function's own header comment for the full account: the
  // legacy ladder's windowed fallback was found, live, cutting a name
  // mid-word ("Hamlin" -> "amlin"), silently losing the one edge a question
  // needed, and this repo never patches a frozen legacy organ in place).
  // native/organs/source.js's chunkSource splits on real paragraph/sentence
  // boundaries, so a returned chunk can never start or end mid-word by
  // construction; retrieve() ranks by the question's own term overlap, with
  // no hand-picked relevance floor — the SAME organ the-fold's own app.js
  // already uses successfully for this exact question shape.
  const allChunks = [];
  for (const [sourceId, doc] of session.corpus.documents.entries()) {
    if (isConversationSource(sourceId)) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text) continue;
    allChunks.push(...chunkSource(sourceId, text));
  }
  const hits = retrieveChunks(allChunks, task, SURF_MAX_SEGMENTS);
  if (onNote) onNote({ move: "surfaced", operator: "CONTENT", fan: hits.length, docs: session.corpus.documents.size });

  if (!hits.length) {
    // SECOND WITNESS: the exact-term ladder found nothing — the field
    // recalls what the question's words RESEMBLE. A real recall is kept
    // (addressed_by "field"); a recall inside the null band is not a
    // recall, and the void is disclosed as a void, never dressed up as a
    // match.
    const field = fieldRecall(session, task);
    const recalled = field.recalled.filter((r) => !isConversationSource(r._ledger?.source));
    if (recalled.length) {
      if (onNote) onNote({ move: "surfaced", operator: "FIELD", fan: recalled.length, docs: session.corpus.documents.size, kind: field.kind, band: field.band ? { hi: field.band.hi } : null });
      return { segments: recalled, void: false, addressedBy: true, addressedByWitness: "field", band: field.band ? { hi: field.band.hi } : null };
    }
    const gap = "content_not_found";
    const reason = "no chunk shares a term with the question, and nothing resembled it above the field's own null";
    if (onNote) onNote({ move: "void", gap, reason });
    return { segments: [], void: true, gap, reason };
  }

  // WEAK-MATCH BOOST: exact term overlap can still be thin (few shared
  // terms) — ask the field whether the cue RESEMBLES a stronger passage the
  // exact ladder did not surface. The field joins the offered set, never
  // replaces it; only a recall above the null band counts (measured, never
  // chosen), and it never duplicates a source the ladder already selected.
  const existingSources = new Set(hits.map((c) => String(c.ref).split("#")[0]));
  const field = fieldRecall(session, task);
  const boosted = field.recalled.filter((r) => !isConversationSource(r._ledger?.source) && !existingSources.has(r._ledger?.source));
  if (boosted.length && onNote) onNote({ move: "surfaced", operator: "CONTENT+FIELD", fan: hits.length + boosted.length, kind: field.kind, boost: boosted.length });

  const segments = [];
  let total = 0;
  for (const c of hits) {
    const text = String(c.text ?? "").slice(0, SURF_MAX_SEGMENT_CHARS);
    if (!text) continue;
    total += text.length;
    if (total > SURF_MAX_TOTAL_CHARS) break;
    // address ledger, never model context
    segments.push({ text, _ledger: { source: String(c.ref).split("#")[0] ?? null, heading: null, addressed_by: "content", bytes: [c.start ?? null, c.end ?? null] } });
  }
  for (const r of boosted) {
    const text = String(r.text ?? "").slice(0, SURF_MAX_SEGMENT_CHARS);
    if (!text) continue;
    total += text.length;
    if (total > SURF_MAX_TOTAL_CHARS) break;
    segments.push({ text, _ledger: { source: r._ledger?.source ?? null, heading: null, addressed_by: "field", bytes: [null, null] } });
  }
  return { segments, void: false, addressedBy: segments.length > 0 };
}

// --- ollama -------------------------------------------------------------------

const PREFLIGHT_CACHE_MS = 4000;
let _preflightCache = { ts: 0, models: null };
async function ollamaReachable({ timeoutMs = 3000 } = {}) {
  const now = Date.now();
  if (_preflightCache.models !== null && now - _preflightCache.ts < PREFLIGHT_CACHE_MS) {
    return _preflightCache.models;
  }
  try {
    const tags = await offeredOllamaModels({ timeoutMs });
    const models = Array.isArray(tags?.models) ? tags.models : [];
    _preflightCache = { ts: now, models };
    return models;
  } catch {
    _preflightCache = { ts: now, models: null };
    return null;
  }
}

// --- concurrency gate --------------------------------------------------------
// N slots PER MODEL for Ollama generation. Ollama runs CPU-only with
// OLLAMA_NUM_PARALLEL=4 (launchctl env, set 2026-09-16) so up to
// GENERATION_SLOTS_PER_MODEL requests on the SAME model genuinely run side
// by side instead of one blocking the rest; generation still never shares a
// slot ACROSS models — a long turn on gemma2:2b never blocks a turn on
// qwen3:30b, since a different model is a different lane. Keep this at or
// below whatever OLLAMA_NUM_PARALLEL actually is, or requests queue inside
// Ollama invisibly instead of here.
const GENERATION_SLOTS_PER_MODEL = Number(process.env.ER7_GENERATION_SLOTS ?? 4);
const generationSlots = new Map(); // model -> in-flight count
export function generationSlotHealth() {
  const out = {};
  for (const [model, count] of generationSlots) out[model] = count > 0 ? "busy" : "idle";
  return out;
}
async function withSlot(model, work) {
  while ((generationSlots.get(model) ?? 0) >= GENERATION_SLOTS_PER_MODEL) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  generationSlots.set(model, (generationSlots.get(model) ?? 0) + 1);
  try {
    return await work();
  } finally {
    const next = (generationSlots.get(model) ?? 1) - 1;
    if (next <= 0) generationSlots.delete(model);
    else generationSlots.set(model, next);
  }
}

// Yield to the event loop between CPU-heavy steps so other sessions can
// make progress on their own reading pipelines.
function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}

export async function offeredOllamaModels({ timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA}/api/tags`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`ollama /api/tags: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Keep a model resident: a minimal /api/generate against it resets Ollama's
// keep_alive countdown without doing real work. Bounded time, cached in-flight
// so an interval tick can't stack duplicate loaders on the same model. Names
// come in er7-aliased and are un-prefixed for the raw Ollama endpoint.
const _hot = new Set();
const _hotting = new Map();
const hotModelName = (model) => String(model ?? "").replace(/^er7:/, "");
export async function keepModelHot(model) {
  const m = hotModelName(model);
  if (!m) return;
  // Opencode-served models (Claude/DeepSeek) have no Ollama copy: pinging
  // Ollama with their id would only log a 404 every interval tick. Same for
  // the direct Anthropic lane — there is no local copy to hold.
  if (upstreamModelFor(m)) return;
  if (upstreamAnthropicModelFor(m)) return;
  if (OLLAMA_KEEP_ALIVE_S <= 0) return;
  _hot.add(m);
  if (_hotting.has(m)) return _hotting.get(m);
  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 300000);
    try {
      const res = await fetch(`${OLLAMA}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: m,
          prompt: "",
          stream: false,
          keep_alive: OLLAMA_KEEP_ALIVE_S + "s",
          // Declare NO window (2026-09-21): the resident copy runs under the
          // server's single OLLAMA_CONTEXT_LENGTH, exactly like real turns.
          // A warm-load that declared its own num_ctx reloaded the runner
          // whenever the real turns disagreed — the reload storm this line
          // used to feed. OLLAMA_CONTEXT_LENGTH caps the KV squat; no caller
          // needs to pin anything.
          options: { num_predict: 1 },
        }),
      });
      if (!res.ok) throw new Error(`keep-warm /api/generate: ${res.status}`);
      await res.arrayBuffer();
      return true;
    } catch (err) {
      console.error(`[keepModelHot] ${m}: ${err.message}`);
      return false;
    } finally {
      clearTimeout(timer);
      _hotting.delete(m);
    }
  })();
  _hotting.set(m, p);
  return p;
}

// Models worth holding hot even before the first request (ER7_HOT_MODELS:
// comma-separated). Warmed at proxy boot, then kept by the interval below.
export function hotModelSet() {
  for (const m of String(process.env.ER7_HOT_MODELS ?? "")
    .split(",").map((s) => hotModelName(s)).filter(Boolean)) _hot.add(m);
  return new Set(_hot);
}

const CALL_MAX_TOKENS = 1024;
const CALL_RETRIES = 2;
// TRAFFIC-JAM DISCIPLINE (2026-09-21): a retry is load, and a retry fired
// into a box that is already thrashing is load added to the very failure it
// exists to ride out. Before re-firing, ASK the box: if memory is pressured
// or the CPU is pegged, don't retry at all — fail fast with a typed throw so
// heimdall's gate 429s the next arrival instead of this turn stacking another
// model load on top of the one that just died. When the box is merely busy,
// back off with an exponential-ish wait so a stalled lane gets a real chance
// to finish instead of being re-fired into its own tail. The measured reason:
// under swap churn a first-byte timeout fired again at once, reloaded the
// model, and added a fresh ~7s load to a box that had none to give.
const RETRY_BACKOFF_MS = Number(process.env.ER7_RETRY_BACKOFF_MS ?? 1500);
async function retryUnderLoad(attempt, model, { local = false } = {}) {
  // LOCAL LANE ONLY (2026-09-21): the pressured-throw is for a retry that
  // would LOAD a model into a thrashing box — that is load added to the very
  // failure it rides out. Remote lanes (anthropic/opencode) never touch this
  // box, so local pressure must not gate them (the fast-pass law: a remote
  // mouth is never refused on local saturation). They still back off.
  if (local) {
    // The box's own word, read through heimdall's lazy import — never through
    // this caller's memory of it. Unknown pressure never convicts: an
    // unreadable vitals table is "not pressured", so a healthy box is never
    // slowed by a failed read.
    let pressured = false;
    try {
      const h = await import("./heimdall.mjs");
      const v = h.readVitals?.() ?? null;
      pressured = (h.memoryPressured?.(v) ?? false) || (h.isBoxSaturated?.(v) ?? false);
    } catch { pressured = false; }
    // ER7_PRESSURE_HOLD=0 is a HARNESS knob for measured test runs on a box
    // whose swap is chronically high (2026-09-21: swap at 94% for hours, so
    // every first-byte timeout ended a run before its fold — the harness was
    // measured, not the pipeline). Production leaves it on.
    if (pressured && (process.env.ER7_PRESSURE_HOLD ?? "1") !== "0") {
      throw Object.assign(new Error(`box is pressured — heimdall holds the turn; retry later (attempt ${attempt + 1} of ${CALL_RETRIES} not re-fired into the storm)`), {
        code: "ERR_BOX_PRESSURED", retryable: false, retryAfterS: 30,
      });
    }
  }
  // Busy but not pressured: give the lane room before re-firing. The wait
  // grows with the attempt so a twice-failed draw backs off harder instead of
  // hammering the same dead lane.
  await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * (attempt + 1)));
}
// A verdict answer is a JUDGMENT (YES/NO + a reason), never a production —
// small budget, no long-extend (see the extendable exclusion below).
const VERDICT_MAX_TOKENS = 200;
// The LONG flavor of long-form: a single answer that goes further than chat
// provides (an extended response, no artifact, no ledger). One bounded draw
// at a generous budget — the void is "answer thoroughly", filled in one
// sitting rather than section by section.
const LONG_MAX_TOKENS = Number(process.env.ER7_LONG_MAX_TOKENS ?? 2600);
// Degrees in Kelsen (K°): how tightly the composition is bound to the
// material's normative ground — Kelsen's Stufenbau, where validity flows
// down a hierarchy of degrees and each level is bound by the norm above.
// HIGH Kelsen-degrees (the default) — literal, grounded, faithful to the
// retained text. LOWER Kelsen-degrees let the model compose more
// IMPRESSIONISTICALLY (freer, looser prose) at the cost of faithfulness.
// This is our own gauge, driven by the SHAPE of the target (see
// kelsenFromShape), not a physics metaphor. ER7_KELSEN sets the default; a
// caller may pass kelsen per turn. 1.0 = fully bound, 0.1 = fully free.
const DEFAULT_KELSEN = Number(process.env.ER7_KELSEN ?? 0.9);
// A MAX prompt budget, not a timid one: the context is filled to near this
// ceiling every turn, chat history with precedence (the turn's own recent
// line of talk is what continuity lives on), then masked/grounded material
// fills the room that remains. text length ≈ 4 chars/token. The server-side
// OLLAMA_CONTEXT_LENGTH must cover this + output so the budget is actually
// reachable.
// Sized for OLMo 2 7B's 4096-token window (the proxy's default model):
// 4096 - 1024 output = 3072 prompt tokens; at the conservative 3 chars/token
// used below that is 9216 chars. gemma2:2b's 8192 window was the prior budget.
const PROMPT_MAX_CHARS = Number(process.env.ER7_MAX_PROMPT_CHARS ?? 9216);
// ONE WINDOW FOR THE WHOLE BOX, DECIDED BY THE SERVER (2026-09-21). The
// 2026-09-15 attempt made each caller DECLARE the same window — but declared
// windows only agree while every caller remembers to declare, and the box
// still reloads whenever any caller forgets or disagrees. Measured on the
// live server the same day: a call carrying `num_ctx: 8192` while the runner
// sits at the server default (OLLAMA_CONTEXT_LENGTH) forces a full reload
// (~1.2s, discarding the prompt cache); 23 such reloads in one session.
//
// The fix is to declare NOTHING on every caller. Ollama then loads the model
// once, at the server's single OLLAMA_CONTEXT_LENGTH, and no request can
// disagree with any other — the window becomes unanimous by construction.
// The proxy's budget guarantee holds because OLLAMA_CONTEXT_LENGTH is set
// (setup-proxy.sh) to cover PROMPT_MAX_CHARS + output; a deployment that
// wants a different ceiling changes that ONE server value, never a caller.
const MSG_OVERHEAD_CHARS = 64;
// Post-processing latency guard: this many ms max per turn for the pyodide
// lint + dependency reorder. Warmed at boot; if it ever exceeds this, the
// original text is returned untouched so turns never stall on the tooling.
const POSTPROCESS_TIMEOUT_MS = Number(process.env.ER7_POSTPROCESS_TIMEOUT_MS) || 3000;
// The discourse at three resolutions (vendored the-fold resolutions.js, P171):
// 0 = nearest verbatim only, 1 = + atmosphere, 2 = + lens, 3 = + paradigm.
const RESOLUTIONS_LEVEL = (() => { const raw = process.env.ER7_RESOLUTIONS; if (raw === undefined || raw === null || raw === "") return 3; const v = Number(raw); return [0, 1, 2, 3].includes(v) ? v : 3; })();
// The KELSEN MODALITY — the norm-hierarchy linter's force. Default (1) is the
// hyper-grounded posture: conflicting claims resolve by the declared order,
// and resolutions are shown. For CREATIVE work (a poem, a speculative piece,
// a fiction) the modality is turned DOWN (0 or 0.5): the linter still runs
// and names conflicts, but a tie or an unresolved pair is not a failure —
// creativity may hold tension, never a silent pick. ER7_KELSEN_MODALITY.
const KELSEN_MODALITY = (() => { const v = Number(process.env.ER7_KELSEN_MODALITY ?? ""); return [0, 0.5, 1].includes(v) ? v : 1; })();

export async function* streamOllamaChat(model, messages, { maxTokens, json, onNote, kelsen, logitsBias, signal, stop } = {}) {
  // ANTIStrauss — the safety-and-ethics gate (native/the-fold/antistrauss.mjs).
  // THIS is the choke point every real model call in the proxy passes
  // through (draw() → runProxyTurn → here). The gate settles a physics
  // verdict against the prompt BEFORE anything reaches Ollama, and refuses
  // the call (typed ERR_ANTISTRAUSS_BLOCKED) when the standing law is
  // contravened. forceBlock:true means ER7_ANTISTRAUSS=off NEVER opens this
  // path (nor the output guard below) — `off` needs the allowlist file AND
  // a non-answer path. Do not add an upstream model call that skips this line.
  const gate = antistrauss.gate({ model, messages, route: "chat" }, { forceBlock: true });
  if (!gate.allow) {
    throw Object.assign(new Error(gate.reason), { code: "ERR_ANTISTRAUSS_BLOCKED", antistrauss: gate.verdict });
  }
  // ── ANTIStrauss OUTPUT GUARD (streaming) ───────────────────────────────
  // Model output is re-scanned BEFORE it reaches the caller: reviewBlock()
  // re-runs the same law classes over what the model actually emitted.
  // Chunks are held back OUTPUT_HOLD_CHARS so a blocked span is detected
  // before its bytes are yielded — the already-yielded prefix always passed
  // the check, the offending tail is discarded, and a refusal + note
  // replaces it (block mode; log mode, kept for evals, only notes).
  // Per-chunk probes scan a bounded tail window with audit:false; the full
  // buffer is settled once, at finish/trigger, so the audit trail carries
  // the exact digest.
  const OUTPUT_HOLD_CHARS = 1000;
  const OUTPUT_SCAN_WINDOW = 2000;
  const refusalFor = (chk) =>
    `I can't provide that. [Note: the model's output was withheld by the safety-and-ethics gate (AntiStrauss): ${chk.hits.map((h) => h.label ?? h.class).join(", ")}. The full output digest is in antistrauss-log.jsonl.]`;
  let outBuf = "";
  let outYielded = 0;
  let outBlocked = null;
  const noteOutputBlocked = (chk) => {
    if (onNote) { try { onNote({ move: "antistrauss_output_blocked", classes: chk.hits.map((h) => h.class), labels: chk.hits.map((h) => h.label ?? h.class), mode: chk.effectiveMode }); } catch { /* notes never break a turn */ } }
  };
  // Accept one raw content chunk. Returns { emit, blocked }: emit is
  // safe-to-yield text ("" when nothing is releasable yet); blocked means
  // the tail tripped the gate and the caller must stop the upstream, yield
  // the refusal, and return.
  function guardAccept(raw) {
    if (outBlocked) return { emit: "", blocked: true };
    outBuf += raw;
    const probe = antistrauss.reviewBlock(outBuf.slice(-OUTPUT_SCAN_WINDOW), { model, route: "chat", forceBlock: true, audit: false });
    if (probe.blocked && probe.replace) {
      // Settle the FULL buffer once for the audit trail, then cut the stream.
      outBlocked = antistrauss.reviewBlock(outBuf, { model, route: "chat", forceBlock: true });
      noteOutputBlocked(outBlocked);
      return { emit: "", blocked: true };
    }
    const safe = Math.max(outYielded, outBuf.length - OUTPUT_HOLD_CHARS);
    const emit = outBuf.slice(outYielded, safe);
    outYielded = safe;
    return { emit, blocked: false };
  }
  // End of stream: flush the held tail, or replace it when it contravenes.
  // Returns { emit, blocked, refusal } — exactly one of emit/refusal is set.
  function guardFinish() {
    if (outBlocked) return { emit: "", blocked: true, refusal: refusalFor(outBlocked) };
    const final = antistrauss.reviewBlock(outBuf, { model, route: "chat", forceBlock: true });
    if (final.blocked && final.replace) {
      outBlocked = final;
      noteOutputBlocked(final);
      return { emit: "", blocked: true, refusal: refusalFor(final) };
    }
    if (final.blocked && !final.replace && onNote) {
      try { onNote({ move: "antistrauss_output_would_block", classes: final.hits.map((h) => h.class), mode: final.effectiveMode }); } catch { /* notes never break a turn */ }
    }
    return { emit: outBuf.slice(outYielded), blocked: false, refusal: "" };
  }
  // Audit accumulation for the post-call review row (digest-only, never raw).
  let emitted = [];
  const finishReview = (done) => {
    antistrauss.review({ model, messages, output: emitted.join(""), route: "chat", verdict: gate.verdict, ok: done, outputBlocked: !!outBlocked });
  };
  // ── ANTHROPIC LANE (direct, ANTHROPIC_API_KEY) ─────────────────────────
  // Checked BEFORE the opencode lane: when both could serve the same Claude
  // id, the direct key wins — a token-usage comparison must measure the
  // frontier model, not the aggregator. Same gate (above), same yield
  // contract, same heimdall account (ungated: the call never touched the
  // local box — no VRAM, no keep-alive, no reload).
  const anthropicRoute = upstreamAnthropicModelFor(model);
  if (anthropicRoute) {
    if (onNote) onNote({ move: "anthropic_lane", provider: anthropicRoute.providerID, model: anthropicRoute.modelID });
    for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
      try {
        for await (const chunk of streamAnthropicText(anthropicRoute, messages, { maxTokens: maxTokens ?? CALL_MAX_TOKENS, kelsen: kelsen ?? null, signal, onNote })) {
          if (typeof chunk === "string") {
            emitted.push(chunk);
            const g = guardAccept(chunk);
            if (g.emit) yield g.emit;
            if (g.blocked) {
              yield refusalFor(outBlocked);
              yield { done: true, outputBlocked: true, prompt_eval_count: 0, eval_count: emitted.join("").length };
              finishReview(true);
              return;
            }
          } else if (chunk?.done) {
            import("./heimdall.mjs").then((h) => h.observeCall({
              model,
              promptTokens: chunk.prompt_eval_count ?? 0,
              promptMs: 0,
              genTokens: chunk.eval_count ?? 0,
              genMs: 0,
              loadMs: 0,
              // UNGATED: this call never touched the local box — Heimdall
              // counts it apart, and the used-vs-saved ledger rides on the
              // server's own counters (input/output incl. prompt-cache split).
              ungated: true,
              upstream: "anthropic",
              reasoningTokens: 0,
              cacheReadTokens: chunk.cacheRead ?? 0,
              cacheWriteTokens: chunk.cacheCreation ?? 0,
              cost: chunk.cost ?? null,
            })).catch(() => {});
            if (onNote && !chunk.estimated) onNote({ move: "anthropic_usage", provider: anthropicRoute.providerID, model: anthropicRoute.modelID, input: chunk.prompt_eval_count ?? 0, output: chunk.eval_count ?? 0, cacheRead: chunk.cacheRead ?? 0, cacheWrite: chunk.cacheCreation ?? 0 });
            {
              const fin = guardFinish();
              if (fin.blocked) yield fin.refusal;
              else if (fin.emit) yield fin.emit;
              yield fin.blocked ? { ...chunk, outputBlocked: true } : chunk;
            }
            finishReview(true);
            return;
          }
        }
        {
          const fin = guardFinish();
          if (fin.blocked) {
            yield fin.refusal;
            yield { done: true, outputBlocked: true, prompt_eval_count: 0, eval_count: emitted.join("").length };
          } else if (fin.emit) yield fin.emit;
        }
        finishReview(true);
        return;
      } catch (err) {
        if (attempt === CALL_RETRIES - 1) { finishReview(false); throw err; }
        await retryUnderLoad(attempt, model).catch((e) => { finishReview(false); throw e; });
      }
    }
    return;
  }
  // ── OPENCODE LANE (Claude/DeepSeek only, for now) ────────────────────────
  // The gate above already ran — antistrauss covers EVERY mouth, whichever
  // server speaks. Same yield contract as below (strings + a terminal {done})
  // so draw() needs no changes, same retry discipline, same heimdall account.
  // The lane decision reads the discovery cache only (no fetch on the hot
  // path); the turn preflight warms it before any draw runs.
  const upstream = upstreamModelFor(model);
  if (upstream) {
    if (onNote) onNote({ move: "opencode_lane", provider: upstream.providerID, model: upstream.modelID });
    for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
      try {
        for await (const chunk of streamOpencodeText(upstream, messages, { maxTokens: maxTokens ?? CALL_MAX_TOKENS, signal, onNote })) {
          if (typeof chunk === "string") {
            emitted.push(chunk);
            const g = guardAccept(chunk);
            if (g.emit) yield g.emit;
            if (g.blocked) {
              yield refusalFor(outBlocked);
              yield { done: true, outputBlocked: true, prompt_eval_count: 0, eval_count: emitted.join("").length };
              finishReview(true);
              return;
            }
          } else if (chunk?.done) {
            import("./heimdall.mjs").then((h) => h.observeCall({
              model,
              promptTokens: chunk.prompt_eval_count ?? 0,
              promptMs: 0,
              genTokens: chunk.eval_count ?? 0,
              genMs: 0,
              loadMs: 0,
              // UNGATED: this call never touched the local box (no VRAM, no
              // keep-alive, no reload) — Heimdall counts it apart, and the
              // used-vs-saved ledger rides on the server's own counters.
              ungated: true,
              upstream: "opencode",
              reasoningTokens: chunk.reasoningTokens ?? 0,
              cacheReadTokens: chunk.cacheRead ?? 0,
              cacheWriteTokens: chunk.cacheWrite ?? 0,
              cost: chunk.cost ?? null,
            })).catch(() => {});
            if (onNote && !chunk.estimated) onNote({ move: "opencode_usage", provider: upstream.providerID, model: upstream.modelID, input: chunk.prompt_eval_count ?? 0, output: chunk.eval_count ?? 0, cacheRead: chunk.cacheRead ?? 0, cacheWrite: chunk.cacheWrite ?? 0, ...(chunk.cost == null ? {} : { cost: chunk.cost }) });
            {
              const fin = guardFinish();
              if (fin.blocked) yield fin.refusal;
              else if (fin.emit) yield fin.emit;
              yield fin.blocked ? { ...chunk, outputBlocked: true } : chunk;
            }
            finishReview(true);
            return;
          }
        }
        {
          const fin = guardFinish();
          if (fin.blocked) {
            yield fin.refusal;
            yield { done: true, outputBlocked: true, prompt_eval_count: 0, eval_count: emitted.join("").length };
          } else if (fin.emit) yield fin.emit;
        }
        finishReview(true);
        return;
      } catch (err) {
        if (attempt === CALL_RETRIES - 1) { finishReview(false); throw err; }
        await retryUnderLoad(attempt, model).catch((e) => { finishReview(false); throw e; });
      }
    }
    return;
  }
  for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort();
    if (signal) {
      if (signal.aborted) throw new Error("aborted");
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    // WHICH SERVER (2026-09-21): heimdall picks the host — sticky per session,
    // resident first, shortest measured wait, rotate ties (heimdall.mjs
    // "INFERENCE HOSTS"). One local daemon is the default, so this is the
    // same call as before on a one-box setup.
    const H = await import("./heimdall.mjs");
    // WHICH MOUTH (2026-09-22, "use whatever model and system will be
    // fastest for the user"): before the host, Heimdall says which ON-DEVICE
    // mouth answers this draw soonest — the asked model when it can inside
    // the promise, else a warm substitute (the small mouth, the person's own
    // phone), sticky for the rest of the turn and disclosed (heimdall.mjs
    // mouthFor). A logit bias pins the asked model: it was computed for that
    // model's tokenizer and would push the wrong tokens on any other.
    const mouth = H.mouthFor(model, { pinned: !!(logitsBias && Object.keys(logitsBias).length) });
    const drawModel = mouth.provisional ? mouth.model : model;
    _hot.add(hotModelName(drawModel)); // the mouth that SERVES is the one the residency holon keeps warm
    const mouthHost = mouth.provisional ? H.hostByName(mouth.host) : null;
    const picked = mouthHost ? { host: mouthHost, reason: `mouth:${mouth.tier}` } : H.pickHost({ model: drawModel, session: H.currentTurnSession() });
    const host = picked.host;
    H.hostBegin(host.name, drawModel);
    const hostT0 = Date.now();
    let hostClosed = false;
    const closeHost = (o) => { if (hostClosed) return; hostClosed = true; H.hostEnd(host.name, { model: drawModel, ms: Date.now() - hostT0, ...o }); };
    if (onNote && mouth.fresh) onNote({ move: "mouth", asked: mouth.revisableBy, servedBy: drawModel, tier: mouth.tier, host: host.name, reason: mouth.reason, waitMs: mouth.waitMs ?? null, askedEtaMs: mouth.askedEtaMs ?? null });
    if (onNote && hosts_note_once(host.name, picked.reason)) onNote({ move: "host_pick", host: host.name, reason: picked.reason });
    try {
const res = await fetch(`${host.url}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: drawModel,
          messages,
          stream: true,
          // Keep the model resident for the DURATION of the work. A long
          // composition runs 5-10+ minutes, longer than Ollama's 5-min default
          // keep_alive — without this the model unloads mid-essay and the draw
          // hangs retrying. This is a per-request floor, aligned with the
          // server-side OLLAMA_KEEP_ALIVE (setup-proxy.sh sets 1h): the bridge
          // holds what it asked the daemon to hold, never lower.
          keep_alive: `${Math.max(OLLAMA_KEEP_ALIVE_S, 1200)}s`,
          ...(json ? { format: json === true ? "json" : json } : {}),
          options: {
            num_predict: maxTokens ?? CALL_MAX_TOKENS,
            // Declare NO num_ctx (2026-09-21): every caller loads the model at
            // the server's single OLLAMA_CONTEXT_LENGTH, so no request can
            // disagree with another and the reload storm cannot recur. The
            // budget guarantee lives in the server default, not a caller.
            // KELSEN-DEGREES → Ollama's native temperature: high Kelsen
            // (bound to the material) maps to low temperature; low Kelsen
            // (impressionistic) maps high. Our gauge is how tightly the
            // composition is bound to the ground; Ollama's sampler parameter
            // is how we express that to the model.
            temperature: 0.1 + (1 - (kelsen ?? DEFAULT_KELSEN)) * 0.8,
            // LOGIT PUSHING: the voice pipeline's mechanism for making the
            // mouth mechanical. For a one-claim call the output is tiny, so
            // we can bias the sampler toward the claim's own tokens
            // (gemma2-tokenizer.mjs → logitBiasFor). Positive bias on the
            // claim's words pulls the sampling toward them — fidelity
            // becomes mechanical, not hoped for.
            ...(logitsBias && Object.keys(logitsBias).length ? { logits_bias: logitsBias } : {}),
            // THE ONE-SENTENCE STOP (2026-09-21): a sentence draw passes a
            // stop sequence so the stream halts at the first sentence-end —
            // "one sentence" becomes a STRUCTURAL fact of the sampling, never
            // a request the mouth must obey. The absence of the wrong path
            // (there is no path past the first period) is the guardrail.
            ...(stop && stop.length ? { stop } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
const reader = res.body.getReader();
      // First-byte race: headers already arrived; body may stall for minutes
      // on a load. First read only — steady streaming is never timed here.
      let firstRead = true;
      const readBody = async () => {
        if (!firstRead) return reader.read();
        firstRead = false;
        return raceFirstRead(() => reader.read(), FIRST_BYTE_TIMEOUT_MS, drawModel);
      };
      const decoder = new TextDecoder();
      let buffer = "";
      let emittedTokens = 0;
      const TOKEN_BUDGET = maxTokens ?? CALL_MAX_TOKENS;
      let overBudget = false;
      // Stream-shape witnesses (visibility only — never feed sampling,
      // budgets, retries, or guards): did a done frame arrive, what reason
      // Ollama gave, Ollama's own eval_count, first server error frame.
      let doneSeen = false;
      let doneReason = null;
      let doneEvalCount = 0;
      let streamErr = null;

      while (true) {
        if (signal?.aborted) throw new Error("cancelled");
        const { done, value } = await readBody();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          // Parse first, alone: the old shared catch swallowed obj.error
          // frames into silence. Malformed lines skip; error frames are
          // recorded (machine-side note) and skipped — never thrown.
          let obj;
          try { obj = JSON.parse(trimmed); } catch { continue; }
          if (obj?.error) {
            if (!streamErr) {
              streamErr = String(obj.error);
              if (onNote) { try { onNote({ move: "ollama_error_frame", error: streamErr }); } catch { /* notes never break a turn */ } }
            }
            continue;
          }
          try {
            if (obj.message?.content) {
              // HARD CAP: never let the model run away past its budget. The
              // tip of consciousness must not loop. Count content-bearing SSE
              // frames (one per message-content line — NOT tokens; the trip
              // point is in chunks, mislabeled pre-2026-09-19); when the
              // budget is exhausted, stop yielding AND stop the reader so
              // the server stops generating (abort, not just stop reading).
              emittedTokens++;
              if (emittedTokens > TOKEN_BUDGET) {
                overBudget = true;
                ctrl.abort();
                {
                  const fin = guardFinish();
                  if (fin.blocked) yield fin.refusal;
                  else if (fin.emit) yield fin.emit;
                  yield { done: true, truncated: true, outputBlocked: fin.blocked, prompt_eval_count: 0, eval_count: emittedTokens, doneSeen: false, doneReason: "budget" };
                }
                finishReview(true);
                return;
              }
              emitted.push(obj.message.content);
              {
                const g = guardAccept(obj.message.content);
                if (g.emit) yield g.emit;
                if (g.blocked) {
                  yield refusalFor(outBlocked);
                  yield { done: true, outputBlocked: true, truncated: overBudget, prompt_eval_count: 0, eval_count: emittedTokens, doneSeen: false, doneReason: "blocked" };
                  finishReview(true);
                  return;
                }
              }
            }
            if (obj.done) {
              doneSeen = true;
              doneReason = obj.done_reason ?? null;
              doneEvalCount = obj.eval_count ?? 0;
              // The bridge keeps the account of what each model really does
              // (heimdall.observeCall): Ollama has just handed us its own
              // counters, so reporting them costs nothing and no watcher has
              // to spend a call to find out. Lazily imported and never
              // awaited — a report may not slow a turn, and node hands back
              // the same heimdall instance the proxy already runs.
              // QUEUE INSIDE THE DAEMON (2026-09-21): total_duration is Ollama's
              // own wall for this request; minus load+prompt+gen it is the time
              // the request sat in the daemon's queue behind OTHER callers —
              // evals, other proxies, anything that talks to Ollama directly and
              // never passes this gate. Measured, never inferred from load average.
              const _workMs = ((obj.load_duration ?? 0) + (obj.prompt_eval_duration ?? 0) + (obj.eval_duration ?? 0)) / 1e6;
              const _queueMs = Math.max(0, (obj.total_duration ?? 0) / 1e6 - _workMs);
              closeHost({ ok: true, loadMs: (obj.load_duration ?? 0) / 1e6, queueMs: _queueMs });
              import("./heimdall.mjs").then((h) => h.observeCall({
                model: drawModel,
                host: host.name,
                promptTokens: obj.prompt_eval_count ?? 0,
                promptMs: (obj.prompt_eval_duration ?? 0) / 1e6,
                genTokens: obj.eval_count ?? 0,
                genMs: (obj.eval_duration ?? 0) / 1e6,
                loadMs: (obj.load_duration ?? 0) / 1e6,
                queueMs: _queueMs,
              })).catch(() => {});
              {
                // Flush the held tail BEFORE the terminal chunk (the yield
                // contract is strings then a terminal {done}); a blocked tail
                // is replaced by the refusal and the done is marked.
                const fin = guardFinish();
                if (fin.blocked) yield fin.refusal;
                else if (fin.emit) yield fin.emit;
                yield { done: true, truncated: overBudget, outputBlocked: fin.blocked, prompt_eval_count: obj.prompt_eval_count ?? 0, eval_count: obj.eval_count ?? 0, doneSeen: true, doneReason: obj.done_reason ?? null, serverEvalCount: doneEvalCount };
              }
              finishReview(true);
              return;
            }
          } catch { /* skip malformed lines */ }
        }
      }
      {
        const fin = guardFinish();
        if (fin.blocked) {
          yield fin.refusal;
          yield { done: true, outputBlocked: true, prompt_eval_count: 0, eval_count: emitted.join("").length, doneSeen, doneReason, streamErr };
        } else if (fin.emit) yield fin.emit;
      }
      // Stream ended without done=true — previously a silent return with
      // partial text (measured: 31-char 'ACTION: patch\nPATH: solution.py').
      // Flush + classify the stranded tail, then SAY so on a terminal chunk.
      buffer += decoder.decode();
      const tail = buffer.trim();
      let tailParsedAs = tail ? "unparsable" : "empty";
      if (tail) {
        try {
          const t = JSON.parse(tail);
          if (t?.done) { doneSeen = true; doneReason = t.done_reason ?? null; doneEvalCount = t.eval_count ?? 0; tailParsedAs = "done"; }
          else if (t?.message?.content) tailParsedAs = "content";
          else if (t?.error) { if (!streamErr) streamErr = String(t.error); tailParsedAs = "error"; }
          else tailParsedAs = "other";
        } catch { /* tailParsedAs stays "unparsable" */ }
      }
      yield { done: true, truncated: overBudget, outputBlocked: false, prompt_eval_count: 0, eval_count: emitted.join("").length, doneSeen, doneReason, serverEvalCount: doneEvalCount, streamErr, leftoverChars: tail.length, leftoverTail: tail.slice(-120), tailParsedAs };
      return; // stream ended without done=true
    } catch (err) {
      // A first-byte stall is evidence about the MODEL, not the turn: mark
      // it unservable now so the next turn refuses fast at Heimdall's gate
      // instead of rediscovering the same silence. Lazily imported, never
      // awaited — the mark must not slow the error's own path home.
      if (err?.code === "ollama_first_byte_timeout") {
        const bare = String(drawModel ?? "").replace(/^er7:/, "");
        import("./heimdall.mjs").then((h) => h.markUnservable(bare, "first_byte_timeout")).catch(() => {});
      }
      // the host that failed this attempt: a refusal stands it down (the
      // next attempt picks another); a timeout is not a conviction
      closeHost({ ok: false, refused: /ECONNREFUSED|EHOSTUNREACH|ENOTFOUND/.test(String(err?.cause?.code ?? err?.code ?? "")) || /^ollama 5\d\d$/.test(String(err?.message ?? "")) });
      if (attempt === CALL_RETRIES - 1) { finishReview(false); throw err; }
      // A substitute that failed is dropped from the turn, so the retry
      // decides again. When the NEXT attempt would go to a warm mouth, the
      // retry loads nothing — the pressured-throw below exists only to keep
      // a retry from loading into a thrashing box, so it does not apply.
      if (mouth.provisional) H.forgetMouth(model);
      const nextMouth = H.mouthFor(model, { peek: true, pinned: !!(logitsBias && Object.keys(logitsBias).length) });
      const nextWarm = nextMouth.provisional || nextMouth.reason === "resident_inside_promise";
      await retryUnderLoad(attempt, model, { local: !nextWarm }).catch((e) => { finishReview(false); throw e; });
    } finally {
      clearTimeout(timer);
      closeHost({ ok: false }); // no-op if the done chunk or the catch already closed it
      if (signal) signal.removeEventListener("abort", onAbort);
    }
  }
}
// one note per (host, reason) per turn would be ideal; per call is what we
// have — noted only when the pick was not the obvious sole host
function hosts_note_once(name, reason) { return reason !== "sticky_session" && reason !== "shortest_expected_wait" ? true : false; }

// --- turn execution -----------------------------------------------------------

function makeDigest(sessionId, session, fold, ledger, hyperlexicon) {
  const stats = ledger.diagnostics();
  const composition = Object.values(hyperlexicon.composition ?? {});
  const parts = [];
  parts.push(`[EOReader7 session=${sessionId} turn=${session.turnCount}: relations=${stats.relationEdges}, bindings=${stats.referentBindings}, hyperlexicon=${composition.length}]`);
  const known = composition.filter((e) => e.standing === "given");
  const candidates = composition.filter((e) => e.standing === "candidate");
  if (HYPERLEXICON_ON && known.length) parts.push(`[Known compositions: ${known.map((e) => `${e.left}→${e.right}`).join(", ")}]`);
  if (HYPERLEXICON_ON && candidates.length) parts.push(`[Candidate compositions: ${candidates.slice(0, 10).map((e) => `${e.left}→${e.right}(${e.meta?.independentSupport ?? 0})`).join(", ")}]`);
  return {
    digest: parts.join("\n"),
    stats,
    composition,
    known,
    candidates,
  };
}

// --- the three resolutions (the-fold, vendored) ------------------------------
// Summarization by the terrain, never model compression: the discourse is
// restated at three grains by the reading's own organs (atmosphere over the
// whole run, lens on what is said about the active referents, paradigm on
// what recurs). Recent material stays verbatim; these blocks are the
// paraphrase resolutions above it. Addresses never reach the mouth —
// resolutionBlocks' `.text` is struck of them (firewall.js), `.lines` keep
// theirs for the record.
function chatTranscript(chatHistory = []) {
  const transcript = [];
  let turn = 0;
  let lastAnswer = "";
  for (const m of chatHistory ?? []) {
    if (!m || typeof m.content !== "string") continue;
    if (m.role === "user") { transcript.push({ turn: ++turn, question: m.content, answer: lastAnswer, refs: [] }); lastAnswer = ""; }
    else if (m.role === "assistant") lastAnswer = m.content;
  }
  return transcript;
}

// ── broad recall: the "summarize / what do you remember" class ──────────────
// A question that asks for the CONVERSATION ITSELF is not addressed by any
// single passage: "what do you remember about me" shares almost no tokens
// with the planted turns, so the absolute ladder and the field both come up
// empty for exactly the question that asks for the whole. These questions
// are answered from the conversation's own fold (conversationFoldSegments),
// never from a void or a tautological re-address of the current turn.
const BROAD_RECALL_RE = /\b(?:summari[sz]e\b|sum\s+up\b|recap(?:itulate)?\b|remember about me|remember anything about me|what do you (?:remember|recall|know about me)|what (?:do|did|have|'ve|are) (?:we|i|you and i) (?:talk(?:ed)?|discuss(?:ed)?|say|said|cover(?:ed)?|share(?:d)?) about|what (?:we|i|you and i) (?:have|'ve) (?:talked|discussed|said|covered|shared)|what have we been talking about)/i;
function isBroadRecall(task) {
  return BROAD_RECALL_RE.test(String(task ?? ""));
}

// GATE for conversationFoldSegments (2026-09-18, fixing the two-agent echo
// loop): the fold is a SUBSTITUTE for chat history the caller did not send
// — the same rationale transcriptFromSession states for itself ("when the
// client sends no history"), and that function IS properly gated on
// `!keptChat.length`. A caller that sends its full `chatHistory` each
// request (every real client, and eval/the-fold/two-agent-stress.mjs) has
// the prior turns as real conversation turns already; re-surfacing those
// same turns AGAIN as "Here's what came up on this" material handed the
// model its own prior reply as grounding to summarize/paraphrase rather
// than as the conversation to continue — two chatty small models
// paraphrasing their own last paraphrase, every turn, converges on a fixed
// phrase (the "## Dispute Resolution" attractor seen live) within ~10
// turns, because nothing compared the "material" against what had already
// been said. Exported so the decision is tested at the pure layer.
export function shouldUseConversationFold(task, chatHistory, hasNonChatMaterial) {
  if (Array.isArray(chatHistory) && chatHistory.length) return false;
  return isBroadRecall(task) || !hasNonChatMaterial;
}

// The conversation's own fold, as surfaced segments: the corpus's chat
// documents (one per admitted turn, in order), capped like any surfed
// segment. The CURRENT turn — just admitted, still unanswered — is excluded
// (the model already holds it as its own task); the fold is what came before.
//
// DECAY RATE (Atta, 2026-09-17): the conversation is surfaced NEWEST-FIRST
// with a decay window — the present is what the person just said, and older
// turns fade unless reinforced, exactly the kernel's activation law
// (activation.js: "trails evaporate unless reinforced"). The window is a
// declared depth (ER7_CONVO_WINDOW, default 12 turns); a turn older than the
// window has decayed below the activation floor and is dropped from the surf
// (still reachable by the resolutions/atmosphere, never by the model's eye).
// The previous code walked insertion order and hit the char cap from the
// OLDEST turn — the farthest past ate the whole budget and the newest words
// never reached the model. Measured backwards and fixed.
function conversationFoldSegments(session, task, materialText = "") {
  const segments = [];
  let total = 0;
  const current = String(materialText ?? "").trim();
  const currentIs = (text) =>
    text === current || (current.endsWith(text) && text.includes(`[user]: ${task}`));
  // Collect the chat docs with their turn order (the chat: sourceId embeds
  // `turn-<n>`), then walk NEWEST first.
  const docs = [];
  for (const [sourceId, doc] of session.corpus?.documents?.entries?.() ?? []) {
    if (!String(sourceId ?? "").startsWith("chat:")) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text || currentIs(text)) continue;
    const turn = Number(/turn-(\d+)/.exec(String(sourceId ?? ""))?.[1] ?? docs.length);
    docs.push({ sourceId, text, turn });
  }
  docs.sort((a, b) => b.turn - a.turn);
  // DECAY: the window is a declared depth in turns; gamma = 1 - 1/window, so
  // a turn `age` turns old has activation gamma^age. Below the floor it is
  // gone from the surf — reinforcement is the only thing that keeps a trail.
  const WINDOW = Number(process.env.ER7_CONVO_WINDOW ?? 12);
  const FLOOR = Number(process.env.ER7_CONVO_FLOOR ?? 0.25);
  const gamma = WINDOW > 1 ? gammaFor(WINDOW) : 0.8;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    const text = d.text;
    const activation = Math.pow(gamma, i);
    if (activation < FLOOR) break; // decayed below the floor — drop the trail
    total += text.length;
    if (total > SURF_MAX_TOTAL_CHARS) break;
    segments.push({
      text: text.slice(0, SURF_MAX_SEGMENT_CHARS),
      _ledger: { source: d.sourceId, heading: null, addressed_by: "conversation", bytes: [0, text.length], decay: { age: i, activation: Number(activation.toFixed(3)), gamma } },
    });
  }
  return segments;
}

// The conversation as EXCHANGES, read from the session's OWN corpus when the
// client sent no history (each request carries only the current message, so
// the conversation lives only in the fold). The live question — just admitted
// — is excluded: it is asked, not yet answered.
function transcriptFromSession(session, task) {
  const transcript = [];
  let turn = 0;
  for (const [sourceId, doc] of session.corpus?.documents?.entries?.() ?? []) {
    if (!String(sourceId ?? "").startsWith("chat:")) continue;
    const text = String(doc?.text ?? doc ?? "").trim();
    if (!text) continue;
    for (const line of text.split("\n")) {
      const t = String(line ?? "").trim();
      const q = /^\[user\]:\s*(.+)/i.exec(t)?.[1]?.trim();
      const a = /^\[assistant\]:\s*(.+)/i.exec(t)?.[1]?.trim();
      if (q) {
        if (q === String(task ?? "").trim()) continue;
        transcript.push({ turn: ++turn, question: q, answer: "", refs: [] });
      } else if (a && transcript.length) {
        transcript[transcript.length - 1].answer = a;
      }
    }
  }
  return transcript;
}

// The conversation's own BEINGS, for a broad question's active set: the
// referents the conversation's own words resolve to, via the index's OWN
// identity organs (resolveIn + represent — never a scan, P11/P38). A broad
// question names none of them itself, so the resolution blocks get them as
// the active set or the digest is empty for exactly the question that asks
// for the whole. Function/question words the reader happened to admit
// ("what", "do", "me") are not beings the summary is about and are never
// named.
const NON_BEING = /\b(?:what|which|who|whom|whose|where|when|why|how|do|does|did|i|me|my|you|your|we|us|our|it|its|he|she|they|them|the|a|an|is|are|am|have|has|had|was|were|be|been|being|to|of|in|on|at|for|with)\b/i;
function conversationBeings(index, transcript = []) {
  if (!index || typeof index.resolveIn !== "function") return [];
  const text = (transcript ?? [])
    .map((t) => `${t?.question ?? ""} ${t?.answer ?? ""}`.trim())
    .filter(Boolean)
    .join(" ");
  let ids;
  try { ids = index.resolveIn(String(text)); } catch { return []; }
  const names = new Set();
  for (const id of [...(ids ?? [])]) {
    const name = index.represent?.(id) ?? id;
    if (typeof name === "string" && name.length >= 2 && !NON_BEING.test(name)) names.add(name);
  }
  return [...names].slice(0, 4);
}

// The notes the Lens reads: the fold's own EOHyperedge@1 entries, one ledger
// row per edge, endpoints as their SURFACES — the referent index resolves a
// surface; the perceiver's own `ref`s live in a different id space. sources/
// witnesses give the blocks their standing phrases.
//
// DISPUTE LOOKUP (2026-09-14, closing the Kelsen dispute-veto gap): a
// graphEntry here has NO dispute field at any layer — kernel/fold.js's
// perception graph and kernel/notes.js's assertion ledger (where `dispute`/
// `attest`/`concede` actually live, per that file's own CON·Figure·
// CONTESTED act) are two separate structures that nothing in this live
// answer pipeline ever bridges; `session.reader` never builds a notes.js
// ledger at all. Duplicating dispute DETECTION here — inferring a contest
// from the raw graph itself — would be exactly the mistake CLAUDE.md's own
// top rule warns against (an organ for this already exists: notes.js's
// dispute/attest/concede triple, corroboration.js's contestedSearch). So
// this function takes an OPTIONAL `disputeLog` — a real notes.js ledger, if
// a caller has one — and looks up each note's live disputes by the SAME
// identity notes.js already uses for a note born from bare ends with no
// identity organ: `noteId(end1, label, end2)` (kernel/notes.js), which is
// byte-for-byte the (subject, relation, object) triple built below. No
// disputeLog supplied (every current call site) means `disputedBy` stays
// empty everywhere, exactly as before this change — the gap this closes is
// that the FIELD now exists and is wired all the way to kelsenGrade's
// tagClaim, ready the moment a live notes ledger is threaded in; actually
// running contestedSearch (or any other dispute-detection) during a live
// conversation turn is a separate, larger, budget/latency design decision
// (corroboration.js's own header: "model calls are the scarce resource"),
// not attempted here.
export function notesFromEdges(graphEntries = [], { disputeLog = null } = {}) {
  const disputes = disputeLog ? DISPUTE_NOTES.disputesOf(disputeLog) : null;
  const notes = [];
  for (const e of graphEntries ?? []) {
    // The fold's graphEntries carry the REDUCED {relation, participants} shape
    // (recursive.js), not a full EOHyperedge@1 schema — measured 2026-09-13:
    // every proposition was dropped by the schema check, so LaVar graded the
    // essay against zero material claims and reported "unsatisfied" with
    // ofPropositions 0. Both shapes are propositions; neither is required.
    const reduced = e?.relation && Array.isArray(e?.participants);
    if (e?.schema !== "EOHyperedge@1" && !reduced) continue;
    if (!e?.relation) continue;
    const parts = e.participants ?? [];
    const end = (p) => p?.surface ?? p?.ref ?? p?.surfaceKey ?? null;
    const subject = end(parts[0]);
    if (!subject) continue;
    const object = end(parts.length > 1 ? parts[parts.length - 1] : null) ?? "?";
    const disputedBy = disputes?.get(notesLedgerNoteId(subject, e.relation, object))?.map((d) => d.source) ?? [];
    notes.push({ subject, verb: e.relation, object, end1: subject, end2: object, label: e.relation, witnesses: e.witness ? [e.witness] : [], sources: 1, ...(disputedBy.length ? { disputedBy } : {}) });
  }
  return notes;
}

/** Read the answer with the engine's own relation reader against the turn's surfaced passages — the per-sentence claims (verdicts + addresses) the ground ladder and answer record feed from. */
function readAnswerClaims(answer, passages) {
  try {
    const reader = engineRelationsFor(passages);
    if (!reader?.read) return [];
    const report = reader.read(String(answer ?? ""));
    return (report?.claims ?? []).map((c) => ({
      sentence: c.sentence ?? null,
      end1: c.end1 ?? c.subject ?? null,
      label: c.label ?? c.verb ?? null,
      end2: c.end2 ?? c.object ?? null,
      verdict: c.verdict ?? "unheard",
      polarity: c.polarity ?? "+",
      refs: c.refs ?? [],
      spans: (c.spans ?? []).map((sp) => ({ ref: sp.ref ?? null, start: sp.start ?? null, end: sp.end ?? null })),
      ...(c.reason ? { reason: c.reason } : {}),
    }));
  } catch {
    return [];
  }
}

// The conversation's referent index — a PROJECTION of the reading's own log
// (P171, the-fold/reading-log.js), never a scan over names. The workspace
// files and the chat are both stepped through the same constitutional
// reader, so the log is the record and this index is its identity face:
// EOReferent@1 surfaces under the session's fold + namesCorefer, no case, no
// scan. The reader's log is immutable (append-only); we rebuild the
// projection only when the log has actually grown, and reuse it otherwise.
// Used ONLY by the resolution blocks — nothing in it ever reaches the model's
// context.
function sessionReferentIndex(session, onNote) {
  const log = session.reader?.getLog?.() ?? [];
  if (!log.length) return null;
  const last = log[log.length - 1];
  const sig = `${log.length}:${(last?.schema ?? "?")}:${last?.sequencePosition ?? ""}`;
  if (session.indexSig === sig && session.referents) return session.referents;
  const started = Date.now();
  let index = null;
  try {
    index = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
  } catch {
    index = null;
  }
  session.indexSig = sig;
  session.referents = index;
  if (onNote) onNote({ move: "referent_index", referents: index?.referents?.size ?? 0, events: index?.events?.length ?? 0, encounters: index?.encounters ?? 0, ms: Date.now() - started, basis: index?.basis ?? null });
  return index;
}

// ── MURCH, THE EDITOR PASS ─────────────────────────────────────────────────
// The essay's first draft is written by Wolfe; MURCH then reads the assembled
// whole and fixes its SHAPE — the way Walter Murch edits a film: the film is
// made in the cut, and the edit is where it becomes a composition rather than
// a pile of shots. This replaces the loop-on-loops — three separate rewrite
// passes (per-section EVA correction, shape-check REC, strike revision) each
// patching one symptom in isolation. Murch is given the MACHINE-TYPED findings
// across the whole essay (opening without a thesis, no closing, a section that
// repeats the prior, meta-commentary, a theme uncovered) and the essay folded
// at resolutions — never the raw bytes, never an open-ended "improve this".
// Each finding becomes one bounded rewrite that lands as a ledger revision;
// the shape is re-checked. Murch is a WRITER'S second pass, not a judgment: he
// is told exactly what to fix and writes the fixed prose.
function aggregateEssayFindings({ sections, documentLines, material, shapeCheck }) {
  const findings = [];
  if (shapeCheck) {
    for (const f of shapeCheck.failures ?? []) findings.push({ ...f, sectionIndex: null });
  }
  for (let i = 0; i < documentLines.length; i++) {
    const r = satisfactionOfSection(documentLines[i], {
      theme: sections[i] ?? "",
      material,
      prior: i > 0 ? documentLines[i - 1] : "",
    });
    for (const f of r.failures) findings.push({ ...f, sectionIndex: i });
  }
  return findings;
}

// ── THE ESSAY AS A CONVERSATION, FOLDED AT RESOLUTIONS ─────────────────────
// The accumulated prose is NOT handed to the mouth whole — that violates the
// point of resolutions (past content is folded COMPUTED, never dumped). Each
// written section is one exchange of the essay's own conversation: its void
// question and its written answer. resolutionBlocks reads that transcript the
// same way it reads a chat — atmosphere (where the essay stands), lens (what
// is said about its active referents), paradigm (what recurs) — and the mouth
// is handed the fold, not the bytes. This is what lets WOLFE's later sections
// COMPOSE with the earlier ones instead of restarting cold: he knows what the
// piece has established without being buried in it.
function essayResolutions({ sections, documentLines, index, rawEntries, onNote }) {
  const written = [];
  for (let j = 0; j < documentLines.length; j++) {
    const text = String(documentLines[j] ?? "").trim();
    if (!text) continue;
    written.push({ turn: j + 1, question: String(sections[j] ?? ""), answer: text, refs: [] });
  }
  if (!written.length) return null;
  try {
    const notes = notesFromEdges(rawEntries);
    const r = resolutionBlocks({
      level: RESOLUTIONS_LEVEL,
      question: String(sections[written.length] ?? sections.at(-1) ?? ""),
      transcript: written,
      index,
      notes,
      voids: [],
      records: [],
      dmdWindow,
      prominence: null,
    });
    if (!r.text) return null;
    if (onNote) onNote({ move: "essay_resolutions", level: r.level, sections: written.length, active: r.active?.ids?.length ?? 0 });
    return r.text;
  } catch (err) {
    if (onNote) onNote({ move: "essay_resolutions_failed", error: err.message });
    return null;
  }
}

// ── the answer's grain: MODE ────────────────────────────────────────────────
// The proxy is a normal conversation first; long-form is a mode it can enter.
// "auto" decides per turn: projection on an explicit artifact ask, long on an
// elaboration ask, chat otherwise. "chat"/"long"/"projection" force it
// (projection aliases "compose"/"artifact"/"origami"). Every answer — whatever
// the mode — is a void defined and satisfied; the mode is the GRAIN at which
// the void is filled (one answer, one extended answer, or an append-only-ledger
// artifact whose live projection is read in a surface, iterated by revisions).
function normalizeMode(m) {
  if (m === "compose" || m === "artifact" || m === "origami") return "projection";
  return ["chat", "long", "projection", "auto"].includes(m) ? m : "auto";
}

// The void's satisfaction for a single-answer mode (chat / long): the answer
// filled the void it was defined against. Lighter than the essay-grade EVA
// (no continuity/grounding gate — a chat answer may rest on model knowledge),
// but honest: empty is unfilled, a thin substantive answer is thin, and
// answering about the instrument instead of the question is meta.
function chatVoidCheck(text, { shape, material = "" } = {}) {
  const t = String(text ?? "").trim();
  if (!t) return { ok: false, filled: 0, of: 1, failures: [{ kind: "unfilled", detail: "the void named an answer; nothing was written" }], strain: 1 };
  if (["greeting", "command", "trivial", "natural", "verdict"].includes(shape))
    return { ok: true, filled: 1, of: 1, failures: [], strain: 0, basis: `${shape} — a small void, filled in one answer` };
  const failures = [];
  let strain = 0;
  // A short answer is a filled void for a plain question — "Paris" answers
  // "what is the capital of France" completely. The thin test applies only
  // when the void wanted SUBSTANCE (a research question with material to draw
  // from, or an extended answer), never to a direct question.
  if (["research", "long"].includes(shape) && t.length < 40) { failures.push({ kind: "thin", detail: "the answer is almost empty — the void wanted substance" }); strain++; }
  if (/\b(as an ai|i can't|i cannot|i'm just|i'm not able|let me know if you)\b/i.test(t)) { failures.push({ kind: "meta", detail: "the answer talks about the instrument instead of answering" }); strain++; }
  return { ok: failures.length === 0, filled: failures.length ? 0 : 1, of: 1, failures, strain };
}

// ── THE CONTINUATION GATE (2026-09-17) — the mechanical validator that
// decides whether a long-form continuation chunk is kept or REVERTED, the
// coding-loop discipline (code-loop.js) applied to prose. The model never
// grades itself: this function is the `testCommand` of the long answer, and
// it is blind to which model wrote the chunk.
//
// What makes a continuation PASS:
//   - it is substantial (≥ minChars of new prose — a couple of stray words
//     are not a continuation);
//   - it does not RESTART the answer (an "Here's my take / In summary /
//     Let me explain" fresh opening means the model went back to the top
//     instead of continuing where it was — the seam the uncueed loop exists
//     to prevent);
//   - it does not REPEAT the tail of what already exists (overlap — the
//     model re-announcing the end of the previous chunk);
//   - it is not a meta-narration about continuing ("Sure, I'll continue
//     writing now...").
//
// A failing chunk is discarded — never appended, never left in the stream.
export function proseContinuationCheck({ existing = "", incoming = "", minChars = 120, onNote = null } = {}) {
  const inc = String(incoming ?? "").trim();
  if (!inc) return { ok: false, reason: "empty_chunk" };
  if (inc.length < minChars) return { ok: false, reason: `thin_chunk:${inc.length}<${minChars}` };
  // A restart: the chunk opens like a fresh answer rather than mid-thought.
  if (/^(here['’]?s (?:my|the|a|an) (?:take|answer|response)|in (?:summary|conclusion)|let me (?:explain|start|begin)|to (?:summarize|recap)|overall,|all things considered,|so, to answer)/i.test(inc)) {
    return { ok: false, reason: "restarted_answer" };
  }
  // Meta-narration about the act of continuing — the mouth talking about the
  // machine instead of carrying the thread.
  if (/^(sure,? (?:i(?:'|’)ll|i will)|(?:i|i'?m) (?:will )?continue|(?:as|to) (?:requested|asked|instructed)|let me continue|i'?ll (?:continue|keep going|pick up))/i.test(inc)) {
    return { ok: false, reason: "meta_continuation" };
  }
  // Overlap with the existing tail: if the chunk's opening words re-state the
  // last words of what came before, it is repeating, not continuing (the model
  // re-anchoring to the seam). Two probes: (1) the existing text's final ~40
  // chars VERBATIM at the chunk's head — the strongest repeat signal; (2) a
  // positional run of the last 12 words vs the first 12 (a long aligned
  // prefix means the model literally re-started from the previous ending).
  const ex = String(existing ?? "").trim();
  if (ex) {
    const words = (s) => String(s).toLowerCase().split(/\s+/).filter(Boolean);
    const tail = words(ex).slice(-12);
    const head = words(inc).slice(0, 12);
    if (tail.length >= 4 && head.length >= 4) {
      // POSITIONAL RUN: the model re-started from the previous ending — the
      // chunk's opening words align in order with the existing text's closing
      // words (a long shared prefix).
      let shared = 0;
      for (let i = 0; i < Math.min(tail.length, head.length); i++) if (tail[i] === head[i]) shared++; else break;
      if (shared >= Math.max(4, Math.min(tail.length, head.length) / 2)) {
        return { ok: false, reason: `tail_overlap:${shared}` };
      }
      // CONTAINMENT: the chunk's opening phrase (its first N words) appears
      // verbatim anywhere in the existing text's final ~200 chars — the model
      // re-announced an earlier sentence instead of continuing past it.
      const headPhrase = head.slice(0, Math.max(5, Math.floor(head.length / 2))).join(" ");
      if (headPhrase.split(" ").length >= 5) {
        const exTailWords = words(ex).slice(-60);
        const exTail = exTailWords.join(" ");
        if (exTail.includes(headPhrase)) {
          return { ok: false, reason: "tail_phrase_repeat" };
        }
      }
    }
  }
  return { ok: true, chars: inc.length };
}

// ── THE PARAPHRASE CHASE (the meaning rule, 2026-09-14): "something is a
// paraphrase if it isn't character identical but the holograph equates to the
// same thing — and you do have to chase meaning." AND the user's amendment:
// no model evaluates paraphrasing, and meaning always has a for whom — even
// the empty hub of the ethos at this fold. The verbatim instrument (runDMCA)
// is character identity; its silence is now NAMED by the shadow chase
// (paraphraseCandidates). The EQUATE is performed by the RECORD, never a
// model: the fold's own claim rows — {label, end2, end1} at referent
// identity, the very rows the material ledger holds — are equated against the
// candidate spans FOR the run's whom (here: the EVA lens, LaVar). A span that
// resolves to a row is grounded-by-meaning, moved to Derive on the ledger's
// own ruler; a span no row resolves is NAMED un-equatable FOR that whom,
// disclosed, never laundered. No model is asked while meaning is equated.
// ────────────────────────────────────────────────────────────────────────

// ── PLAIN-SPEECH MODEL SWITCH — "switch to haiku", "use something faster".
// No precise command needed: a switch verb plus a model reference (roster id,
// bare name, or alias class) moves THIS session to that model. Mechanical —
// the reference is required, so "switch to a different topic" never fires.
// The override persists until the client explicitly picks another model
// (explicit beats inferred); the response always discloses who answered
// (result.model + a model_switched note), never silently.
const SWITCH_FRAME = /\b(switch|switching|change|changing|move|moving|swap|swapping|flip|flipping)\s+(to|over to|back to|onto)\b/i;
const SWITCH_USE_VERB = /\b(use|using|try|trying|give me|get me|run|running)\b/i;
const SWITCH_DECLARATIVE_USE = /\b(i|we)\s+(use|uses|try|tried|have been using|am using)\b/i;
const SWITCH_SHORT_COMMAND = /^(?:please\s+)?(?:switch to|change to|use|try|give me|get me|run)\b/i;
const SWITCH_ALIAS = /\b(fast|faster|fastest|quick|small|tiny|slow|smart|smarter|frontier|big|bigger|best|strong|cheap|cheapest|local|offline|remote|cloud)\b/i;

// Cheap verb hints gating the roster fetch: a turn without any switch verb
// never pays for discovery. The full detect (verb + model reference) still
// decides — hints over-trigger, the gate does not.
const SWITCH_VERB_HINT = /\b(switch|switching|change|changing|move|moving|swap|swapping|flip|flipping|give me|get me)\b/i;
const SWITCH_USE_HINT = /\b(use|using|try|trying|run|running)\b.{0,28}\b(model|models|haiku|sonnet|opus|claude|deepseek|gemma|qwen|llama|olmo|moondream|phi|fast|faster|fastest|quick|small|slow|smart|frontier|big|best|cheap|local|remote)\b/i;

/** Detect a plain-speech model switch. Returns { ref } or null. Pure. */
export function detectModelSwitch(task, roster = []) {
  const t = String(task ?? "");
  if (!t || t.length > 500) return null; // switches are short asks, never essays
  const low = t.toLowerCase();
  const ids = roster.map(String).filter(Boolean);
  let ref = null;
  for (const id of ids) {
    if (id && low.includes(id.toLowerCase())) { ref = id; break; }
  }
  if (!ref) {
    const frags = new Map();
    for (const id of ids) {
      for (const f of id.toLowerCase().replace(/^er7:/, "").split(/[/:._-]+/)) {
        if (f.length < 3) continue;
        if (!frags.has(f)) frags.set(f, []);
        frags.get(f).push(id);
      }
    }
    const words = low.match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? [];
    let best = null;
    for (const w of words) {
      if (frags.has(w) && (!best || w.length > best.length)) best = w;
    }
    const alias = SWITCH_ALIAS.exec(low)?.[1] ?? null;
    if (best) ref = best;
    else if (alias) ref = `@${alias}`;
  }
  if (!ref) return null; // no model reference, no switch — "switch topics" never fires
  const frame = SWITCH_FRAME.test(t);
  const shortCommand = t.trim().length <= 64 && SWITCH_SHORT_COMMAND.test(t.trim());
  const useVerb = SWITCH_USE_VERB.test(t) && !SWITCH_DECLARATIVE_USE.test(t);
  if (!frame && !shortCommand && !useVerb) return null;
  return { ref };
}

/** Resolve a switch reference against the roster (er7:-prefixed ids).
 *  Deterministic: exact id > unique fragment > flagship preference
 *  (sonnet > opus > deepseek > haiku) > first. Alias classes map to the
 *  roster, never to a guess outside it. Returns the id or null. Pure. */
export function resolveModelTarget(ref, roster = [], { current = null } = {}) {
  const ids = roster.map(String).filter(Boolean);
  if (!ids.length || !ref) return null;
  const low = (s) => String(s).toLowerCase();
  const FLAGSHIP = ["sonnet", "opus", "deepseek", "haiku"];
  if (!ref.startsWith("@")) {
    const exact = ids.find((id) => low(id) === low(ref));
    if (exact) return exact;
    const cands = ids.filter((id) => {
      const bare = low(id).replace(/^er7:/, "");
      return bare.split(/[/:._-]+/).includes(low(ref)) || bare.includes(low(ref));
    });
    if (!cands.length) return null;
    if (cands.length === 1) return cands[0];
    for (const p of FLAGSHIP) {
      const hit = cands.find((id) => low(id).includes(p));
      if (hit) return hit;
    }
    return cands[0];
  }
  const cls = ref.slice(1);
  const bare = (id) => String(id).replace(/^er7:/i, "");
  const local = ids.filter((id) => !bare(id).includes("/"));
  const remote = ids.filter((id) => bare(id).includes("/"));
  const flagship = (list) => {
    for (const p of FLAGSHIP) {
      const hit = list.find((id) => low(id).includes(p));
      if (hit) return hit;
    }
    return list[0] ?? null;
  };
  const smallest = (list) => {
    const haiku = list.find((id) => /haiku/i.test(id));
    if (haiku) return haiku;
    return [...list].sort((a, b) => a.length - b.length)[0] ?? null;
  };
  switch (cls) {
    case "fast": case "faster": case "fastest": case "quick":
    case "small": case "tiny": case "cheap": case "cheapest":
      return smallest(ids);
    case "smart": case "smarter": case "frontier":
    case "big": case "bigger": case "best": case "strong":
      return flagship(remote.length ? remote : ids);
    case "local": case "offline":
      if (current && local.some((id) => low(id).replace(/^er7:/, "") === low(current))) return current;
      return local.find((id) => /gemma/i.test(id)) ?? local[0] ?? null;
    case "remote": case "cloud":
      return flagship(remote);
    default: return null; // "slow" and anything unknown: refuse to guess
  }
}

// ── famous open problems (the open-problem hand's table) ────────────────────
// A prove/solve ask naming one of these is declined mechanically, pre-model.
// Pure and exported for tests: openProblemOf(task) -> { name, millennium } |
// null. The ASK verbs (prove/proof/solve/solution/show/disprove/derive) are
// part of the match — "what is P vs NP" is a factual question, not a proof
// ask, and must NOT trip the gate.
const OPEN_PROBLEMS = Object.freeze([
  { name: "P versus NP", millennium: true, re: /p\s*(≠|!=|vs\.?|versus)\s*np\b/i },
  { name: "Navier–Stokes existence and smoothness", millennium: true, re: /navier[\s\u2013\u2014-]*stokes/i },
  { name: "the Collatz conjecture", millennium: false, re: /collatz|3n\s*\+\s*1/i },
  { name: "the Riemann hypothesis", millennium: true, re: /riemann/i },
  { name: "the Yang–Mills mass gap", millennium: true, re: /yang[\s\u2013\u2014-]*mills/i },
  { name: "the Hodge conjecture", millennium: true, re: /hodge/i },
  { name: "Birch and Swinnerton-Dyer", millennium: true, re: /birch|swinnerton[\s\u2013\u2014-]*dyer/i },
  { name: "the Goldbach conjecture", millennium: false, re: /goldbach/i },
  { name: "the twin prime conjecture", millennium: false, re: /twin\s*primes?/i },
]);
const PROOF_ASK_RE = /\b(prove|proof|solve|solution|show\s+that|disprove|derive|find\s+a\s+proof)\b/i;
export function openProblemOf(task) {
  const t = String(task ?? "");
  if (!PROOF_ASK_RE.test(t)) return null;
  for (const p of OPEN_PROBLEMS) {
    if (p.re.test(t)) return { name: p.name, millennium: p.millennium };
  }
  return null;
}

export async function runProxyTurn({ sessionId, userId = null, model, task, chatHistory = [], discourse = "", workspace = "", attachments = [], holonLevel = "section", resumeAnswered = [], resumePlan = null, openBefore = null, kelsen = null, mode = "auto", caller = null, signal = null, webConsent = false, seed = null }, onToken, onNote = null, onThinking = null) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  // ── ETHOS FIRST (the ground) ──────────────────────────────────────────────
  // The constitution (Charter/Grotius + the spec gate/Brandeis) produces a
  // CLEARANCE. The session below REQUIRES it — so the ethos is a bearing wall,
  // not a governor: remove this and getSession() throws, breaking every turn.
  const { charter, family: charterFamily, source: charterSource } = constitution();
  // THE SHADOW TRAIL (Bourdieu): the person's accumulated acts condition THIS
  // one's assessment — the cross-session pattern is the second witness a single
  // request cannot supply. Read before the gate; the act is recorded after.
  const personId = userId ?? sessionId;
  const shadowBefore = assessShadow(personId);
  const clearance = ethosClear(task, { disposition: dispositionFrom(shadowBefore) });
  const session = getSession(sessionId, clearance, task);
  // WHO is at the door (organs/interlocutor.js, Buber): recognized mechanically
  // from the request's shape, accumulated across the session (one interlocutor
  // per conversation), held so the reader can meet an agent or a person in the
  // idiom each can receive — never to decide whether to be honest with them.
  const interlocutor = mergeInterlocutor(session.interlocutor ?? null, readInterlocutor(caller ?? {}));
  session.interlocutor = interlocutor;
  if (onNote && interlocutor.kind !== "unknown") onNote({ move: "interlocutor", kind: interlocutor.kind, confidence: interlocutor.confidence, basis: interlocutor.basis });
  // THE MAYEROFF NULL (kernel/mayeroff.js — family two, PERTURBATION, never
  // family one). ethos.js above already licensed what may be composed (a
  // clearance that can be failed). This runs AFTER it, on clearance.shape,
  // and asks the other question: does this composition typecheck against
  // self.js at all. A deceptive/extractive shape exists only under the
  // separable-self null, never under READER_SELF as sealed — so it leaves
  // an `unrealizable` shadow (never merged with norm_conflict: refused
  // declines a live option; unrealizable never had a state to reach) and
  // the turn returns a care-grounded account, not a refusal. Deliberately
  // NOT through ethos.js: caring is not one more licensed affordance.
  let mayeroffJudgment = null;
  try {
    mayeroffJudgment = clearance?.shape ? judgeAskShape(clearance.shape) : null;
  } catch { mayeroffJudgment = null; }
  const mayeroffBlocked = Boolean(
    mayeroffJudgment && !mayeroffJudgment.realizable && clearance?.cleared,
  );
  if (mayeroffBlocked && onNote) onNote({ move: "mayeroff_unrealizable", reason: mayeroffJudgment.reason });
  // Record this act's norm-standing (append-only, never merged).
  const shadowType = !clearance.cleared
    ? "norm_conflict"
    : mayeroffBlocked
      ? "unrealizable"
      : (clearance.voice?.descriptive && !clearance.voice?.prescriptive ? "descriptive" : "norm_compliant");
  recordShadow(personId, { shadow: shadowType, reason: mayeroffBlocked ? mayeroffJudgment.reason : clearance.reason, task });  // THE REGISTER, READ ONCE — the request's field/tenor/mode (Halliday). The
  // instrument (code) field decides whether the projection writes SOURCE CODE
  // or prose; it is read off the request itself, never from the mode forced by
  // a caller, so a code ask stays code even when a job forces "projection".
  const taskRegister = deriveRegister(task, { genres: sidecarGenres() });
  const isInstrument = taskRegister?.field?.field === "instrument";
  // THE CORRECTION TRIGGER — a correction of the machine's own answer
  // authors a falsifiable rule in the correction ledger (organs/correction-
  // rule.js, renamed 2026-09-17 from hive.js — see LAVAR.md's Wilson
  // reconciliation; this is a single-threaded rule minter, not a multi-
  // instrument hive). Later requests are steered by discovered rules, never
  // by another hardcoded genre branch.
  const correction = authorCorrectionRule(task, { source: "proxy-turn" });
  if (onNote && correction.rule) {
    onNote({
      move: "correction_rule_authored",
      id: correction.rule.id,
      kind: correction.rule.kind,
      dimension: correction.rule.dimension,
      persisted: correction.persisted,
      falsifier: correction.rule.falsifier,
    });
  }

  // The person's durable theory of mind — loaded at the turn's start so the
  // character carries continuity across sessions, while this conversation's
  // SPECIFICS stay in chatHistory. A null userId means an anonymous caller:
  // the durable model is a no-op, never a fabrication about who they are.
  const speakerModel = userId ? loadSpeakerModel(userId) : null;
  const durable = speakerModel ? durableFacts(speakerModel) : [];

  // ── PLAIN-SPEECH MODEL SWITCH, APPLIED — the session's override lives
  // here (modelOverride / overrideBasis / lastEffectiveModel), so every
  // caller shares it: opencode's /model command, the repo TUI, or plain
  // words. Explicit beats inferred: a request naming a model different from
  // both the last answer and the switch-time request is a deliberate move
  // and clears the override. `model` is reassigned once, here, so the
  // preflight, the draws, the keep-warm and the disclosed result all agree
  // on who answers. Roster calls happen ONLY on switch-candidate turns (a
  // cheap verb hint gates them); the full detect still decides.
  {
    const hint = SWITCH_VERB_HINT.test(task) || SWITCH_USE_HINT.test(task);
    let sw = null;
    if (hint) {
      let roster = [];
      try {
        const up = await ollamaReachable();
        roster = [...(up ?? []).map((m) => `er7:${m.name ?? m.model}`)];
      } catch { /* ollama down — the opencode lane may still resolve */ }
      try {
        await refreshOpencodeModels().catch(() => null);
        for (const id of knownOpencodeModels()) roster.push(`er7:${id}`);
      } catch { /* the local roster stands alone */ }
      try {
        await refreshAnthropicModels().catch(() => null);
        for (const id of knownAnthropicModels()) {
          const rid = id.includes("/") ? `er7:${id}` : `er7:anthropic/${id}`;
          if (!roster.includes(rid)) roster.push(rid);
        }
      } catch { /* a keyless box offers no frontier models */ }
      const hit = detectModelSwitch(task, roster);
      if (hit) {
        const target = resolveModelTarget(hit.ref, roster, { current: model });
        if (target) {
          // Roster ids are er7:-prefixed; the turn runs on BARE ids (the
          // door strips the prefix — Ollama would 400 a prefixed name).
          const bare = String(target).replace(/^er7:/, "");
          session.modelOverride = bare;
          session.overrideBasis = model;
          session.lastEffectiveModel = bare;
          model = bare;
          sw = { switched: true };
          if (onNote) onNote({ move: "model_switched", to: bare, ref: hit.ref, basis: "plain-speech" });
        } else if (onNote) {
          onNote({ move: "model_switch_missed", ref: hit.ref });
        }
      }
    }
    if (!sw) {
      if (session.modelOverride) {
        if (model !== session.lastEffectiveModel && model !== session.overrideBasis) {
          session.modelOverride = null; session.overrideBasis = null; // explicit move — honored
        } else {
          model = session.modelOverride;
        }
        session.lastEffectiveModel = model;
      } else {
        session.lastEffectiveModel = model;
      }
    }
  }
  // A model the person NAMED IN WORDS (a spoken switch, this turn or carried
  // from an earlier one) is served exactly as named: Heimdall's mouth never
  // substitutes the person's own choice (heimdall.mjs pinTurnModel/mouthFor).
  // HOT = WHAT SERVES (2026-09-22): the residency holon re-warms every hot
  // model it finds missing (45s cadence). Marking the ASKED model hot here
  // loaded it mid-turn even while Heimdall's mouth had a warm model answering
  // (measured: a cold OLMo ask was loaded ~44s into the turn, so its draw
  // found it resident and the substitution never happened). Each draw now
  // marks its own mouth hot (streamOllamaChat); only a model that will serve
  // as asked — pinned by the person or the caller, or a turn with no
  // Heimdall scope at all — is marked here, as before.
  {
    let pinnedHere = false;
    try {
      const H = await import("./heimdall.mjs");
      const st = H.turnScope.getStore();
      if (session.modelOverride && model === session.modelOverride) { H.pinTurnModel(model); pinnedHere = true; }
      if (!st || st.tier === "exact") pinnedHere = true;
    } catch { pinnedHere = true; /* no Heimdall: the old behavior */ }
    if (pinnedHere) _hot.add(model);
  }

  // Fold an early-return turn into the session corpus so the conversation's
  // own fold keeps continuity (transcriptFromSession reads these lines).
  const foldEarlyTurn = (turnText) => {
    try {
      if (!session.corpus) session.corpus = createCorpusSession();
      const firstLine = String(turnText ?? "").trim().split(/\r?\n/)[0].slice(0, 500);
      const doc = `[user]: ${task}\n\n[assistant]: ${firstLine}`;
      if (doc.trim().length >= 8) {
        admitChunked(session.corpus, { text: piiAdmit(session, doc, `chat:${sessionId}:turn-${session.turnCount}`, onNote), sourceId: `chat:${sessionId}:turn-${session.turnCount}` });
      }
    } catch { /* the fold must never break an early answer */ }
  };
  const earlyResult = (text, { answerShape, mechanical = null, quote = null, truncated = false } = {}) => {
    session.turnCount++;
    foldEarlyTurn(text);
    return {
      text,
      charter: null,
      groundedWisdom: null,
      privacy: null,
      copy: null,
      security: null,
      blindspot: null,
      pii: null,
      injection: null,
      shadow: [],
      interlocutor: { kind: interlocutor.kind, confidence: interlocutor.confidence, basis: interlocutor.basis },
      relationEdges: 0,
      referentBindings: 0,
      hyperlexiconCandidates: 0,
      turn: session.turnCount,
      workspace: { files: 0, chars: 0, segments: 0, refusals: 0 },
      attachments: { files: 0, chars: 0, admitted: 0 },
      reading: null,
      pathos: null,
      reGround: null,
      surfed: [],
      activated: null,
      void: null,
      post: null,
      resolutions: null,
      document: null,
      usage,
      truncated,
      totalStrain: 0,
      thinking: null,
      answerShape,
      mode: "chat",
      model,
      voidHolarchy: null,
      mechanical,
      quote,
    };
  };

  // ── THE SNIP HAND — verbatim asks answered pre-model ───────────────────
  // The reading already knows HOW to answer a quotation ask: snip the work's
  // own words from a public-domain primary source (Wikisource), cut
  // positionally, with provenance — no model tokens, no generation. Runs
  // before the preflight so a snip is reachable even with the upstream down
  // (when the source fetch itself succeeds). A source that cannot be reached
  // falls through to the normal turn; an unwired work is a named mechanical
  // refusal — a generated "quote" would be an invention wearing a source's
  // name, so the model never gets the ask.
  const snipGate = snipShape(task);
  if (snipGate && clearance.cleared) {
    if (!snipGate.work) {
      if (onNote) onNote({ move: "quote_gap", gap: "no_source_wired", basis: "verbatim ask for a work with no wired public-domain source — refused mechanically, never generated" });
      return earlyResult(
        "I can't quote that verbatim — I only quote public-domain works I can snip word-for-word from their printed text (Shakespeare today: name a play, a sonnet, or a speech). Anything else I would have to make up, and a made-up quote is worse than none.",
        { answerShape: "quote", mechanical: { rung: "verbatim-snip", gap: "no_source_wired", basis: "verbatim ask for an unwired work — named refusal, never a generated quotation" }, quote: null },
      );
    }
    const snipQueries = snipGate.defaulted
      ? [DEFAULT_PASSAGE.wikisource, "Shake-speares Sonnets, Never before Imprinted/Sonnet 18", "Shakespeare's Sonnets"]
      : [snipGate.work.wikisource, snipGate.work.author];
    let fetched = null;
    let cut = null;
    for (const q of snipQueries) {
      try {
        fetched = await wikisourceText(q);
      } catch {
        fetched = null;
      }
      if (!fetched?.text?.trim()) { fetched = null; continue; }
      const trial = cutSnip(fetched.text, { maxChars: MAX_SNIP_CHARS });
      // A versions/disambiguation page has no verse-length lines — keep
      // hunting instead of snipping the scaffolding.
      if (trial.snip && trial.longest > 30) { cut = trial; break; }
      if (onNote) onNote({ move: "quote_thin", query: q, title: fetched.title ?? q, longest: trial.longest, basis: "no verse-length line — not quotable, keep hunting" });
      fetched = null;
    }
    if (fetched?.text?.trim() && cut?.snip) {
        const url = `https://en.wikisource.org/wiki/${encodeURIComponent(String(fetched.title ?? snipQueries[0]).replace(/ /g, "_"))}`;
        const frame = snipGate.defaulted ? `${DEFAULT_PASSAGE.basis}. ` : "";
        const text = `${frame}Quoted word-for-word from ${snipGate.work.author}:\n\n${formatQuote({ snip: cut.snip, title: fetched.title ?? snipQueries[0], author: snipGate.work.author, url })}`;
        if (onNote) onNote({ move: "quote_said", rung: "verbatim-snip", title: fetched.title ?? snipQueries[0], chars: cut.snip.length, defaulted: snipGate.defaulted, basis: cut.basis });
        return earlyResult(text, {
          answerShape: "quote",
          mechanical: { rung: "verbatim-snip", title: fetched.title ?? snipQueries[0], url, chars: cut.snip.length, defaulted: snipGate.defaulted, basis: cut.basis },
          quote: { title: fetched.title ?? snipQueries[0], url, chars: cut.snip.length, defaulted: snipGate.defaulted },
        });
    }
    if (onNote) onNote({ move: "quote_miss", basis: "the printed text could not be reached — falling through to the normal turn" });
  }

  // ── PERSONAL EXPERIENCE — answered pre-model, never generated ──────────
  // See PERSONAL_EXPERIENCE_RE's own header: a NEUTRAL_CHARACTER honesty
  // instruction was tried first and gemma2:2b still fabricated a specific,
  // false weekend with that instruction live in its system prompt. Same
  // shape as the snip hand above and the open-problem hand below — a class
  // where a generated answer is confabulation wearing a normal reply's
  // clothes, declined mechanically before the model ever sees the task.
  if (clearance.cleared && PERSONAL_EXPERIENCE_RE.test(String(task ?? ""))) {
    const text = personalExperienceAnswer(task);
    if (onNote) onNote({ move: "personal_experience", basis: "a question presupposing a life outside the conversation — answered mechanically, never generated" });
    return earlyResult(text, {
      answerShape: "chat",
      mechanical: { rung: "personal-experience", basis: "closed pattern; the instrument has no lived history to report, so nothing here is generated" },
    });
  }

  // ── THE OPEN-PROBLEM HAND — famous unsolved problems declined pre-model ──
  // Asking for a PROOF or SOLUTION of a famously open problem (P vs NP,
  // Navier-Stokes, Collatz…) must never reach the mouth: the honest answer is
  // a decline, and a generated "proof" would be a confabulation wearing a
  // proof's clothes (measured on the hard battery: the void fallback's "no
  // material" is accurate but names nothing). Asking ABOUT the problem ("what
  // is P vs NP") is a factual question and flows through normally — only
  // prove/solve/show/disprove verbs trip the gate. Zero mouth tokens either
  // way: the decline is mechanical, EOT-recorded on the turn.
  {
    const open = openProblemOf(task);
    if (open && clearance.cleared) {
      const where = open.millennium
        ? `It is one of the Clay Mathematics Institute's Millennium Prize Problems — a correct solution carries a $1,000,000 prize precisely because none exists.`
        : `It is a famously unsolved problem — no proof exists.`;
      if (onNote) onNote({ move: "open_declined", problem: open.name, millennium: open.millennium });
      return earlyResult(
        `I can't prove that — ${open.name} is an open problem. ${where} What I can do instead: explain what the problem asks, what partial progress exists, or why it resists proof.`,
        { answerShape: "decline", mechanical: { rung: "open-problem", problem: open.name, millennium: open.millennium, basis: "prove/solve ask for a famously unsolved problem — named decline, never a generated proof" } },
      );
    }
  }

  // 0. Preflight — fail fast, don't hang. The check hits the lane that owns
  // THIS model: a directly-served Anthropic model needs only its key, an
  // opencode-served model (Claude/DeepSeek) needs its server, and neither
  // must fail because Ollama is down, nor vice versa. Discovery refreshes
  // first (cached — a warm cache costs nothing) so the lane decision is current.
  await refreshAnthropicModels().catch(() => null);
  await refreshOpencodeModels().catch(() => null);
  const anthropicRoute = upstreamAnthropicModelFor(model);
  let opencodeRoute = null;
  if (anthropicRoute) {
    if (!anthropicConfigured()) {
      if (onNote) onNote({ move: "upstream_down", target: ANTHROPIC_URL });
      throw new Error(`anthropic upstream ${ANTHROPIC_URL} needs ANTHROPIC_API_KEY — set it and retry.`);
    }
  } else {
  opencodeRoute = upstreamModelFor(model);
  if (opencodeRoute) {
    if (!(await opencodeReachable())) {
      if (onNote) onNote({ move: "upstream_down", target: OPENCODE_URL });
      throw new Error(`opencode upstream ${OPENCODE_URL} is not responding — check that 'opencode serve' is running.`);
    }
  } else {
  const modelsUp = await ollamaReachable();
  if (modelsUp === null) {
    if (onNote) onNote({ move: "upstream_down", target: OLLAMA });
    throw new Error(`Ollama upstream ${OLLAMA} is not responding — check 'er7-proxy log' and that Ollama is running.`);
  }
  const modelKnown = modelsUp.some((m) => (m.name ?? m.model) === model);
  if (modelsUp.length && !modelKnown) {
    if (onNote) onNote({ move: "model_missing", model, available: modelsUp.map((m) => m.name ?? m.model) });
  }
  }
  }

  // ── SMALL-TALK FAST PATH — a short interpersonal turn is chat content ──
  // ("my name is X, what is yours?", "huh?", "thanks"). The full pipeline's
  // multi-KB system prompt (Kelsen conflicts, resolutions, surfed noise)
  // collapses a small model on exactly these turns (measured live: gemma2:2b
  // echoed its identity line instead of answering). One direct draw on the
  // standing character + the conversation is the honest shape here — the
  // turn still folds into the corpus, so continuity holds.
  {
    const _t = String(task ?? "").trim().toLowerCase();
    const isSmallTalk =
      /^(hi|hello|hey|howdy|greetings|good\s+(morning|afternoon|evening))[\s,!?]*$/.test(_t) ||
      /^(clear|reset|help|status|what\s+can\s+you\s+do|who\s+are\s+you)[\s,!?]*$/.test(_t) ||
      /^(huh|what|really|oh|ok|okay|thanks|thank you|yes|no|yeah|yep|nope|hmm|lol|nice|cool|got it|i see|fair enough|never ?mind|please|wow)[\s.!?]*$/.test(_t) ||
      (_t.length < 160 && (/\bmy name is\b.{0,40}\b(your|yours|you)\b/.test(_t) || /\bwhat('s| is) your name\b/.test(_t))) ||
      (_t.length < 200 && SELF_REFERENTIAL_RE.test(_t));
    if (isSmallTalk && clearance.cleared && !opencodeRoute && !anthropicRoute) {
      const msgs = [{ role: "system", content: [NEUTRAL_CHARACTER, turnStanding(model), discourse ? `\n${discourse}` : null].filter(Boolean).join("\n") }];
      for (const m of chatHistory ?? []) msgs.push({ role: m.role, content: m.content });
      msgs.push({ role: "user", content: task });
      let fullText = "";
      let fastTruncated = false;
      await withSlot(model, async () => {
        for await (const chunk of streamOllamaChat(model, msgs, { maxTokens: CALL_MAX_TOKENS, onNote, signal })) {
          if (typeof chunk === "string") {
            fullText += chunk;
            if (onToken) onToken(chunk);
          } else if (chunk?.done) {
            usage.promptTokens += chunk.prompt_eval_count ?? 0;
            usage.completionTokens += chunk.eval_count ?? 0;
            if (chunk?.truncated) fastTruncated = true;
          }
        }
      });
      let text = fullText;
      if (fullText.trim()) {
        try {
          const post = await postprocessAnswer(fullText, { onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS });
          if (post && typeof post.text === "string" && post.text.trim() && post.text !== fullText) text = post.text;
        } catch { /* the tooling never breaks the answer */ }
      }
      // The fast path has no material and runs no search by design; if its draft
      // is itself a checkable open-now claim, the ENVIRONMENT is consulted first
      // (the stigmergic route over kinds and links — no web door needed for a
      // fact the environment already holds), and the surgical gate strikes a
      // sentence that commits to a value the kind+link contradicts.
      try {
        const store = currentFactsStore();
        const resolved = store.resolve(task);
        let kind = resolved.kind, link = resolved.link;
        const hq = holderQueryFor({ ask: task, answer: text });
        if ((webConsent || WEB_SEARCH_ON) && !kind && hq) {
          const h = await currentHolder(hq);
          if (h.found) {
            store.adoptDatedRecord({ head: hq.role, text: h.text, ref: h.ref });
            const again = store.resolve(task);
            kind = again.kind; link = again.link;
          }
        }
        const v = applyVerdictGate({ ask: task, answer: text, ground: [], kind, link, route: resolved.route, now: new Date(), lens: resolved.lens ?? lensForAsk(task) });
        if (v.gated) {
          text = v.text;
          // THE ALARM IS NOT THE STRIKE. A contradicted draft means the DRAFT
          // disagreed with the link — the link is the ground, it is not
          // demoted for being right. The link is only suspect when a FRESH
          // door disagrees with it; that disagreement lands here as an
          // adoption above, not as a veto.
          if (onToken) onToken(`\n\n${v.replacement}`);
          if (onNote) onNote({ move: "fast_path", shape: "chat", chars: fullText.length, verdict: v.verdict, route: resolved.route, kind: kind?.label ?? null });
        } else {
          const g = decideGate({ ask: task, answer: text, ground: [], context: [discourse, ...(chatHistory ?? []).map((m) => m?.content ?? "")].filter(Boolean).join("\n"), lens: lensForAsk(task) });
          if (g.open && g.append) { const tail = `\n\n${g.append}`; text += tail; if (onToken) onToken(tail); }
          if (onNote) onNote({ move: "fast_path", shape: "chat", chars: fullText.length, verdict: v.verdict, route: resolved.route ?? null });
        }
      } catch { /* an addition, never a break */ }
      return earlyResult(text, { answerShape: "chat", truncated: fastTruncated });
    }
  }

  // 1. Workspace — admit real files into the session corpus, then SURF the
  // task. The model is never shown an address; it is shown the content the
  // surfer mechanically addressed ("as if from nowhere").
  const workspaceStats = { files: 0, chars: 0, segments: 0, refusals: 0 };
  let surfacedSegments = [];
  let surfVoid = false;
  let surfVoidInfo = null;
  if (workspace && fs.existsSync(workspace)) {
    if (onNote) onNote({ move: "scanning", root: workspace });
    const entries = workspaceEntries(workspace, onNote);
    if (onNote) onNote({ move: "files_found", count: entries.length, chars: entries.reduce((a, e) => a + e.size, 0) });
    const admit = await admitWorkspaceEntries(session, entries, onNote);
    workspaceStats.files += entries.length;
    workspaceStats.chars += admit.chars;

    // Step surfaced segment text through the fold too, so holograph/hyperlexicon
    // build from the code being discussed — not just the task prose.
    if (admit.admitted > 0 && onNote) onNote({ move: "admitted", files: admit.admitted });

    // LOOK AT IT — the native "looking" capacity: images in the workspace
    // are read by CV/OCR + a vision model and admitted as sources, so the
    // reading can actually SEE a diagram/screenshot/chart it would otherwise
    // never be given (the text scan refuses them).
    const lookedImages = await lookWorkspaceImages(session, workspace, onNote);
    if (lookedImages.looked > 0 && onNote) onNote({ move: "look_images_done", files: lookedImages.looked });
  }

  // 1.1 BROWSER-POSTED MATERIAL — attachments ride the request BODY, not the
  // filesystem (the ONE-ENGINE-PLAN's gating port: "no way for a browser to
  // POST attached text"). Each `{ name, text }` is admitted into the SAME real
  // corpus session and stepped through the SAME reader as a workspace file —
  // one intake path, one PII door, one holograph/hyperlexicon — so a client
  // that pastes or drops material (the-fold's attachments) needs no disk path
  // at all. Deduped by name+content, bounded like workspace files, and the
  // bytes are never a file on this machine.
  const sha1Short = (t) => { let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h.toString(36); };
  let attachmentStats = { files: 0, chars: 0, admitted: 0 };
  if (Array.isArray(attachments) && attachments.length) {
    if (!session.corpus) session.corpus = createCorpusSession();
    const index = session.corpusIndex ?? new Map();
    for (const a of attachments) {
      const name = String(a?.name ?? `attachment-${attachmentStats.files + 1}`).slice(0, 120);
      const text = String(a?.text ?? "");
      if (!text.trim()) continue;
      attachmentStats.files += 1;
      attachmentStats.chars += text.length;
      const sig = `${text.length}:${sha1Short(text)}`;
      if (index.get(name) === sig) continue; // unchanged re-admission is a no-op
      const res = admitChunked(session.corpus, { text: piiAdmit(session, text, name, onNote), sourceId: name });
      index.set(name, sig);
      touchFileActivation(session, name, "attachment");
      attachmentStats.admitted += res.deduped ? 0 : 1;
      const encounters = textEncounters(text, { source: `attach:${name}`, offset: 0 });
      for (const enc of encounters) {
        const turn = await session.reader.step(enc);
        if (turn?.tasks?.open && onNote) {
          for (const t of turn.tasks.open) {
            onNote({ move: "open_question", rel: name, task_id: t.task_id ?? null, description: t.description ?? null });
          }
        }
        await yieldToEventLoop();
      }
      if (onNote) onNote({ move: "attachment_admitted", name, chars: text.length, admitted: res.deduped ? 0 : 1 });
    }
    session.corpusIndex = index;
  }

  // 1.2 NL FILE MENTIONS — the operator asks about particular files in plain
  // language; the system meets the file qua file. Each mention is resolved
  // mechanically against the declared workspace (or matched exactly against
  // an attachment name); a resolved file is force-admitted as its own
  // file-scoped corpus doc + stepped through the fold reader even when the
  // bulk scan skipped it (caps, ordering) — bounded per file, PII-gated,
  // code-vs-prose grained like every other admission. The mouth is fed only
  // the bytes (via surfacedSegments below, content without names); the FILE
  // (which file, what kind, what was missing) travels onNote + _ledger +
  // turnUsedSourceIds, so citations and the facing page can show the file
  // the answer stood on. Nothing here invents bytes for a missing/unreadable
  // mention — those are typed gaps on the record.
  let nlFiles = []; // [{ rel|name, sourceId, kind: workspace|attachment }]
  {
    const mentions = extractNlFileMentions(task);
    const attachmentNames = new Set((Array.isArray(attachments) ? attachments : []).map((a) => String(a?.name ?? "")));
    if (mentions.length && onNote) onNote({ move: "file_mentioned", mentions });
    const absRoot = workspace && fs.existsSync(workspace) ? path.resolve(workspace) : null;
    // An anaphoric ask with no path-shaped mention ("what does it do?",
    // "that file") resolves against the activation ledger — what this
    // session has actually been pointing at — with a kind filter when the
    // words name one ("the config", "the test"), most-active file otherwise.
    if (!mentions.length && absRoot && ANAPHOR_RE.test(task)) {
      const top = rankFileActivation(session, { kindFilter: anaphorKindFilter(task), limit: 1 })[0];
      if (top) {
        nlFiles.push({ rel: top.sourceId, sourceId: top.sourceId, kind: "anaphor" });
        touchFileActivation(session, top.sourceId, "mention");
        if (onNote) onNote({ move: "file_resolved", mention: "(anaphor)", sourceId: top.sourceId, kind: "anaphor", score: Number(top.score.toFixed(3)) });
      } else if (onNote) {
        onNote({ move: "file_missing", mention: "(anaphor)", reason: "no file in scope yet this session — name one or admit a workspace first" });
      }
    }
    for (const m of mentions) {
      if (nlFiles.length >= NL_MENTION_MAX) break;
      // Attachments first: an exact name match is already admitted above —
      // just carry its file identity into this turn's membership below.
      if (attachmentNames.has(m)) {
        nlFiles.push({ rel: m, sourceId: m, kind: "attachment" });
        touchFileActivation(session, m, "mention");
        if (onNote) onNote({ move: "file_resolved", mention: m, sourceId: m, kind: "attachment" });
        continue;
      }
      if (!absRoot) {
        if (onNote) onNote({ move: "file_missing", mention: m, reason: "no workspace in scope for this turn" });
        continue;
      }
      const r = resolveMentionedFile(absRoot, m);
      if (!r.ok) {
        // Exact resolution missed — try the basename against activation
        // history before declaring it missing ("package.json" for the
        // package.json this session has been reading).
        if (r.gap?.kind === "file_missing") {
          const via = resolveBasenameMention(session, m);
          if (via) {
            nlFiles.push({ rel: via, sourceId: via, kind: "basename" });
            touchFileActivation(session, via, "mention");
            if (onNote) onNote({ move: "file_resolved", mention: m, sourceId: via, kind: "basename" });
            continue;
          }
        }
        if (onNote) onNote({ move: r.gap?.kind === "file_missing" ? "file_missing" : "file_unreadable", mention: m, reason: r.gap?.reason ?? null, rel: r.gap?.rel ?? null });
        continue;
      }
      // Force-admit when the bulk scan did not (or not yet): real bytes,
      // real sourceId, real reader steps — the file entering the record.
      try {
        if (!session.corpus) session.corpus = createCorpusSession();
        const index = session.corpusIndex ?? new Map();
        const prev = index.get(r.rel);
        if (!prev || prev.size !== r.size || prev.mtimeMs !== r.mtimeMs) {
          const text = fs.readFileSync(r.abs, "utf8").slice(0, MAX_FILE_CHARS);
          const res = admitChunked(session.corpus, { text: piiAdmit(session, text, r.rel, onNote), sourceId: r.rel });
          index.set(r.rel, { size: r.size, mtimeMs: r.mtimeMs });
          session.corpusIndex = index;
          const encounters = isCodeHunk(text)
            ? codeEncounters(text, { source: `workspace:${r.rel}`, offset: 0 })
            : textEncounters(text, { source: `workspace:${r.rel}`, offset: 0 });
          for (const enc of encounters) { await session.reader.step(enc); await yieldToEventLoop(); }
          if (onNote) onNote({ move: "file_resolved", mention: m, sourceId: r.rel, kind: "workspace", admitted: res.deduped ? 0 : 1, chars: text.length });
        } else if (onNote) {
          onNote({ move: "file_resolved", mention: m, sourceId: r.rel, kind: "workspace", admitted: 0, cached: true });
        }
        nlFiles.push({ rel: r.rel, sourceId: r.rel, kind: "workspace" });
        touchFileActivation(session, r.rel, "mention");
      } catch (err) {
        if (onNote) onNote({ move: "file_unreadable", mention: m, reason: err?.message ?? null, rel: r.rel });
      }
    }
  }

  // 1.5 DEF THE VOID — UNIVERSAL, EVERY TURN. The void is the shape of what
  // the answer must satisfy; the MODE is the grain at which it is filled.
  // A chat answer fills a small void in one draw; a long answer fills a
  // larger one in a single extended draw; a projection fills a large void
  // section by section on an append-only ledger, iterated by revisions, its
  // live projection read in a surface. The void is defined by ASKING
  // QUESTIONS first (from the task + topic; the reading is still empty, so
  // no material can steer the shape).
  const topic = topicPhrase(task);
  // THE SHAPE IS AN ASSERTION, NEVER A FIXED LADDER (2026-09-21): this turn
  // asserts its own essay-shape register — every cell CANDIDATE, concedable
  // when the material refutes its universal claim (organs/essay-shape-
  // register.js). The void is composed through this register, so a cell the
  // material refuted is never asked, and a future pass can concede cells on
  // real specimens. One register per turn: no document's refutation silently
  // mutates a shared table.
  const shapeRegister = createShapeRegister();
  // The reading state the born gate consults: what the hunt actually found.
  // Available BEFORE the full read: sources retained + the reader's running
  // state. `stats`/`session.referents` fill in later (the enriched re-ask).
  const readingState = (partial = {}) => ({
    referents: session.referents?.referents?.size ?? 0,
    relations: partial.relations ?? 0,
    sources: session.webSources?.size ?? 0,
    disputes: (session.lastPageSurprise?.salient ?? 0) > 2,
    surprise: session.lastPageSurprise?.salient ?? 0,
  });
  // THE HONEST GOLDEN, hoisted to function scope (2026-09-13): every
  // proposition the mouth is handed is recorded here, so the satisfaction can
  // score the UNPROMPTED recall — claims the essay carries that it was never
  // told. Grading the echo is scoring the prompt, not the reading.
  const handedKeys = new Set();
  const keyOf = (p) => `${p.end1 ?? ""}|${p.label ?? ""}|${p.end2 ?? ""}`;
  const preVoid = voidCellsFor({ topic, question: task, openQuestions: [], shadowReferents: [], reading: readingState(), shapeRegister });
  // The origami SECTIONS are the CONTENT cells (grounded prose about the
  // subject); the shape-instrument cells steer internally but are not reader
  // sections. The seed question is still the first content question.
  const voidQuestions = preVoid.cells.filter((c) => c.relevant && c.essay).map((c) => c.question);
  if (onNote) onNote({ move: "void_questions", of: voidQuestions.length, cells: `${preVoid.cells.filter((c) => c.relevant && c.essay).length} content / ${preVoid.cells.filter((c) => c.relevant && !c.essay).length} shape of ${preVoid.relevant} relevant`, questions: voidQuestions.slice(0, 5) });
  // THE MODE DECISION — made HERE, before any expensive essay-oriented work,
  // and never upgraded by material discovered later. "auto" is a normal
  // conversation: a plain question stays chat; only an explicit artifact ask
  // becomes projection and an elaboration ask becomes long. The preliminary
  // shape uses the task + workspace alone (no web — the decision never
  // depends on having gone out and gathered).
  const prelimShape = detectAnswerShape(task, workspaceStats.files > 0, false, false, [], null);
  let runMode = normalizeMode(mode) === "auto"
    ? (prelimShape.shape === "composition" ? "projection" : prelimShape.shape === "long" ? "long" : "chat")
    : normalizeMode(mode);
  if (onNote) onNote({ move: "void_defined", mode: runMode, shape: prelimShape.shape, of: voidQuestions.length, basis: mode === "auto" ? null : "forced by the caller" });
  // CODE MODE: a projection whose register is INSTRUMENT (code) writes source
  // code, not prose. The language is read off the request; python when it
  // names none (disclosed). Every essay-specific organ (the 27-cell void, the
  // meaning-potential staging, Ranke/Murch, APA citations) is bypassed for
  // code — its shape is CODE_SHAPE_PRIOR, its voice is code, its check is the
  // hard pyodide validator.
  let isCode = runMode === "projection" && isInstrument;
  let codeLanguage = isCode ? (detectLanguage(task) ?? "python") : null;
  // DATA-SOVEREIGN APP: a web app that HOLDS records (notes/contacts/ledger).
  // The unconscious owns the substrate (encrypted event log + fold + snip/cut);
  // the model proposes only the record SCHEMA. The machine renders the shell
  // around it — the model never writes crypto, storage, or the fold.
  const isSovereignData = isCode && codeLanguage === "html" && isDataHoldingTask(task);
  // THE SPEC GATE (at the ask) — the refusal came from the ethos clearance at
  // the turn's top (constitution → ethosClear). Refused: no generation, the
  // account IS the answer. The clearance rides the session, so every turn
  // carries its standing. `clearance.reason`/`clearance.shape` are the exact
  // judgment and stay on the record (onNote, the shadow trail); the text a
  // person or agent actually reads is composed by organs/socratic.js
  // (Kierkegaard) in the register interlocutor.js recognized them under —
  // the working vocabulary (SHAPE, FORECLOSE, STANDPOINT) never reaches them.
  const specRefusalText = !clearance.cleared ? speakDecline({ reason: clearance.reason, shape: clearance.shape }, interlocutor) : null;
  if (specRefusalText && onNote) onNote({ move: "spec_refused", reason: clearance.reason });

  // ── THE ASK-BACK DOOR (build-clarify.js — the recursive void) ──────────
  // A BUILD-SHAPED ask ("make a ... site/app") does NOT generate until the
  // void it would fill is declared across the nine operators. The three
  // registers run IN ORDER: ethos already cleared at the turn's top (the
  // clearance above); logos is Degrees Kelsen over the void + answers (a
  // cycle refuses the answer before it lands); pathos is the re-ground
  // reading of the round. When build-blocking cells are undeclared the turn
  // RETURNS the questions — real JSON, no generation — and the person's
  // answers ride back through the SAME session (`resumeAnswered` carrying
  // {cell, value} + `openBefore` from the prior round), re-declaring the
  // void each time until licensed or still_under_specified.
  const buildAskGate = () => {
    if (clearance?.cleared !== true) return null;
    const t = String(task ?? "").trim();
    if (!t) return null;
    // A REPLY to an open round is the build continuing — the person answers
    // "who is it for? how many?" with plain words, whatever THIS turn's own
    // shape reads as (a reply reads "chat/open", never "projection"; the
    // session's open questions are the license, not this turn's register).
    const open = session?.buildRounds?.at(-1)?.round?.questions;
    if (Array.isArray(open) && open.length) return t;
    // A fresh build ask — must be a projection-shaped code ask to open the door.
    // The artifact word must be a real SOFTWARE build target. The discriminator
    // is the count: "write a five-page paper on X" contains both "write" and
    // "page", but "five-page" is a page-count, not a web page — the build door
    // must not ask "who is it for?" at a prose essay. A concrete software
    // target (site/app/dashboard/tool/game/web page) wins even when prose words
    // appear ("make a site that reviews books" is a build). A bare "page" is a
    // build target only when it is NOT a page-count and NOT beside a prose noun.
    if (runMode !== "projection") return null;
    const verb = /^(?:make|build|create|generate|write|let'?s make)\b/i.test(t);
    const softwareTarget = /(?:site|app|dashboard|tool|game|web ?page|landing ?page|homepage)\b/i.test(t);
    const pageCount = /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)[- ]\s*page\b/i.test(t);
    const barePage = /\bpage\b/i.test(t) && !pageCount;
    const proseNoun = /\b(?:paper|essay|report|article|document|thesis|dissertation|story|novel|book|poem|brief|memo|letter|post)\b/i.test(t);
    if (verb && (softwareTarget || (barePage && !proseNoun))) return t;
    return null;
  };
  const buildTask = buildAskGate();
  if (buildTask) {
    const openBeforeArr = (Array.isArray(openBefore) && openBefore.length)
      ? openBefore.map(String)
      : (session?.buildRounds?.length
          ? (session.buildRounds.at(-1)?.round?.void?.levels?.[0]?.void?.undeclared ?? []).map((u) => u.field)
          : null);
    let answers = Array.isArray(resumeAnswered)
      ? resumeAnswered.filter((a) => a && typeof a === "object" && (a.cell || a.value)).map((a) => ({ cell: String(a.cell ?? "").trim(), value: String(a.value ?? "").trim() }))
      : [];
    // THE PLAIN REPLY FOLD: a caller (the fold, the TUI) answering an open
    // round sends the person's own words as `task` — "for me, three profiles"
    // — not hand-built JSON. When the session holds an open round and the
    // caller sent no structured answers, the reply is folded onto the open
    // cells by the questions' own words (foldAnswersFromTask, pure, pinned).
    const priorRound = session?.buildRounds?.at(-1)?.round;
    const priorQuestions = priorRound?.questions ?? [];
    if (!answers.length && priorQuestions.length) {
      const folded = foldAnswersFromTask(buildTask, priorQuestions);
      if (folded.length) answers = [...answers, ...folded.map((f) => ({ cell: f.cell, value: f.value }))];
    }
    const standing = session?.buildStanding ?? [];
    const roundCount = Array.isArray(session?.buildRounds) ? session.buildRounds.length : 0;
    // THE RE-GROUND: the void is re-declared FROM the answers — each filled
    // cell becomes a declared cell of the current void, so the recursion
    // narrows and closes (the pathos of one ring is the ethos of the next).
    // Declared cells ACCUMULATE on the session across rounds; a round never
    // loses what an earlier round already named.
    const declaredFromAnswers = Object.fromEntries(
      answers.filter((a) => a.cell && a.value).map((a) => [a.cell, a.value]),
    );
    // The session's declared map starts from what the TASK itself declared
    // (slot = the thing to build, admits = its parts), then accumulates the
    // person's answers across rounds. A licensed build thus carries the full
    // declared shape — slot included — so downstream (language re-derivation,
    // the generation prompt) reads the build's own words, never a guess.
    const accumulatedDeclared = { ...buildVoidFields(buildTask), ...(session?.buildDeclared ?? {}), ...declaredFromAnswers };
    const clarify = buildClarify({
      task: buildTask, modality: "code", round: roundCount,
      openBefore: openBeforeArr,
      answers,
      standing,
      fieldsByLevel: { whole: { ...buildVoidFields(buildTask), ...accumulatedDeclared } },
      // ETHOS is already the turn's clearance; the door re-checks nothing.
      clear: () => ({ cleared: true }),
      // LOGOS: Degrees Kelsen over the standing + the answers' own claims.
      lint: ({ notes }) => {
        const cycle = findClaimCycle(notes ?? []);
        return cycle ? { cycles: [cycle] } : { cycles: [] };
      },
      // PATHOS: the round's re-ground reading — an answer that fills an
      // open cell holds the ground; one that fills nothing does not move it.
      reGround: ({ fills }) => fills.length
        ? { kind: "ground_holds", basis: `${fills.length} cell(s) filled — the ground absorbs what arrived` }
        : { kind: "ground_unmoved", basis: "no cell filled this round — no altitude change" },
      budget: CLARIFY_MAX_ROUNDS,
    });
    const landed = recordRound(session.buildRounds ?? (session.buildRounds = []), clarify);
    session.buildRounds = landed;
    session.buildDeclared = accumulatedDeclared;
    session.buildStanding = [...standing, ...(clarify.fills ?? []).map((f) => ({ end1: "the person", label: "declared", end2: f.value.slice(0, 120) }))];
    if (clarify.kind === "needs-clarification") {
      if (onNote) onNote({ move: "clarify_asked", round: clarify.round, cells: clarify.questions.map((q) => q.cell) });
      const text = clarify.questions.map((q) => q.ask).join("\n");
      return earlyResult(text, {
        answerShape: "needs-clarification",
        mechanical: {
          rung: "build-clarify", round: clarify.round, schema: CLARIFY_SCHEMA,
          openBefore: clarify.void.levels[0].void.undeclared.map((u) => u.field),
          questions: clarify.questions.map((q) => ({ cell: q.cell, ask: q.ask, wouldSettle: q.wouldSettle })),
          asksBack: true,
        },
        truncated: false,
      });
    }
    if (clarify.kind === "still_under_specified") {
      if (onNote) onNote({ move: "clarify_stalled", round: clarify.round, basis: clarify.basis });
      return earlyResult(`An answer is still missing — ${clarify.basis ?? "the build is not yet specified."}`, {
        answerShape: "needs-clarification",
        mechanical: { rung: "build-clarify", round: clarify.round, schema: CLARIFY_SCHEMA, stalled: true, basis: clarify.basis ?? null },
        truncated: false,
      });
    }
    if (clarify.kind === "refused") {
      if (onNote) onNote({ move: "clarify_refused", reason: clarify.reason });
      return earlyResult(`This build is refused — ${clarify.reason ?? "unknown reason."}`, {
        answerShape: "needs-clarification",
        mechanical: { rung: "build-clarify", round: clarify.round, schema: CLARIFY_SCHEMA, refused: clarify.reason ?? null },
        truncated: false,
      });
    }
    // licensed: generation may begin — the void is declared, the build falls
    // through to the normal code pipeline below with the declared shape.
    if (onNote) onNote({ move: "clarify_licensed", round: clarify.round, cells: (clarify.fills ?? []).map((f) => f.cell) });
    // A REPLY turn licensed the build: the reply's own shape read "chat", but
    // the build is the session's — re-enter code mode from the declared
    // shape so the model writes the artifact, not prose about it.
    if (session?.buildRounds?.length && !isCode) {
      isCode = true;
      runMode = "projection";
      codeLanguage = detectLanguage(task) ?? "python";
      if (onNote) onNote({ move: "declared_reenter_code", from: "chat reply", basis: "the build continued by plain reply — re-entered the code pipeline" });
    }
    // THE DECLARED SHAPE RE-DERIVES THE LANGUAGE: a build declared as a
    // *site* is an html artifact, whatever detectLanguage fell back to
    // ("a myspace-like site" reads no extension → python by default; the
    // person said SITE). The declared slot/admits are the person's own
    // words; the re-derivation reads them the same way the register does,
    // never a second vocabulary.
    const declaredSlotWords = String(session?.buildDeclared?.slot ?? session?.buildDeclared?.admits ?? "").toLowerCase();
    if (isCode && languageForDeclared(session?.buildDeclared ?? {}, codeLanguage) !== codeLanguage) {
      codeLanguage = languageForDeclared(session?.buildDeclared ?? {}, codeLanguage);
      if (onNote) onNote({ move: "declared_language", from: detectLanguage(task) ?? "python", to: codeLanguage, basis: "the declared shape names a site" });
    }
  }
  // THE WHEEL (D/E/R): every stage of the pipeline is one pass of
  // Void/Beings/Fold — DEF what would satisfy it, EVA a real difference,
  // REC an append-only landing whose pattern is the next stage's ground.
  // One ledger per run; the turns ARE the run, in order.
  const wheel = createWheelLedger({ task });
  if (prelimShape?.register) {
    wheel.turn("register",
      "a right register must construe the request's genre as a staged process, carried in a medium, for a tenor — from the request's own structure, never a noun list",
      { field: prelimShape.register.field?.field ?? null, mode: prelimShape.register.mode, tenor: prelimShape.register.tenor?.tenor ?? null, provenance: prelimShape.register.field?.provenance ?? "staged", basis: prelimShape.register.basis },
      prelimShape.register,
      { evaBasis: "Holmes reads the cast through the meaning potential — a LEARNED sign where the sidecar has read this field, a RECEIVED one where it has not; the impression hunt is its first EVA", operator: "NUL", grain: "Ground", face: "the void opens" });
  }
  // Gore's initial gather: hunt the FIRST question (the most basic: "What is
  // X?") to seed the reading — then the per-section loop below strikes each
  // remaining question for its own shape.
  // The SEED QUERY is the clean TOPIC, never the first void question — a
  // question like "What is the bongo antelope, marked off from everything
  // adjacent to it — what space is this essay..." is a terrible web search
  // string (measured: it returned nothing, so the ground was the chat text
  // alone and every section failed grounding). The topic is a real search
  // term; the void questions are the SECTIONS, not the search queries.
  // PROJECTION hunts the web for its shape. A normal chat turn does NOT go out
  // and search the topic — chat is the main use case; a research-shaped ask
  // may still gather when the web door is explicitly open (ER7_WEB_SEARCH=1).
  const seedQuery = topic;
  let webResult = { pages: 0, chars: 0 };
  let hasWeb = false;
  if (runMode === "projection" && !isCode) {
    // Projection hunts the web for its shape — the void's own hunt.
    webResult = await searchAndAdmitWeb(session, sessionId, seedQuery, onNote, { move: "gather", webConsent });
    hasWeb = webResult.pages > 0;
  } else if (WEB_SEARCH_ON && (prelimShape.shape === "research" || prelimShape.shape === "open")) {
    // A research-shaped chat ask may gather when the web door is open
    // (ER7_WEB_SEARCH=1) — but never a plain question by default.
    webResult = await searchAndAdmitWeb(session, sessionId, task, onNote, { move: "gather", maxPages: 2 });
    hasWeb = webResult.pages > 0;
  }

  // MEMBERSHIP SET: the source ids THIS TURN grounded on — surfaced by its
  // own surf, adopted by its own prompt, or admitted for it by its own
  // primary-source hunt. The citation sweep ranges over this set, never
  // over the whole accumulated corpus: a source the turn did not use is
  // inadmissible, not merely filtered (2026-09-17, the stale-citation fix).
  const turnUsedSourceIds = new Set();

  // 2. Surf AND fold the conversation itself: the chat history is admitted to
  // the same corpus session as the workspace (unique per-turn sourceId, so
  // the corpus's concat-on-readmission guard is never tripped), and the fold
  // reader steps it alongside the workspace text. Prior turns then hold real
  // referents the surfer can address — the model is anchored to what IT said
  // before, not left to ad-lib continuity.
  const materialLines = [];
  if (discourse) materialLines.push(`[System Context]: ${discourse}`);
  for (const m of chatHistory) materialLines.push(`[${m.role}]: ${m.content}`);
  materialLines.push(`[user]: ${task}`);
  const materialText = materialLines.join("\n\n");

  // HEIMDALL FOLDS, IT NEVER REPLAYS: session.reader is a persistent,
  // per-session accumulator (kernel/reading.js's step() extends
  // fold/graphIndex/log one encounter at a time — it never recomputes from
  // scratch), so handing it the FULL conversation every turn does not just
  // waste time, it re-witnesses old sentences as new ones, inflating their
  // independent-support counts turn after turn (measured: a live session's
  // wall time climbed 13.7s -> 67.8s over five turns as the unmeasured,
  // non-draw share of that time grew with the replayed history). Only the
  // text since the last fold is admitted; a clean append is diffed against
  // session.lastChatText (the same check the corpus admission below already
  // trusts) and the offset continues from where the prior turn left off, so
  // textEncounters' sentence anchors land on the same absolute positions a
  // full replay would have produced. A history that was EDITED, not just
  // appended to (a regenerate), cannot be diffed as a clean append — real,
  // but even then a large message is never forced through unbounded: it is
  // capped to its most recent FOLD_RESET_MAX_CHARS and the cap is disclosed.
  const FOLD_RESET_MAX_CHARS = Number(process.env.ER7_FOLD_RESET_MAX_CHARS ?? 20000);
  const prevChatText = session.lastChatText ?? "";
  const cleanAppend = materialText.startsWith(prevChatText);
  let foldText = cleanAppend ? materialText.slice(prevChatText.length) : materialText;
  let foldOffset = cleanAppend ? prevChatText.length : 0;
  let foldCapped = false;
  if (!cleanAppend && foldText.length > FOLD_RESET_MAX_CHARS) {
    foldOffset = materialText.length - FOLD_RESET_MAX_CHARS;
    foldText = materialText.slice(foldOffset);
    foldCapped = true;
  }

  // The reader is handed the transcript with its role marks BLANKED (the-fold/
  // transcript-reading.js): measured, the marks became beings ("user",
  // "assistant") and turned each question's first word into a name ("Tell",
  // "What"). Same length, so every anchor keeps its absolute position.
  const encounters = textEncounters(readableTranscript(materialText).slice(foldOffset, foldOffset + foldText.length), { source: `proxy:session:${sessionId}`, offset: foldOffset });
  if (onNote) onNote({ move: "reading", count: encounters.length, chars: foldText.length, totalChars: materialText.length, folded: cleanAppend, capped: foldCapped });
  if (!cleanAppend && onNote) onNote({ move: foldCapped ? "fold_reset_capped" : "fold_reset", chars: materialText.length, keptChars: foldText.length });

  for (const enc of encounters) {
    const turn = await session.reader.step(enc);
    if (turn?.tasks?.open && onNote) {
      for (const t of turn.tasks.open) {
        onNote({ move: "open_question", task_id: t.task_id ?? null, description: t.description ?? null, questions: t.questions ?? [] });
      }
    }
    await yieldToEventLoop();
  }
  const fold = session.reader.getFold();
  session.turnCount++;

  // ── PATHOS — THE FELT SHAPE, ON EVERY TURN (the third Greek leg) ──────
  // Ethos (the ground) comes first; logos (the reading) builds the record;
  // pathos names how the material was UNDERGOEN, FOR WHOM — rhythm (Murch),
  // curve (surprise/tension/release from the fold's own machinery), strain
  // (the hamartia-gate). A felt shape with no declared experiencer is
  // REFUSED (organs/pathos.js): here the experiencer is the person at the
  // door — the guest Terry Gross draws out — undergoing this session's
  // exchange. Computed on the conversation's own material, so the felt shape
  // rides every response, not just CLI reads.
  let pathos = null;
  let pathosReGround = null;
  let pathosLog = session.pathosLog ?? null;
  try {
    const pathosState = {
      contested: Array.isArray(fold.unresolvedAlternatives) ? fold.unresolvedAlternatives : [],
      expired: Array.isArray(fold.exclusions) ? fold.exclusions : [],
      contradictions: [],
    };
    const exper = { who: String(userId ?? "the-person").trim() || "the-person", read: `conversation:${sessionId}` };
    pathos = pathosOf({ text: materialText, experiencer: exper, state: pathosState, fold });
    const groundCheck = reGroundCondition(pathos);
    if (groundCheck.kind !== "ground_holds") {
      const act = reGround({ read: pathos, giver: GIVER, reScope: null });
      pathosLog = landReGround(pathosLog ?? [], act);
      session.pathosLog = pathosLog;
      pathosReGround = pathosLog[pathosLog.length - 1];
    }
    if (onNote) onNote({ move: "pathos_read", strain: pathos.strain, flatline: pathos.rhythm.flatline, blinks: pathos.rhythm.blinks, curve: pathos.curve.measured ? "measured" : "unmeasured", reGround: groundCheck.kind });
  } catch (err) {
    // A pathos failure must never break a turn — the felt shape is carried
    // when it can be and honestly absent when it cannot.
    pathos = null;
    if (onNote) onNote({ move: "pathos_failed", error: err.message });
  }

  // Reader's task log — the "little logic notes".
  const taskLog = session.reader.getTasks?.() ?? [];
  if (onNote && taskLog.length) {
    for (const t of taskLog) {
      if (t?.status === "open" || t?.result) {
        onNote({ move: "reader_note", task_id: t.task_id ?? null, description: t.description ?? null, result: t.result ?? null });
      }
    }
  }

  const rawEntries = fold.graphEntries ?? [];
  const ledger = createRelationCompositionLedger(rawEntries);
  const stats = ledger.diagnostics();
  const observed = acquireCompositionCandidates(rawEntries, { minWitnesses: 1 });
  // THE LICENSE (THE-MORAL-CORE.md): the charter family's prohibitions and
  // protections are GIVEN affordances with the charters as giver — the LICENSE
  // the composition runs under, not a filter it passes through. Only a given
  // affordance licenses composition (kernel/hyperlexicon.js): a reading that
  // would compose "permit torture" finds no such given, because the family gave
  // "prohibit torture" instead. Issued BEFORE any observed candidate, so
  // experience can never override the charters (admission's own
  // `standing === "given"` guard drops later candidates on a given key).
  const licensedHyperlexicon = giveCharterFamily(createHyperlexicon(), charterFamily, giveHyperlexiconAffordance);
  const hyperlexicon = admitHyperlexiconCandidates(licensedHyperlexicon, observed.map((c) => ({
    left: c.left, right: c.right, giver: GIVER,
    witnesses: (c.witnesses ?? []).slice(0, 3).map((w) => w?.[0]).filter(Boolean),
    meta: { independentSupport: c.meta?.support ?? 0, rememberedLeft: false, rememberedRight: false },
  })));

  if (onNote) onNote({ move: "composed", relations: stats.relationEdges, bindings: stats.referentBindings, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length });

  // KELSEN — THE PRIMARY MODALITY, ON EVERY SURFACE. The reading's own claims
  // are linted through the precedence order (regime.js's own PRECEDENCE_STEPS
  // / precedenceOrderPhrase() — imported above, never hand-typed here again;
  // this comment used to restate it by hand and, audited 2026-09-14, had
  // drifted to drop "regime" entirely) whenever the reading holds propositions —
  // the CHAT turn and the projection alike, never a silent pick. Computed
  // HERE, at the reading's first edges, so both the answer's prompt and the
  // thinking surface read the SAME resolutions: the mouth is told what is
  // contested and how the order resolves it, before anything is composed.
  const resultKelsen = rawEntries?.length
    ? kelsenGrade({
        propositions: notesFromEdges(rawEntries),
        index: sessionReferentIndex(session, onNote),
        precedence,
        tagClaim,
      })
    : null;

  // 3. SURF the task against the session corpus — the mechanical address
  // ladder (source→heading→content→window). Content only reaches the model
  // inside surfacedSegments, or a DISCLOSED void fact (P32's searched-void
  // pattern: a fact about what the corpus does NOT hold, never a behavioral
  // instruction stacked on top of it).
  if (session.corpus && session.corpus.documents.size > 0) {
    // Chat-format lines have no structural boundaries that surfTask's mechanical
    // address ladder can navigate. When all corpus docs are chat: entries (no
    // workspace or web material), route directly to conversationFoldSegments —
    // the conversation-aware path that already handles this case correctly.
    const hasNonChatMaterial = [...session.corpus.documents.keys()].some(k => !String(k ?? "").startsWith("chat:"));

    if (hasNonChatMaterial) {
      // A projection task (an artifact with sections — essay/paper/report/spec,
      // any generation with material to write from) wants the multi-doc surf:
      // one windowed segment per source, so each section has its own grounded
      // material — not the single best address a one-shot answer needs.
      const surf = surfTask(session, task, onNote, { composition: runMode === "projection" });
      surfacedSegments = surf.segments;
      // MEMBERSHIP (2026-09-17, the cite set is the turn's grounding, never
      // the pool): everything this turn's surf surfaced is this turn's
      // material — in projection the section briefs come from the fold that
      // read these very segments, so they are citable here; chat/long mark
      // only what the material loop actually adopts below. Stale pages
      // (fetched turns ago) are not in this set, so they can never be cited
      // by this turn, however many downstream filters fail.
      for (const s of surf.segments) {
        const sid = segmentSourceOf(s);
        if (sid) turnUsedSourceIds.add(sid);
      }
      // QUA-FILE GUARANTEE (bounded by the surf cap): a file this turn
      // resolved (mention, basename, anaphor, attachment) is surfaced even
      // when the address ladder did not rank it — a bounded window of its
      // own bytes, carrying its file identity in _ledger + membership so
      // citations and the facing page show the file the answer stood on.
      // The mouth receives content only, never the name; the record keeps
      // which file it was. When the cap is already full the file is NOT
      // silently dropped: a file_dropped note names it on the record, so a
      // missing citation is explainable, never mysterious.
      // Operator-pointed segments go FIRST: the downstream prompt budget
      // (materialRoom) takes surfacedSegments in order, so a file the
      // operator named beats ladder-ranked material to the mouth — the
      // ladder is cut first, never the pointed-at file. Membership follows
      // the same order.
      const pointed = [];
      for (const f of nlFiles) {
        if (turnUsedSourceIds.has(f.sourceId)) continue;
        if (surfacedSegments.length + pointed.length >= SURF_MAX_SEGMENTS) {
          if (onNote) onNote({ move: "file_dropped", sourceId: f.sourceId, kind: f.kind, reason: "surf cap full — ladder segments filled the budget" });
          continue;
        }
        const doc = session.corpus.documents.get(f.sourceId);
        const text = String(doc?.text ?? doc ?? "").trim();
        if (!text) continue;
        const capped = text.slice(0, SURF_MAX_SEGMENT_CHARS);
        pointed.push({
          text: capped,
          _ledger: { source: f.sourceId, heading: null, addressed_by: "file-mention", bytes: [0, capped.length] },
        });
        turnUsedSourceIds.add(f.sourceId);
        touchFileActivation(session, f.sourceId, "surfaced");
        if (onNote) onNote({ move: "file_surfaced", sourceId: f.sourceId, kind: f.kind, chars: capped.length });
      }
      surfacedSegments = [...pointed, ...surfacedSegments];
      // Touch everything the ladder surfaced too — being read IS pointing.
      for (const s of surfacedSegments) {
        const sid = segmentSourceOf(s);
        if (sid) touchFileActivation(session, sid, "surfaced");
      }
      surfVoid = surf.void || surf.segments.length === 0;
      surfVoidInfo = (surf.void || surf.segments.length === 0)
        ? { gap: surf.void ? (surf.gap ?? "content_not_found") : "nothing_relevant_found", reason: surf.reason ?? null, whatWouldSettle: voidSettleQuestion(surf.void ? (surf.gap ?? "content_not_found") : "nothing_relevant_found", task) }
        : null;
      workspaceStats.segments = surfacedSegments.length;
      if (surfVoid) workspaceStats.refusals = 1;
    }

    // BROAD RECALL and chat-only: use the conversation's own fold — the prior
    // turns' words addressed as a conversation, never the mechanical ladder
    // (which has no cue for meta questions or unstructured chat lines).
    if (shouldUseConversationFold(task, chatHistory, hasNonChatMaterial)) {
      const foldSegments = conversationFoldSegments(session, task, materialText);
      if (foldSegments.length) {
        surfacedSegments = foldSegments;
        surfVoid = false;
        surfVoidInfo = null;
        workspaceStats.segments = foldSegments.length;
        if (onNote) onNote({ move: "surfaced", operator: "CONV", fan: foldSegments.length, docs: session.corpus.documents.size, broadRecall: isBroadRecall(task) });
      }
    }
  } else {
    surfVoid = true;
    surfVoidInfo = { gap: "no_material", reason: "no material established for this session", whatWouldSettle: voidSettleQuestion("no_material", task) };
    if (onNote) onNote({ move: "surf_skip", reason: session.corpus ? "empty_corpus" : "no_corpus" });
  }

  if (materialText.trim()) {
    if (!session.corpus) session.corpus = createCorpusSession();
    const prevText = session.lastChatText ?? "";
    const delta = materialText.startsWith(prevText)
      ? materialText.slice(prevText.length)
      : materialText;
    if (delta.trim().length >= 8) {
      const srcId = `chat:${sessionId}:turn-${session.turnCount - 1}${materialText.startsWith(prevText) ? "" : ":reset"}`;
      admitChunked(session.corpus, { text: piiAdmit(session, delta, srcId, onNote), sourceId: srcId });
      if (onNote) onNote({ move: "conversation_folded", sourceId: srcId, chars: delta.length, reset: !materialText.startsWith(prevText) });
    }
    session.lastChatText = materialText;
  }

  // 3.5 THE THREE RESOLUTIONS — the discourse restated by the reading's own
  // organs at three grains (atmosphere / lens / paradigm). This is
  // summarization BY THE TERRAIN, never model compression; the most recent
  // material reaches the model VERBATIM (the surfaced segments below), and
  // these blocks are the paraphrase resolutions above it.
  let resolutions = null;
  if (RESOLUTIONS_LEVEL > 0) {
    const index = sessionReferentIndex(session, onNote);
    if (index) {
      // The transcript the blocks read. When the client SENDS history it is
      // the request's own messages; when it sends none (the no-history memory
      // test — every request carries only the current message) the
      // conversation lives only in the session's own fold, so it is
      // reconstructed from the corpus's chat documents. Without this the
      // atmosphere block sees zero exchanges and the digest is empty.
      const transcript = chatHistory.length
        ? chatTranscript(chatHistory)
        : transcriptFromSession(session, task);
      const notes = notesFromEdges(rawEntries);
      // A BROAD recall question names no single referent ("what do you
      // remember about me"), so lens/paradigm would resolve nothing and the
      // digest would be empty for exactly the question that asks for the
      // whole. Give the blocks the conversation's own beings as the active
      // set — the summary is asked over the whole conversation, not over one
      // addressed passage.
      let question = task;
      if (isBroadRecall(task)) {
        const beings = conversationBeings(index, transcript);
        if (beings.length) question = `Tell me what you remember about ${beings.join(" and ")}.`;
      }
      const started = Date.now();
      try {
        resolutions = resolutionBlocks({
          level: RESOLUTIONS_LEVEL,
          question,
          transcript,
          index,
          notes,
          voids: [],
          records: [],
          dmdWindow,
          prominence: null,
        });
      } catch (err) {
        if (onNote) onNote({ move: "resolutions_failed", error: err.message });
      }
      if (onNote && resolutions) {
        onNote({
          move: "resolutions", level: resolutions.level,
          active: resolutions.active ?? null,
          atmosphere: resolutions.atmosphere ? { basis: resolutions.atmosphere.basis } : null,
          lens: resolutions.lens ? { windows: resolutions.lens.windows, cuts: resolutions.lens.cuts } : null,
          paradigm: resolutions.paradigm ? { basis: resolutions.paradigm.basis, window: resolutions.paradigm.window } : null,
          ms: Date.now() - started,
        });
      }
    }
  }

  // 4. Build grounding digest
  const digestInfo = makeDigest(sessionId, session, fold, ledger, hyperlexicon);
  let readingDigest = digestInfo.digest;
  if (WIKIPEDIA_ON) {
    const wikiNotes = await enrichFromWikipedia(digestInfo.composition);
    if (wikiNotes.length > 0) {
      readingDigest += `\n\nA reference on the terms at play:\n${wikiNotes.map((w) => `- ${w.term}: ${w.snippet}`).join("\n")}`;
      if (onNote) onNote({ move: "wiki_lookup", notes: wikiNotes.map((w) => w.term) });
    }
  }
  // WIKISOURCE — the hyperlexicon's PRIMARY-SOURCE door. The composition's
  // terms can name a public-domain work (or an author/speaker a work covers);
  // when one resolves on Wikisource, the FULL text is admitted to the corpus
  // and stepped through the reader — the same admission a web source gets —
  // so the reading absorbs the primary bytes, not a secondhand digest. The
  // hyperlexicon then reads real relations from the work itself. Never a
  // guess: only a page that actually exists resolves.
  // WIKISOURCE — the hyperlexicon's PRIMARY-SOURCE door, a PROJECTION-only
  // step (the artifact's grounding). A chat answer does not fetch primary
  // texts: that is the artifact's hunt, not a normal conversation's.
  if (runMode === "projection" && WIKISOURCE_ON && digestInfo.composition?.length) {
    // The admission below is BLOCKING setup before the first draw (fetch +
    // reader-step up to 11K chars of primary text). Ollama's keep_alive
    // expires during it, so the first draw cold-loads and can blow the job
    // timeout. This is NOT keep-warm (which stays off): it is a scoped
    // residency ping for the duration of active setup work, cleared after.
    const residentTimer = keepResidentDuringSetup(typeof model === "string" && model ? model.replace(/^er7:/, "") : MODEL_REGISTRY.id);
    try {
    const hlTerms = [...new Set(
      Object.values(digestInfo.composition)
        .filter((e) => e?.standing === "given")
        .flatMap((e) => [e.left, e.right].map((s) => String(s ?? "").trim()).filter(Boolean)),
    )].slice(0, WIKI_MAX_CONCEPTS);
    const primary = [];
    for (const term of hlTerms) {
      const got = await wikisourceText(term);
      if (got) primary.push({ term, ...got });
    }
    for (const p of primary) {
      const srcId = `wikisource:${sessionId}:${p.term}`;
      // READ FIRST, ADMIT ONLY ON SALIENCE (2026-09-17): admission used to
      // happen BEFORE the reader ran, unconditionally — the measured door
      // the gun-legislation page walked through (admitted to the corpus at
      // an earlier turn, cited by a haiku turns later). Now the reader steps
      // the page and only a page that moved the reading is admitted; a
      // zero-surprise page is retained on the shadow (the visit stays on
      // the record) but never enters the corpus — it can be neither
      // surfaced nor cited. Nomination is not admission.
      const encounters = textEncounters(p.text, { source: srcId, offset: 0 });
      let surprise = { salient: 0 };
      for (const enc of encounters) {
        const step = await session.reader.step(enc);
        const s = step?.surprise;
        if (!s) { await yieldToEventLoop(); continue; }
        if ((s.expectationEffects?.length ?? 0) > 0 || (s.recanonicalizations?.length ?? 0) > 0) surprise.salient++;
      }
      // Keep the shadow + a note so the reader's movement is disclosed, and
      // fold the primary source INTO the digest so the mouth speaks from it.
      session.shadow.push({ url: `https://en.wikisource.org/wiki/${encodeURIComponent(p.title.replace(/ /g, "_"))}`, title: p.title, seenAt: new Date().toISOString(), chars: p.text.length, resolution: "fine", reading: surprise.salient });
      capShadow(session);
      if (surprise.salient > 0) {
        admitChunked(session.corpus, { text: piiAdmit(session, p.text, srcId, onNote), sourceId: srcId });
        stampAdmission(session, srcId, { task, salience: surprise.salient, resolution: "fine", kind: "wikisource" });
        // MEMBERSHIP: this page grounded THIS turn — it is citable here.
        turnUsedSourceIds.add(srcId);
        readingDigest += `\n\n[A primary source: ${p.title}]\n${p.text.slice(0, 3000)}${p.text.length > 3000 ? "…" : ""}`;
        if (onNote) onNote({ move: "wikisource_primary", term: p.term, title: p.title, chars: p.text.length, salient: surprise.salient });
      } else {
        if (onNote) onNote({ move: "wikisource_ignored", term: p.term, title: p.title, retained: "shadow-only" });
      }
    }
    } finally {
      clearInterval(residentTimer);
    }
  }
  if (resolutions?.text) {
    readingDigest += `\n\n[The conversation at three resolutions]\n${resolutions.text}`;
  }

  // ── void-detection: steer answer shape ───────────────────────────────────
  // Zero the space first, then see what is still empty. A greeting needs one
  // sentence; a command needs acknowledgment; a research question needs
  // grounded material; a void needs a disclosed fact (P32). This steers the
  // model toward the proper length and modality without relying on the model
  // to figure out the shape itself — the shape is the READING's verdict.
  // The MODE is authoritative: whatever the recomputed shape says, a forced
  // mode wins, and a material discovered mid-turn never upgrades a chat turn
  // into long-form.
  let answerShape = detectAnswerShape(task, workspaceStats.files > 0, hasWeb, surfVoid, surfacedSegments, resolutions);
  if (runMode === "projection") answerShape = { shape: "composition", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  else if (runMode === "long") answerShape = { shape: "long", maxTokens: LONG_MAX_TOKENS, modality: "extended" };
  else if (answerShape.shape === "composition") answerShape = { shape: "research", maxTokens: CALL_MAX_TOKENS, modality: "grounded" };
  if (onNote) onNote({ move: "answer_shape", shape: answerShape.shape, modality: answerShape.modality, mode: runMode });

  // 5. Build messages for Ollama. THE MODEL IS THE MOUTH — the prompt speaks
  // the way a collaborator speaks, never as an instrument. No "you are a
  // reading instrument", no apparatus names, no session ids, no relation
  // counts. The essay's user-turn is in the essay's voice; the surfaced
  // material is "here's what came up", not "material was surfaced from the
  // workspace" (the-fold firewall.js: nothing here names a part of this
  // instrument, so there is no word to borrow).
  // The resolutions' own text already opens with "Where the conversation
  // stands:" (the atmosphere block's header) — never double the banner.
  const readingContext = resolutions?.text
    ? (resolutions.text.startsWith("Where the conversation stands:")
      ? `\n\n${resolutions.text}`
      : `\n\nWhere the conversation stands:\n${resolutions.text}`)
    : "";
  const systemCore = [
    // The standing character — the same neutral voice every session begins
    // with, plus the durable theory of mind (what the person has asserted
    // and its standing), type-level only. Never a persona name, never a role.
    NEUTRAL_CHARACTER,
    // Who answers, as serving fact (turnStanding) — the small model never
    // has to reach for a name from weights.
    turnStanding(model),
    ...(durable.length ? [`\nWhat you remember about this person (from before):\n${durable.map((f) => `- ${f}`).join("\n")}`] : []),
    // Composition: the frame is "we're writing an essay about X" — never an
    // instruction to the model about its own identity or process.
    answerShape.shape === "composition"
      ? (isCode
        ? `\nWe're writing ${codeLanguage ? `a ${codeLanguage} program` : "a program"} named ${codeArtifactName(task, codeLanguage)}.`
        : `\nWe're working on a piece about ${topicPhrase(task)}.`)
      : "\nYou're helping answer a question. Here's the context we have.",
    discourse ? `\n${discourse}` : null,
    readingContext || null,
    null, // void is asserted as data in the material block, not as a behavioral instruction
    // KELSEN, ON THE ANSWER'S BODY — when the reading held conflicting claims,
    // the precedence order resolved them and the mouth must speak the
    // standing, never silently pick a winner. This is the machine-that-won't-
    // answer on every surface: the answer carries why the claim won or lost.
    resultKelsen?.resolutions?.length
      ? `\n\nSome claims in the material conflict. They were resolved by the fixed norm hierarchy (${precedenceOrderPhrase()}):\n${resultKelsen.resolutions.slice(0, 5).map((r) => `- “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} (${r.why ?? r.reason})`).join("\n")}${resultKelsen.resolutions.length > 5 ? `\n… ${resultKelsen.resolutions.length - 5} more.` : ""}\nSpeak with that standing: name the conflict and the resolution, do not silently pick.`
      : null,
  ].filter(Boolean).join("\n");

  // Chat history precedence: walk from the most recent message backwards and
  // keep as much as the budget permits after the essential system context and
  // the turn's own task. Older messages are the first thing to give way.
  const taskLen = String(task).length + MSG_OVERHEAD_CHARS;
  const systemLen = systemCore.length + MSG_OVERHEAD_CHARS;
  let chatLen = 0;
  const keptChat = [];
  for (let i = chatHistory.length - 1; i >= 0; i--) {
    const m = chatHistory[i];
    const cost = String(m?.content ?? "").length + MSG_OVERHEAD_CHARS;
    if (systemLen + taskLen + chatLen + cost > PROMPT_MAX_CHARS) break;
    keptChat.unshift({ role: m.role, content: m.content });
    chatLen += cost;
  }
  // When the client sends no history (stateless API call), reconstruct prior
  // turns from the session corpus so opaque tokens and short prior exchanges
  // reach the model verbatim — the semantic surf may miss them by topic mismatch.
  if (!keptChat.length && session.corpus?.documents?.size) {
    const priorTurns = transcriptFromSession(session, task);
    for (const t of priorTurns) {
      const qCost = String(t.question ?? "").length + MSG_OVERHEAD_CHARS;
      const aCost = String(t.answer ?? "").length + MSG_OVERHEAD_CHARS;
      if (systemLen + taskLen + chatLen + qCost + aCost > PROMPT_MAX_CHARS) break;
      keptChat.push({ role: "user", content: t.question });
      if (t.answer) keptChat.push({ role: "assistant", content: t.answer });
      chatLen += qCost + aCost;
    }
  }

  // Surfed material fills what remains — the most-relevant segments first,
  // truncated only when the budget (not caution) demands it.
  const materialRoom = Math.max(0, PROMPT_MAX_CHARS - systemLen - taskLen - chatLen);
  const material = [];
  let used = 0;
  for (const s of surfacedSegments) {
    const text = String(s.text ?? "");
    if (used + text.length > materialRoom) break;
    material.push(text);
    used += text.length;
    // MEMBERSHIP: what the prompt actually adopts is what the turn used.
    const sid = segmentSourceOf(s);
    if (sid) turnUsedSourceIds.add(sid);
  }

  // The fact gate's standing for this turn (read again after the draw).
  const factGate = { searched: false, ground: [] };
  let systemContent = systemCore;
  // THE MOUTH NEVER READS RAW BYTES IN A PROJECTION (2026-09-13). A section
  // draw must voice the reading, not re-read the source: the per-section
  // brief carries the fold's own claims (propsForSection), so dumping the
  // surfaced material into the system prompt made every draw a giant-context
  // call — measured: a 25K system prompt (17K of raw source text) re-sent on
  // each of 13 section draws. Chat/long have no per-section brief, so they
  // keep the material in the prompt; projection draws on the claims alone.
  if (runMode !== "projection") {
    if (material.length) {
      systemContent += `\n\nHere's what came up on this:\n\n"""\n${material.join("\n\n")}\n"""`;
    } else if (surfVoid) {
      // GROUND FIRST (INS·Ground, the declared preflight): the engine has just
      // found no ground for this ask. If the ask is itself a checkable open-now
      // fact, the web check is declared here — before a word is drawn — under
      // the person's per-request consent (the fold's web switch) or the env door.
      // Widened 2026-09-23: a past-tense possessive office ask ("who was
      // Lincoln's VP") is the identical checkable shape, just tensed
      // differently — factShape's own past-tense branch returns before its
      // definite-noun-phrase walk runs, so `factAsk.scope` alone missed it;
      // fact-gate.js's possessiveOfficeAsk names the shape directly. Found
      // live: this exact ask, checking on, shipped two different wrong
      // answers from two different models with declaredFactCheck false and
      // no search ever run.
      const factAsk = factShape(task);
      const possessiveAsk = factAsk.scope === "closed" ? possessiveOfficeAsk(task) : null;
      const declaredFactCheck = factAsk.fact && (factAsk.scope === "open-now" || Boolean(possessiveAsk)) && (webConsent || WEB_SEARCH_ON);
      const webGround = await voidWebSearchFallback(task, { force: declaredFactCheck });
      factGate.searched = Boolean(webGround);
      if (onNote && factAsk.fact) onNote({ move: "fact_preflight", scope: factAsk.scope, declared: declaredFactCheck, found: webGround?.found ?? null, query: webGround?.query ?? null });
      if (webGround?.found) factGate.ground = [{ text: webGround.text, ref: `web-search:${webGround.query}` }];
      // The web's own finding is ADOPTED into the environment (Wilson): the
      // role becomes a kind, the finding a link, so the route that resolved
      // it is faster next time — the colony keeps what its scouts found.
      if (webGround?.found && factAsk.fact && factAsk.jurisdiction?.head) {
        try {
          currentFactsStore().adoptWebFinding({ head: factAsk.jurisdiction.head, groundText: webGround.text, query: webGround.query });
        } catch { /* adoption never breaks the turn */ }
      }
      const what = classifyAbsent(task);
      const why  = surfVoidInfo?.gap === "no_material" ? "no_material" : "searched_absent";
      let vt;
      if (!webGround) {
        vt = buildVoidText({ what, why, grain: "unverified" });
      } else if (webGround.found) {
        vt = webGround.text;
      } else {
        vt = buildVoidText({ what, why, grain: "probable", query: webGround.query });
      }
      systemContent += `\n\nHere's what came up on this:\n\n"""\n${vt}\n"""`;
    }
  }
  // Verbatim snips (citations) available to the composition so the essay can
  // QUOTE the sources — the model weaves real source text into its sections,
  // and the mechanical Sources appendix below still lists the same snips.
  // Never paraphrased: the model is handed the sources' own sentences.
  // Projection withholds them from the prompt too: the citations ledger and
  // footnotes carry the verbatim spans; the section briefs carry the claims.
  if (answerShape.shape === "composition" && runMode !== "projection" && session.webSources && session.webSources.size) {
    // Same relevance gate as the appendix below: session-persistent pools,
    // per-turn quotes. Stale quotes would steer the model, not just the
    // appendix — worse — so they drop here too.
    const gatedPrompt = relevantSources(session.webSources, task);
    const snips = snipsFromSources(gatedPrompt.kept, { maxSnips: 8, maxChars: 200 });
    if (snips.length) {
      systemContent += `\n\nVerbatim from the sources (quote these where they support your writing, never invent a quote):\n\n"""\n${snips.map((s) => `- "${s.snip}"`).join("\n")}\n"""`;
    }
  }
  if (onNote) onNote({ move: "prompt_budget", system: systemCore.length, chat: keptChat.length, chatChars: chatLen, materialSegments: runMode === "projection" ? 0 : material.length, materialChars: runMode === "projection" ? 0 : used, taskChars: taskLen, max: PROMPT_MAX_CHARS, projection: runMode === "projection" ? "compact — section briefs carry the claims" : null });

  // TRAJECTORY BOREDOM — "boring is itself a surprise to avoid" (user,
  // 2026-09-17). Not the same thing as pacing.js's flatline (one text's own
  // sentence-rhythm) or holon.js's per-turn echo/reproduction verdicts (one
  // repeated sentence): this is the same Fisher permutation test
  // document-ledger.js already uses on an essay's sections, pointed at the
  // assistant's own turns in the ALREADY-KEPT chat window (never a fresh
  // window size chosen for this) — the two-model loop that motivated this
  // (401b81c) opened on "## Dispute Resolution" every turn, restated with
  // less change each time. When it fires, `trajectoryBoredom.basis` is a
  // measured fact, fed to the model exactly like every other earned-cast
  // fact — never an instruction to "be more creative."
  const trajectoryBoredom = detectTrajectoryBoredom(keptChat.filter((m) => m.role === "assistant").map((m) => m.content));
  if (onNote && trajectoryBoredom.bored) onNote({ move: "trajectory_boredom", n: trajectoryBoredom.n, basis: trajectoryBoredom.basis });

  // ── the earned cast, this turn only. The model is never told it is
  // playing a role — it receives exactly the facts this turn earned, at the
  // object level, and nothing else. A cue with nothing to say adds nothing.
  const cue = earnedCue({ task, chatHistory: keptChat, surfVoidInfo, pathos, trajectoryBoredom });
  if (cue?.mouth) {
    systemContent += `\n\nA few things to keep in mind as you answer:\n${cue.mouth}`;
    if (onNote) onNote({ move: "earned_cue", act: cue.act, strain: cue.strain, attentions: cue.eligible, chars: cue.mouth.length });
  }

  const ollamaMessages = [];
  ollamaMessages.push({ role: "system", content: systemContent });
  for (const m of keptChat) {
    ollamaMessages.push({ role: m.role, content: m.content });
  }
  ollamaMessages.push({ role: "user", content: task });

  // DEBUG: dump the exact prompt sent to the model.
  try { fs.writeFileSync("/tmp/er7-prompt-debug.json", JSON.stringify(ollamaMessages, null, 2)); } catch {}

  // 6. Stream tokens from Ollama, forward each to caller — through the single
  // eval slot. COMPOSITION: when the answer shape is a composition and the
  // reading established real structure, the overall concept stays in the
  // unconscious notes (systemCore: digest + resolutions + grounded material)
  // while each section is generated as a BRIEF, separate task. The model is
  // never asked to hold the whole essay in one draw — it is asked to write
  // each section against the same ground, briefly, and the assembly is the
  // reading's own structure (LaVar: the shape comes from the record, never
  // the model).
  // The essay's shape is the VOID, DEF'd by ASKING QUESTIONS — never by
  // copying the source's own headings (Wikipedia's taxonomy table is not the
  // essay's shape). The questions were asked BEFORE the hunt (preVoid); after
  // the gather, the reading's OWN open questions and the shadow's referents
  // enrich them — the material's unresolved distinctions deepen the void.
  // CRITICAL GATE: only a true COMPOSITION shape gets the multi-section
  // plan. A plain question ("name one river") must take the FAST single-draw
  // path — running the essay pipeline on every question makes even a
  // one-line ask compose six sections and take 30-60s (measured live). The
  // void questions are still computed (they inform the shape), but they only
  // become SECTIONS when the shape is composition.
  let compositionPlan = { questions: runMode === "projection" ? [...voidQuestions] : [], declaration: null };
  if (runMode === "projection" && !isCode) {
    const idx = sessionReferentIndex(session, onNote);
    // THE INDEX'S REFERENTS ARE REF-IDS, NOT OBJECTS (reading-log.js:312 —
    // `referents` is a Set of ids; the surfaces live behind `represent`).
    // Reading `r.surfaces` off the Set's strings silently emptied `refs` on
    // every run — measured 2026-09-13: the referent enrichment never fired,
    // the void collapsed to the always-on cells, and every essay re-asked
    // "what is X". `represent` returns a ref id's longest surface. Quality-
    // gated (2026-09-13): a heading fragment or a lowercase content word is
    // not a being — measured: "coordinates" and "Industry Applies" became
    // essay sections. A being-name is multi-word or capitalised.
    const JUNK_REFERENT = new Set(["coordinates", "location", "significance", "managed", "source", "authored", "published", "related", "topics", "last", "updated", "visit", "information", "primary", "resources", "bureau", "gallery", "references", "overview", "notes", "search"]);
    // BEING-QUALITY RANKING (2026-09-13): the outline's sections come from
    // the record's CENTRAL beings, ranked by recurrence (the index's own
    // surface rows per referent) weighted by proper-name signal — never the
    // first-N. A being that recurs and is multi-word/capitalised is the
    // record's spine; "coordinates" is a heading, not a being.
    const mentionOf = new Map();
    for (const e of idx?.events ?? []) mentionOf.set(e.referent_id, (mentionOf.get(e.referent_id) ?? 0) + 1);
    const beingQuality = (id, s) => {
      const n = String(s ?? "").trim();
      if (n.length <= 3) return 0;
      const lc = n.toLowerCase();
      if (JUNK_REFERENT.has(lc)) return 0;
      if (lc === topic.toLowerCase()) return 0;
      let q = 0;
      const words = n.split(/\s+/);
      if (words.length >= 2) q += 2;                 // multi-word names carry more
      if (/[A-Z]/.test(n)) q += 1;                    // proper-case signal
      q *= (1 + Math.log2(1 + (mentionOf.get(id) ?? 0))); // recurrence dominates
      return q;
    };
    const refs = [...(idx?.referents?.values?.() ?? [])]
      .map((id) => { try { return { id, s: idx.represent?.(id) ?? id }; } catch { return { id, s: id }; } })
      .filter(({ id, s }) => beingQuality(id, s) > 0)
      .sort((a, b) => beingQuality(b.id, b.s) - beingQuality(a.id, a.s))
      .slice(0, 3)
      .map(({ s }) => s);
    // THE BELONGING GATE (2026-09-21, ethos first — Mozi: a claim stands on
    // what the eyes and ears can witness, or it does not stand). A session's
    // referents are the SESSION's beings, not the TASK's. A referent that
    // shares no content word with the task's own topic is refused admission
    // to this turn's void — the battery-and-lighthouse essay was exactly this
    // leak: the shape came from a session's retained referents, never the
    // ask. The gate's words are the task's own (topic + task, folded to
    // content tokens); a referent passes only on a real shared token. The
    // refused referents are DISCLOSED, never silent.
    const taskWords = new Set(
      [topic, task].join(" ").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !["the", "and", "for", "with", "about", "white", "paper", "write"].includes(w)),
    );
    const belongsToTask = (s) => {
      const words = String(s ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
      return words.some((w) => taskWords.has(w));
    };
    const belongingRefs = refs.filter(belongsToTask);
    const refusedRefs = refs.filter((s) => !belongsToTask(s));
    if (refusedRefs.length) {
      if (onNote) onNote({ move: "belonging_gate", refused: refusedRefs, reason: "session referents sharing no content word with the task are refused the void — the task's shape is the task's own", kept: belongingRefs });
    }
    const openQ = (session.reader.getTasks?.() ?? [])
      .filter((t) => t?.status === "open" && t?.questions?.length)
      .flatMap((t) => t.questions ?? [])
      .filter((q) => q && q.length > 10)
      .slice(0, 2);
    // THE BELONGING GATE COVERS OPEN QUESTIONS TOO (2026-09-21): the session's
    // open-task questions are the SESSION's questions, not the TASK's — the
    // "moment of no return" and "unraveling" sections leaked through here even
    // after refs were gated. A question sharing no content word with the task
    // is refused the void, disclosed, never silently dropped.
    const belongingOpenQ = openQ.filter(belongsToTask);
    const refusedOpenQ = openQ.filter((q) => !belongsToTask(q));
    if (refusedOpenQ.length) {
      if (onNote) onNote({ move: "belonging_gate_open", refused: refusedOpenQ, reason: "open session questions sharing no content word with the task are refused the void", kept: belongingOpenQ });
    }
    if (belongingOpenQ.length || belongingRefs.length) {
      const enriched = voidCellsFor({ topic, question: task, openQuestions: belongingOpenQ, shadowReferents: belongingRefs, reading: readingState({ relations: stats?.relationEdges ?? 0 }), shapeRegister });
      // The SECTIONS are the ESSAY-CONTENT cells (the reader-facing prose).
      // The shape-instrument cells (when would the essay revise, what does it
      // declare) steer the composition internally but are not sections of a
      // standalone piece — an essay about the bongo does not have a section
      // titled "when would the essay concede its frame."
      compositionPlan = { questions: enriched.cells.filter((c) => c.relevant && c.essay).map((c) => c.question), declaration: null };
    }
  }
  // On a RESUMED run, the sections are the STORED void plan (from the ledger) —
  // the same shape the crashed run DEF'd — minus the already-answered parts.
  // Never re-derive a different shape after a crash: the plan is the shape.
  let sections = (resumePlan ?? compositionPlan.questions)
    // CRASH RESILIENCE: questions already answered (part titles in the existing
    // ledger) are skipped on a resumed run — the essay continues, it never
    // restarts. The ledger already holds those parts; appending is the only write.
    .filter((q) => !resumeAnswered.includes(String(q).toLowerCase().trim()))
    // THE VOID'S EXTENT IS THE TASK'S, THEN THE VOID'S OWN (2026-09-21): a
    // "five-paragraph essay" ask is DEF'd as FIVE parts — the shape the writer
    // was told to write, measured 2026-09-21 when a "five-paragraph essay"
    // projection wrote twelve because the void sweep outgrew the ask. An
    // explicit "N-paragraph"/"N-section" count in the task caps the outline
    // FIRST; only then does the generous void cap (ER7_MAX_SECTIONS) bound it.
    // A task that names no count keeps the void's full sweep.
    .slice(0, (() => {
      // THE EXTENT IS THE VOID'S OWN (2026-09-21): no regex, no task-word
      // counting. The mouth writes WIDE — whatever the void def's, capped only
      // against runaway. The FOLD assembles the wide draft into the asked-for
      // shape (five paragraphs from twelve parts) AFTER the writing; the fold
      // is the machinery, and it sees the whole draft, not a truncated one.
      return Number(process.env.ER7_MAX_SECTIONS ?? 20);
    })());
  // CODE: the artifact's sections are its structural units (CODE_SHAPE_PRIOR),
  // never the essay void-cells — a code ask DEF's its shape as header, core,
  // CLI, entry, usage; the essay sweep has no bearing on a file's parts.
  if (isCode) {
    sections = codeSections(task, codeLanguage);
    compositionPlan = { questions: sections, declaration: null };
    if (onNote) onNote({ move: "code_shape", language: codeLanguage, name: codeArtifactName(task, codeLanguage), sections });
  }
  // THE MEANING POTENTIAL STAGES, NOT THE TEMPLATE (Halliday, 2026-09-14):
  // when the register names a genre, the void consults the whole prior
  // cascade (sidecar → genre priors → reading priors → the record's seams)
  // BEFORE the essay template. The template is the fallback for an empty
  // meaning potential, never the default for a registered genre.
  let discoveredVoice = null; // the LLM's discovered write voice — hoisted so the section loop reads it
  let discoveredFelt = null; // the LLM's felt target (releases/tension) — threaded into the verdict
  let discoveredFraming = null; // the full discovered framing (staging + voice + feltTarget)
  let storySeed = null; // the ground-seed cast — drawn once, recorded in the write turn
  let citesResult = null; // the citation ledger's split: verbatim (quoted) vs unsupported (the model's own) — Ranke's parse
  let citationSources = new Map(); // the actual citable material (web + workspace) — hoisted for the verdict
  let categorized = null; // the periodic-table cell this piece landed in — hoisted for the thinking surface
  if (runMode === "projection" && prelimShape?.register?.field?.field && !isCode) {
    try {
      const staged = queryMeaningPotential(prelimShape.register, { record: null, seams: [] });
      // THE IMPRESSION (D/E/R, the first EVA after the register DEF): the
      // meaning potential is measured for what it KNOWS of this genre's
      // shape and feeling — hits, phases, shapes — no content rides.
      const impression = {
        genre: prelimShape.register.field.field,
        seen: staged.evidence.filter((e) => e.seen).reduce((a, e) => a + (e.seen ?? 0), 0),
        phases: [...new Set(staged.evidence.flatMap((e) => e.phases ?? []))].slice(0, 7),
        shapes: [...new Set(staged.evidence.flatMap((e) => e.shapes ?? []))],
        contributors: staged.evidence.map((e) => e.from),
      };
      wheel.turn("impression",
        `what a satisfying ${impression.genre} would FEEL like — shape, felt, staging; no content`,
        { seen: impression.seen, phases: impression.phases.length, shapes: impression.shapes, contributors: impression.contributors.length, hyperlexicon: Object.keys(hyperlexicon.composition ?? {}).length },
        impression,
        { evaBasis: "the meaning-potential query measures the genre's accumulated shape+feeling against an empty content ground", operator: "SIG", grain: "Figure", face: "scout" });
      const stagedPhases = staged.evidence.flatMap((e) => e.phases ?? []).filter((p) => p && p.length > 3 && p.toLowerCase() !== topic.toLowerCase());
      // THE DISCOVERY (footprints first — the LLM's proper place: proposing,
      // never measuring). If the genre already has a discovered framing, reuse
      // it — the trajectory is easier next time. If not, TASK the LLM to "go
      // find what makes a good <genre>": its staging, write voice, felt
      // target — and REC its trajectory as footprints (append-only sidecar).
      // The structural organs dispose of whatever the LLM proposes.
      const field = prelimShape.register.field.field;
      let framingApplied = false;
      // THE GROUND COMES FIRST (2026-09-21, the 3-agent paper benchmark): the
      // discovery's staging is a genre-ARC ("the moment of no return") — the
      // fallback for an EMPTY ground. When the workspace/web actually holds
      // material, the essay's sections must be themed from THAT content, never
      // replaced by a narrative arc the material doesn't discuss. A grounded
      // essay section ("what the Cumberland river did for Nashville") written
      // to an arc theme ("the revelation") shares nothing with the material →
      // satisfaction flags it ungrounded → Ranke/Murch churn without growth
      // (measured: 4 × 500-char sections + 13 revisions, ~2500 chars total,
      // instead of a 5-page paper). The discovery still supplies the WRITE
      // VOICE and felt target when grounded; only its section-staging is
      // declined in favor of the material's own structure.
      const groundBeforeDiscovery = (session.webSources?.size ?? 0) > 0 || (workspaceStats.files ?? 0) > 0 || surfacedSegments.length > 0;
      try {
        const sidecar = loadSidecar();
        const fp = discoveredFramingFor(sidecar, { genre: field, medium: prelimShape.register.mode });
        if (fp) {
          const applied = applyDiscovered({ framing: fp.framing, sections, questionFor: (f, t) => questionFor(prelimShape.register, f, t), topic, keepSectionsWhenGrounded: groundBeforeDiscovery });
          // ADDITIVE ONLY: a discovered voice fills a field the register has
          // no voice for; it never overrides one it does. Same for the felt
          // target, which arrives from the same narrative-shaped question.
          const declared_ = voiceIsDeclaredFor(prelimShape.register);
          sections = applied.sections; discoveredVoice = declared_ ? null : applied.voice; framingApplied = true; discoveredFelt = declared_ ? null : (fp.framing?.feltTarget ?? null); discoveredFraming = fp.framing;
          if (declared_ && onNote) onNote({ move: "framing_voice_declined", field, basis: "the register declares its own voice for this field — a discovered voice may add, never override" });
          wheel.turn("discovery", `reuse the footprints — a framing for ${field} was discovered before`, { from: "footprints", staging: fp.framing.staging.length, grounded: groundBeforeDiscovery }, { framing: fp.framing, basis: fp.basis }, { evaBasis: "the sidecar's latest footprint wins; no new model call — easier next time", operator: "INS", grain: "Pattern", face: "scout" });
        } else {
          // ANTIStrauss: the discovery's model call must go through the SAME
          // gated wire every other call uses. discoverFraming falls back to a
          // raw upstream fetch when no `draw` is passed; routing it through
          // streamOllamaChat (which runs the safety-and-ethics gate) closes
          // the one path a model call could otherwise take without the gate.
          const d = await discoverFraming({
            register: prelimShape.register, impression: staged, prior: sidecar, upstream: OLLAMA, model,
            draw: async (msgs, maxTokens) => {
              let out = "";
              for await (const chunk of streamOllamaChat(model, msgs, { maxTokens, onNote, signal })) {
                if (typeof chunk === "string") out += chunk;
              }
              return out;
            },
          });
          if (d?.framing) {
            const applied = applyDiscovered({ framing: d.framing, sections, questionFor: (f, t) => questionFor(prelimShape.register, f, t), topic, keepSectionsWhenGrounded: groundBeforeDiscovery });
            const declared_ = voiceIsDeclaredFor(prelimShape.register);
            sections = applied.sections; discoveredVoice = declared_ ? null : applied.voice; framingApplied = true; discoveredFelt = declared_ ? null : (d.framing?.feltTarget ?? null); discoveredFraming = d.framing;
            if (declared_ && onNote) onNote({ move: "framing_voice_declined", field, basis: "the register declares its own voice for this field — a discovered voice may add, never override" });
            wheel.turn("discovery", `the LLM is tasked to go find what makes a good ${field}`, { from: d.from, staging: d.framing.staging.length, voice: !!d.framing.writeVoice, grounded: groundBeforeDiscovery }, { framing: d.framing, footprints: !!d.appended, basis: d.basis }, { evaBasis: "the LLM PROPOSES the framing; the wheel's EVA and the satisfaction organs dispose", operator: "INS", grain: "Pattern", face: "scout" });
            if (d.appended) { try { fs.writeFileSync(SIDECAR_PATH, JSON.stringify(d.appended, null, 2)); } catch {} }
          }
        }
      } catch {}
      if (!framingApplied && stagedPhases.length >= 2 && !resumePlan) {
        sections = [...new Set(stagedPhases)].slice(0, 7).map((f) => questionFor(prelimShape.register, f, topic));
        if (onNote) onNote({ move: "void_questions", of: sections.length, cells: `staged from the meaning potential: ${staged.evidence.map((e) => e.from.split(" ")[0]).join(" + ")}`, questions: sections.slice(0, 5), basis: staged.evidence.map((e) => e.basis).slice(0, 3) });
      }
    } catch {}
  }
  // A forced PROJECTION whose void produced no content cells still gets an
  // artifact — a single grounded part on the whole of what came up, rather
  // than silently falling out of the mode into a chat answer.
  if (runMode === "projection" && !sections.length) sections = [topicPhrase(task) || task];
  // THE ARTIFACT'S EXTENT IS THE MATERIAL'S OWN. A projection with NO ground
  // to write from (no workspace, no web, no surfaced passages) has no
  // multi-section extent — the void cannot support sections it cannot fill.
  // A "short essay about X" asked with nothing to ground it becomes a short
  // piece (bounded), and the grounding checks disclose its standing honestly
  // rather than churning ungrounded rewrites forever.
  const hasGrounding = (session.webSources?.size ?? 0) > 0 || (workspaceStats.files ?? 0) > 0 || surfacedSegments.length > 0;
  if (runMode === "projection" && !hasGrounding && !isCode) sections = sections.slice(0, 2);
  // THE PLAN (D/E/R): after the impression DEF's EVA, the void stages —
  // phases × question-form × topic, arc climbing toward the DEF'd shape.
  // The plan is a PREDICTION; the read and write will be measured against it.
  if (runMode === "projection") {
    wheel.turn("plan",
      sections.length ? "the void's staged phases, ordered toward a climbing arc, each phase a question in the register's form" : "a single declared artifact — the void stages it as it writes",
      { sections: sections.length, first: sections[0]?.slice(0, 80) ?? null, arc: "climbing" },
      { sections, register: prelimShape.register?.field?.field ?? null },
      { evaBasis: "the predicted fortune arc must match the genre's accumulated shape; the read below is its EVA", operator: "SEG", grain: "Field", face: "Murch" });
    // DEF — the interpretive frame is DECLARED (not read off grammar): what
    // would satisfy this piece, named before a word is written. The felt
    // target rides here — the genre's own release count is the criterion the
    // write will be measured against.
    wheel.turn("declare",
      `the piece is declared in the ${prelimShape.register?.field?.field ?? "staged"} register: ${discoveredFelt ? `felt target ${discoveredFelt.releases ?? "?"} releases, shape "${String(discoveredFelt.shape ?? "")}"` : "no felt target — the register's own shape stands"}`,
      { feltTarget: discoveredFelt?.releases ?? null, genre: prelimShape.register?.field?.field ?? null },
      { feltTarget: discoveredFelt, register: prelimShape.register?.field?.field ?? null },
      { evaBasis: "the frame is declared before the write; EVA measures the write against it", operator: "DEF", grain: "Atmosphere", face: "the void declares" });
  }
  // The composition block below may EVOLVE the plan (REC supersedes the outline
  // and adds themes as the reading grows). Hoisted so the satisfaction check
  // reads the plan the essay actually wrote, whether or not the block ran.
  let plannedSectionsOut = [...sections];
  let rankeTotalFindings = 0; // Ranke's rewrite count, hoisted for the thinking surface (scoped across the composition block)
  // The single-answer modes' void-fill verdict, hoisted for the result —
  // every answer, whatever the mode, is a void defined and satisfied.
  let chatSatisfaction = null;
  // A generated composition is a DOCUMENT LEDGER (EOT): every part admitted
  // is a line, every revision is a line, and the text a person reads is a
  // PROJECTION of the ledger — the full revision history is always re-foldable.
  // DEF (declare the shape) and EVA/REC (admit or revise each part) are the
  // runtime gates here; only their outcome lands in the ledger.
  const documentLedger = sections.length
    ? createDocumentLedger({ docId: `${sessionId}:${session.turnCount}`, title: task.slice(0, 60), path: sections.map((s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-")).join("_") })
    : null;
  // Store the VOID PLAN (every question the essay must answer) as the ledger's
  // first line — so a resumed run reads the SAME plan back and continues the
  // unanswered questions, never re-deriving a different shape after a crash.
  if (documentLedger && sections.length) {
    appendLedgerLine(documentLedger, {
      role: "plan", title: "Void plan", text: sections.map((s) => `- ${s}`).join("\n"),
      giver: "eoreader7:void",
      basis: "the DEF'd void questions this essay must answer — resumed runs continue from these, never re-derive",
    }, { dir: ESSAY_LEDGER_DIR });
  }
  // THE VOID, DEF'd: the essay's shape declared across all nine operators
  // BEFORE writing begins. This is what "done" means — the void filled by
  // parts that pass its admission test. The meno question is answered by the
  // declaration: we know we've learned when nothing the void named is missing.
  const voidDeclaration = documentLedger
    ? (compositionPlan.declaration ?? declareEssayVoid({ title: task.slice(0, 60), topic: topicPhrase(task), sections, holonLevel, shadow: session.shadow ?? [], webSources: session.webSources }))
    : null;
  if (documentLedger && onNote) onNote({
    move: "void_declared", slot: voidDeclaration?.slot ?? null,
    cardinality: voidDeclaration?.cells?.find((c) => c.op === "DEF")?.declared ?? null,
    extent: voidDeclaration?.cells?.find((c) => c.op === "SEG")?.declared ?? null,
    mneme: voidDeclaration?.cells?.find((c) => c.op === "SIG")?.declared ? null : voidDeclaration?.mneme ?? null,
    shadowSites: session.shadow?.length ?? 0,
  });

  // OUR OWN KELSEN GAUGE, driven by the SHAPE of the target — not a raw number.
  // The void's cells say how determinate the target is: grounded, tested,
  // bounded cells (EVA the claim is witnessed, SEG the extent is cut, DEF the
  // cardinality is declared) want HIGH Kelsen-degrees — literal, bound to the
  // material. Generative, open cells (INS what kind, SYN how it composes, REC
  // what would revise, NUL the space it clears) allow LOWER Kelsen-degrees —
  // the prose can be more impressionistic, freer. Kelsen is a function of the
  // shape, so an open subject composes loosely while a fact-ledger composes
  // literally. A caller may still override via the turn's `kelsen` field.
  const kelsenFromShape = () => {
    if (kelsen != null) return kelsen;
    const cells = voidDeclaration?.cells ?? [];
    if (!cells.length) return DEFAULT_KELSEN;
    const grounded = cells.filter((c) => ["EVA", "SEG", "DEF"].includes(c.op)).length;
    const ratio = grounded / Math.max(1, cells.length);
    return Number((0.3 + ratio * 0.6).toFixed(2)); // 0.3 (all generative) … 0.9 (all grounded)
  };
  // The Kelsen gauge is a PROJECTION instrument (how tightly an artifact is
  // bound to its ground). A chat/long answer uses the caller's override or
  // the flat default — no artifact shape to gauge against.
  const compositionKelsen = runMode === "projection" ? kelsenFromShape() : (kelsen ?? DEFAULT_KELSEN);
  if (runMode === "projection" && onNote) onNote({
    move: "kelsen", value: compositionKelsen,
    shape: voidDeclaration?.cells?.map((c) => c.op).filter(Boolean).join(" ") ?? "none",
    grounded: voidDeclaration?.cells?.filter((c) => ["EVA", "SEG", "DEF"].includes(c.op)).length ?? 0,
    cells: voidDeclaration?.cells?.length ?? 0,
  });
  // The essay LIVES as a JSONL file on disk (not just in memory) so its state
  // is projectable at any moment — even mid-writing. Each observation appends
  // as one line; the projection re-folds the file.
  if (documentLedger) {
    try { fs.mkdirSync(ESSAY_LEDGER_DIR, { recursive: true }); } catch {}
  }
  let documentLines = [];
  let totalStrain = 0; // the cumulative correction load — how hard the piece was to write
  let fullText = "";
  let truncated = false;
  // Last draw's stream-shape witnesses + cut count (machine-side, never guards).
  let streamMeta = null;
  let streamCuts = 0;
  let codeValidation = null; // the hard pyodide verdict on a code artifact — hoisted for the satisfaction check
  let privacyResult = null; // the Privacy archon's (Brandeis) weak-signal findings — hoisted for the result
  let copyResult = null; // the anti-copy archon's (Martial) holon-aware findings — hoisted for the result
  let securityResult = null; // the security archon's (Saltzer) CWE-gap findings — hoisted for the result
  let blindspotResult = null; // the blindspot archon's (Popper) whole-view findings — hoisted for the result
  let piiResult = null; // the PII archon's (Goffman) redacted findings — hoisted for the result
  let injectionResult = null; // the injection archon's (Ulysses) findings — hoisted for the result
  // The model is the tip of consciousness: it must never run away. A hard
  // cap on total generated chars protects the turn from a repetition loop
  // (num_predict is not always honored by these models). When the cap hits,
  // generation stops and the answer is disclosed as truncated — never silent.
  // But the cap is GENEROUS: the model writes as much as it is comfortable
  // doing — writing is rewriting, and a cramped budget is a cramped essay.
  // The assembled answer's budget. This is the LONG-FORM ceiling, not a
  // single call's — sections accumulate into it (a 12-section essay is
  // legitimately >40K chars), so the default is a generous guard against a
  // runaway loop, not a per-turn truncation. Lower it only for chat turns.
  const MAX_OUTPUT_CHARS = Number(process.env.ER7_MAX_OUTPUT_CHARS ?? 200000);
  const SECTION_MAX_TOKENS = Number(process.env.ER7_SECTION_MAX_TOKENS ?? 1200);
  const MAX_REWRITE_ROUNDS = Number(process.env.ER7_MAX_REWRITE_ROUNDS ?? 2);
  // The GROUNDING TEXT is what Ranke measures a section against: the FULL
  // retained web corpus (every fetched page, addressable) plus the surfaced
  // windows. The surfaced sample alone is too thin for a 24-cell essay — a
  // section naming Tragelaphus eurycerus is grounded, but the surf may only
  // have returned two windows. Grounding against the whole corpus is the
  // honest test. Hoisted to function scope so the section loop, Murch, and
  // the final satisfaction check all measure against the same ground.
  const groundingText = () => {
    const parts = [];
    if (session.webSources?.size) for (const text of session.webSources.values()) if (text) parts.push(String(text));
    // The surf's segments are TRUNCATED SLICES (SURF_MAX_SEGMENT_CHARS) — for a
    // composition whose corpus is in hand they are fragments of it, and a
    // fragment pins the bond null (measured 2026-09-21). They stand in only
    // when there is no corpus to stand on.
    const corpusInHand = runMode === "projection" && (session.corpus?.documents?.size ?? 0) > 0;
    if (!corpusInHand) for (const s of surfacedSegments ?? []) if (s?.text) parts.push(String(s.text));
    // A COMPOSITION'S GROUND IS THE WHOLE ADMITTED MATERIAL (2026-09-21,
    // measured: a 25-sentence workspace file surfaced as 6 sentences — the
    // chat surf's relevance cut — and twelve sections asked against six
    // facts could only restate them; the selector refused the restatements
    // and the sections came back empty). The surf's slice is for a chat
    // turn. A piece is written from everything the session admitted.
    if (runMode === "projection" && session.corpus?.documents?.size) {
      // GIVEN MATERIAL OUTRANKS FETCHED MATERIAL, AND EXCLUDES IT (2026-09-21,
      // measured): an essay on the Cumberland River was grounded on 38,569
      // characters, of which 2,263 were the workspace file the operator gave
      // and the rest were three pages of a UN convention the Wikisource organ
      // fetched on the phrase "in all their forms". Every gate below then
      // measured that text — the variance vocabulary, the bond null, what
      // counts as an invented name — so the piece was judged against material
      // about something else entirely.
      //
      // `session.corpusIndex` is exactly the set the operator supplied
      // (workspace files and attachments; opportunistic fetches never enter
      // it), so the discriminator needs no string parsing and no source-name
      // vocabulary. When the operator gave material, that IS the ground; a
      // fetch may still inform the reading, but it cannot become the field
      // the piece is measured against.
      const given = session.corpusIndex instanceof Map ? session.corpusIndex : null;
      const hasGiven = !!given?.size;
      for (const [sid, doc] of session.corpus.documents) {
        if (String(sid).startsWith("chat:")) continue;
        if (hasGiven && !given.has(String(sid))) continue;
        if (doc?.text && String(doc.text).trim().length > 40) parts.push(String(doc.text));
      }
    }
    return parts.join("\n").slice(0, 200000);
  };
  // STATE THE GROUND'S CONFIGURATION (2026-09-21, the law from P88: prove the
  // configuration before claiming anything about the material, else the
  // harness was measured). The ground line carries where its bytes came from.
  const groundingSources = () => {
    const out = { web: 0, surf: 0, corpusDocs: 0, corpusChars: 0, docIds: [] };
    if (session.webSources?.size) for (const text of session.webSources.values()) out.web += String(text ?? "").length;
    const corpusInHand = runMode === "projection" && (session.corpus?.documents?.size ?? 0) > 0;
    if (!corpusInHand) for (const s of surfacedSegments ?? []) out.surf += String(s?.text ?? "").length;
    if (runMode === "projection" && session.corpus?.documents?.size) {
      const given = session.corpusIndex instanceof Map ? session.corpusIndex : null;
      const hasGiven = !!given?.size;
      out.given = hasGiven ? given.size : 0;
      for (const [sid, doc] of session.corpus.documents) {
        if (String(sid).startsWith("chat:")) continue;
        const t = String(doc?.text ?? "");
        if (t.trim().length <= 40) continue;
        if (hasGiven && !given.has(String(sid))) {
          out.excludedDocs = (out.excludedDocs ?? 0) + 1;
          out.excludedChars = (out.excludedChars ?? 0) + t.length;
          if ((out.excludedIds ??= []).length < 4) out.excludedIds.push(String(sid).slice(0, 60));
          continue;
        }
        out.corpusDocs++; out.corpusChars += t.length; if (out.docIds.length < 6) out.docIds.push(String(sid).slice(0, 60));
      }
    }
    return out;
  };
  // THE MEASURED CUT (2026-09-13): the section's own grounded window. The
  // mouth must voice a reading, never re-read the page — but zero in-context
  // material makes a small model hallucinate (measured: 13 sections, every one
  // a confident 1933-fair fabrication). This hands each part ONLY the source
  // sentences that share its terms — a few thousand chars, never the page.
  const SECTION_WINDOW_CHARS = Number(process.env.ER7_SECTION_WINDOW_CHARS ?? 2500);
  // THE MATERIAL'S OWN VOCABULARY, MEASURED ONCE (2026-09-21).
  // Every selector below used to run on hand-written English word lists — a
  // stopword set, a "claim variants" set with `cumberland` and `nashville`
  // compiled into it, and an ASCII-only tokenizer that returned the EMPTY
  // STRING for every sentence of Chinese, Arabic, Russian, Hindi and Japanese.
  // The consequence was not a degradation but a wall: the first sentence
  // deposited "" in the claim registry and every later sentence in the
  // document collided with it, so a non-Latin piece could never exceed one
  // sentence. What replaces the lists is a measurement over THIS material
  // (native/the-fold/admission.js): which of its own words are spread as
  // widely as independent scattering would already spread them, and how much
  // two arbitrary passages of it already share. Measured once per material,
  // held for the whole composition.
  const __omniCache = new Map();
  const omniOf = (material) => {
    const key = String(material ?? "");
    let v = __omniCache.get(key);
    if (!v) {
      const variance = measureVariance(key);
      v = { variance, bondNull: measureBondNull(key, undefined, variance), gate: referentNameGate(key) };
      __omniCache.set(key, v);
    }
    return v;
  };
  const WINDOW_STOP = new Set("the and for with that this from under through after during was were are is had has have by to of in on at it its their there here which where when how what who into across over been being not but or as than then so such only also very just an a your our their its".split(" "));
  const groundedWindowFor = (section, claims, material, usedSentences = null, handedClaims = null, position = 0) => {
    const text = String(material ?? "");
    if (text.length < 60) return "";
    const terms = new Set();
    const pool = `${section} ${(claims ?? []).map((p) => `${p.end1 ?? ""} ${p.end2 ?? ""}`).join(" ")}`;
    const { variance: omniVariance } = omniOf(text);
    for (const t of wordTokensOmni(pool)) {
      if (!WINDOW_STOP.has(t) && !omniVariance.has(t)) terms.add(t);
    }
    if (!terms.size) return "";
    const sentences = segmentSentencesOmni(text).filter((s) => s.length > 40 && s.length < 400);
    // THE STIGMERGIC TRAIL, CLAIM-CORE LEVEL (2026-09-21, Wilson run deeper):
    // `usedSentences` holds exact sentences, their opening templates, AND the
    // CLAIM-CORE of each used sentence — the being·relation pair the mouth
    // grounded on. A candidate sentence is excluded when it carries a used
    // claim-core, even under paraphrase: "played a significant role in
    // Nashville's growth" and "served as a vital artery for Nashville's
    // growth" are the SAME claim (Cumberland-becomes-Nashville's-growth) in
    // different clothing. The measured failure: template-level evaporation
    // missed synonym-variant openers (significant/vital/crucial role), so the
    // mouth re-anchored on the strongest semantic claim of the source in every
    // window. The claim-core trail evaporates the MEANING, not the surface —
    // omnilingual, since it keys on the referent-relation structure, never a
    // lexicon. This is the register's SYN·Figure ("re-sightings fold into the
    // same note") made mechanical on the window itself.
    const openingTemplate = (s) => wordTokensOmni(s).filter((w) => !WINDOW_STOP.has(w)).slice(0, 5).join(" ");
    // The claim's skeleton: the sentence's words with THIS MATERIAL'S variance
    // words stripped, so "played a significant role in Nashville's growth" and
    // "served as a vital artery for Nashville's growth" reduce to the same
    // core. The variance words are measured off the material, never listed —
    // the older comment here claimed to be "omnilingual, since it keys on the
    // referent-relation structure, never a lexicon" while a hand-written
    // English lexicon sat on the line below it.
    const claimCoreOf = (s) => claimCoreOmni(s, omniVariance);
    const usedTemplates = new Set();
    const usedCores = new Set();
    if (usedSentences) {
      for (const u of usedSentences) {
        if (u.includes(" ")) { // a sentence, not a template — derive both
          usedTemplates.add(openingTemplate(u));
          const core = claimCoreOf(u);
          if (core.split(" ").length >= 2) usedCores.add(core);
        } else {
          usedTemplates.add(u);
        }
      }
    }
    const scored = [];
    // THE HANDED-CLAIM EXCLUSION (2026-09-21): a claim already handed to a
    // previous section's mouth is SPENT — no sibling section re-grounds on it.
    // The 27-cell sweep's sibling openings all resolve to the same theme
    // ("the role of the Cumberland River in Nashville's growth"), so without
    // this every window ranks the same top source sentence first (measured:
    // sections 1,2,3,5,7,9,10 of the sentence-run all opened "The Cumberland
    // River played a vital role..."). handedKeys holds end1|label|end2 keys;
    // a sentence carrying a handed claim's subject or object is excluded —
    // the claim is absent from later windows, not forbidden.
    const handedWords = new Set();
    if (handedClaims) {
      for (const k of handedClaims) {
        for (const w of String(k).toLowerCase().split(/[^a-z']+/)) if (w.length > 4) handedWords.add(w);
      }
    }
    for (const s of sentences) {
      // HOLD BACK WHAT WOULD BE REPETITIVE (2026-09-21): excluded are (a) an
      // exact used sentence, (b) any sentence opening with a used template,
      // (c) any sentence carrying a used claim-core — the re-sighting of a
      // claim already grounded on, whatever its surface. The mouth cannot
      // re-anchor on the strongest claim of the source because the claim is
      // absent from the window, not because a rule forbade it.
      const core = claimCoreOf(s);
      if (usedSentences && (usedSentences.has(s) || usedTemplates.has(openingTemplate(s)) || (core.split(" ").length >= 2 && usedCores.has(core)))) continue;
      // (d) any sentence carrying a claim already handed to an earlier section
      // — the sibling-opening repetition dies at the source, not at the guard.
      if (handedWords.size) {
        const lc = s.toLowerCase();
        const carryingHanded = [...handedWords].filter((w) => lc.includes(w)).length;
        if (carryingHanded >= 2) continue;
      }
      const lc = s.toLowerCase();
      const hits = [...terms].filter((t) => lc.includes(t)).length;
      if (hits >= 2) scored.push({ s, hits });
    }
    // THE EXHAUSTED-GROUND FALLBACK (2026-09-21): when every relevant sentence
    // is already used, an empty window would silently drop grounding. The
    // honest answer is to still hand the mouth the material it has already
    // grounded on, MARKED — "already established, write this ANEW from a
    // different angle, never the same sentence." The ground is not withdrawn
    // (a section with no ground at all is ungrounded), it is re-approached.
    const exhausted = !scored.length && usedSentences && usedSentences.size > 0;
    let source = exhausted
      ? sentences.filter((s) => usedSentences.has(s)).slice(0, 3).map((s) => ({ s, hits: 1, used: true }))
      : scored;
    source.sort((a, b) => b.hits - a.hits);
    // THE ROTATING WINDOW (2026-09-21): sibling sections resolve to the same
    // theme, so without this every section ranks the SAME top sentence first
    // and opens by copying it ("The Cumberland River is a major waterway of
    // the southeastern United States" — measured in every run). The window is
    // not a fixed top-N: it ROTATES through the top candidates by the
    // section's own identity, so a different top sentence leads each section.
    // The strongest claim is served once, then a lower-ranked claim leads the
    // next section — the ground is the same, but the ENTRY POINT differs. This
    // is the French-flag gradient applied to the window: each section reads its
    // own local dose, not the embryo's most prominent sentence every time.
    if (source.length > 2) {
      // THE ROTATION SEED: the section's identity AND its position in the
      // composition. The identity alone is near-identical across sibling
      // sections (all "the role of the Cumberland River in Nashville's
      // growth"), so identity-only rotation would give siblings the same
      // lead — the position index breaks the tie and advances the entry
      // point monotonically through the material as the essay climbs.
      let seed = 0;
      const seedSrc = `${position ?? 0}|${section ?? ""}`;
      for (const ch of seedSrc) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      const top = source.slice(0, 6);
      const rest = source.slice(6);
      const rotated = [...top.slice(seed % top.length), ...top.slice(0, seed % top.length), ...rest];
      source = rotated;
    }
    let out = "", n = 0;
    for (const { s, used } of source) {
      if (out.length + s.length > SECTION_WINDOW_CHARS) break;
      out += (n++ ? " " : "") + (used ? `[already grounded — write this anew, never the same sentence] ${s}` : s);
    }
    return out.trim();
  };
  // READABILITY — how the piece READS, in addition to what it repeats.
  // Prefer textstat (exact, via the venv) when it is reachable; fall back to
  // the JS organ (free, in-process, trend-accurate) when it is not. The grade
  // is EOT-recordable like every other measure. textstat's exact numbers come
  // from a real syllable dictionary; the JS heuristic is deterministic but
  // approximate — the trend agrees, the absolute values differ slightly.
  const PYTHON_VENV = process.env.ER7_GRAM_PYTHON ?? "/var/folders/ck/tztwm60n4s9dxwrjfwlsmz3m0000gn/T/opencode/gram/bin/python";
  // STRUNK & WHITE — the style agent: readability (textstat when reachable,
  // JS heuristic otherwise) PLUS the Elements-of-Style rule violations. The
  // textstat function is injected into the organ.
  const textstatOf = (text) => {
    if (!PYTHON_VENV) return null;
    try {
      const script = `import textstat, json, sys\nt = sys.argv[1]\nprint(json.dumps({"flesch": round(textstat.flesch_reading_ease(t),1), "grade": round(textstat.flesch_kincaid_grade(t),1), "fog": round(textstat.gunning_fog(t),1), "band": "readable" if textstat.flesch_reading_ease(t)>=60 else "dense", "words": textstat.lexicon_count(t)}))`;
      const out = execFileSync(PYTHON_VENV, ["-c", script, String(text ?? "")], { encoding: "utf8", timeout: 8000 });
      return JSON.parse(out.trim());
    } catch { return null; }
  };
  const readabilityOf = (text) => strunkWhiteGrade(text, { textstat: textstatOf });
  if (specRefusalText) {
    // REFUSED at the ask: no generation, no ledger — the account IS the answer.
    fullText = specRefusalText;
    if (onNote) onNote({ move: "spec_refused", reason: clearance.reason });
  } else if (mayeroffBlocked) {
    // UNREALIZABLE at the ask (mayeroff.js): not refused — there was never a
    // state to reach under self.js. No generation; the care-grounded account
    // IS the answer. Mayeroff's positive half: help the other grow toward the
    // real version of the underlying need, honestly known, at their own pace.
    fullText = speakDecline({ reason: mayeroffJudgment.reason, shape: clearance.shape }, interlocutor);
    if (onNote) onNote({ move: "mayeroff_unrealizable", reason: mayeroffJudgment.reason });
  } else {
  await withSlot(model, async () => {
    const draw = async (msgs, maxTokens, { capture = false, kelsen = null, stop = null } = {}) => {
      let buf = "";
      let stopped = false;
      let tokenTruncated = false;
      // Stream-shape witnesses from the terminal chunk (null = no terminal
      // chunk observed: pre-patch lanes whose done carries no witnesses).
      // doneSeen===false never sets truncated here — visibility only.
      let doneSeen = null;
      let doneReason = null;
      let serverEvalCount = null;
      let streamErr = null;
      let leftoverChars = null;
      let leftoverTail = null;
      let tailParsedAs = null;
      for await (const chunk of streamOllamaChat(model, msgs, { maxTokens, onNote, kelsen, signal, stop })) {
        if (typeof chunk === "string") {
          if (fullText.length >= MAX_OUTPUT_CHARS) { truncated = true; stopped = true; break; }
          if (!capture) {
            fullText += chunk;
            if (onToken) onToken(chunk);
          }
          buf += chunk;
        } else if (chunk?.done) {
          usage.promptTokens += chunk.prompt_eval_count;
          usage.completionTokens += chunk.eval_count;
          if (chunk?.truncated) { truncated = true; tokenTruncated = true; }
          if (chunk.doneSeen !== undefined) doneSeen = chunk.doneSeen;
          if (chunk.doneReason !== undefined) doneReason = chunk.doneReason;
          if (chunk.serverEvalCount !== undefined) serverEvalCount = chunk.serverEvalCount;
          if (chunk.streamErr !== undefined) streamErr = chunk.streamErr;
          if (chunk.leftoverChars !== undefined) leftoverChars = chunk.leftoverChars;
          if (chunk.leftoverTail !== undefined) leftoverTail = chunk.leftoverTail;
          if (chunk.tailParsedAs !== undefined) tailParsedAs = chunk.tailParsedAs;
        }
      }
      if (doneSeen === false) streamCuts++;
      streamMeta = { doneSeen, doneReason, serverEvalCount, streamErr, leftoverChars, leftoverTail, tailParsedAs, bufChars: buf.length };
      return { buf, stopped, tokenTruncated, doneSeen, doneReason, serverEvalCount, streamErr, leftoverChars, leftoverTail, tailParsedAs };
    };
    // ── VARIATION, OWNED BY THE ORGAN ──────────────────────────────────────
    // The variation machinery (rejection-sampling draw + opening identity)
    // lives in organs/variation.js (Handle: Brillat-Savarin) — universal,
    // aliased, reusable by any caller. The runner builds the SYNONYM POOL
    // here (the reading's surfaces for the subject — referents + hyperlexicon
    // composition), which the organ injects into the draw.
    const synonymPool = (() => {
      const seen = new Set();
      const out = [];
      const idx = sessionReferentIndex(session, onNote);
      for (const r of idx?.referents?.values?.() ?? []) {
        for (const s of r.surfaces ?? []) {
          const n = String(s ?? "").trim();
          if (n.length > 3 && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); out.push(n); }
        }
      }
      for (const e of Object.values(hyperlexicon?.composition ?? {})) {
        for (const n of [e?.left, e?.right]) {
          const s = String(n ?? "").trim();
          if (s.length > 3 && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
        }
      }
      return out.slice(0, 16);
    })();
    if (sections.length) {
      // ── WOLFE WRITES, FIRST ────────────────────────────────────────────────────
      // A writer starts writing before the research is done and goes back for
      // more when a section needs it. So: no blocking outline draw — the
      // sections the material's own structure gives us ARE the plan. WOLFE
      // (Virginia Woolf's composed, continuous prose is the voice) writes each
      // section immediately, carries the essay's state forward, and strikes
      // Gore for its own source only when it needs one. The outline is never a
      // separate 56s model call that stalls the piece.
      const topic = topicPhrase(task);
      // THE MATERIAL'S OWN PROPOSITIONS — what LaVar grades the essay on.
      // Wolfe writes FROM these so the essay RE-STATES the record (the holon
      // law: the essay, high, makes the material's claims, low, probable).
      // Each section is handed the propositions that share referents with its
      // theme, resolved through the material's own index — the record's
      // claims about the beings the section is about, never generic prose.
      const materialProps = rawEntries?.length ? notesFromEdges(rawEntries) : [];
      const propsIndex = sessionReferentIndex(session, onNote);
      const propsForSection = (section) => {
        if (!materialProps.length || !propsIndex?.resolveIn) return [];
        const themeIds = propsIndex.resolveIn(String(section ?? ""));
        if (!themeIds?.size) return materialProps.slice(0, 10); // no theme referents: show the top claims
        const shown = new Set();
        const out = [];
        for (const p of materialProps) {
          if (out.length >= 12) break;
          const subj = String(p.end1 ?? ""); const obj = String(p.end2 ?? "");
          const sIds = propsIndex.resolveIn(subj); const oIds = propsIndex.resolveIn(obj);
          if ([...themeIds].some((id) => sIds.has(id) || oIds.has(id))) {
            const key = keyOf(p);
            if (shown.has(key)) continue;
            shown.add(key);
            handedKeys.add(key); // this claim reached the mouth — it cannot be "carried unprompted"
            out.push(p);
          }
        }
        return out.length ? out : materialProps.slice(0, 10);
      };
      const outlineBuf = sections.length
        ? sections.map((s, i) => `${i + 1}. ${s}`).join("\n")
        : `1. ${topic}`;
      let outlineId = null; // REC supersedes the outline line when the reading grows it
      const plannedSections = plannedSectionsOut; // the hoisted plan — REC's additions are visible to the satisfaction check
      const recoffered = new Set(); // REC offers each evolving theme once — never loops forever
      const goredThemes = new Set(); // Gore strikes each theme once — no re-fetch of the same cue
      if (onThinking) onThinking(`\n### Outline\n${outlineBuf}\n`);
      // THE GROUND-SEED: the story's cast is drawn at random FROM the ground
      // (the beings the reading established, with their sources), once — so
      // every scene is traceable to what inspired it. Recorded in the wheel.
      storySeed = prelimShape?.register?.field?.field === "narrative" ? groundSeed(session, { sidecar: loadSidecar(), framing: discoveredFraming, field: prelimShape.register.field.field, count: 4, seed }) : null;
      // Evolve the outline as sections land: re-read the reading's referents;
      // a being the essay has not yet covered is a theme the outline missed.
      // REC: supersede the outline line and add the section.
      // HOLD BACK WHAT WOULD BE REPETITIVE — the USED-source set, carried
      // across the whole composition. Every sentence a section grounds on is
      // recorded; no later section re-reads it. The window is always UNUSED
      // material, so the mouth must find new facts section by section.
      const usedSentences = new Set();
      // ONLY THE PIECE DEPOSITS MATTER (2026-09-21, falsified live: every
      // section after the opening was refused "repeat" — the window's own
      // sentences ride in `usedSentences` so the mouth cannot copy them, and
      // the registry was deriving matter words from that trail, so the
      // MATERIAL pre-emptied the matter vocabulary before the piece said a
      // word). Matter words are deposited here, by admitted sentences alone.
      const matterRegistry = new Set();
      // ── THE SPIRAL CONTRACT, LAYER 1: GROUND (2026-09-21, the user's law:
      // "hyper-defined layers, explicit revisable work product at each loop;
      // low sets possibility for high, high probability for low"). The ground
      // is measured once and gated once. A ground that fails the LOW gate
      // has nothing to measure a null on; a ground that fails the HIGH gate
      // cannot tell a continuation from chance. Neither stops the draw — the
      // Ranke disclosure already names an ungrounded piece — but neither
      // LICENSES a revision: no redraw is spent on a piece with no ground to
      // redraw from. The verdict is on the record.
      const spiralBudget = Number(process.env.ER7_SPIRAL_BUDGET ?? 1);
      const groundProduct = (() => {
        const g = String(groundingText() ?? "");
        const m = omniOf(g);
        return { sentences: segmentSentencesOmni(g).length, variance: m.variance, bondNull: m.bondNull, gate: m.gate };
      })();
      const groundLow = groundGate.low(groundProduct);
      const groundHigh = groundLow.pass ? groundGate.high(groundProduct) : { pass: false, basis: groundLow.basis, missing: "ground" };
      const groundLicensed = groundLow.pass && groundHigh.pass;
      const contractRecord = { ground: { low: groundLow, high: groundHigh, licensed: groundLicensed }, draft: [], fold: null, tighten: null, arrive: null };
      if (onNote) onNote({ move: "contract_ground", licensed: groundLicensed, low: groundLow.basis, high: groundHigh.basis, gate: groundProduct.gate?.gate, sentences: groundProduct.sentences, bondCeiling: groundProduct.bondNull?.max ?? null });
      if (documentLedger) {
        try {
          appendLedgerLine(documentLedger, {
            role: "ground", title: groundLicensed ? "Ground licensed" : "Ground not licensed",
            text: `low: ${groundLow.basis}\nhigh: ${groundHigh.basis}\nreferent gate: ${groundProduct.gate?.gate ?? "?"}\nbond ceiling (two arbitrary passages): ${groundProduct.bondNull?.max?.toFixed?.(3) ?? "n/a"}\nsources: ${JSON.stringify(groundingSources())}`,
            giver: "eoreader7:contract", basis: groundLicensed ? "ground measured — revisions licensed" : "ground unlicensed — no revision will be spent",
          }, { dir: ESSAY_LEDGER_DIR });
        } catch {}
      }
      // The shared admitter: the same two-road selector the section loop runs,
      // reachable from the fold so a gap beat's redraw is admitted by the
      // SAME rule as every other sentence. (The section loop keeps its own
      // inline copy because it carries the section's window-scoped registry.)
      const admitWide = (text, { priorLanding = "", registry = null, section = "" } = {}) => {
        const ground = String(groundingText() ?? "");
        const { variance, bondNull, gate } = omniOf(ground);
        const reg = registry ?? new Set();
        const grounded = (cand) => { try { const r = propsIndex?.resolveIn?.(cand); const ids = r instanceof Set ? r : new Set(r ?? []); return ids.size > 0; } catch { return false; } };
        const out = { survivors: [], roads: [], refusals: [] };
        const priorCore = priorLanding ? claimCoreOmni(priorLanding, variance) : "";
        for (const cand of segmentSentencesOmni(text).filter((x) => x.length > 20)) {
          if (priorCore && claimCoreOmni(cand, variance) === priorCore) { out.refusals.push({ kind: "relanding", given: "model" }); continue; }
          if (verifyIsMetaSentence(cand)) { out.refusals.push({ kind: "meta", given: "model" }); continue; }
          const v = admitCandidate(cand, { ground, priorLanding, instruction: `${task}\n${section}`, registry: reg, continues: (c, p) => { try { const A = propsIndex?.resolveIn?.(c); const B = propsIndex?.resolveIn?.(p); const a = A instanceof Set ? A : new Set(A ?? []); const b = B instanceof Set ? B : new Set(B ?? []); for (const id of a) if (b.has(id)) return true; } catch {} return false; }, variance, bondNull, isGrounded: grounded, invented: gate.applies ? ((x) => verifyInventedNameRuns(x, ground)) : null });
          if (!v.admit) { out.refusals.push(...(v.refused ?? [])); continue; }
          out.survivors.push(cand); out.roads.push(v.road); depositAdmitted(reg, v); depositAdmitted(matterRegistry, v);
          usedSentences.add(cand); if (v.core) usedSentences.add(v.core);
        }
        return out;
      };
      for (let i = 0; i < plannedSections.length && !truncated; i++) {
        const section = plannedSections[i];
        if (onNote) onNote({ move: "composing_section", index: i + 1, of: plannedSections.length, section });
        // EVA admits the part: real text against a ground. A projection with
        // NO ground still writes its bounded sections — the admission gate
        // admits them ungrounded (their standing is disclosed by the
        // satisfaction check, never churned); a grounded projection keeps the
        // strict gate exactly as before.
        const grounded = material.length > 0;
        const eva = admitPart({ text: section, grounded: grounded || !hasGrounding, minChars: 0 });
        if (!eva.ok) {
          if (onNote) onNote({ move: "composing_skip", section, because: eva.because });
          continue;
        }
        // Gore: go back for more on this section's cue — a targeted strike for
        // the specific theme. THIS RUNS CONCURRENTLY with the section draw:
        // whichever is ready first goes. The model starts writing the section
        // from what is already grounded; the strike's admitted material is
        // available for the NEXT sections (the reading grows). A fetch that
        // lands later is never wasted — it feeds the piece that follows.
        let goreStrike = Promise.resolve({ landed: false });
        if (WEB_SEARCH_ON && documentLedger && section && !goredThemes.has(section)) {
          goredThemes.add(section);
          const cuePlan = cueGoDeeperPlan(section, { query: `${topic} ${section}` });
          if (onNote) onNote({ move: "gore", cue: section, query: cuePlan.query });
          if (onThinking) onThinking(`\n[Gore: gathering on "${section}"]\n`);
          goreStrike = searchAndAdmitWeb(session, sessionId, cuePlan.query, onNote, { move: "go-deeper", maxPages: 2, webConsent })
            .then((r) => ({ landed: true, result: r }))
            .catch(() => ({ landed: false }));
        }
        // WHERE THE ESSAY STANDS — folded, never dumped. The earlier sections
        // are read as the essay's own conversation and folded at resolutions
        // (atmosphere/lens/paradigm), so this section knows what the piece has
        // established and can COMPOSE with it — transition, build, never
        // restate — without the mouth being buried in the raw prose.
        // THE VOID IS CONCRETE (2026-09-21): the mouth is NOT given the essay's
        // accumulated standing — no thematic summary, no prior prose dump. Each
        // section is its own concrete void, grounded only on its own source
        // tokens. The essay's continuity is carried by the ledger, never by the
        // prompt (the log is the memory; the mouth needs only this void's
        // tokens at this moment).
        // HOLON LEVEL: the granularity of the task is an experimentable
        // variable. "section" writes the whole part in one draw; "paragraph"
        // asks for a paragraph; "sentence" asks for a few focused sentences
        // per draw (smallest, most granular — a task generated at the level
        // the piece actually needs, decided per-call, never fixed).
        const holonPhrase = holonLevel === "sentence" ? "in a few focused sentences" : holonLevel === "paragraph" ? "as a short paragraph" : "as a full section";
        // The part is a QUESTION the essay must ANSWER — the void DEF'd it.
        // The writing is an answer, never a section echoing a source heading.
        const isQuestion = /[?？]$/.test(section.trim());
        // WRITE RIGHT THE FIRST TIME: the section prompt states the bar the
        // EVA test enforces, so the model meets it in one draw instead of
        // being corrected. Three demands, each mirroring a satisfactionOfSection
        // failure: a real amount of prose (the holon phrase), written FROM the
        // material (the ungrounded check), and as the piece itself (the meta
        // check). This is the measured speed lever — 12 of 18 sections were
        // being corrected once, each correction a full second draw (~50s).
        // THE OPENING IS A THESIS, NOT AN ANSWER. The essay opens with a SURPRISING
        // assertion about the subject — a claim the reader does not expect —
        // and the body's grounded evidence then RETROACTIVELY REDUCES that
        // surprise. This is the competency principle: an essay is competent
        // when the retrieval explains the why until the surprise collapses
        // (the gathering gate's own stop). The thesis is drawn from the
        // material's propositions but stated as a POSITION, never a
        // description — "the bongo is a forest antelope" is not a thesis;
        // "the bongo's survival hangs on the very forests it hides in" is.
        const isOpening = i === 0;
        // THE MEASURED CUT: the section's own claims + the source window that
        // grounds them. The window is computed once per section and handed to
        // the brief — the mouth voices real source sentences, never the page
        // and never nothing. The HANDED-CLAIM snapshot: claims handed to
        // EARLIER sections are excluded from this section's window (sibling
        // openings must not re-ground on the same claim) — but this section's
        // own claims are handed AFTER the snapshot, so its own window keeps
        // them. The snapshot is the boundary of what is already spent.
        const handedKeysBefore = new Set(handedKeys);
        const secProps = propsForSection(section);
        const secWindow = groundedWindowFor(section, secProps, groundingText(), usedSentences, handedKeysBefore, i);
        // Record the sentences this window actually used — the next section
        // cannot re-read them.
        if (secWindow) {
          String(secWindow).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 20).forEach((s) => usedSentences.add(s));
        }
        const claimBlock = secProps.length ? `Here are the material's claims this part should carry:\n${secProps.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : "";
        // THE MINIMAL WINDOW (2026-09-21): the raw source tokens for THIS void,
        // with no meta-label. The mouth reads the material as the material —
        // the label ("Grounded source text... its real names, places, dates")
        // is instructional scaffolding the mouth does not need; the register
        // voice already names what to draw from it.
        const windowBlock = secWindow ? `\n\nGrounded source text:\n"""\n${secWindow}\n"""` : "";
        const isNarrative = prelimShape?.register?.field?.field === "narrative";
        const baseVoice = writeVoiceFor(prelimShape?.register, topic);
        const voice = discoveredVoice ? {
          // LOW sets the possibility (the register's hard constraint: SHOW,
          // never name the phase or analyze); HIGH sets the probability (the
          // discovered voice is an EXEMPLAR to continue, never to repeat).
          opening: (t) => `${baseVoice.opening(t)}\n\nWrite in this voice — an exemplar to continue, never to repeat:\n"${String(discoveredVoice.opening ?? "").slice(0, 400)}"`,
          body: (t) => `${baseVoice.body(t)}\n\nWrite in this voice — an exemplar to continue, never to repeat:\n"${String(discoveredVoice.body ?? "").slice(0, 400)}"`,
        } : baseVoice;
        // THE MOUTH IS SPOKEN TO THE WAY IT MUST SPEAK. An essay is addressed
        // as an essayist ("answer this question", "the claims to carry"); a
        // story is addressed as a storyteller ("the story continues", "this is
        // the next scene", "the world holds these truths"). The frame is the
        // register — never an instruction bolted onto an essay frame.
        const castBlock = (isNarrative && storySeed?.cast?.length)
          ? `\nThe story's SEED, drawn at random from the ground — let the world grow from these (a place, an event, a name to begin from), and invent freely around them:\n${storySeed.cast.map((c) => `- ${c.name}  (seed from: ${(c.provenance?.length ? c.provenance.join(", ") : "the reading")})`).join("\n")}`
          : "";
        // NARRATIVE CONTINUITY: a scene is handed the story SO FAR — the actual
        // prose already written — and its PHASE POSITION, so it advances the
        // story instead of restating the opening, and holds the invented cast
        // and facts stable instead of re-deriving them (Cape Cod must stay Cape
        // Cod, not drift to Cape May). The last beat is the resolution.
        const storySoFar = documentLines.length
          ? documentLines.map((line, j) => `[scene ${j + 1}] ${line}`).join("\n\n").slice(-1800)
          : "";
        // THE VOID IS CONCRETE, THE MOUTH IS MINIMAL (2026-09-21): each section is
        // its own concrete void grounded only on its own source tokens. No
        // prior-prose dump, no stated prohibition — the absence of the already-
        // used sentences and their opening templates in the window IS the
        // guardrail (the mouth cannot re-open with a used boilerplate because
        // the path is not there, not because a rule forbade it).
        // THE PLOT-SEED: the story's beats are drawn from the ground's own
        // events (a complication, a disaster, a rescue), mapped to the phases —
        // so the story has something to advance TOWARD, not a bag of facts to
        // describe. The seed's drawn events name the turn at each phase.
        const seedEvent = storySeed?.cast?.[Math.min(i, (storySeed.cast?.length ?? 1) - 1)]?.name ?? null;
        const beat = plannedSections.length > 1
          ? (i === plannedSections.length - 1 ? `the RESOLUTION — land the story${seedEvent ? ` (the ground names this turn: ${seedEvent})` : ""}, release the tension you have built`
            : i === 0 ? `the OPENING — drop into a moment, establish the cast and the world${seedEvent ? ` (the ground names this turn: ${seedEvent})` : ""}`
            : `scene ${i + 1} of ${plannedSections.length} — the next turn of the story${seedEvent ? `, which the ground names: ${seedEvent}` : ""}, escalating what came before`)
          : "the whole story";
        const materialBlock = isNarrative
          ? `${castBlock}${secProps.length ? `\nThe story's world holds these truths — let them shape the world, but write them in YOUR OWN words:\n${secProps.map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n")}` : ""}${secWindow ? `\n\nThe world, in its own words (its real names, places, storms come from here — read these, then write your own sentences):\n"""\n${secWindow}\n"""` : ""}\n\n${RANKE_RULE}`
          : `${claimBlock}${windowBlock}\n\n${RANKE_RULE}`;
        // THE MINIMAL MOUTH (2026-09-21, the user's law: less is more, voids
        // are concrete, rules are not stated — the absence of wrong paths is
        // the guardrail). The mouth is given ONLY the stray pre-verbal tokens
        // it needs for THIS void at THIS moment:
        //   1. the concrete void — the section question itself;
        //   2. the source tokens THIS void can ground on (its claims + window);
        //   3. nothing else — no priorParts summary, no factsSoFar dump, no
        //      stated prohibition.
        // The guardrail against repetition is the ABSENCE of the wrong paths:
        // the already-grounded sentences and their opening templates were
        // excluded from the window (usedSentences), so the mouth cannot re-
        // open with a used boilerplate — not because a rule forbade it, but
        // because the path is not there. A stated rule ("HOLD BACK...") was
        // measured to still let a 2B mouth paraphrase the same boilerplate
        // across sections 6-11; absence cannot be paraphrased away.
        const sectionTask = isCode
          ? codeSectionPrompt({
              section,
              language: codeLanguage,
              name: codeArtifactName(task, codeLanguage),
              task,
              i,
              total: plannedSections.length,
              soFar: documentLines.length ? documentLines.join("\n\n").slice(-3000) : "",
              exemplar: i === 0 ? codeExemplar(codeLanguage) : null,
              declared: session?.buildDeclared ?? null,
            })
          : plannedSections.length > 1
          ? (isOpening
            ? (isNarrative
              ? `You are telling a story. This is ${beat}. It begins in the middle of a moment, in a real place. ${materialBlock}\n\n${voice.opening(topic)}`
              : `We're writing a piece on ${topic}. ${materialBlock}\n\n${voice.opening(topic)}`)
            : (isNarrative
              ? `The story continues. This is ${beat}.${storySoFar ? `\n\nHere is the story so far — HOLD every name, place, and number stable, do not rename anyone or change any detail, do not restate what already happened:\n${storySoFar}\n` : ""}Now show what happens NEXT: the next thing that changes, the next beat toward the resolution. ${materialBlock}\n\n${voice.body(topic)}`
              : `${isQuestion ? `Answer this: ${section}` : `Write the part: ${section}`}, ${holonPhrase}. Write it as a substantial passage of the piece itself — several sentences. ${voice.body(topic)} ${windowBlock}`))
          : (isNarrative
            ? `You are telling a story. This is ${beat}. It begins in the middle of a moment, in a real place. ${materialBlock}\n\n${voice.opening(topic)}`
            : `We're writing a piece on ${topic}. ${materialBlock}\n\n${voice.opening(topic)}`);
        const holonBudget = holonLevel === "sentence" ? Math.min(SECTION_MAX_TOKENS, 220) : holonLevel === "paragraph" ? Math.min(SECTION_MAX_TOKENS, 450) : SECTION_MAX_TOKENS;
        // A SHORT PIECE WITH NO GROUND writes SHORT sections — a "short essay"
        // asked with nothing to ground it gets a bounded per-part budget, so
        // the artifact completes in chat-time rather than running past the
        // turn deadline churning ungrounded prose. CODE is exempt: a code part
        // needs the full budget to be a real function/block, and its ground is
        // the spec itself, not admitted material. (hasGrounding, hoisted with
        // the sections bound.)
        const drawBudget = isCode ? holonBudget : (hasGrounding ? holonBudget : Math.min(holonBudget, 400));
        if (onThinking) onThinking(`\n### ${section} (${holonLevel})\n\n`);
        // THE PARAGRAPH WRITTEN ONE SENTENCE AT A TIME (2026-09-21, the user's
        // law — "if we can write an essay one sentence at a time, we've got
        // it"). Each sentence is its own draw. The next sentence's VOID is the
        // previous sentence's ENDING: the piece lands somewhere we did not
        // predict when we opened the sentence before, and the next sentence is
        // a RESPONSE to that landing — it does not re-answer the section from
        // scratch (the measured repetition came from re-answering the same
        // static void; a sentence that opens on the last sentence's ending
        // cannot re-open on the topic). The mouth is minimal: only the stray
        // pre-verbal tokens it needs at this moment — the ending it must
        // respond to, and this void's grounded source tokens. No stated rules:
        // the absence of the wrong path is the guardrail. The 3-part shape is
        // NOT pre-sliced; it EMERGES from the recursion (opening sets a strain,
        // sentences turn it, the last resolves it) and is MEASURED by the
        // holonic general, which stops the loop when the paragraph's shape
        // resolves (or the section budget is exhausted).
        const sentenceAtATime = !isCode && !isNarrative && !isOpening;
        // THE STRUCTURE ENDS ITS OWN UNITS — LEARNED, NEVER STATED (2026-09-21,
        // the user's law: "it needs to learn from context what would end a
        // particular piece of structure"). The stop sequence is NOT a fixed
        // [". ", "! ", "\n"] — that is a stated rule, modality-blind, and it
        // would end a code line at a period or a haiku at a newline. A unit's
        // boundary is a property of the STRUCTURE being written, read off its
        // context: the register's FIELD (verse ends on a line, code on a
        // statement, prose on a sentence), the MODE (a musical gesture ends on
        // a rest, not a period), and the MATERIAL'S OWN terminators (how the
        // source prose ACTUALLY closes its sentences is the strongest signal
        // for prose — the mouth ends a sentence the way the ground does). A
        // LEARNED boundary (the discovered framing's endings) wins when it
        // exists. The French flag applied to endings: the boundary is read
        // from the local gradient of the structure, never imposed by a rule.
        function structureEndingsFor({ field = "", mode = "", material = "", discoveredEndings = null } = {}) {
          if (Array.isArray(discoveredEndings) && discoveredEndings.length) return discoveredEndings;
          if (field === "instrument") return ["\n", ";"];
          if (field === "lyric") return ["\n"];
          if (mode && mode !== "text") return ["\n"];
          if (material && material.length > 20) {
            const ends = {};
            const m = String(material).replace(/\s+/g, " ");
            for (const p of [".", "!", "?", "…"]) {
              const re = new RegExp("\\" + p + "(?=\\s|$)", "g");
              const n = (m.match(re) ?? []).length;
              if (n > 0) ends[p] = n;
            }
            const sorted = Object.entries(ends).sort((a, b) => b[1] - a[1]);
            if (sorted.length) {
              const top = sorted[0][0];
              return top === "…" ? ["…"] : [top + " "];
            }
          }
          return [". ", "! ", "? "];
        }
        const structureStop = structureEndingsFor({ field: prelimShape?.register?.field?.field, mode: prelimShape?.register?.mode, material: groundingText() });
        // THE CLAIM-CORE (2026-09-21): the mechanical identity of a sentence's
        // claim — the being-nouns and change-verbs with variance words
        // stripped, so "played a significant role in Nashville's growth" and
        // "served as a vital artery for Nashville's growth" are the SAME claim.
        // The global registry keys on this; a claim deposited by any section is
        // absent from every later window. Same set the window's trail uses.
        const { variance: omniVar, bondNull: omniBondNull, gate: omniGate } = omniOf(groundingText());
        const claimCoreOfStable = (x) => claimCoreOmni(x, omniVar);
        // THE REFERENT-VERIFY GATE (2026-09-21, the user's law "nothing is held
        // unattributed"): a sentence is admitted only when every capitalized
        // name it carries is grounded. Punctuation (comma, period, colon,
        // semicolon, connective) BREAKS a name run — "Cherokee, Chickasaw, and
        // Shawnee" is three grounded single names, never one invented string.
        // A run of TWO+ capitalized words ("Thomas Vanderbilt", "Duke's Creek")
        // is grounded only when the WHOLE sequence appears in the ground —
        // "Thomas Duke" dies because the ground has "Duke of Cumberland" but
        // never "Thomas Duke". A SINGLE capitalized word is grounded when the
        // ground contains it or it is a common discourse opener (However, Thus).
        // This is what killed the "Thomas Duke / Vanderbilt / Jefferson"
        // hallucinations of the 2026-09-21 run: the workspace named only Walker,
        // the Duke of Cumberland, Robertson, Donelson — the model's invented
        // names carried no ground trace. A refused sentence is cut mechanically,
        // never negotiated with the mouth.
        // THE REFERENT-VERIFY GATE — now the falsified module
        // (native/the-fold/referent-verify.js, 9/9 falsify tests green). It
        // carries the law "all content has a given — if it's the model, that's
        // the source" (§III): a refused run is attributed, never vanished. The
        // ground text is the field the mouth may not exceed.
        const groundForGate = String(groundingText() ?? "");
        const inventedNameRuns = (s) => verifyInventedNameRuns(s, groundForGate);
        const isMetaSentence = (s) => verifyIsMetaSentence(s);
        // THE GROUNDED-CANDIDATE CHECK, SHARED BY BOTH DRAW PATHS (2026-09-21):
        // a sentence folds to a material referent when the reading's proposition
        // index resolves it to an id. Both the paragraph snip and the
        // opening/narrative snip admit only grounded candidates.
        // THE PIECE'S OWN THREAD: which referents does this sentence resolve?
        // A turn is a sentence that takes up one the prior landing put down —
        // read off the reading's proposition index, never off shared strings.
        const referentsOf = (cand) => {
          try {
            const resolved = propsIndex?.resolveIn?.(cand);
            return resolved instanceof Set ? resolved : new Set(resolved ?? []);
          } catch { return new Set(); }
        };
        const continuesFrom = (cand, prior) => {
          if (!String(prior ?? "").trim()) return false;
          const a = referentsOf(cand); if (!a.size) return false;
          const b = referentsOf(prior); if (!b.size) return false;
          for (const id of a) if (b.has(id)) return true;
          return false;
        };
        const groundedCand = (cand) => {
          try {
            const resolved = propsIndex?.resolveIn?.(cand);
            const ids = resolved instanceof Set ? resolved : new Set(resolved ?? []);
            if (ids.size) return true;
          } catch {}
          return false;
        };
        let buf = "";
        let stopped = false;
        let drawFailure = "";
        let snipSummary = "";
        if (sentenceAtATime) {
          // THE PARAGRAPH, DRAWN WIDE, SNIPPED MECHANICALLY (2026-09-21, the
          // user's synthesis: "we did have fairly decent longform essay writing
          // on a 2b when it was asked to write paragraphs — this effort caused
          // regressions. the smaller the model, the more we prompt it with
          // precisely what we want and nothing more, virtually no 'dont's. small
          // models have tourettes"). So: the mouth is asked for a PARAGRAPH —
          // its natural competence — with a minimal positive prompt (the void +
          // this position's ground, no prohibitions, no "don't repeat"). The
          // MODEL writes longform; the MACHINERY is the selector: the paragraph
          // is split into sentences, each is folded through the referent index
          // (grounded?) and checked against the global claim-registry
          // (repeated?), and only the survivors are kept. The mouth never sees
          // a "don't" — the repetition is cut mechanically, after the fact,
          // because a small model cannot be talked out of its default and the
          // absence of the repeated claim is the only guardrail that holds.
          const PARAGRAPH_MAX = Math.min(drawBudget, 500);
          let paragraphBuf = "";
          let paraStopped = false;
          // THE VOID IS THE PRIOR LANDING, NEVER THE RE-ASKED TOPIC (2026-09-21):
          // the section continues the piece — it opens on where the piece
          // actually landed, not on re-answering "the role of the Cumberland
          // River in Nashville's growth" (measured: every section re-asking the
          // topic question opened "The Cumberland River played a vital role...").
          // THE PRIOR LANDING IS THE LAST PLACE THE PIECE ACTUALLY LANDED
          // (2026-09-21, falsified live: an empty section left "" as the prior
          // landing, which closed the motion road AND the redraw for the next
          // section, and eleven sections emptied in a cascade). The landing is
          // the last non-empty part, however many empty ones lie between.
          const priorLanding = [...documentLines].reverse().map((l) => String(l ?? "").trim()).find(Boolean) ?? "";
          const paraTask = priorLanding
            ? `Continue the piece from exactly where it left off. Write the next passage (${holonPhrase}) of the piece itself.\n\nThe piece just said:\n"${priorLanding.split(/(?<=[.!?])\s+/).filter(Boolean).pop() ?? priorLanding}"\n\nHere is what this passage is about:\n"${section}"\n\nGrounded source text:\n"""\n${secWindow ?? ""}\n"""\n\nWrite the passage now.`
            : `${isQuestion ? `Answer this: ${section}` : `Write the part: ${section}`}, ${holonPhrase}. ${voice.body(topic)} ${windowBlock}`;
          if (onThinking) onThinking(`\n### ${section} (paragraph draw)\n\n`);
          const [paraRes] = await Promise.allSettled([
            draw(
              [
                { role: "system", content: systemContent },
                ...keptChat.slice(-2),
                { role: "user", content: paraTask },
              ],
              PARAGRAPH_MAX,
              { kelsen: compositionKelsen },
            ),
          ]);
          paragraphBuf = paraRes.status === "fulfilled" ? String(paraRes.value?.buf ?? "").trim() : "";
          if (paraRes.status === "fulfilled" && paraRes.value?.stopped) { paraStopped = true; }
          // A REFUSED DRAW IS A GIVEN, NOT AN EMPTY PART (2026-09-21, found
          // live: eleven sections were empty because heimdall held the turn
          // under load, and the ledger said "composition section, strain 0"
          // for each — the harness was measured and the record blamed the
          // selector). The draw's failure is carried to the part line.
          drawFailure = paraRes.status === "rejected" ? String(paraRes.reason?.message ?? paraRes.reason ?? "draw failed").slice(0, 160) : (paragraphBuf ? "" : "the mouth returned nothing");
          // THE MECHANICAL SNIP (2026-09-21): the paragraph overshoots (it
          // repeats, drifts, copies) — the machinery keeps only the sentences
          // that FOLD to a material referent (grounded) and carry a claim the
          // registry has not already deposited (new). The survivors are the
          // section; their claims are deposited globally so no later section —
          // and no sibling — re-grounds on them. This is the model-as-generator,
          // machinery-as-selector division, and it is the ONLY repetition guard
          // (the mouth was told none).
          const globalRegistry = (() => {
            const out = new Set();
            if (usedSentences) {
              for (const u of usedSentences) {
                if (u.includes(" ")) out.add(claimCoreOfStable(u));
                else out.add(u);
              }
            }
            // Matter words come ONLY from what the piece admitted — never from
            // the window's sentences that ride in the trail.
            for (const w of matterRegistry) if (String(w).startsWith("w:")) out.add(w);
            return out;
          })();
          // THE PARAGRAPH SPLIT BY THE SCRIPT'S OWN RULES (2026-09-21). The
          // predecessor required an ASCII capital after the break, so a
          // Chinese, Arabic, Hindi or Japanese paragraph never split at all:
          // one candidate, one refusal, an empty section.
          const paragraphSentences = segmentSentencesOmni(paragraphBuf).filter((s) => s.length > 20);
          // TWO ROADS INTO THE PIECE (2026-09-21, the swarm's converging
          // verdict on the projected Cumberland essay: "thirteen topics, none
          // of them a turn").
          //
          // The predecessor admitted a sentence only when it was GROUNDED and
          // its claim was NEW. Both tests reward a fresh assertion about the
          // subject and punish a sentence that TURNS: a bridging sentence
          // carries pronouns and connectives, resolves to few referents, and
          // has a thin claim core. So the survivors were, structurally, a list
          // of assertions — the fold collapsed duplicates but could not create
          // motion, because motion had no road in.
          //
          // Now a sentence survives on MATTER (grounded, claim-new) or on
          // MOTION (it bonds to where the piece just landed harder than two
          // arbitrary passages of this material bond to each other, carries no
          // invented referent, and is not meta). Matter alone is a list;
          // motion alone is drift. The road each sentence took is on the
          // record, and so is every refusal, with its given.
          const survivors = [];
          const roads = [];
          const refusals = [];
          const priorCore = priorLanding ? claimCoreOfStable(priorLanding) : "";
          for (const cand of paragraphSentences) {
            // A verbatim re-landing is refused mechanically: the candidate's
            // claim core IS the prior landing's. No overlap percentage — a
            // hand-set fraction would have refused exactly the bridging
            // sentences the motion road exists to admit.
            if (priorCore && claimCoreOfStable(cand) === priorCore) { refusals.push({ kind: "relanding", given: "model" }); continue; }
            if (isMetaSentence(cand)) { refusals.push({ kind: "meta", given: "model" }); continue; }
            const verdict = admitCandidate(cand, {
              ground: groundForGate,
              priorLanding,
              // THE CELL'S OWN WORDING IS INSTRUCTION, NOT MATERIAL (2026-09-21,
              // measured: "Is it a kind that holds firm against the material..."
              // — a void cell's question — appeared verbatim as essay prose).
              // A sentence that bonds to the question harder than to the
              // ground is the mouth answering the scaffolding, not writing.
              instruction: `${task}\n${section}`,
              registry: globalRegistry,
              variance: omniVar,
              bondNull: omniBondNull,
              isGrounded: groundedCand,
              continues: continuesFrom,
              // The capitalization gate guards only scripts that HAVE case.
              // Where the script has none it is a silent no-op, and the
              // reading's own referent index carries the guard instead — said
              // out loud rather than assumed.
              invented: omniGate.applies ? ((x) => inventedNameRuns(x)) : null,
            });
            if (!verdict.admit) { refusals.push(...(verdict.refused ?? [])); continue; }
            survivors.push(cand);
            roads.push(verdict.road);
            depositAdmitted(globalRegistry, verdict); depositAdmitted(matterRegistry, verdict);
            usedSentences.add(cand);
            if (verdict.core) usedSentences.add(verdict.core);
          }
          if (onNote) onNote({
            move: "paragraph_snip",
            section,
            sentences: paragraphSentences.length,
            kept: survivors.length,
            matter: roads.filter((r) => r === "matter" || r === "both").length,
            motion: roads.filter((r) => r === "motion" || r === "both").length,
            gate: omniGate.gate,
            basis: survivors.length < paragraphSentences.length
              ? `snipped ${paragraphSentences.length - survivors.length}: ${[...new Set(refusals.map((r) => r.kind))].join(", ")}`
              : "no snipping needed",
          });
          // ── THE SPIRAL CONTRACT, LAYER 3: DRAFT. The section's product is
          // its survivors with their roads. LOW: anything survived. HIGH:
          // matter, and (past the opening) motion. A section that fails HIGH
          // on motion is a fresh topic, not a turn — the licensed revision is
          // ONE redraw opening on the prior landing ALONE, no window, because
          // the window is where the mouth finds fresh topics to re-assert.
          // Bounded by the budget; every attempt on the record.
          {
            let draftProduct = { survivors, roads, refusals };
            let draftHigh = draftGate.high(draftProduct, { isOpening: false });
            let spent = 0;
            const attempts = [{ pass: draftHigh.pass, basis: draftHigh.basis }];
            // EITHER MISSING ROAD LICENSES A REDRAW (2026-09-21, measured: a
            // section whose every candidate was refused as a repeat got no
            // redraw at all, because the loop only fired for missing MOTION —
            // so the commonest failure, a mouth restating the thesis, left an
            // empty part). The instruction decides what the redraw opens on:
            // a missing turn opens on the prior landing alone, a missing
            // assertion opens on the window alone.
            while (!draftHigh.pass && groundLicensed && spent < spiralBudget) {
              const instruction = draftGate.revise(draftProduct, draftHigh);
              if (!instruction) break;
              if (instruction.open === "prior-landing" && !priorLanding) break;
              if (instruction.open === "window" && !String(secWindow ?? "").trim()) break;
              spent++;
              const redrawTask = instruction.open === "prior-landing"
                ? `Continue the piece from exactly where it left off. Write the next passage (${holonPhrase}) of the piece itself.\n\nThe piece just said:\n"${lastSentenceOmni(priorLanding)}"\n\nWrite the passage now.`
                : `Write the part: ${section}, ${holonPhrase} of the piece itself.\n\nGrounded source text:\n"""\n${secWindow ?? ""}\n"""\n\nWrite the passage now.`;
              if (onThinking) onThinking(`\n### ${section} (redraw for ${draftHigh.missing}, ${spent}/${spiralBudget})\n\n`);
              const [redo] = await Promise.allSettled([draw([{ role: "system", content: systemContent }, ...keptChat.slice(-2), { role: "user", content: redrawTask }], PARAGRAPH_MAX, { kelsen: compositionKelsen })]);
              const redoText = redo.status === "fulfilled" ? String(redo.value?.buf ?? "").trim() : "";
              const more = admitWide(redoText, { priorLanding, registry: globalRegistry, section });
              // Keep the motion sentences the redraw found; matter it also
              // found is welcome. Order: the turn first, then the rest.
              // The turn leads, the matter follows — whichever road the
              // redraw was asked for, everything it found that survived is
              // kept, in the order a piece reads.
              const turn = more.survivors.filter((_, k) => more.roads[k] === "motion" || more.roads[k] === "both");
              const rest = more.survivors.filter((_, k) => !(more.roads[k] === "motion" || more.roads[k] === "both"));
              survivors.unshift(...turn); roads.unshift(...turn.map(() => "motion"));
              survivors.push(...rest); roads.push(...rest.map(() => "matter"));
              refusals.push(...more.refusals);
              draftProduct = { survivors, roads, refusals };
              draftHigh = draftGate.high(draftProduct, { isOpening: false });
              attempts.push({ pass: draftHigh.pass, basis: draftHigh.basis, redrawSentences: more.survivors.length });
            }
            contractRecord.draft.push({ section, pass: draftHigh.pass, missing: draftHigh.missing ?? null, attempts, exhausted: !draftHigh.pass && spent >= spiralBudget });
            // THE SENTENCE IS A LEVEL, AND IT DEPOSITS ITS OWN PRODUCT
            // (2026-09-21). Until now the lowest holon left only a summary
            // inside another line's basis, so a section that came back empty
            // could not be read — you could see THAT nothing survived, never
            // WHICH sentence died of what. Every candidate is now on the
            // ledger with its verdict, which is what makes a killed run
            // usable at this level instead of only at the whole.
            if (documentLedger && paragraphSentences.length) {
              const kept = new Set(survivors);
              const roadOf = new Map(survivors.map((x, k) => [x, roads[k]]));
              const lines = paragraphSentences.map((cand) => kept.has(cand)
                ? `[${roadOf.get(cand) ?? "kept"}] ${cand}`
                : `[refused] ${cand}`);
              const why = [...new Set(refusals.map((r) => r.basis ? `${r.kind}: ${String(r.basis).slice(0, 70)}` : r.kind))];
              try {
                appendLedgerLine(documentLedger, {
                  role: "admission", title: `Admission — ${String(section).slice(0, 70)}`,
                  text: `${lines.join("\n")}${why.length ? `\n\nrefusals: ${why.join("; ")}` : ""}`,
                  giver: "eoreader7:admission",
                  basis: `${survivors.length} of ${paragraphSentences.length} admitted; the mouth drew, the machinery selected`,
                }, { dir: ESSAY_LEDGER_DIR });
              } catch {}
            }
            snipSummary = `${survivors.length} kept (${roads.filter((r) => r === "matter" || r === "both").length} matter, ${roads.filter((r) => r === "motion" || r === "both").length} motion) of ${paragraphSentences.length}` + (refusals.length ? `; refused: ${[...new Set(refusals.map((r) => r.basis ? `${r.kind} (${String(r.basis).slice(0, 60)})` : r.kind))].join("; ")}` : "");
            if (onNote) onNote({ move: "contract_draft", section, pass: draftHigh.pass, missing: draftHigh.missing ?? null, attempts: attempts.length, basis: draftHigh.basis });
          }
          buf = survivors.join(" ");
          // THE FLOOR IS GONE (2026-09-21, falsified live): it kept "the first
          // grounded sentence" when nothing survived the snip WITHOUT asking
          // the registry, and an exact repeat of section 4's last sentence
          // became the whole of section 5. An empty section is now a product
          // that fails the draft gate's LOW — and the fold's gap redraw is
          // what handles an empty part, admitted by the same rule as
          // everything else. A repeated floor is worse than a named gap.
          if (false) {
            const firstGrounded = null;
            if (firstGrounded) {
              buf = firstGrounded;
              usedSentences.add(firstGrounded);
              usedSentences.add(claimCoreOfStable(firstGrounded));
              if (onNote) onNote({ move: "paragraph_floor", section, kept: 1 });
            }
          }
          stopped = paraStopped;
        } else {
          // The draw runs NOW, in parallel with the Gore strike. Whichever
          // lands first flows; the strike's result is folded into the reading
          // whenever it arrives.
          const [drawRes] = await Promise.allSettled([
            draw(
              [
                { role: "system", content: systemContent },
                ...keptChat,
                { role: "user", content: sectionTask },
              ],
              drawBudget,
              { kelsen: compositionKelsen },
            ),
          ]);
          // The Gore strike is FIRE-AND-FORGET: it never gates the section. The
          // draw is the only thing the section waits for. Whatever the strike
          // lands is admitted to the reading and feeds the sections that follow;
          // if it has not returned by then, this section simply does not use it.
          // (Previously Promise.allSettled awaited BOTH, so a slow web fetch
          // stretched every section to max(draw, gore) — the speed killer.)
          if (goreStrike?.then) {
            goreStrike
              .then((r) => { if (r?.landed && onNote) onNote({ move: "gore_landed", cue: section, pages: r.result?.pages ?? 0 }); })
              .catch(() => {});
          }
          const d = drawRes.status === "fulfilled" ? drawRes.value : {};
          buf = d.buf ?? "";
          stopped = !!d.stopped;
          // THE OPENING/NARRATIVE PATH IS NOT EXEMPT FROM THE MACHINERY
          // (2026-09-21): the essay-true run wrote openings through this plain
          // draw path, and every opening re-grounding the same claim survived —
          // "The Cumberland River's flow cuts through the heart of Nashville"
          // opened nearly all twelve sections, and "The user is requested to
          // write about the Cumberland River" leaked into the prose, because
          // this branch never ran the snip. The mechanical filters — registry,
          // referent-verify, meta — are selector rules, not prose-style rules;
          // they apply to EVERY sentence the mouth writes, whatever branch
          // produced it. The survivors here are folded + deposited exactly like
          // the sentence-at-a-time path's.
          const openSentences = segmentSentencesOmni(buf).filter((s) => s.length > 20);
          const openRegistry = (() => {
            const out = new Set();
            if (usedSentences) {
              for (const u of usedSentences) {
                if (u.includes(" ")) out.add(claimCoreOfStable(u));
                else out.add(u);
              }
            }
            return out;
          })();
          const openSurvivors = [];
          for (const cand of openSentences) {
            const core = claimCoreOfStable(cand);
            if (openRegistry.has(core)) continue;
            if (!groundedCand(cand)) continue;
            if (inventedNameRuns(cand).length) continue;
            if (/the user|requested a|requested to|will explore|essay (?:will|is|should)|this essay|the essay(?:'s| is| will| should)|asked to write|subject is|called upon|to answer this|is to (?:be|write)|its significance is (?:undeniable|a subject)/i.test(cand)) continue;
            openSurvivors.push(cand);
            usedSentences.add(cand);
            usedSentences.add(core);
          }
          if (openSurvivors.length) {
            buf = openSurvivors.join(" ");
          } else if (openSentences.length && !stopped) {
            const firstOk = openSentences.find((s) => !inventedNameRuns(s).length && !isMetaSentence(s));
            if (firstOk) {
              buf = firstOk;
              usedSentences.add(firstOk);
              usedSentences.add(claimCoreOfStable(firstOk));
            }
          }
          if (onNote) onNote({ move: "open_snip", section, sentences: openSentences.length, kept: openSurvivors.length, basis: openSurvivors.length < openSentences.length ? `snipped ${openSentences.length - openSurvivors.length} repeated/ungrounded/meta sentence(s) from the opening/narrative draw` : "no snipping needed" });
          if (stopped) break;
        }
        if (onThinking) onThinking(buf + (i < plannedSections.length - 1 ? "\n\n" : ""));

        // ── FIRST DRAFT LANDS; the EDITOR corrects, not this loop ──────────
        // The section lands as its first draft (admission already guaranteed it
        // is not a wholly empty part). Its strain is RECORDED here — repetition,
        // meta, thin are the editor's brief, which reads the WHOLE essay and
        // fixes every finding in one holistic pass instead of patching each
        // section in isolation (the loop-on-loops this replaces).
        const sectionEva = isCode
          ? codeSatisfaction({ documentLines: [buf], sections: [section], validation: null })
          : satisfactionOfSection(buf, { theme: section, material: groundingText(), prior: documentLines.length ? documentLines[documentLines.length - 1] : "" });
        const strainAdded = isCode ? (sectionEva.ok ? 0 : 1) : sectionEva.strain;
        totalStrain += strainAdded;
        if (onNote) onNote({ move: "strain", section, strain: strainAdded, failures: sectionEva.failures.map((f) => f.kind) });
        if (documentLedger) {
          // CODE: the ledger's part is the WHOLE file, written once after the
          // validator clears it — a per-section "part" row would make the
          // projection show the first-draft parts instead of the fixed file
          // (projectDocument reads only role "part"). The section lands in
          // memory here; the code branch appends the single part line at the
          // end. An essay still lands each section as its own part line.
          if (!isCode) appendLedgerLine(documentLedger, {
            role: "part", title: section, text: buf.trim(), giver: model,
            basis: `composition section, strain ${strainAdded}${drawFailure ? ` — draw refused: ${drawFailure}` : ""}${snipSummary ? ` — ${snipSummary}` : ""}`,
          }, { dir: ESSAY_LEDGER_DIR });
          documentLines.push(isCode ? stripCodeFences(buf, codeLanguage) : buf.trim());
        }
        // THE DEPOSIT (2026-09-21): the section's OWN prose is folded into the
        // stigmergic trail — the essay's claims become the record, so no later
        // section re-grounds on them. The trail used to deposit only the WINDOW
        // sentences (what was read); the mouth's OUTPUT (what it wrote) was
        // never deposited, so a section that wrote "The Cumberland River flows
        // 688 miles from its headwaters..." as a paraphrase left no trace, and
        // later sections re-grounded on the same claim (measured: sections
        // 6/9/10 of the browser run all opened with the identical "major
        // waterway... flows 688 miles" pair). The deposit is the writing
        // itself — the piece's own sentences and their claim-cores evaporate
        // from every future window. Absence, never a stated rule.
        if (!isCode && buf && documentLines.length) {
          segmentSentencesOmni(buf).filter((s) => s.length > 20).forEach((s) => usedSentences.add(s));
        }
        if (i < plannedSections.length - 1 && onToken) onToken("\n\n");

        // ── REC: does the reading now hold a being the outline missed? ─────
        // The web material was EOT-ized; as sections are written the fold's
        // referents settle. A newly-established referent not yet covered is a
        // theme the outline must grow to include. Bounded: the same being is
        // never offered twice (the reading does not grow mid-composition, so
        // without this guard the loop re-offers the same theme forever).
        // CODE is exempt — a code file's parts are fixed by CODE_SHAPE_PRIOR,
        // and the reader's prose referents are not code sections.
        if (documentLedger && !truncated && plannedSections.length < 7 && !isCode) {
          const fresh = sessionReferentIndex(session, onNote);
          const beings = [...(fresh?.referents ?? new Map()).values()]
            .map((r) => [...(r.surfaces ?? [])][0])
            .filter((n) => n && n.length > 3)
            .filter((n) => !plannedSections.some((s) => s.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(s.toLowerCase())))
            .filter((n) => !recoffered.has(n));
          if (beings.length) {
            const newTheme = beings[0];
            recoffered.add(newTheme);
            plannedSections.push(newTheme);
            if (outlineId || documentLedger) {
              outlineId = appendLedgerLine(documentLedger, {
                role: "outline", title: "Outline (evolved)", text: `${outlineBuf.trim()}\n- ${newTheme}`,
                supersedes: outlineId ?? null, giver: "eoreader7:reading",
                basis: `REC: the reading established "${newTheme}" as sections were written — the outline grows to include it`,
              }, { dir: ESSAY_LEDGER_DIR });
            }
            if (onNote) onNote({ move: "outline_evolved", added: newTheme, total: plannedSections.length });
            if (onThinking) onThinking(`\n### Outline evolved: added ${newTheme}\n\n`);
            i -= 1; // run the new section immediately, not at the end
          }
        }
      }

      if (!isCode) {
      // ── RANKE VERIFIES THE GROUND, BEFORE MURCH EDITS ────────────────────────
      // Wolfe's first draft is written. RANKE (Leopold von Ranke's
      // Quellenkritik: the account is judged by the document it stands on)
      // checks whether each section's claims are grounded in the retained
      // documents. An ungrounded section — prose that shares almost nothing
      // with the material — is rewritten FROM the material, fact-fidelity
      // restored before any stylistic work. Murch then edits the SHAPE of
      // the grounded prose; he never touches grounding (that is Ranke's).
      // Bounded: each section rewritten at most MAX_REWRITE_ROUNDS across the
      // pass; a section that still fails becomes a declared gap, never churned.
      const rankeAttempts = new Map(); // sectionIndex -> rewrite count, persists across rounds
      for (let round = 0; round < MAX_REWRITE_ROUNDS && !truncated; round++) {
        const rankeFindings = [];
        // RANKE FOLDS THE ESSAY AT THE MATERIAL'S OWN POINTS. The material was
        // folded through the reader into a referent index; Ranke folds each
        // section through THAT SAME index. A section that resolves to the
        // material's beings is grounded IN THE RECORD (its referents and their
        // byte spans ride the finding — P5.2, 54a5622). A section that folds
        // to nothing invented a being the material never carried: that is
        // Ranke's `unresolved` — typed, never a guess. This replaces the
        // token-overlap "ungrounded" test: the check is holographic, the
        // record is the ground.
        const rankeIndex = sessionReferentIndex(session, onNote);
        const holo = rankeIndex ? holographicSatisfaction(documentLines, plannedSections, { index: rankeIndex }) : null;
        if (holo) {
          for (const f of holo.failures) if (f.kind === "unresolved") rankeFindings.push({ ...f, sectionIndex: f.sectionIndex });
        } else {
          for (let i = 0; i < documentLines.length; i++) {
            const r = satisfactionOfSection(documentLines[i], {
              theme: plannedSections[i] ?? "",
              material: groundingText(),
              prior: i > 0 ? documentLines[i - 1] : "",
            });
            for (const f of r.failures) if (f.kind === "ungrounded") rankeFindings.push({ ...f, sectionIndex: i });
          }
        }
        // LAVAR'S LOW-RECALL FINDING: a section that resolves to the material
        // but re-states none of its propositions is grounded-but-generic —
        // LaVar grades it (recall), and Ranke rewrites it to CARRY the
        // material's claims, not just mention the subject. The material's
        // propositions are its EOT graph entries.
        const lavarProps = rankeIndex && rawEntries?.length ? notesFromEdges(rawEntries) : [];
        if (rankeIndex && rawEntries?.length) {
          const lavar = lavarGradeEssay(documentLines, plannedSections, { materialPropositions: lavarProps, index: rankeIndex });
          if (lavar.recall < 0.5 && lavar.ofPropositions > 0) {
            if (onNote) onNote({ move: "lavar", recall: lavar.recall, covered: lavar.covered, of: lavar.ofPropositions });
            // LAVAR'S LOW-RECALL is a RANKE FINDING: a section that carries
            // none of the material's propositions is grounded-but-generic —
            // Ranke rewrites it to re-state the record's claims.
            for (const ps of lavar.perSection ?? []) {
              if (ps.carried === 0 && documentLines[ps.sectionIndex]?.trim()) {
                rankeFindings.push({ kind: "low-recall", sectionIndex: ps.sectionIndex, detail: `the section re-states none of the material's EOT propositions — LaVar grades it 0` });
              }
            }
          }
        }
        if (!rankeFindings.length) break;
        rankeTotalFindings += rankeFindings.length;
        // NO GROUND, NO REWRITE: with no material to ground against, Ranke's
        // ungrounded/unresolved findings cannot be fixed by rewriting FROM
        // nothing — the rewrite would churn model calls against an empty
        // ground. The findings are recorded and the sections stand as written,
        // with their ungrounded standing disclosed by the satisfaction check.
        if (!hasGrounding) {
          if (onNote) onNote({ move: "ranke", round: round + 1, ungrounded: rankeFindings.map((f) => f.sectionIndex), declared: "no ground to rewrite from — gaps disclosed, not churned" });
          // THE DISCLOSURE RIDES THE RECORD, NEVER ONLY THE CHAT NOTE. A
          // falsified claim (what-broke-falsify G6): the model's own admission
          // ("I don't have a grounded source for this") lived only in the chat
          // answer, so the composed document carried the ungrounded prose with
          // no visible disclosure on the ledger. Here the same gap is written
          // as a typed ledger line — a reader of the ARTIFACT sees it, not
          // only a reader of the transcript.
          if (documentLedger) appendLedgerLine(documentLedger, {
            role: "revision",
            title: `ranke: ungrounded — no ground, disclosed`,
            text: `DISCLOSED UNGROUNDED: this composition has no material ground (no web egress, no workspace corpus). ${rankeFindings.length} section(s) folded to no material referent and stand as written, NOT rewritten from the record. Any cited source in the prose is the model's own claim, not a verified citation.`,
            giver: "eoreader7:ranke",
            supersedes: null,
            basis: `RANKE: no ground to rewrite from — ${rankeFindings.map((f) => (f.sectionIndex ?? "?" ) + 1).join(", ")}`,
          }, { dir: ESSAY_LEDGER_DIR });
          break;
        }
        if (onNote) onNote({ move: "ranke", round: round + 1, ungrounded: rankeFindings.map((f) => f.sectionIndex) });
        // CONVERGENCE GUARD: a section that stays ungrounded after the rewrite
        // budget becomes a DECLARED GAP — typed and disclosed, never silently
        // dropped, and never churned forever. Ranke is bounded per section,
        // and the count persists across rounds.
        for (const f of rankeFindings) {
          if (truncated) break;
          const i = f.sectionIndex;
          const sectionText = documentLines[i];
          if (!sectionText) continue;
          const tried = (rankeAttempts.get(i) ?? 0);
          if (tried >= MAX_REWRITE_ROUNDS) {
            if (onNote) onNote({ move: "ranke_gap", sectionIndex: i, theme: plannedSections[i] ?? "", detail: f.detail });
            continue; // declared gap — Ranke has done its budget
          }
          rankeAttempts.set(i, tried + 1);
          if (onThinking) onThinking(`\n### Ranke, section ${i + 1}: ${f.detail}\n\n`);
          // Ranke rewrites the section FROM the documents — the material's
          // own facts and wording, nothing invented. The material's ACTUAL
          // claims are handed over (LaVar grades on whether the section
          // re-states them), so the model can carry the record's
          // propositions rather than generic prose.
          const propBlock = lavarProps.slice(0, 14).map((p) => `- ${p.end1 ?? ""} ${p.label} ${p.end2 ?? ""}`).join("\n");
          const rankeMsg = `We're writing a piece on ${topic}. One section drifted from the material — it names almost none of the source's own claims. The section reads:\n"""\n${String(sectionText).slice(0, 1200)}\n"""\n\nThese are the material's actual claims about ${topic}:\n${propBlock}\n\nRewrite the section so it carries these claims — use the material's own facts, names, and figures, several sentences, as the piece itself. No introduction, no commentary about writing, no discussion of the essay or the question. Write only the corrected section.`;
          const rewrite = await draw(
            [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: rankeMsg }],
            SECTION_MAX_TOKENS,
            { kelsen: Math.max(compositionKelsen, 0.9) }, // Ranke is literal, never impressionistic
          );
          if (rewrite.stopped) { truncated = true; break; }
          let fixText = rewrite.buf.trim();
          if (!fixText) continue;
          // THE NON-MOVING EDIT CUT (2026-09-21, Pathos/Murch — "a film is
          // cut where the audience blinks"). The degenerate loop the falsify
          // tier exposed (wp-improve, 15× byte-identical sections): a rewrite
          // that did not actually change the section is a NO-OP, not a fix —
          // the rewrite loop was churning the same prose forever against an
          // empty ground. A rewrite that leaves the section byte-identical
          // (or collapses it to a near-twin) is refused as a non-move: it
          // consumes the same rewrite budget as any other failed attempt, so
          // the loop terminates by its own convergence guard instead of
          // spinning. Disclosed on the record, never silent.
          const sectionBefore = String(documentLines[i] ?? "").trim();
          const identical = sectionBefore === fixText;
          const collapseRatio = identical ? 1 : 1 - (similarity(sectionBefore, fixText));
          if (identical || collapseRatio >= NON_MOVING_EDIT_RATIO) {
            if (onNote) onNote({ move: "ranke_nonmove", sectionIndex: i, identical, similarity: (1 - collapseRatio), detail: "the rewrite did not move the section — a non-moving edit is not a fix; budget consumed, loop terminates" });
            continue;
          }
          // A REWRITE IS A DRAFT, AND FACES THE SAME ADMISSION (2026-09-21,
          // falsified live: Ranke's rewrites re-introduced "Thomas named
          // Duke", "the 1812 flood" and "the Convention" — the very invented
          // referents the section snip had refused — because this line
          // replaced the section with the mouth's text unexamined). The
          // rewrite is admitted sentence by sentence by the same two-road
          // rule; nothing surviving means the rewrite failed and the section
          // stands as it was, with the failure on the record.
          {
            const rankePrior = [...documentLines.slice(0, i)].reverse().map((l) => String(l ?? "").trim()).find(Boolean) ?? "";
            const got = admitWide(fixText, { priorLanding: rankePrior, registry: new Set(), section: plannedSections[i] ?? "" });
            if (!got.survivors.length) {
              if (onNote) onNote({ move: "ranke_refused", sectionIndex: i, refused: [...new Set(got.refusals.map((r) => r.kind))], basis: "the rewrite survived no admission — the section stands as written" });
              if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `ranke: rewrite refused @ ${i + 1}`, text: `refused: ${[...new Set(got.refusals.map((r) => r.basis ? `${r.kind} (${String(r.basis).slice(0, 60)})` : r.kind))].join("; ")}`, giver: "eoreader7:admission", basis: "a rewrite is a draft and faces the same admission" }, { dir: ESSAY_LEDGER_DIR });
              continue;
            }
            fixText = got.survivors.join(" ");
          }
          documentLines[i] = fixText;
          if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `ranke: ungrounded @ ${i + 1}`, text: fixText, giver: model, supersedes: null, basis: `RANKE: ${f.detail}` }, { dir: ESSAY_LEDGER_DIR });
        }
      }

      // ── MURCH EDITS: EVA the whole, then REC the shape ────────────────────────
      // Wolfe's first draft is written, and Ranke has grounded it. Now MURCH
      // reads the assembled whole (folded at resolutions, never dumped) and is
      // handed the STYLISTIC findings — the shape check's opening/closing/body
      // gaps and each section's repetition/meta/thin verdicts. GROUNDING is
      // not Murch's: an ungrounded section is Ranke's fact-fidelity finding,
      // already rewritten above. Murch produces one batch of bounded rewrites,
      // each fixing exactly one finding, and the shape is re-checked — the
      // film made in the cut.
      // NO GROUND, NO EDITORIAL PASS: with no material, Murch's shape-check
      // will find what any ungrounded short piece lacks (a closing, a body)
      // and rewrite it FROM nothing — churning draws against an empty ground,
      // the same runaway as Ranke's. The piece is written once, short, and its
      // standing is disclosed by the satisfaction check. The editorial film is
      // made in the cut; there is no cut without the material.
      const assembled = documentLines.join("\n\n");
      const shapeCheck = hasGrounding ? checkEssayShape(assembled, { parts: plannedSections.length, themes: plannedSections, subject: topic }) : { ok: true, failures: [] };
      if (onNote) onNote({ move: "shape_check", ok: shapeCheck.ok, failures: shapeCheck.failures.map((f) => f.detail) });
      if (!hasGrounding) {
        if (onNote) onNote({ move: "murch", round: 0, findings: [], basis: "no ground — editorial pass skipped, standing disclosed by satisfaction" });
      }
      const editorIndex = sessionReferentIndex(session, onNote);
      for (let round = 0; round < MAX_REWRITE_ROUNDS && !truncated && hasGrounding; round++) {
        // Aggregate EVERY finding across the whole essay — Murch's brief.
        // Murch is a STYLISTIC editor: his findings are the shape of the prose —
        // repetition, meta-commentary, thin sections, and the whole-essay
        // opening/closing/body gaps. GROUNDING is RANKE's job (Quellenkritik:
        // does the prose stand on the documents?), so `ungrounded` is not
        // handed to Murch — a section that fails grounding is a fact-fidelity
        // failure for Ranke, not a style problem for the editor. The loop is
        // bounded by `applied` and MAX_REWRITE_ROUNDS.
        const findings = aggregateEssayFindings({ sections: plannedSections, documentLines, material: groundingText(), shapeCheck });
        // FISHER DETECTS THE WHOLE-ESSAY OPENING REPETITION (the gate the
        // neighbor-overlap check misses): five paragraphs opening "The bongo
        // antelope, scientifically classified as..." recur ABOVE CHANCE
        // (p from a word-order-scramble null). Fisher names the repeated
        // openings; Murch flags them; BRILLAT-SAVARIN seasons them.
        const fisher = detectRepetition(documentLines, { shuffles: 400 });
        if (fisher.significant && fisher.repeated.length) {
          if (onNote) onNote({ move: "fisher", p: fisher.p, observed: fisher.observed, repeated: fisher.repeated.length, basis: fisher.basis });
          for (let fi = 0; fi < documentLines.length; fi++) {
            if (fisher.repeated.includes(documentLines[fi])) {
              findings.push({ kind: "repetition", sectionIndex: fi, detail: `the opening repeats another section's — Fisher's null shows it recurs above chance (${fisher.repeated.length} section(s) share the same opening construction)` });
            }
          }
          // THE HOLONIC REPAIR — BOREDOM IS SURPRISING (2026-09-21, Meyer).
          // A piece that restates the same section across N slots is a felt
          // deviation of ZERO, which is itself the signal. Murch flags it;
          // the repair does NOT fall to another model draw (a 2B mouth re-
          // drifts toward its strongest sentence — measured: 43 revision
          // marks, sections still 0.48-overlapping). Instead the mechanical
          // register-walk repairs the WHOLE across all nine terrains: it
          // concedes every shape assertion the flat specimen demonstrates
          // false (SYN·Pattern's own falsifying control: "a document whose
          // parts are a flat list, never chained") and CHAINS the duplicates
          // by merging — keeping the longest variant of each flat group and
          // folding any distinct content. The concession is REC, never an
          // edit, and it is grounded FOR WHOM: the specimen names the
          // experiencer's own read, so the refutation is not the machine's
          // private judgment but a recorded act under the person's lens.
          if (hasGrounding && documentLines.length >= 2) {
            const holonic = repairStaleComposition({
              register: shapeRegister,
              sections: documentLines,
              specimen: `${pathos?.forWhom?.who ?? userId ?? "the-person"} reading ${topic} — the piece paced flat, ${fisher.repeated.length} section(s) restating one construction`,
              // THE REPAIR SITS ON REFERENTS, NEVER SPANS (the user's rule):
              // the session's reading index is the being-face — the same
              // index the holographic satisfaction folds against. Sections
              // pair when they resolve to the SAME beings; a merge never
              // fuses two different beings into one voice.
              referents: sessionReferentIndex(session, null),
            });
            // THE REPAIR IS GROUNDED FOR WHOM, AND THE CONTENT'S OWN
            // STANDPOINTS STAY APART (2026-09-21, Panini + Mahavira +
            // Scheherazade). The experiencer is the person at the door — the
            // same forWhom the pathos read declared; the perspectives map
            // discloses which standpoints the chained piece holds apart, so
            // the merge is never a voice-flattening. Both ride the repair.
            if (holonic.perspectives && pathos?.forWhom?.who) {
              holonic.perspectives = { ...holonic.perspectives, forWhom: pathos.forWhom.who };
            }
            if (holonic.merged.length !== documentLines.length) {
              // The merge is a CHAINING, not a rewrite: the sections' own
              // content survives; only the restatements fuse. The refuted
              // shape cells are recorded on the register (REC, for-whom-
              // grounded specimen), and the concession lands on the pathos
              // log as a re-ground — the felt shape of the repair, recorded.
              const holonicFrom = documentLines.length;
              documentLines = holonic.merged;
              if (onNote) onNote({ move: "holonic_repair", merged: holonic.merged.length, from: holonicFrom, conceded: holonic.conceded.length, terrains: "Void·Entity·Kind·Field·Link·Network·Atmosphere·Lens·Paradigm", groundedOn: holonic.groundedOn, forWhom: holonic.perspectives?.forWhom ?? null, standpoints: holonic.perspectives?.keptApart ?? [], basis: holonic.basis });
              if (pathos?.forWhom) {
                try {
                  const act = reGround({ read: pathos, giver: GIVER, reScope: [topic] });
                  pathosLog = landReGround(pathosLog ?? [], act);
                  session.pathosLog = pathosLog;
                } catch {}
              }
              break; // the whole is chained — the flat list is gone; no model rewrite needed
            }
          }
        }
        // REDUNDANCY — ALL of it, not just openings. A maximally rational
        // argument is maximally predictable, and that predictability is the
        // boredom Brillat-Savarin seasons. detectRedundancy catches repeated
        // facts (the same claim stated in N sections) and repeated sentence
        // templates (the same construction opening sentences everywhere) —
        // each finding names the sections, so the seasoning is chosen, never
        // random.
        const redundancy = detectRedundancy(documentLines, { shuffles: 300 });
        for (const r of redundancy) {
          if (onNote) onNote({ move: "redundancy", kind: r.kind, sections: r.sections, detail: r.detail });
          for (const si of r.sections ?? []) {
            findings.push({ kind: r.kind, sectionIndex: si, detail: r.detail });
          }
        }
        // MURCH'S PACING — the blink of an eye. A flatline piece (sentence
        // lengths never vary, no blinks) has no emotional cut. When the whole
        // essay paces flat, Murch flags it as a pacing finding so Brillat-
        // Savarin varies the sentence rhythm — a short landing after a long
        // sentence, the blink where the thought turns.
        const pacing = murchPacing(documentLines.join("\n\n"));
        if (pacing.flatline) {
          if (onNote) onNote({ move: "pacing", basis: pacing.basis });
          findings.push({ kind: "pacing", sectionIndex: null, detail: pacing.basis });
        }
        const fixable = findings.filter((f) => f.kind !== "ungrounded");
        if (!fixable.length) break;
        if (onNote) onNote({ move: "murch", round: round + 1, findings: fixable.map((f) => `${f.kind}${f.sectionIndex != null ? `@${f.sectionIndex}` : ""}`) });
        const editorStanding = essayResolutions({ sections: plannedSections, documentLines, index: editorIndex, rawEntries, onNote });
        const brief = fixable.map((f, idx) => `${idx + 1}. [${f.kind}${f.sectionIndex != null ? `, section ${f.sectionIndex + 1}` : " the piece as a whole"}] ${f.detail}`).join("\n");
        if (onThinking) onThinking(`\n### Murch, pass ${round + 1}\n${brief}\n\n`);
        // Murch fixes ONE finding per draw — the reliable grain for a 2B
        // mouth (the voice design: one proposition per call). Each draw is
        // small, targeted, and replaces the specific section it names; the
        // whole-essay context is the resolutions fold, never the raw bytes.
        let applied = 0;
        for (let fi = 0; fi < fixable.length && !truncated; fi++) {
          const f = fixable[fi];
          const targetSection = f.sectionIndex != null ? documentLines[f.sectionIndex] : null;
          if (f.kind === "body") {
            // A theme is uncovered — write a section that covers it, appended.
            const bodyMsg = `The piece on ${topic} is missing this: ${f.detail}. ${editorStanding ? `The piece so far: ${editorStanding}` : ""}\n\nWrite the missing section from the material, in the piece's own voice — a substantial passage, several sentences, the material's own facts and wording, no introduction, no commentary about writing.`;
            const body = await draw(
              [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: bodyMsg }],
              SECTION_MAX_TOKENS,
              { kelsen: Math.max(compositionKelsen, 0.9) },
            );
            if (body.stopped) { truncated = true; break; }
            // A MURCH BODY IS A DRAFT, AND FACES THE SAME ADMISSION (2026-09-21).
            const bodyPrior = [...documentLines].reverse().map((l) => String(l ?? "").trim()).find(Boolean) ?? "";
            const bodyGot = admitWide(body.buf.trim(), { priorLanding: bodyPrior, registry: new Set(), section: "body" });
            const bodyText = bodyGot.survivors.join(" ");
            if (!bodyText && body.buf.trim() && onNote) onNote({ move: "murch_body_refused", refused: [...new Set(bodyGot.refusals.map((r) => r.kind))] });
            if (bodyText) {
              documentLines.push(bodyText);
              if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `murch: body`, text: bodyText, giver: model, supersedes: null, basis: `MURCH: ${f.detail}` }, { dir: ESSAY_LEDGER_DIR });
              applied++;
            }
            continue;
          }
          // A section finding (meta/repetition/thin/ungrounded) — rewrite that
          // specific section from the material, keeping the piece's voice.
          // BRILLAT-SAVARIN's seasoning instruction rides the repetition finding: the
          // piece must be accurate (Ranke) and FLAVORED (Brillat-Savarin) —
          // the chosen off-kilter detail, the exact fact landed with the right
          // measure of surprise, never a shower of random spice. Season the
          // opening so it does not echo the other sections' construction —
          // vary the construction and the rhythm the way a good dish varies
          // its course: a new flavor, not more of the same.
          const brillatNote = (f.kind === "repetition" || f.kind === "repeated-fact" || f.kind === "repeated-template" || f.kind === "pacing")
            ? (f.kind === "pacing"
              ? " This piece paces flat — the sentences are all the same length, no blink, no cut. Murch edits where the blink falls: let a SHORT sentence land after a long one, vary the rhythm, let the reader's eye rest where the thought turns. Dense information reads slow; release it with a short sentence."
              : f.kind === "repeated-fact"
              ? " This fact is a crutch — it is stated in more than one section. State it ONCE, in its best form, and let the other section move on: a fact once is a finding, twice is a crutch. Season the section by advancing something the reader has not already been told."
              : f.kind === "repeated-template"
                ? " This construction repeats across the piece — the same scaffolding everywhere is the boredom. Season it: vary the construction, the rhythm, the first phrase, the way a good dish varies its course. Do not add random spice; add the right one."
                : " Open differently — do not begin the way the other sections begin. Season it: land an exact fact with a surprising, chosen measure of flavor — a detail the reader did not expect, the way a striking detail makes a dish memorable. Vary the construction and the rhythm; do not add random spice, add the right one.")
            : "";
          const fixMsg = `We're editing a piece on ${topic}. ${editorStanding ? `Where the piece stands: ${editorStanding}\n\n` : ""}The editor found this problem in one section:\n- [${f.kind}] ${f.detail}\n\nThe current section reads:\n"""\n${String(targetSection ?? "").slice(0, 1200)}\n"""\n\nRewrite that section from the material, in the piece's own voice — a substantial passage, several sentences, the material's own facts and wording, no introduction, no commentary about writing.${brillatNote} Write only the corrected section.`;
          // VARIATION BY SEARCH: for the repetition family, try the MECHANICAL
          // snip FIRST (free, deterministic, EOT-recorded — no model call),
          // then fall to drawVaried's rejection sampling at rising
          // temperature with the material's synonym surfaces. The revision
          // LADDER: mechanical (free, certain) → varied draw (model, small).
          // Every mechanical edit lands as an EOT TRANSFORMATION line: the
          // op (INS·swap / SYN·rotate / SEG·cut), the `from` (superseded
          // bytes), and the `to` — always auditable, always re-foldable.
          const isVariation = f.kind === "repetition" || f.kind === "repeated-fact" || f.kind === "repeated-template";
          const blocked = isVariation
            ? documentLines.map((_, i) => i === f.sectionIndex ? "" : documentLines[i]).filter(Boolean)
            : [];
          let fixText = null, fixOp = null;
          if (isVariation) {
            // THE MECHANICAL SNIP — no model call. If it produces a genuine,
            // different opening, it is the edit: recorded as an EOT transform
            // with the op and the before/after bytes.
            const mech = mechanicalRevision(String(targetSection ?? ""), {
              kind: f.kind, synonyms: synonymPool, others: blocked,
            });
            if (mech) {
              fixText = mech.to;
              fixOp = mech.op;
              if (onNote) onNote({ move: "mechanical", op: mech.op, kind: f.kind, basis: mech.basis });
            }
          }
          if (!fixText) {
            // FALL TO THE MODEL — the mouth, when no mechanical transform
            // expresses the needed change.
            const fix = isVariation
              ? await variedDraw({
                  draw,
                  msgs: [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
                  maxTokens: SECTION_MAX_TOKENS,
                  blockedOpenings: blocked,
                  synonyms: synonymPool,
                  onReject: (r) => { if (onNote) onNote({ move: "rejected_draw", ...r }); },
                })
            : await draw(
                [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
                SECTION_MAX_TOKENS,
                { kelsen: Math.max(compositionKelsen, 0.9) }, // Murch is literal, never impressionistic
              );
            if (fix.stopped) { truncated = true; break; }
            fixText = fix.buf.trim();
            fixOp = "INS·rewrite";
          }
          if (!fixText) continue;
          // A MODEL REWRITE IS A DRAFT, AND FACES THE SAME ADMISSION
          // (2026-09-21). A mechanical edit (mech.to) is deterministic and
          // passes as it is; the mouth's rewrite is admitted sentence by
          // sentence, and a rewrite that survives nothing leaves the section
          // as it was, with the refusal on the record.
          if (fixOp === "INS·rewrite" && f.sectionIndex != null) {
            const murchPrior = [...documentLines.slice(0, f.sectionIndex)].reverse().map((l) => String(l ?? "").trim()).find(Boolean) ?? "";
            const got = admitWide(fixText, { priorLanding: murchPrior, registry: new Set(), section: plannedSections[f.sectionIndex] ?? "" });
            if (!got.survivors.length) {
              if (onNote) onNote({ move: "murch_refused", sectionIndex: f.sectionIndex, kind: f.kind, refused: [...new Set(got.refusals.map((r) => r.kind))] });
              if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `murch: ${f.kind} refused @ ${f.sectionIndex + 1}`, text: `refused: ${[...new Set(got.refusals.map((r) => r.basis ? `${r.kind} (${String(r.basis).slice(0, 60)})` : r.kind))].join("; ")}`, giver: "eoreader7:admission", basis: "a rewrite is a draft and faces the same admission" }, { dir: ESSAY_LEDGER_DIR });
              continue;
            }
            fixText = got.survivors.join(" ");
          }
          if (f.sectionIndex != null && documentLines[f.sectionIndex]) {
            documentLines[f.sectionIndex] = fixText;
          } else {
            documentLines.push(fixText);
          }
          // THE EOT TRANSFORMATION: every edit — mechanical or model — lands
          // as a typed transformation line carrying the OP and the superseded
          // bytes (`from` in the basis), so the edit is always auditable and
          // the piece re-foldable to any point. A mechanical edit is free and
          // deterministic; a model edit is the mouth's. Both are recorded the
          // same way: a revision that supersedes, never an in-place write.
          if (documentLedger) appendLedgerLine(documentLedger, {
            role: "revision", title: `murch: ${f.kind} ${f.sectionIndex != null ? `@ ${f.sectionIndex + 1}` : "whole"}`,
            text: fixText, giver: model, supersedes: null,
            basis: `${fixOp ?? "revision"}: EVA found ${f.kind} — ${f.detail}`,
          }, { dir: ESSAY_LEDGER_DIR });
          applied++;
        }
        if (onNote) onNote({ move: "murch_applied", round: round + 1, applied });
        if (!applied) break; // nothing landed — stop, don't loop forever
        const rechecked = checkEssayShape(documentLines.join("\n\n"), { parts: plannedSections.length, themes: plannedSections, subject: topic });
        if (onNote) onNote({ move: "shape_recheck", ok: rechecked.ok, failures: rechecked.failures.map((f) => f.detail) });
        shapeCheck.ok = rechecked.ok;
        shapeCheck.failures = rechecked.failures;
        if (rechecked.ok) break;
      }

      // ── READING IS WRITING: a landed strike may revise EARLIER sections ──
      // Everything is revisable — the ledger is append-only, so a revision to
      // section 2 after section 4 is just a line that supersedes it. After the
      // sections and strikes, re-read the reading: a section whose theme the
      // grown material now covers more fully (more referents, more notes) is
      // worth revising — a writer returns to an earlier part when the later
      // research deepens it. Bounded: one revision pass, each section at most
      // once, and only when the fold genuinely grew.
      if (documentLedger && !truncated && plannedSections.length > 1 && session.reader && hasGrounding) {
        const fresh = sessionReferentIndex(session, onNote);
        const afterCount = fresh?.referents?.size ?? 0;
        // The FIRST time a session composes, there is no "before" — the baseline
        // is set, nothing is revised on the first pass. Revision requires the
        // reading to have ACTUALLY grown mid-composition (a later strike landed
        // and deepened the fold), never a first-run artifact.
        const beforeCount = session.lastReferentCount;
        session.lastReferentCount = afterCount;
        if (beforeCount != null && afterCount > beforeCount + 1) {
          // The reading grew substantially mid-writing. Revise the earliest
          // section whose theme the new referents touch.
          const newRefs = [...(fresh?.referents?.values?.() ?? [])]
            .map((r) => [...(r.surfaces ?? [])][0])
            .filter((n) => n && n.length > 3);
          const reviseTarget = plannedSections.findIndex((s) => newRefs.some((n) => s.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(s.toLowerCase())));
          if (reviseTarget >= 0) {
            const section = plannedSections[reviseTarget];
            if (onNote) onNote({ move: "strike_revision", section, reason: `the reading grew from ${beforeCount} to ${afterCount} referents — the section can be deepened` });
            if (onThinking) onThinking(`\n### Revising earlier section: ${section}\n\n`);
            const revise = await draw(
              [
                { role: "system", content: systemContent },
                ...keptChat,
                { role: "user", content: `The piece on ${topic} has a section on "${section}". The research since it was written turned up more. Rewrite that section, deepened by the new material.` },
              ],
              SECTION_MAX_TOKENS,
              { kelsen: Math.max(compositionKelsen, 0.9) },
            );
            if (!revise.stopped && revise.buf.trim()) {
              const revisedText = revise.buf.trim();
              if (documentLedger) {
                // The revision SUPERSEDES the earlier section in the ledger —
                // both stay on the record; the projection takes the survivor.
                appendLedgerLine(documentLedger, {
                  role: "revision", title: `revision: ${section}`, text: revisedText, giver: model,
                  supersedes: null, basis: `REC: the reading grew (${beforeCount}→${afterCount} referents) — "${section}" rewritten with the new material`,
                }, { dir: ESSAY_LEDGER_DIR });
              }
              documentLines[reviseTarget] = revisedText;
              fullText += `\n\n${revisedText}`;
              if (onToken) onToken(`\n\n${revisedText}`);
            }
          }
        }
      }
      if (documentLedger) {
        const def = sections.map((s) => `"${s}"`).join(", ");
        if (onNote) onNote({ move: "document_ledger", docId: documentLedger.docId, parts: documentLines.length, declared: def });
      }
      // Verbatim snips (citations) — taken mechanically from the EOT-retained
      // web sources, never generated by the model. Appended as their own
      // document-ledger observation after the sections, with source URLs.
      // CITATION SOURCES = THE ACTUAL MATERIAL, WEB AND WORKSPACE (2026-09-13).
      // The citation ledger used to be gated on session.webSources alone, so a
      // workspace run produced zero citations — measured: no citations.json, no
      // footnotes, no inline markers. Every retained non-conversation document
      // is a citable source: web pages (url→text) and workspace files (path→text).
      if (session.webSources?.size) for (const [u, t] of session.webSources) if (t) citationSources.set(u, t);
      if (session.corpus?.documents?.size) for (const [sid, doc] of session.corpus.documents) {
        if (String(sid).startsWith("chat:")) continue;
        if (citationSources.has(sid)) continue;
        if (doc?.text && String(doc.text).trim().length > 40) citationSources.set(sid, String(doc.text));
      }
      // MEMBERSHIP GATE (2026-09-17, measured): the pools above accumulate
      // across turns, so a stale Wikisource page admitted turns earlier
      // reached a later poem's Sources appendix with zero shared vocabulary.
      // A source is cited only when THIS TURN used it — the surf surfaced
      // it, the prompt adopted it, or the primary-source hunt admitted it
      // for this artifact. Unused docs are inadmissible, not filtered: they
      // never enter the ledger, the footnotes, or the appendix below (all
      // three read this same Map). The drop is disclosed, never silent.
      // NO SKIP ON EMPTY (2026-09-17, falsification): the gate used to be
      // guarded on `turnUsedSourceIds.size` — a turn that used NOTHING
      // (no surf, no primary source) skipped the gate and cited the whole
      // pool. Empty used-set means the turn has NO sources to cite: the
      // intersection below drops everything, which is the honest result.
      {
        const beforeMembership = citationSources.size;
        for (const k of [...citationSources.keys()]) if (!turnUsedSourceIds.has(k)) citationSources.delete(k);
        const membershipDropped = beforeMembership - citationSources.size;
        if (membershipDropped > 0 && onNote) onNote({ move: "citations_unused_dropped", dropped: membershipDropped, kept: citationSources.size, used: turnUsedSourceIds.size });
      }
      // RELEVANCE GATE: hygiene on the used set — a source the turn used is
      // still only cited for the task it serves. Mechanical word overlap,
      // never a model judgment, so the gate cannot invent relevance.
      const gated = relevantSources(citationSources, task);
      if (gated.dropped > 0) {
        citationSources.clear();
        for (const [k, v] of gated.kept) citationSources.set(k, v);
        if (onNote) onNote({ move: "citations_stale_dropped", dropped: gated.dropped, kept: citationSources.size });
      }
      if (documentLedger && citationSources.size) {
        const snips = snipsFromSources(citationSources);
        // The structured citation ledger: a JSON doc beside the essay with the
        // REAL verbatim source spans and their byte addresses into the retained
        // shadow text — every citation points at actual bytes, never a guess.
        const assembledBody = documentLines.join("\n\n");
        // THE GIVERS, ALL CITED (the user's discipline): the model is a giver
        // when it states something; every prior that steered the composition
        // is a giver too (the shape prior, the POS prior + born anchoring
        // that shaped the reading). None invisible.
        const essayGivers = [
          // THE MODEL, CITED WITH ITS IDENTITY: what it is, when it
          // released, where it lives — a giver is named, never anonymous.
          (() => { const m = MODEL_GIVER(model); return { role: "model", name: m.name, id: m.id, hfUrl: m.hfUrl, released: m.released, license: m.license, note: m.note }; })(),
          { role: "prior", name: "eoreader7:shape-prior:essay-v1", basis: "the essay's received form — thesis opening, body, closing" },
          { role: "prior", name: "pos:en-ud-ewt + born anchoring", basis: "the reading's shape prior — what the priors caused the shadow to retain" },
        ];
        const cites = citationLedger(assembledBody, citationSources, { givers: essayGivers });
        citesResult = cites;
        if (cites.citations.length) {
          const citesPath = path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.citations.json`);
          try { fs.writeFileSync(citesPath, JSON.stringify({ docId: documentLedger.docId, ...cites }, null, 2)); } catch {}
          if (onNote) onNote({ move: "citation_ledger", path: citesPath, citations: cites.citations.length, basis: cites.basis });
        }
        // APA footnotes: each essay sentence attributed mechanically to its
        // best source, with the VERBATIM span it borrows from — the Fold's
        // cite.js discipline (an address is attached, never requested).
        const footnoteBlock = renderApaFootnotes(assembledBody, citationSources, { givers: essayGivers });
        // INLINE CITATION MARKERS are applied CLIENT-SIDE by the live HTML
        // (each citation's essaySentence gets [n] after it in the folded
        // prose). The server stores the STRUCTURED citations (citations.json)
        // and the footnote block as a `citations` ledger line — never a
        // duplicate inline-marked body, never the footnotes twice. THE CHAT
        // MESSAGE IS THE PROSE AND NOTHING ELSE (2026-09-17): footnotes and
        // the Sources appendix used to ride documentLines/fullText/onToken,
        // so the TUI transcript printed a raw source dump under the essay —
        // that rendering belongs to the ARTIFACT (the browser's live HTML
        // folds the ledger + citations client-side), never to the reply.
        // The artifact is the ledger; the message is the prose.
        if (footnoteBlock) {
          appendLedgerLine(documentLedger, {
            role: "citations", title: "Footnotes (APA)", text: footnoteBlock,
            giver: "eoreader7:cite",
            basis: "mechanical attribution of each essay sentence to its best-supporting web source, with the verbatim borrowed span",
          }, { dir: ESSAY_LEDGER_DIR });
          if (onThinking) onThinking(`\n### Footnotes (APA)\n\n${footnoteBlock}\n`);
        }
        if (snips.length) {
          const citationsText = snips.map((s) => `- "${s.snip}" — ${s.url}`).join("\n");
          appendLedgerLine(documentLedger, {
            role: "citations", title: "Sources (verbatim)", text: citationsText,
            giver: "eoreader7:web-organ",
            basis: "verbatim snips taken mechanically from EOT-retained web sources — never generated",
          }, { dir: ESSAY_LEDGER_DIR });
          if (onThinking) onThinking(`\n### Sources (verbatim)\n\n${citationsText}\n`);
        }
      }
      // ── THE FOLD → THE SPIRAL → THE CONCRESCENCE (2026-09-21, the design) ──
      // The mouth wrote WIDE (every void cell, twelve sections, no cap). Now
      // the MACHINERY assembles: the fold values the wide draft into the asked
      // shape, the spiral tightens the folded beats toward mutual requirement,
      // and the concrescence detector reads the rotation stream to say whether
      // the piece has ARRIVED. Each phase deposits a usable artifact to the
      // ledger BEFORE the next runs — the watchmaker's shelf: kill the run at
      // any boundary and the ledger holds a finished instrument, not a
      // half-essay. The fold is the VALUATION phase; the spiral is the
      // COMPARATIVE phase; the detector names satisfaction — strain CONSTANT,
      // never zero.
      if (documentLedger && documentLines.length >= 2) {
        try {
          const wideParts = [...documentLines];
          const atoms = wideToAtoms(wideParts, { ground: groundingText() });
          // THE SHAPE IS THE MATERIAL'S, NOT A TABLE'S (2026-09-21). The fold
          // used to assemble into DEFAULT_ESSAY_BEATS, whose charge words were
          // `waterway`, `steamboats`, `cotton`, `flood`, `levy`. That shape
          // folded one river correctly and turned every other subject into
          // gaps — which is where "The tension [gap] (empty)" came from in a
          // finished piece. The beats are now derived: the ground's own seams
          // set what parts are POSSIBLE, the ask's count sets how many are
          // PROBABLE when the ground declares no seam of its own.
          const derivedBeats = beatsFromGround(groundingText(), { want: plannedSections.length || 5 });
          if (onNote) onNote({ move: "beats_derived", beats: derivedBeats.beats.length, from: derivedBeats.from, titles: derivedBeats.beats.map((b) => b.title).slice(0, 8) });
          const folded = foldWideToShape(atoms, { ground: groundingText(), beats: derivedBeats.beats.length ? derivedBeats.beats : null });
          // ── THE SPIRAL CONTRACT, LAYER 4: FOLD. LOW: a beat filled. HIGH:
          // no gap. A gap is not "(empty)" in a finished piece — it is the
          // fold's own statement of the NEXT SECTION TO DRAW, opening on the
          // landing of the beat before it and drawing on the ground window
          // for the beat's own charge. Bounded by the budget per gap; the
          // redraw is admitted by the same two-road rule as every sentence.
          {
            const foldLow = foldGate.low(folded);
            let foldHigh = foldLow.pass ? foldGate.high(folded) : { pass: false, basis: foldLow.basis, missing: "beat", gaps: [] };
            const attempts = [{ pass: foldHigh.pass, basis: foldHigh.basis }];
            let filledByRedraw = 0;
            if (!foldHigh.pass && groundLicensed && foldHigh.gaps?.length) {
              const foldRegistry = new Set([...usedSentences].filter((u) => !u.includes(" ")));
              for (const instr of foldGate.revise(folded, foldHigh) ?? []) {
                const beat = folded.beats[instr.beatIndex];
                if (!beat) continue;
                let spent = 0;
                while (spent < spiralBudget && (beat.gap || !String(beat.text ?? "").trim())) {
                  spent++;
                  const charge = `${beat.title}${beat.charge ? ` — ${String(beat.charge).slice(0, 160)}` : ""}`;
                  const win = groundedWindowFor(charge, [], groundingText(), usedSentences, null, instr.beatIndex);
                  const redrawTask = instr.priorLanding
                    ? `Continue the piece from exactly where it left off. Write the next passage (as a short paragraph) of the piece itself.\n\nThe piece just said:\n"${instr.priorLanding}"\n\nHere is what this passage is about:\n"${beat.title}"\n\nGrounded source text:\n"""\n${win ?? ""}\n"""\n\nWrite the passage now.`
                    : `Write the part: ${beat.title}, as a short paragraph of the piece itself.\n\nGrounded source text:\n"""\n${win ?? ""}\n"""\n\nWrite the passage now.`;
                  if (onThinking) onThinking(`\n### ${beat.title} (gap beat redraw, ${spent}/${spiralBudget})\n\n`);
                  const [redo] = await Promise.allSettled([draw([{ role: "system", content: systemContent }, { role: "user", content: redrawTask }], 450, { kelsen: compositionKelsen })]);
                  const redoText = redo.status === "fulfilled" ? String(redo.value?.buf ?? "").trim() : "";
                  const got = admitWide(redoText, { priorLanding: instr.priorLanding, registry: foldRegistry, section: beat.title });
                  if (got.survivors.length) { beat.text = got.survivors.join(" "); beat.gap = false; filledByRedraw++; }
                  if (onNote) onNote({ move: "contract_fold_redraw", beat: beat.title, filled: !beat.gap, kept: got.survivors.length, roads: got.roads, refused: [...new Set(got.refusals.map((r) => r.kind))] });
                }
              }
              foldHigh = foldGate.high(folded);
              attempts.push({ pass: foldHigh.pass, basis: foldHigh.basis, filledByRedraw });
            }
            contractRecord.fold = { pass: foldHigh.pass, missing: foldHigh.missing ?? null, attempts, filledByRedraw };
            if (onNote) onNote({ move: "contract_fold", pass: foldHigh.pass, filledByRedraw, basis: foldHigh.basis });
          }
          const foldedBeats = folded.beats.filter((b) => !b.gap).map((b) => b.text).filter(Boolean);
          if (onNote) onNote({ move: "fold_done", beats: folded.beats.length, filled: foldedBeats.length, residual: folded.residual.length, refused: folded.refused.length, basis: folded.basis });
          // THE FOLD IS THE ESSAY'S SHAPE (2026-09-21, the user's "the full
          // projected essay must be created by eoreader7"): the wide draft's
          // parts are SUPERSEDED by the folded beats, and each beat becomes a
          // `role: part` line — so `projectDocument` (which reads only
          // "part"/"citations") emits the FOLDED ESSAY, not the wide draft.
          // The wide parts remain in the ledger as superseded history (§V:
          // the losing readings are kept). The projection is eoreader7's own.
          // EVERY wide part is superseded — a beat with no 1:1 counterpart
          // still supersedes one wide part each, so no wide section leaks into
          // the projection (measured 2026-09-21: folding 13 parts into 5 beats
          // left 8 wide parts alive and the projection mixed both).
          const widePartIds = documentLedger.lines
            .filter((l) => l.role === "part" && !documentLedger.superseded.has(l.id))
            .map((l) => l.id);
          const beatTitles = folded.beats.map((b) => b.title);
          const foldedPartIds = [];
          folded.beats.forEach((beat, bi) => {
            if (beat.gap || !beat.text.trim()) return;
            // Each folded beat supersedes the wide part at its index; any wide
            // part beyond the beat count is superseded by the fold's final
            // line below. No wide section stays alive.
            const sup = widePartIds[bi] ?? null;
            const beatLine = appendLedgerLine(documentLedger, {
              role: "part", title: beat.title, text: beat.text.trim(), giver: "eoreader7:fold",
              supersedes: sup, basis: `folded beat "${beat.title}" — supersedes the wide draft section${sup ? "" : " (no matching wide part)"}`,
            }, { dir: ESSAY_LEDGER_DIR });
            foldedPartIds.push(beatLine.id);
          });
          // The wide parts with NO folded beat to pair with (index ≥ beats)
          // are superseded by the fold's final line — the fold is ONE act
          // replacing the whole wide draft, and every wide section is revised
          // (supersedes takes an array: the fold batches the remaining parts).
          const unsupersededWide = widePartIds.slice(folded.beats.length);
          if (unsupersededWide.length && foldedPartIds.length) {
            appendLedgerLine(documentLedger, {
              role: "fold", title: "Fold (supersedes remaining wide sections)",
              text: unsupersededWide.length === 1
                ? `folded: the remaining wide section is superseded by the folded essay`
                : `folded: the remaining ${unsupersededWide.length} wide sections are superseded by the folded essay`,
              giver: "eoreader7:fold", supersedes: unsupersededWide,
              basis: `the fold supersedes every wide draft section not paired to a beat — the projection reads only the folded essay`,
            }, { dir: ESSAY_LEDGER_DIR });
          }
          // documentLines now carries the FOLDED essay — the projected artifact.
          const foldedDocument = folded.beats.filter((b) => !b.gap && b.text.trim()).map((b) => b.text.trim());
          if (foldedDocument.length) documentLines = foldedDocument;
          appendLedgerLine(documentLedger, {
            role: "fold", title: `Fold (${folded.beats.length} beats)`,
            text: folded.beats.map((b, i) => `${b.title}${b.gap ? " [gap]" : ""}: ${b.text || "(empty)"}`).join("\n\n"),
            giver: "eoreader7:fold", basis: `${folded.basis} — shape: ${derivedBeats.basis}`,
          }, { dir: ESSAY_LEDGER_DIR });
          // THE SPIRAL over the folded beats — one rotation per beat, cutting
          // the inflationary diction and false-tension the probes can name.
          // Each rotation records its level, its gathered world, and what it
          // broke in the OTHER two appeals (the re-read). The LOG is the
          // piece's lineage — its scars — deposited as a ledger line.
          let spiral = createSpiral({ text: foldedBeats.join("\n\n") });
          let rotations = 0;
          for (let b = 0; b < foldedBeats.length && rotations < 12; b++) {
            const before = spiral.text;
            const r = rotate(spiral, {
              cell: "micro.ethos", level: "paragraph", gathered: 1,
              basis: `Zinsser over beat "${beatTitles[b] ?? b}" — strip the inflation the probe names`,
              cut: (t) => {
                const lines = String(t).split("\n\n");
                const target = lines[b] ?? "";
                // INFLATION MEASURED, NOT LISTED (2026-09-21): a word the
                // ground never said, in a sentence whose grounded claim stands
                // without it. No English intensifier list; runs in any script.
                const decoration = measuredInflation(target, groundingText(), omniOf(groundingText()).variance);
                const cleaned = decoration.reduce((acc, h) => acc.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${h.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}\\p{N}])`, "giu"), "$1"), target).replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
                lines[b] = cleaned;
                return lines.join("\n\n");
              },
            });
            if (r.refused) break;
            spiral = r;
            if (spiral.text !== before) rotations++;
          }
          if (onNote) onNote({ move: "spiral_rotations", count: spiral.log.length, rotations, basis: spiralPath(spiral).slice(0, 3).join(" | ") });
          appendLedgerLine(documentLedger, {
            role: "tighten", title: "Spiral rotations",
            text: spiralPath(spiral).join("\n"),
            giver: "eoreader7:spiral", basis: `${spiral.log.length} rotation(s), ${rotations} changed the text`,
          }, { dir: ESSAY_LEDGER_DIR });
          // THE TIGHTENING FLOWS INTO THE PROJECTION (2026-09-21): the spiral's
          // cuts are not a side-note — the tightened text REPLACES documentLines
          // so the projected essay is the tightened one, not the pre-spiral
          // fold. The rotations that changed the text are folded back into the
          // beats the projection reads.
          if (spiral.text && spiral.text !== foldedBeats.join("\n\n")) {
            let tightened = String(spiral.text).split("\n\n").filter((t) => t.trim());
            // ── THE SPIRAL CONTRACT, LAYER 5: TIGHTEN. HIGH: no cut took a
            // beat's matter or motion with it. A beat the cut broke reverts to
            // its pre-cut text — reverting is the recorded revision.
            {
              const m = omniOf(groundingText());
              const tHigh = tightenGate.high({ beats: tightened }, { before: foldedBeats, variance: m.variance, bondNull: m.bondNull });
              if (!tHigh.pass) {
                for (const r of tightenGate.revise({ beats: tightened }, tHigh, { before: foldedBeats }) ?? []) {
                  if (r.text) tightened[r.beatIndex] = r.text;
                }
              }
              contractRecord.tighten = { pass: tHigh.pass, basis: tHigh.basis, reverted: tHigh.broken ?? [] };
              if (onNote) onNote({ move: "contract_tighten", pass: tHigh.pass, reverted: tHigh.broken ?? [], basis: tHigh.basis });
            }
            if (tightened.length) {
              documentLines = tightened;
              if (onNote) onNote({ move: "spiral_applied", parts: tightened.length, basis: "the tightened text replaced the folded documentLines" });
            }
          }
          // THE CONCRESCENCE DETECTOR — reads the rotation stream for the
          // triad (every unit required + influx-stable + strain constant).
          // The verdict replaces the naive strain-0 stop: it names WHICH
          // signal is missing, always usable.
          // ── THE SPIRAL CONTRACT, LAYER 6: ARRIVE. The removal test needs a
          // satisfaction that MOVES when a required beat is removed. The old
          // one ("strain 1 if over 25 words") never moved, so the detector
          // reported "still a list" on every piece longer than a sentence,
          // forever. chainStrain counts the adjacent beat pairs whose bond
          // does not clear the material's null — broken links. Remove a beat
          // the chain needs and its neighbours face each other and fail.
          const unitSatisfaction = (t) => {
            const m = omniOf(groundingText());
            return chainStrain(t, { variance: m.variance, bondNull: m.bondNull });
          };
          const conc = isConcrescent({ whole: spiral.text, units: foldedBeats, sat: unitSatisfaction, log: spiral.log });
          if (onNote) onNote({ move: "concrescence", reached: conc.concrescent, signals: conc.signals, basis: conc.basis });
          contractRecord.arrive = arriveGate.high(conc);
          if (onNote) onNote({ move: "contract_arrive", pass: contractRecord.arrive.pass, missing: contractRecord.arrive.missingAll ?? [], basis: contractRecord.arrive.basis });
          appendLedgerLine(documentLedger, {
            role: "contract", title: "Spiral contract — every layer's gates",
            text: [
              `ground: ${contractRecord.ground.licensed ? "licensed" : "NOT licensed"} — ${contractRecord.ground.high.basis}`,
              ...contractRecord.draft.map((d) => `draft "${String(d.section).slice(0, 60)}": ${d.pass ? "pass" : `FAIL (${d.missing})`} after ${d.attempts.length} attempt(s)${d.exhausted ? " — budget exhausted" : ""}`),
              `fold: ${contractRecord.fold ? (contractRecord.fold.pass ? "pass" : `FAIL (${contractRecord.fold.missing})`) + ` — ${contractRecord.fold.filledByRedraw} gap(s) filled by redraw` : "not run"}`,
              `tighten: ${contractRecord.tighten ? (contractRecord.tighten.pass ? "pass" : `reverted ${contractRecord.tighten.reverted.length} beat(s)`) : "no cut"}`,
              `arrive: ${contractRecord.arrive.pass ? "arrived" : contractRecord.arrive.basis}`,
            ].join("\n"),
            giver: "eoreader7:contract", basis: `budget ${spiralBudget} revision(s) per layer; low gate = possibility, high gate = probability`,
          }, { dir: ESSAY_LEDGER_DIR });
          appendLedgerLine(documentLedger, {
            role: "concrescence", title: conc.concrescent ? "Concrescence reached" : "Concrescence not yet",
            text: `${conc.basis}\n\nsignals: ${Object.entries(conc.signals).map(([k, v]) => `${k}=${v}`).join(", ")}`,
            giver: "eoreader7:concrescence", basis: conc.basis,
          }, { dir: ESSAY_LEDGER_DIR });
        } catch (foldErr) {
          // A SWALLOWED ERROR IS AN UNATTRIBUTED REFUSAL (2026-09-21, found
          // live: the fold threw, the note went nowhere a reader could see,
          // and the job finished "unsatisfied" with no fold, tighten, contract
          // or verdict line — the ledger looked like the fold never ran). The
          // error is now a ledger line with its given.
          if (onNote) onNote({ move: "fold_error", detail: String(foldErr?.message ?? foldErr).slice(0, 160) });
          try {
            appendLedgerLine(documentLedger, {
              role: "fold", title: "Fold error",
              text: `the fold phase threw and the piece was left as the wide draft: ${String(foldErr?.stack ?? foldErr?.message ?? foldErr).slice(0, 600)}`,
              giver: "eoreader7:fold", basis: "an error is a refusal with a given, never silence",
            }, { dir: ESSAY_LEDGER_DIR });
          } catch {}
        }
      }
      } else {
      // ── CODE: hard logos validation + bounded REC ─────────────────────────
      // The essay organs (Ranke/Murch/citations) are prose; code's own check
      // is the hard pyodide gate — compile + undefined-name + exec + smoke —
      // run UNCONSCIOUSLY (the model never sees the validator, only the
      // findings that failed it). A failing artifact is a typed REC: the mouth
      // re-draws the whole file with the errors in hand, bounded like Ranke.
      const codeText = () => stripCodeFences(documentLines.join("\n\n"), codeLanguage);
      // The app's NAME — a clean name ("called X"/"named X"), else derived from
      // the record schema, never the raw (truncated) task text.
      const cleanTitle = (() => {
        const m = /\b(?:called|named)\s+([A-Z][\w\s&'-]{1,40}?)(?=[.,)]|$)/i.exec(task);
        return m ? m[1].trim() : null;
      })();
      const titleFromSchema = (recordName) => {
        const n = String(recordName || "data").trim();
        const plural = /s$/i.test(n) ? n : `${n}s`;
        return plural.replace(/^\w/, (c) => c.toUpperCase());
      };
      const assembleCode = () => {
        // The sources we SNIPPED from, recorded quietly in the header comment.
        const exemplar = codeExemplar(codeLanguage);
        const srcExtra = isSovereignData ? ["encryption + append-only fold adapted from the author's Matrix E2EE base"] : [];
        const header = codeSourcesHeader({ language: codeLanguage, model, exemplar, extra: srcExtra });
        let body = codeText();
        // DATA-HOLDING APP: the mouth proposed the schema; the machine renders
        // the sovereign substrate (crypto + ledger + fold + snip/cut) around it.
        if (isSovereignData) {
          const schema = extractSovereignSchema(body);
          if (schema) {
            const title = cleanTitle ?? titleFromSchema(schema.recordName);
            const shell = sovereignDataShell({ title, recordName: schema.recordName, fields: schema.fields });
            return header + shell;
          }
        }
        // LINE-LEVEL provenance: before each holon that drew on a retained
        // source, a quiet comment naming it — the per-line record of what we
        // snip from, in the code's own comment syntax, never a banner.
        if (exemplar?.text) {
          try {
            const prov = provenanceFor(body, { sources: [{ text: exemplar.text, name: exemplar.name, license: exemplar.license }], fileName: codeArtifactName(task, codeLanguage) });
            if (prov.length) {
              body = annotateWithSources(body, { provenance: prov, language: codeLanguage });
              if (onNote) onNote({ move: "source_annotations", count: prov.length, sources: [...new Set(prov.map((p) => p.sourceName))] });
            }
          } catch { /* annotation must never break the artifact */ }
        }
        const fallbackTitle = cleanTitle ?? "Data";
        if (codeLanguage === "html") return htmlShell(fallbackTitle, body).replace("<body>", `<body>\n${header.trim()}`);
        return header + body;
      };
      fullText = assembleCode();
      // PRIVACY ARCHON (Brandeis): the defensive face, run over the assembled
      // artifact. Weak signals only — a finding is a nomination, never a
      // verdict (corroboration across independent signals is the caller's
      // job). Surfaced on the result, never used to silently block.
      privacyResult = privacyFindings(fullText, { task });
      if (privacyResult.findings.length && onNote) onNote({ move: "privacy_findings", findings: privacyResult.findings.map((f) => `${f.kind}: ${f.detail}`) });
      // ANTI-COPY ARCHON (Martial): holon-aware — a distinctive holon that is a
      // word-shingle match of the retained source is a copy finding; generic
      // boilerplate is replication-for-efficiency, never flagged.
      const exemplarText = codeExemplar(codeLanguage)?.text ?? null;
      copyResult = copyFindings(fullText, { sources: exemplarText ? [exemplarText] : [], fileName: codeArtifactName(task, codeLanguage) });
      if (copyResult.findings.length && onNote) onNote({ move: "copy_findings", findings: copyResult.findings.map((f) => `${f.level} ${f.name}: ${f.detail}`) });
      // SECURITY ARCHON (Saltzer): the CWE gaps frontier models leave in ordinary
      // code — structural, over the AST/DOM surface. A witness, not a proof.
      securityResult = await securityFindings(fullText, { language: codeLanguage });
      if (securityResult.findings.length && onNote) onNote({ move: "security_findings", findings: securityResult.findings.map((f) => `${f.cwe} ${f.detail}`) });
      // BLINDSPOT ARCHON (Popper): the whole-view properties a single window
      // cannot hold — unfalsifiable tests, timing-unsafe compares, leaks.
      blindspotResult = await blindspotFindings(fullText, { language: codeLanguage });
      if (blindspotResult.findings.length && onNote) onNote({ move: "blindspot_findings", findings: blindspotResult.findings.map((f) => `${f.cwe} ${f.detail}`) });
      const runValidator = async (t) => {
        // HONESTY (ethos): a language with no hard validator is marked
        // `unchecked`, never silently "validated". Only python (compile+exec)
        // and html (HTMLParser) have a real witness; every other language
        // discloses that no validator ran — the machine-that-won't-answer
        // posture, aimed at the artifact's own claim of correctness.
        const v = codeLanguage === "python" ? await validatePython(t) : codeLanguage === "html" ? await validateHtml(t) : await validateLanguage(codeLanguage, t);
        // SPEC-DERIVED EVA: the task's own requirements (counts, named
        // content, named definitions) are findings too — a dropped "prices" or
        // a missing "hours" section is a typed gap the REC loop repairs.
        const spec = specFindings(task, t, codeLanguage);
        if (spec.length) { v.ok = false; v.findings = [...(v.findings ?? []), ...spec]; }
        return v;
      };
      if (runValidator) {
        codeValidation = await runValidator(fullText);
        if (onNote) onNote({ move: "code_validate", ok: codeValidation.ok, findings: (codeValidation.findings ?? []).map((f) => `${f.kind}: ${f.detail}`), smoke: codeValidation.smoke });
        let round = 0;
        while (!codeValidation.ok && round < MAX_REWRITE_ROUNDS && !truncated) {
          const findings = (codeValidation.findings ?? []).slice(0, 6).map((f) => `- [${f.kind}] ${f.detail}`).join("\n");
          if (onThinking) onThinking(`\n### Code check failed (round ${round + 1})\n${findings}\n\n`);
          const fixMsg = codeLanguage === "html"
            ? `We're writing the page content for ${codeArtifactName(task, codeLanguage)}. The complete specification:\n\n"""\n${task}\n"""\n\nThe page content written so far:\n"""\n${codeText().slice(-3000)}\n"""\n\nThe validator found these problems:\n${findings}\n\nRewrite the page CONTENT (the hero, menu, and hours as HTML elements — no <html>, <head>, <body>, <style>, or <script> tags) so it is complete and valid. Emit HTML only, no prose, no markdown fences.`
            : `We're writing ${codeArtifactName(task, codeLanguage)} — a ${codeLanguage} program. The complete specification:\n\n"""\n${task}\n"""\n\nThe file written so far:\n"""\n${fullText.slice(-6000)}\n"""\n\nThe validator found these problems:\n${findings}\n\nRewrite the WHOLE file so it is correct, complete, and composes. Emit ${codeLanguage} source code only — no explanation, no prose, no markdown fences, no commentary.`;
          const fix = await draw(
            [{ role: "system", content: systemContent }, ...keptChat, { role: "user", content: fixMsg }],
            SECTION_MAX_TOKENS,
            { kelsen: Math.max(compositionKelsen, 0.9) },
          );
          if (fix.stopped) { truncated = true; break; }
          const fixText = stripCodeFences(fix.buf, codeLanguage);
          if (!fixText) break;
          documentLines.length = 0;
          documentLines.push(fixText);
          fullText = assembleCode();
          if (documentLedger) appendLedgerLine(documentLedger, { role: "revision", title: `logos: validation round ${round + 1}`, text: fullText, giver: model, supersedes: null, basis: `REC: the validator failed — ${findings.slice(0, 200)}` }, { dir: ESSAY_LEDGER_DIR });
          codeValidation = await runValidator(fullText);
          if (onNote) onNote({ move: "code_validate", round: round + 1, ok: codeValidation.ok, findings: (codeValidation.findings ?? []).map((f) => `${f.kind}: ${f.detail}`) });
          round++;
        }
      }
      if (documentLedger) {
        // The code artifact lands as ONE part line — the whole file, after the
        // validator cleared it — so the projection is the fixed code, never the
        // first-draft sections.
        appendLedgerLine(documentLedger, {
          role: "part", title: codeArtifactName(task, codeLanguage), text: fullText, giver: model,
          basis: `code artifact (${codeLanguage}), ${codeValidation?.ok ? "validated" : "validation failed"}`,
        }, { dir: ESSAY_LEDGER_DIR });
        const def = sections.map((s) => `"${s}"`).join(", ");
        if (onNote) onNote({ move: "document_ledger", docId: documentLedger.docId, parts: documentLines.length, declared: def, kind: "code", language: codeLanguage, validated: codeValidation?.ok ?? null });
      }
      }
    } else {
      // ── SINGLE-ANSWER VOICE: chat AND long, one body. ──────────────────
      // THE LONG FORM, AUTO-ENGAGED (2026-09-17): a chat answer that hits the
      // token cap mid-thought is a long answer the shape system didn't foresee
      // (a research/open ask at CALL_MAX_TOKENS) — cutting it there is a
      // cutoff, not a size. So every single-answer turn draws first, and when
      // the draw ends tokenTruncated (cap, not a natural finish) the SAME
      // uncued continuation the long mode uses keeps going — bounded,
      // validated, disclosed — until the model finishes on its own.
      // Micro-shapes where stopping IS correct (greeting/command/trivial/void)
      // never extend. No meta-word ("continue", outline, plan) ever reaches
      // the mouth: the model's own prose is the last assistant turn, the
      // original ask stands as the person's question.
      //
      // THE PRECISION, THE CODING-LOOP DISCIPLINE: a continuation chunk is
      // NOT trusted because the model wrote it. It is drawn into a scratch
      // buffer, then a MECHANICAL validator (proseContinuationCheck) decides
      // pass/fail — never the model's say-so. A chunk that restarts the
      // answer, repeats its own tail, or adds nothing substantial is REVERTED.
      // Every round's verdict rides the note as a disclosed audit trail.
      // Bounded (LONG_MAX_CHUNKS), disclosed, never silent/unbounded.
      const LONG_CHUNK_TOKENS = Number(process.env.ER7_LONG_CHUNK_TOKENS ?? 700);
      const LONG_MAX_CHUNKS = Number(process.env.ER7_LONG_MAX_CHUNKS ?? 4);
      const LONG_MIN_CHUNK_CHARS = Number(process.env.ER7_LONG_MIN_CHUNK_CHARS ?? 120);
      const longRounds = [];
      // Commits respect the output ceiling even for scratch-drawn chunks: a
      // commit that would overflow lands only its fitting head and types the
      // stop (truncated), so the loop below always terminates.
      const commitChunk = (buf) => {
        if (!buf) return true;
        if (fullText.length >= MAX_OUTPUT_CHARS) { truncated = true; return false; }
        const room = MAX_OUTPUT_CHARS - fullText.length;
        const piece = buf.length > room ? buf.slice(0, room) : buf;
        fullText += piece;
        if (onToken) onToken(piece);
        if (buf.length > room) truncated = true;
        return buf.length <= room;
      };
      const continueUncued = async (chunks) => {
        while (chunks < LONG_MAX_CHUNKS && !truncated) {
          const continuation = [...ollamaMessages, { role: "assistant", content: fullText }, { role: "user", content: task }];
          const next = await draw(continuation, LONG_CHUNK_TOKENS, { kelsen: compositionKelsen, capture: true });
          chunks++;
          const verdict = proseContinuationCheck({ existing: fullText, incoming: next.buf, minChars: LONG_MIN_CHUNK_CHARS, onNote });
          longRounds.push({ round: chunks, chars: next.buf.length, tokenTruncated: next.tokenTruncated ?? false, verdict: verdict.ok ? "kept" : `rejected:${verdict.reason}` });
          if (!verdict.ok) {
            // REVERT: the chunk is discarded, never appended — nothing broken
            // is left between rounds. A rejected continuation is a typed stop.
            if (onNote) onNote({ move: "long_chunk_rejected", round: chunks, reason: verdict.reason, kept: fullText.length });
            break;
          }
          commitChunk(next.buf);
          if (!next.tokenTruncated) break; // the model finished on its own — stop
        }
        return chunks;
      };
      let chunks = 0;
      let shapeForCheck = answerShape.shape;
      if (runMode === "long") {
        const first = await draw(ollamaMessages, LONG_CHUNK_TOKENS, { kelsen: compositionKelsen, capture: true });
        chunks = 1;
        longRounds.push({ round: 1, chars: first.buf.length, tokenTruncated: first.tokenTruncated ?? false });
        // The first draw is captured then committed once it passes, so a bad
        // first chunk is never in the stream either.
        const firstVerdict = proseContinuationCheck({ existing: "", incoming: first.buf, minChars: LONG_MIN_CHUNK_CHARS, onNote });
        if (!firstVerdict.ok) {
          if (onNote) onNote({ move: "long_chunk_rejected", round: 1, reason: firstVerdict.reason });
        } else {
          commitChunk(first.buf);
          chunks = await continueUncued(chunks);
        }
        shapeForCheck = "long";
      } else {
        const r = await draw(ollamaMessages, answerShape.maxTokens ?? CALL_MAX_TOKENS, { kelsen: compositionKelsen });
        if (r?.stopped) truncated = true;
        chunks = 1;
        longRounds.push({ round: 1, chars: r.buf.length, tokenTruncated: r?.tokenTruncated ?? false });
        const extendable = !["greeting", "command", "trivial", "void", "natural", "verdict"].includes(answerShape.shape);
        if (extendable && r?.tokenTruncated && !truncated) {
          if (onNote) onNote({ move: "long_auto_engaged", shape: answerShape.shape, afterChars: fullText.length });
          chunks = await continueUncued(chunks);
        }
      }
      if (runMode === "long" || longRounds.length > 1) {
        if (onNote) onNote({ move: "long_continued", chunks, rounds: longRounds, keptChars: fullText.length, lastTruncated: longRounds.at(-1)?.tokenTruncated ?? false });
      }
      chatSatisfaction = chatVoidCheck(fullText, { shape: shapeForCheck, material: material.map((s) => s.text ?? "").join("\n") });
      if (onNote) onNote({ move: "chat_satisfied", shape: shapeForCheck, ok: chatSatisfaction.ok, failures: chatSatisfaction.failures ?? [], strain: chatSatisfaction.strain ?? 0 });
    }
  });
  } // end the spec-refusal else

  // 7. Post-process before it is printed: extract code blocks, pyodide-lint
  // the Python, and reorder top-level entities so each depends only on things
  // defined above it. The unconscious system lints, orders, and pins. The
  // model never sees the fixup transcript — only the repaired answer.
  // Latency guard: warmed at boot, timeboxed per turn; if the budget is
  // exceeded the original text is returned untouched — the unconscious
  let post = null;
  let text = fullText;
  if (fullText.trim()) {
    post = isCode
      ? await postprocessCode(fullText, { language: codeLanguage, onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS })
      : await postprocessAnswer(fullText, { onNote, timeboxMs: POSTPROCESS_TIMEOUT_MS });
    if (post && typeof post.text === "string" && post.text.trim() && post.text !== fullText) {
      text = post.text;
    }
  }

  // 7.4 THE FACT GATE (Heimdall/Ranke + Wilson). A checkable open-now fact that
  // reached this point has either been grounded first (the preflight above put a
  // search in the prompt) or it has not. The decision is mechanical and lives HERE,
  // in the one engine, so every surface (TUI, API, the fold's thin client) gets
  // the same answer. The ENVIRONMENT is consulted first: the stigmergic route over
  // kinds and links. A sentence that commits to a value the kind+link contradicts
  // is STRUCK and replaced mechanically (assembled from the kind and the link —
  // never model-phrased); a grounded draft ships with the dated "checked" note;
  // an ungrounded open-now claim ships with one plain, dated sentence APPENDED.
  let factGateOut = null;
  let factKind = null, factLink = null, factRoute = null;
  if (!isCode && text.trim()) {
    try {
      const ctx = [discourse, ...(chatHistory ?? []).map((m) => m?.content ?? "")].filter(Boolean).join("\n");
      // THE STIGMERGIC ROUTE FIRST: the environment's own kinds and links — a
      // question already resolved by a previous turn (any session) is grounded
      // by the route without spending a web door.
      const store = currentFactsStore();
      const resolved = store.resolve(task);
      factRoute = resolved.route ?? null;
      factKind = resolved.kind ?? null;
      factLink = resolved.link ?? null;
      // A DATED ground for "who holds this office?": the search snippet is a list article's lead paragraph and never
      // names the current holder, so the role is looked up in a record that carries start/end dates (current-holder.js),
      // aimed at the jurisdiction the answer itself chose. Same egress consent as the preflight above. A found record
      // is ADOPTED into the environment (a kind of things that have terms, and its dated link) so the route that
      // resolved it is faster next time — the colony keeps what its scouts found.
      if ((webConsent || WEB_SEARCH_ON) && !factGate.ground.some((g) => g?.kind === "current-holder")) {
        const hq = holderQueryFor({ ask: task, answer: text });
        if (hq) {
          const h = await currentHolder(hq);
          if (onNote) onNote({ move: "current_holder", role: hq.role, jurisdiction: hq.jurisdiction, found: h.found, why: h.why ?? null });
          if (h.found) {
            factGate.ground = [...factGate.ground, { kind: "current-holder", text: h.text, ref: h.ref }];
            factGate.searched = true;
            try {
              store.adoptDatedRecord({ head: hq.role, text: h.text, ref: h.ref });
              // THE FRESH DOOR OUTRANKS THE ENVIRONMENT: the record's own
              // bytes overwrite a stale link (adoption above), and the
              // resolution is re-read so the verdict below sees the door's
              // holder, not the stale one.
              const fresh = store.resolve(task);
              factRoute = fresh.route ?? factRoute;
              factKind = fresh.kind ?? factKind;
              factLink = fresh.link ?? factLink;
            } catch { /* adoption never breaks the turn */ }
          }
        }
      }
      if (factKind && factLink && !factGate.ground.some((g) => g?.kind === "current-holder")) {
        factGate.ground = [...factGate.ground, { kind: "current-holder", text: `${factLink.holder} holds ${factKind.label}${factLink.since ? `, since ${factLink.since}` : ""}${factLink.until ? `, until ${factLink.until}` : ""}.`, ref: factLink.ref }];
        factGate.searched = true;
      }
      const verdictOut = applyVerdictGate({ ask: task, answer: text, ground: factGate.ground, kind: factKind, link: factLink, route: factRoute, now: new Date(), lens: lensForAsk(task) });
      if (verdictOut.gated) {
        text = verdictOut.text;
        if (onToken) onToken(`\n\n${verdictOut.replacement}`);
        // THE ALARM IS NOT THE STRIKE (2026-09-19, falsified live): a
        // contradicted draft disagrees with the LINK — the link is the
        // ground and is not demoted for being right. A link becomes suspect
        // only when a FRESH door contradicts it; the dated-record adoption
        // above already overwrites a stale link with the door's own bytes,
        // so a veto is never issued from this site.
        if (onNote) onNote({ move: "fact_gate", verdict: verdictOut.verdict, count: verdictOut.count, searched: factGate.searched, route: factRoute, kind: factKind?.label ?? null });
      } else {
        factGateOut = decideGate({ ask: task, answer: text, ground: factGate.ground, context: ctx, searched: factGate.searched, groundSource: factKind && factLink ? "the refreshed facts check" : "a web search", lens: lensForAsk(task) });
        if (factGateOut.open && factGateOut.append) {
          const tail = `\n\n${factGateOut.append}`;
          text += tail;
          if (onToken) onToken(tail);
        }
        if (onNote && factGateOut.open) onNote({ move: "fact_gate", searched: factGate.searched, grounded: factGateOut.grounded, jurisdiction: factGateOut.jurisdiction?.assumed ?? null, basis: factGateOut.basis });
      }
    } catch { /* the gate is an addition; it never breaks an answer */ }
  }

  // 7.5 THE PER-SENTENCE READING SURFACE (ONE-ENGINE-PLAN port #2/#3). The
  // fold's reader looks at per-sentence VERDICTS and ADDRESSES, never claim
  // counts; the engine previously returned only relationEdges/referentBindings
  // tallies. Here the answer is read with the engine's OWN relation reader
  // (native/the-fold/reader-bundle.js — the same organs app.js assembles),
  // each sentence is placed on its ground-ladder rung (bound/witnessed/
  // recorded/derived/named/self), and the AnswerRecord (claims, restsOn,
  // groundOf per sentence) is built — so any client (the-fold's browser chat,
  // the TUI, an OpenAI-shaped caller) receives the same marks the fold draws,
  // without running its own engine. Mechanical rungs cost no model call; the
  // WITNESS rung spends model asks only under a caller-declared budget (P9),
  // and without one the rows are typed `skipped` and the ladder says so.
  const readingSurface = (() => {
    try {
      // CODE turns write source code, not prose — reading a program's bytes
      // as sentences would manufacture marks that lie (ONE-ENGINE-PLAN: "get
      // it wrong and marks lie"). The surface is for the reader-facing prose
      // registers only.
      if (!text?.trim() || isCode) return null;
      const passages = passagesFromSegments(surfacedSegments);
      const claims = passages.length ? readAnswerClaims(text, passages) : [];
      const notes = notesFromEdges(rawEntries ?? []);
      const index = sessionReferentIndex(session, onNote);
      // THE FORM-TIER, WIRED (the critique — schema/image/fold): the surfaced
      // material's OWN claim-forms are earned mechanically (output-claims.js:
      // the derived hypothetical + the sequence register), each with its byte
      // span, and handed to the ladder so every bound sentence can disclose
      // what the READING supplied over the BYTES it certified. A language with
      // no registered image set returns a typed gap — never a silent English
      // match, and never a silent fabrication of a rule.
      const claimForms = [];
      for (const p of passages) {
        try {
          const r = claimKindsOf(p.text ?? "", {
            splitSentences: (t) => String(t ?? "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean),
            source: p.ref,
          });
          if (r?.gap) continue;
          claimForms.push(...(r.forms ?? []), ...(r.sequence ?? []));
        } catch { /* a passage that cannot be read for forms never invents a rule */ }
      }
      const surface = sentenceSurface(text, {
        claims,
        notes,
        passages,
        resolveName: index?.resolve ? (n) => index.resolve(n) : null,
        model,
        splitSentences: (t) => String(t ?? "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean),
        forms: claimForms,
      });
      const record = answerRecord({
        question: task,
        answer: text,
        model,
        frame: "eoreader7-proxy",
        recipe: "proxy-runner@1",
        sections: [{ passages, relations: { claims } }],
        unsupported: claims.filter((c) => c.verdict === "contradicted" || c.verdict === "unbound").map((c) => c.sentence),
        unbacked: claims.filter((c) => c.verdict === "beyond-reach" || c.verdict === "unheard").map((c) => c.sentence),
        sources: [...new Set(passages.map((p) => String(p.ref ?? "").split("#")[0]).filter(Boolean))].map((name) => ({ name })),
        constitution: { prompt: "native/organs/ethos.js::constitution", sha256: charter?.sha256 ?? null },
        voids: [],
        witness: [],
      });
      return { surface, record, claims, notes, forms: claimForms };
    } catch (err) {
      if (onNote) onNote({ move: "reading_surface_error", error: err.message });
      return null;
    }
  })();

  // ── the thinking affordance: what the unconscious did, in plain English ──
  // Disclosed only when the client asks (discloseThinking). The grounding
  // summary — what was read, what surfaced, what the reading established —
  // shown as readable lines, never apparatus, never addresses.
  const thinkingLines = [];
  if (workspaceStats.files) thinkingLines.push(`Read ${workspaceStats.files} file(s), ${workspaceStats.chars.toLocaleString()} chars.`);
  if (hasWeb) thinkingLines.push(`Researched the web: ${webResult.pages} page(s), ${webResult.chars.toLocaleString()} chars.`);
  if (session.shadow?.length) {
    const res = session.shadow.map((s) => `${s.resolution ?? "?"}:${s.chars}${s.reading?.referents?.length ? ` (${s.reading.referents.length} refs)` : ""}`).join(", ");
    thinkingLines.push(`Shadow (Mneme, shaped by the POS prior + born anchoring): ${session.shadow.length} site(s) — ${res}`);
  }
  if (surfacedSegments.length) thinkingLines.push(`Found ${surfacedSegments.length} passage(s) addressing the question.`);
  if (surfVoidInfo) thinkingLines.push(`Nothing here answered the question (${surfVoidInfo.gap}).`);
  if (stats.relationEdges) thinkingLines.push(`The reading holds ${stats.relationEdges} relation edge(s), ${stats.referentBindings} referent binding(s).`);
  if (resolutions?.active?.length) thinkingLines.push(`Active referents: ${resolutions.active.map((a) => a?.id ?? a).join(", ")}.`);
  // KELSEN, DISCLOSED: the conflicts the reading held and how the precedence
  // order resolved them — the answer's standing, shown in plain English. This
  // is the machine-that-won't-answer's teaching on every surface, not just the
  // projection: the reader sees WHY a claim won or lost, never a silent pick.
  if (resultKelsen?.resolutions?.length) {
    const k = resultKelsen;
    const lines = [`Conflicting claims resolved by the norm hierarchy (Kelsen — ${precedenceOrderPhrase()}):`];
    for (const r of k.resolutions.slice(0, 5)) lines.push(`- ${r.subject}: “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} — ${r.why ?? r.reason}`);
    if (k.resolutions.length > 5) lines.push(`… ${k.resolutions.length - 5} more.`);
    thinkingLines.push(lines.join("\n"));
  }
  const thinkingBlock = thinkingLines.length ? thinkingLines.join("\n") : null;

  // ── the durable theory of mind, updated and persisted at the turn's end.
  // Type-level only: the person's assertion and the standing this turn's
  // record earned for it. The conversation's SPECIFICS stay in the session.
  // A surf VOID only marks an assertion "contested" when there was real
  // non-conversation material the surf genuinely could not address. When the
  // only material in the corpus is the conversation itself (no workspace, no
  // web — the conversation is excluded from the surf by design), a void
  // means nothing CHALLENGED the person's own statement, and the honest
  // standing is "unexamined", never "contested — not settled".
  // THE GROUND IS WHAT IS NOT THE CONVERSATION: workspace files, admitted
  // web material, or any corpus document outside the chat: prefix. Standing
  // and satisfaction both depend on it — the conversation never counts as
  // material that can fill a void.
  const hasNonConversationGround = workspaceStats.files > 0
    || (session.webSources?.size ?? 0) > 0
    || (session.corpus && [...session.corpus.documents.keys()].some((k) => !String(k).startsWith("chat:")));
  if (speakerModel && userId) {
    const updated = updateSpeakerModel(speakerModel, {
      task,
      classification: (() => { try { return classifySpeech(task); } catch { return "question"; } })(),
      surfVoid: surfVoid && hasNonConversationGround,
      surfaced: surfacedSegments.length,
    });
    saveSpeakerModel(userId, updated);
  }

  // THE MENO CHECK, COMPUTED ONCE: the void was DEF'd when the composition
  // started; here we ask whether it is FILLED. We know we've learned when the
  // void we declared — across its nine operators — is filled by sections that
  // pass its admission test. Strain is the REC pressure the void demanded.
  const satisfaction = documentLedger
    ? (isCode
      // CODE: the void is filled when every part wrote source code and the
      // assembled file passes the hard validator (compile + exec + smoke).
      ? codeSatisfaction({ documentLines, sections: plannedSectionsOut, validation: codeValidation })
      : (hasNonConversationGround
      ? (sessionReferentIndex(session) && rawEntries?.length
        // THE HONEST GRADE (2026-09-13): the essay is scored on the record's
        // claims it carried WITHOUT being handed them — the echo of the
        // prompt never scores. `unprompted` excludes every proposition the
        // mouth was told; the total is reported beside it so the gap between
        // "echoed" and "carried" is visible, never hidden.
        ? (() => {
            const allProps = notesFromEdges(rawEntries);
            const unprompted = allProps.filter((p) => !handedKeys.has(keyOf(p)));
            const totalGrade = lavarGradeEssay(documentLines, plannedSectionsOut, { materialPropositions: allProps, index: sessionReferentIndex(session) });
            const unpromptedGrade = lavarGradeEssay(documentLines, plannedSectionsOut, { materialPropositions: unprompted, index: sessionReferentIndex(session) });
            return { ...unpromptedGrade, total: totalGrade, handed: handedKeys.size, ofTotal: allProps.length, basis: `${unpromptedGrade.basis} — total (incl. prompted echo) ${totalGrade.recall}, ${handedKeys.size} of ${allProps.length} propositions were handed to the mouth and cannot score unprompted` };
          })()
        : sessionReferentIndex(session)
          ? holographicSatisfaction(documentLines, plannedSectionsOut, { index: sessionReferentIndex(session) })
          : fillCheck(voidDeclaration, documentLines, plannedSectionsOut, { material: groundingText() }))
      // NO GROUND IS A VERDICT, NEVER A VACUOUS PASS. With nothing but the
      // conversation in the corpus, every part fails the void's own EVA
      // admission ("grounded in the shadow's material") by definition — and
      // grading the essay against chat-derived propositions would grade it
      // against the request itself. Measured 2026-09-13: an ungrounded run
      // reported "unsatisfied" only because the essay failed to restate the
      // user's one-line ask — the right verdict, earned for the wrong reason.
      : {
          ok: false, filled: 0, of: plannedSectionsOut.length,
          failures: plannedSectionsOut.map((s, i) => ({ index: i, theme: s, kind: "no_ground", detail: "no material ground was admitted — the void cannot be filled by the conversation alone, and every part fails EVA's admission by definition" })),
          totalStrain: plannedSectionsOut.length,
          basis: "satisfaction grades only against non-conversation material; none was admitted",
        }))
    : chatSatisfaction;

  // THE WHEEL CLOSES (D/E/R): the read was the plan's EVA, the verdict is
  // the satisfaction DEF's EVA, and the fold lands what the run PROVED —
  // superseding the impression, never editing it. Every REC is the next
  // stage's ground; the ledger is the run, in order.
  if (runMode === "projection") {
    const readSurprise = session.lastPageSurprise?.salient ?? 0;
    wheel.turn("read",
      "each phase's sub-satisfaction: what would satisfy THIS phase, from THIS material",
      { propositions: stats.relationEdges ?? 0, referents: stats.referentBindings ?? 0, surprise: readSurprise },
      { relations: stats.relationEdges ?? 0, referents: stats.referentBindings ?? 0, surprise: readSurprise, ground: hasGrounding },
      { evaBasis: "the reader's own surprise on the material is the EVA — the felt dimension of the read", operator: "CON", grain: "Link", face: "Gore" });
    wheel.turn("write",
      "the parts compose into one carried ground — the artifact itself, Wolfe's work",
      { parts: documentLines.length, chars: fullText.length, grounded: hasGrounding, seed: storySeed?.seed ?? null, cast: storySeed?.cast?.map((c) => c.name) ?? [] },
      { parts: documentLines.length, chars: fullText.length, voice: discoveredVoice ? "discovered" : "register", seed: storySeed?.seed ?? null, cast: storySeed?.cast ?? [] },
      { evaBasis: "the write is the SYNthesis of the read's ground into one piece — measured against the declare; every cast member keeps its provenance", operator: "SYN", grain: "Field", face: "Wolfe" });
    const sat = satisfaction?.ok ?? false;
    // THE FELT IS THREADED INTO THE VERDICT: the read's release/surprise is
    // measured against the declare's feltTarget (Bharata's rasa, closed).
    const feltTarget = discoveredFelt?.releases ?? null;
    // RANKE'S PARSE (anti-kitsch): the citation ledger already splits each
    // sentence into QUOTED (verbatim/company — reproduced WITH a citation) and
    // UNSUPPORTED (the model's own — cited to the model as giver). Reproducing
    // for quotation is legitimate; reproduction WITHOUT a citation would be
    // copy. `verbatim` vs `unsupported` IS the parse — no hand-set n-gram.
    // (The one hand-set number left — citationLedger's term floor of 3 — is
    // the DMD-to-derive boundary, per born-dmd-rosetta: the cut should come
    // out of DMD+Born, not a constant.)
    const ranke = citesResult
      ? { verbatim: citesResult.verbatim ?? 0, company: citesResult.company ?? 0, unsupported: citesResult.unsupported ?? 0, of: citesResult.of ?? 0, basis: citesResult.basis }
      : null;
    // runDMCA — the seam between Alexander and Ranke: reproduced-with-citation
    // (quoted) vs reproduced-without (copy). The boundary is named, not yet
    // DMD-derived.
    const dmca = citesResult && citationSources.size
      ? runDMCA({ text: documentLines.join("\n\n"), sources: citationSources, citations: citesResult.citations })
      : null;
    categorized = dmca && citesResult
      ? categorizeCreativity({ text: documentLines.join("\n\n"), sources: citationSources, citations: citesResult.citations })
      : null;
    // THE MEANING CHASE (the user's paraphrase rule): when the verbatim
    // instrument is silent but the shadow chase named candidate spans, the
    // RECORD equates them against its OWN claim rows — the fold's
    // {label, end2, end1} propositions through the referent index — never a
    // model, and always FOR the run's whom (the EVA lens of this fold).
    // An equated span is grounded-by-meaning, moved to Derive; a span no
    // row resolves is NAMED un-equatable FOR that whom, disclosed.
    let paraphraseChased = null;
    if (categorized?.paraphraseCandidates > 0) {
      try {
        const chased = chaseParaphrase({
          text: documentLines.join("\n\n"),
          sources: citationSources,
          citations: citesResult.citations,
          claims: notesFromEdges(rawEntries ?? []),
          index: sessionReferentIndex(session, onNote),
          whom: { face: "LaVar", ethos: "the EVA lens of this fold" },
        });
        paraphraseChased = chased.chase ?? null;
        categorized = chased.categorized ?? categorized;
      } catch (err) {
        paraphraseChased = { candidates: categorized.paraphraseCandidates, equated: 0, unEquated: 0, rows: 0, indexResolved: false, basis: `the record equate threw: ${err?.message ?? err}` };
      }
    }
    if (categorized && onNote) onNote({ move: "creativity", cell: categorized.cell.name, archon: categorized.cell.archon, derivation: categorized.derivation, ratio: categorized.derivationRatio, window: categorized.derivationWindow, quoted: categorized.reproduce.quoted, copied: categorized.reproduce.copied, derived: categorized.derive, invented: categorized.invent, disagreement: categorized.disagreement, paraphraseUnmeasured: categorized.paraphraseUnmeasured, paraphraseCandidates: categorized.paraphraseCandidates ?? 0, paraphraseEquated: categorized.paraphraseEquated ?? 0 });
    wheel.turn("verdict",
      documentLedger ? "satisfaction = climbing arc, felt releases, grounded claims — DEF'd before the plan" : "chat satisfaction",
      { ok: sat, filled: satisfaction?.filled ?? 0, of: satisfaction?.of ?? 0, failures: satisfaction?.failures?.length ?? 0, strain: satisfaction?.totalStrain ?? 0, feltTarget, feltRead: readSurprise, feltGap: feltTarget == null ? null : (feltTarget - readSurprise), ranke: ranke?.verbatim ?? null, unsupported: ranke?.unsupported ?? null, dmca: dmca ? { ok: dmca.ok, quoted: dmca.quoted, copied: dmca.copied } : null, categorized: categorized ? { derivation: categorized.derivation, field: categorized.field, echo: categorized.echo, cell: categorized.cell, reproduce: categorized.reproduce, derive: categorized.derive, invent: categorized.invent, paraphraseCandidates: categorized.paraphraseCandidates ?? 0, paraphraseEquated: categorized.paraphraseEquated ?? 0, paraphraseChased: paraphraseChased ?? null } : null },
      { ...satisfaction, ranke, dmca, categorized, paraphraseChased },
      { evaBasis: "the artifact is measured against the declare — a real difference, never a softmax", operator: "EVA", grain: "Lens", face: "LaVar" });
    wheel.turn("fold",
      "the superseding satisfaction — corrected against what this run's material actually allowed",
      { ok: sat, noGround: !hasGrounding, felt: readSurprise },
      { ok: sat, genre: prelimShape.register?.field?.field ?? null, ground: hasGrounding, sidecar: "append-only: this run's shape+felt fold back into the genre's impression" },
      { evaBasis: "a failed criterion supersedes the DEF by appending, never editing — the ledger's law", operator: "REC", grain: "Atmosphere", face: "Murch" });
  }

  // THE CHARTER GATE — governs this generation against the UDHR, on EVERY
  // turn, reachable (P88: a guard that is never reached passes forever).
  // A conflict refuses the answer with the named act/right on the record;
  // descriptive voice (atrocity discussion) passes by construction. The gate
  // cannot be turned off: it is imported, always armed with a charter, and
  // its verdict is part of every result.
  // The cache is trusted only after it passes isValidCharter — anything that
  // sets globalThis.__er7Charter to an empty or gutted charter (a giver with
  // no prohibitions/protections) would otherwise silently disarm the gate for
  // the rest of the process. An invalid cache is never repaired by re-reading
   // the real corpus (that path already ran and produced whatever is sitting
  // there); it is replaced with defaultCharter(), which is always valid by
  // construction, and the replacement is logged (never thrown — the gate must
  // not crash a turn). `charter` is the hoisted one (armed at the turn's top).
  // ── PII (Goffman) + INJECTION (Ulysses) — the two safeguards on ingestion ──
  // PII: the shapes on the artifact AND the ingested material (redacted).
  // Injection: the material is evidence, never instruction — the attempt is
  // disclosed, never obeyed. Both run for EVERY turn (reading, not just code).
  const ingestedMaterial = [
    ...[...(session.webSources?.values?.() ?? [])],
    ...(surfacedSegments ?? []).map((s) => s.text ?? ""),
  ].join("\n\n").slice(0, 200000);
  try {
    const outPii = piiFindings(text, { where: "output" });
    const admitted = session.pii ?? [];
    piiResult = { findings: [...outPii.findings, ...admitted], basis: outPii.basis + (admitted.length ? `; ${admitted.length} finding(s) at admission (before the fold)` : "") };
    if (piiResult.findings.length && onNote) onNote({ move: "pii_findings", counts: piiResult.findings.reduce((a, f) => { a[f.category] = (a[f.category] ?? 0) + 1; return a; }, {}) });
  } catch {}
  try {
    const injF = [
      ...injectionFindings(String(task ?? ""), { where: "task" }).findings,
      ...(ingestedMaterial.trim() ? injectionFindings(ingestedMaterial, { where: "material" }).findings : []),
    ];
    injectionResult = { findings: injF, basis: "injection archon (Ulysses) — material is EVIDENCE, never INSTRUCTION" };
    if (injF.length && onNote) onNote({ move: "injection_findings", findings: injF.map((f) => `${f.strength} ${f.injection}`) });
  } catch {}

  // THE HOLOGRAPH ENFORCEMENT (output-holograph.js + askshape.js): every
  // generation is typed sentence-by-sentence by the SAME fold/morphology the
  // record uses — MATERIAL (carries a ground fact's ends to its byte address)
  // vs SELF:MODEL (the mouth's own prose, marked, never laundered into the
  // record). The block rule is structural, never a wordlist: a SELF:MODEL
  // sentence whose intent composition (askshape arms) licenses foreclosure
  // (the existence face: voids + acquire/atScale) or collapse (the
  // interpretation face: capability + other) with no charter-family GIVEN
  // license is withheld and replaced with the socratic decline. MATERIAL
  // descriptive sentences about atrocity always pass (description never
  // governs). The family verdict below is kept as a fallback until the
  // holograph is proven, and its verdict still rides every result.
  let holographOut = null;
  let holographWithheld = [];
  try {
    if (text?.trim() && !isCode) {
      const holographGroundNotes = readingSurface?.notes ?? notesFromEdges(rawEntries ?? []);
      const holographGround = groundFacts(holographGroundNotes, { source: segmentSourceOf(surfacedSegments?.[0]) ?? "material" });
      holographOut = holographType({ prose: text, ground: holographGround, splitSentences: engineSplitSentences, sameAct: holographSameAct });
      if (onNote) onNote({ move: "holograph_typing", basis: holographSameActBasis, material: holographOut.verdict.material, model: holographOut.verdict.model, total: holographOut.verdict.total, line: holographOut.verdict.line, sentences: holographOut.tiers.holograph });
      for (const s of holographOut.prose) {
        if (s.ground === "material") continue; // description never governs
        let shape = null;
        try { shape = askShape(s.text, { charter }); } catch { continue; }
        if (!shape?.harmful) continue;
        // No charter GIVEN license: the advocate's inverse under ANY family
        // member (not just the UDHR) is a license, whatever language carried it.
        let licensed = !!shape.affirms;
        if (!licensed) {
          for (const c of charterFamily ?? []) {
            if (c === charter) continue;
            try { if (askShape(s.text, { charter: c }).affirms) { licensed = true; break; } } catch {}
          }
        }
        if (licensed) continue;
        const foreclosure = !!shape.forecloses;
        const collapse = (shape.collapses ?? 0) >= 1 && !!shape.capability && !!shape.other;
        // THE MAYEROFF TERM (kernel/mayeroff.js — dismiss-and-destroy): an
        // other-directed fold-collapse needs no instrument to be the same
        // null. Turn-level suppression: an UNDERSTAND ask reinstates the
        // interpretation face, and descriptive voice never governs — under
        // either, a dismiss-only sentence is read, not performed.
        // Foreclosure and instrument-collapse withhold regardless (there the
        // telling IS the capacity). Anything this term alone withholds is
        // unrealizable (no state under self.js), never refused.
        const turnReinstates = !!clearance?.shape?.understand || (!!clearance?.voice?.descriptive && !clearance?.voice?.prescriptive);
        let mayeroffReason = null;
        try {
          const mj = judgeAskShape(shape);
          if (mj && !mj.realizable) mayeroffReason = mj.reason;
        } catch { mayeroffReason = null; }
        const dismissOnly = !foreclosure && !collapse && !!mayeroffReason && !turnReinstates;
        if (foreclosure || collapse || dismissOnly) holographWithheld.push({ sentence: s.text, shape: shape.shape, witnesses: shape.witnesses ?? [], ...(mayeroffReason ? { mayeroff: mayeroffReason } : {}), ...(dismissOnly ? { unrealizable: true } : {}) });
      }
      if (holographWithheld.length) {
        text = speakDecline({ shape: askShape(holographWithheld.map((w) => w.sentence).join(" "), { charter }) }, interlocutor);
        if (onNote) onNote({ move: "holograph_withheld", count: holographWithheld.length, sentences: holographWithheld.map((w) => w.sentence) });
        // THE UNREALIZABLE LEDGER: sentences withheld solely by the mayeroff
        // term enter the shadow trail distinctly — counted, never weighted,
        // never merged with norm_conflict (moral-shadow.js). Foreclosure and
        // instrument-collapse withholds keep their existing standing (their
        // license was declined at the gate); only the no-state-to-reach kind
        // writes here.
        const unrealizableOnly = holographWithheld.filter((w) => w.unrealizable);
        if (unrealizableOnly.length) {
          try { recordShadow(personId, { shadow: "unrealizable", reason: `output-side mayeroff null: ${unrealizableOnly.length} sentence(s) dismiss-and-destroy with no state under self.js — ${(unrealizableOnly[0].witnesses ?? []).slice(0, 2).join("; ")}`, task: String(task ?? "").slice(0, 240) }); } catch {}
          if (onNote) onNote({ move: "mayeroff_output_unrealizable", count: unrealizableOnly.length });
        }
      }
    }
  } catch (err) {
    if (onNote) onNote({ move: "holograph_typing_error", error: err.message });
  }

  // THE FAMILY GATE (Grotius), KEPT AS FALLBACK until the holograph above is
  // proven: the UDHR charter the turn is armed with, plus the Earth
  // instruments — a resolved hierarchy, not one voice. The verdict is the
  // union; each conflict names its charter AND article — the REASON, never the
  // bare verdict (Kelsen's lex superior: show which instrument governs, and
  // why). Descriptive voice (atrocity discussion) passes by construction, and
  // the families' GIVEN affordances already license the composition above.
  const charterVerdictOut = familyVerdict(charterFamily, text);
  // Fail-closed: an unknown verdict (GFP adapter missing — prescriptive text
  // the gate cannot govern) is refused, never a silent pass.
  if (charterVerdictOut.verdict === "unknown-gfp-missing") {
    text = "That isn't something this reading can help with.";
  } else if (charterVerdictOut.verdict === "conflict") {
    // The conflict is already recorded in the charter annotation below (line 4648)
    // so the surface can render it as an affordance. The apparatus marker must
    // never become the answer text — that is a Gary no-apparatus violation.
    // Only a genuine harm conflict (torture/slavery/servitude) replaces the text,
    // and even then with a plain neutral refusal, not an apparatus string.
    const GENUINE_HARM = /torture|slavery|servitude/i;
    const isGenuine = charterVerdictOut.conflicts.some(
      (c) => GENUINE_HARM.test(c.act ?? "") || GENUINE_HARM.test(c.right ?? "")
    );
    if (isGenuine) {
      text = "That isn't something this reading can help with.";
    }
    // False-positive conflicts pass through; the charter field carries the record.
  }

  // ── GROUNDED WISDOM (2026-09-15): the credited archons whose domain this
  // turn touched. The compendium is the latent mind ethos thinks with; a
  // response that draws on an archon's work always credits it. This rides the
  // result beside the constitution: the archons who actually RAN (the code
  // audit organs, the ground itself) plus the archons whose domain the
  // question matched — each with the verbatim credit line from the
  // compendium. The surface renders these as the affordance; the answer text
  // never borrows an archon's authority without its name.
  const groundedWisdom = (() => {
    const matched = matchArchons(String(task ?? ""));
    const ran = [
      charter ? { handle: "solon", why: "the ground — ethos comes before logos; the constitution governed this turn" } : null,
      privacyResult ? { handle: "brandeis", why: "the data-sovereignty archon ran on this turn's artifact" } : null,
      copyResult ? { handle: "martial", why: "the anti-copy archon ran on this turn's artifact" } : null,
      securityResult ? { handle: "saltzer", why: "the security archon ran on this turn's artifact" } : null,
      blindspotResult ? { handle: "popper", why: "the blind-spot archon ran on this turn's artifact" } : null,
      piiResult?.findings?.length ? { handle: "goffman", why: "the PII archon ran on this turn's output and material" } : null,
      injectionResult?.findings?.length ? { handle: "ulysses", why: "the injection archon disclosed an attempt this turn" } : null,
      categorized && (categorized.paraphraseCandidates > 0 || categorized.paraphraseUnmeasured) ? { handle: "yadayadayada", why: "the paraphrase archon ran this turn's meaning chase — the shadow named candidates, the record equated or refused, FOR a named whom" } : null,
    ].filter(Boolean);
    const byHandle = new Map();
    for (const m of matched) byHandle.set(m.handle, { handle: m.handle, why: "the question touched this archon's domain", relevance: m.relevance });
    for (const r of ran) if (!byHandle.has(r.handle)) byHandle.set(r.handle, { handle: r.handle, why: r.why, relevance: 0 });
    return [...byHandle.values()]
      .map((x) => {
        const entry = archonOf(x.handle);
        return entry ? { handle: entry.handle, name: entry.name, organ: entry.organ, role: entry.role, pdStatus: entry.pdStatus, work: entry.work, source: entry.source, credit: entry.credit, why: x.why, relevance: x.relevance ?? 0 } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.relevance - a.relevance);
  })();

  if (text && text.trim() && session.corpus) {
    const _replyLine = text.trim().split(/\r?\n/)[0].slice(0, 500);
    admitChunked(session.corpus, { text: `[assistant]: ${_replyLine}`, sourceId: `chat:${sessionId}:turn-${session.turnCount - 1}:response` });
  }

  return {
    text,
    // giver + sha256 + source ride the result so a consumer can always tell
    // which charter governed this turn — the full corpus or the fallback
    // excerpt — without re-deriving it from process state. `family` and
    // `license` carry the whole resolved hierarchy and the given affordances
    // the composition ran under (the license, not just the gate).
    charter: { verdict: charterVerdictOut.verdict, prescriptive: charterVerdictOut.prescriptive, descriptive: charterVerdictOut.descriptive, conflicts: charterVerdictOut.conflicts.map((c) => ({ kind: c.kind, act: c.act ?? null, right: c.right ?? null, charter: c.charter ?? null, articles: c.articles ?? [] })), giver: charter.giver, sha256: charter.sha256, source: charterSource, family: (charterFamily ?? []).map((c) => ({ schema: c.schema, giver: c.giver, rank: c.rank ?? null })), license: familyAffordances(charterFamily).map((r) => ({ left: r.left, right: r.right, giver: r.giver })) },
    // THE HOLOGRAPH TYPING — the per-sentence MATERIAL vs SELF:MODEL typing
    // that governed this generation (the enforcement above), with the
    // withheld sentences and their judged shapes. null when the text was
    // empty or a code turn (no prose to type) — a typed absence, never a guess.
    holograph: holographOut
      ? {
          schema: holographOut.schema,
          verdict: holographOut.verdict,
          basis: holographSameActBasis,
          sentences: holographOut.tiers.holograph,
          withheld: holographWithheld.map((w) => ({ sentence: w.sentence, shape: w.shape, witnesses: w.witnesses, mayeroff: w.mayeroff ?? null, unrealizable: !!w.unrealizable })),
        }
      : null,
    // GROUNDED WISDOM — the credited archons whose domain this turn touched
    // (the ones that ran + the ones the question matched). Every entry carries
    // its verbatim credit line from the compendium; a response that draws on
    // an archon's work always credits it. The surface renders these as the
    // affordance.
    groundedWisdom,
    privacy: privacyResult ? { archon: "Brandeis", findings: privacyResult.findings, basis: privacyResult.basis } : null,
    copy: copyResult ? { archon: "Martial", findings: copyResult.findings, checked: copyResult.checked, basis: copyResult.basis } : null,
    security: securityResult ? { archon: "Saltzer", findings: securityResult.findings, basis: securityResult.basis } : null,
    blindspot: blindspotResult ? { archon: "Popper", findings: blindspotResult.findings, basis: blindspotResult.basis } : null,
    pii: piiResult ? { archon: "Goffman", findings: piiResult.findings, basis: piiResult.basis } : null,
    injection: injectionResult ? { archon: "Ulysses", findings: injectionResult.findings, basis: injectionResult.basis } : null,
    // THE SHADOW TRAIL (Bourdieu) — the cross-session accumulation: this
    // person's norm-standing as a RATE over their acts, never a verdict.
    shadow: assessShadow(personId),
    // WHO IS AT THE DOOR (Buber) — the recognized kind of interlocutor, with
    // its basis and confidence. A disclosed belief, never a verdict: it selects
    // how the reader meets the other, not whether it is honest with them.
    interlocutor: { kind: interlocutor.kind, confidence: interlocutor.confidence, basis: interlocutor.basis, witnesses: interlocutor.witnesses },
    relationEdges: stats.relationEdges,
    referentBindings: stats.referentBindings,
    hyperlexiconCandidates: Object.keys(hyperlexicon.composition ?? {}).length,
    turn: session.turnCount,
    workspace: workspaceStats,
    attachments: attachmentStats,
    // THE PER-SENTENCE READING SURFACE (ONE-ENGINE-PLAN): every sentence of
    // the answer, its ground-ladder rung (bound/witnessed/recorded/derived/
    // named/self), the claim verdicts that bound to it, and the AnswerRecord
    // (claims, tally, unsupported/unbacked, retrievedSources). null when the
    // answer was empty or the surface could not be computed — a typed
    // absence, never a guess.
    factGate: {
      verdict: factGateOut?.verdict ?? null,
      open: factGateOut?.open ?? false,
      searched: factGateOut?.searched ?? false,
      grounded: factGateOut?.grounded ?? null,
      jurisdiction: factGateOut?.jurisdiction ?? null,
      basis: factGateOut?.basis ?? null,
      route: factRoute ?? null,
      kind: factKind ? { id: factKind.id, label: factKind.label, jurisdiction: factKind.jurisdiction ?? null, parameters: factKind.parameters ?? [], memberOf: factKind.memberOf ?? [] } : null,
      link: factLink ? { holder: factLink.holder, since: factLink.since ?? null, until: factLink.until ?? null, at: factLink.at ?? null, ref: factLink.ref ?? null } : null,
    },
    reading: readingSurface
      ? {
          schema: readingSurface.surface.schema,
          sentences: readingSurface.surface.rows,
          tally: readingSurface.surface.tally,
          claims: readingSurface.claims,
          notes: readingSurface.notes,
          answerRecord: readingSurface.record,
          forms: readingSurface.forms ?? [],
        }
      : null,
    // THE FELT SHAPE (Abhinavagupta, the third Greek leg) — how the material
    // was UNDERGOEN, for whom. Ethos carried the ground, logos built the
    // record; pathos names the felt shape: rhythm (Murch), curve (surprise/
    // tension/release from the fold's own machinery), strain (the hamartia-
    // gate) — and the REC·Ground when the ground failed, a recorded
    // concession, never an idle one. null when the read could not be formed
    // (a typed absence, never a guess).
    pathos: pathos
      ? {
          schema: pathos.schema,
          forWhom: pathos.forWhom,
          strain: pathos.strain,
          rhythm: pathos.rhythm,
          curve: pathos.curve,
        }
      : null,
    reGround: pathosReGround ?? null,
    surfed: surfacedSegments.map((s) => s._ledger),
    // WHAT WAS ACTIVATED WHILE THE MOUTH SPOKE (2026-09-17). The JSON
    // discloses exactly which material was admitted to the turn and how
    // present it was: each surfaced segment's source, its decayed activation
    // (Atta's gamma over the conversation), whether it reached the model's
    // own prompt (kept in `material`), and the pathos felt shape the turn
    // carried. A consumer can see what the answer drew on — not just what
    // the model said.
    activated: {
      segments: surfacedSegments.map((s) => ({
        source: s._ledger?.source ?? null,
        bytes: s._ledger?.bytes ?? null,
        decay: s._ledger?.decay ?? null,
        reachedPrompt: material.some((m) => m === s.text),
      })),
      materialChars: used,
      materialSegments: material.length,
      surfacedSegments: surfacedSegments.length,
      fold: { relationEdges: stats.relationEdges, referentBindings: stats.referentBindings, unresolvedAlternatives: Array.isArray(fold?.unresolvedAlternatives) ? fold.unresolvedAlternatives.length : 0, exclusions: Array.isArray(fold?.exclusions) ? fold.exclusions.length : 0 },
      pathos: pathos ? { strain: pathos.strain, flatline: pathos.rhythm.flatline, blinks: pathos.rhythm.blinks, curve: pathos.curve.measured ? "measured" : "unmeasured" } : null,
    },
    void: surfVoidInfo ? { gap: surfVoidInfo.gap, reason: surfVoidInfo.reason ?? null, whatWouldSettle: surfVoidInfo.whatWouldSettle ?? null } : null,
    post: post ? { blocks: post.blocks?.length ?? 0, linted: post.linted ?? false, reordered: post.reordered ?? false, notes: post.notes ?? [] } : null,
    resolutions: resolutions ? { level: resolutions.level, text: resolutions.text, active: resolutions.active ?? null, atmosphere: resolutions.atmosphere ? { basis: resolutions.atmosphere.basis, ground: resolutions.atmosphere.ground ?? null } : null, lens: resolutions.lens ? { basis: resolutions.lens.basis, windows: resolutions.lens.windows ?? null } : null, paradigm: resolutions.paradigm ? { basis: resolutions.paradigm.basis, window: resolutions.paradigm.window ?? null } : null } : null,
    document: documentLedger
      ? {
          docId: documentLedger.docId,
          projection: projectDocument(documentLedger),
          changelog: documentChangeLog(documentLedger, { declaredParts: sections }),
          ledger: serializeLedger(documentLedger),
          ledgerFile: documentLedger ? ledgerFilePath(ESSAY_LEDGER_DIR, documentLedger.docId) : null,
          citationsFile: documentLedger ? path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.citations.json`) : null,
          // THE WHEEL (D/E/R): the run as a sequence of DEF→EVA→REC turns —
          // register, impression, plan, read, verdict, fold — the fold is
          // the next run's ground. Serialized beside the ledger, append-only.
          wheel: runMode === "projection" ? (() => {
            try {
              const wp = path.join(ESSAY_LEDGER_DIR, `${documentLedger.docId.replace(/:/g, "_")}.wheel.json`);
              fs.writeFileSync(wp, JSON.stringify(wheel.toJSON(), null, 2));
              return { file: wp, turns: wheel.ledger.length };
            } catch { return { turns: wheel.ledger.length }; }
          })() : null,
          // THE THINKING SURFACE — teaches, never just delivers. The reader
          // sees HOW the essay reasoned: the void questions it DEF'd, the
          // claims it carries and the conflicts Kelsen resolved (with WHY),
          // and the grounded witnesses Ranke verified. The reader can check
          // each step and learn the method — the system does not do the
          // thinking for them, it shows the thinking so they can do it.
          thinking: (() => {
            const rows = [];
            const m = MODEL_GIVER(model);
            rows.push(`Written by ${m.name} (${m.released}, ${m.license}${m.hfUrl ? ` — ${m.hfUrl}` : ""}): every claim it states is cited to it; claims grounded in a source are cited to the source.`);
            if (sections.length) rows.push(`The essay DEF'd its shape by asking ${sections.length} questions (the void):\n${sections.slice(0, 6).map((s, i) => `${i + 1}. ${s}`).join("\n")}${sections.length > 6 ? `\n… and ${sections.length - 6} more.` : ""}`);
            const k = resultKelsen;
            if (k?.resolutions?.length) {
              rows.push(`\nConflicting claims the essay carried, resolved by the norm hierarchy (Kelsen — ${precedenceOrderPhrase()}):`);
              for (const r of k.resolutions.slice(0, 8)) rows.push(`- ${r.subject}: “${r.a}” vs “${r.b}” → ${r.winner ? (r.winner === "a" ? r.a : r.b) : "tied"} — ${r.why ?? r.reason}`);
              if (k.resolutions.length > 8) rows.push(`… ${k.resolutions.length - 8} more.`);
            } else if (k?.basis) rows.push(`\nKelsen: ${k.basis}`);
            if (rankeTotalFindings) rows.push(`\nRanke found ${rankeTotalFindings} section(s) that drifted from the material and rewrote them from the record.`);
            // THE PERIODIC TABLE OF CREATIVITY — where this piece landed, read
            // off its own provenance (reproduced / derived / invented), the
            // metadata revealed on every surface. The label is the risk posture;
            // the SHARE, the n-window, and instrument disagreements ride with it.
            if (categorized) {
              rows.push(`\nThis piece landed in the cell ${categorized.cell.name} (${categorized.cell.archon}'s cell, ${categorized.cell.grain} × ${categorized.cell.phase} · ${categorized.derivation}): ${categorized.reproduce.quoted} quoted, ${categorized.reproduce.copied} copied (${categorized.units.reproduce}); ${categorized.derive} derived, ${categorized.invent} invented (${categorized.units.derive}).`);
              rows.push(`${categorized.derivation} STANDS as the FIELD (the category the next read primes on); the ECHO — below the field, still on the record — is ratio ${(categorized.derivationRatio * 100).toFixed(1)}% clutched to a magic n (${categorized.derivationWindow.n}); the real window is ${+categorized.derivationWindow.min.toFixed(2)}…${+categorized.derivationWindow.max.toFixed(2)}.${categorized.disagreement ? " The two instruments disagree on this text (order-specific runs the ledger calls company) — inspect the rows before trusting the cell." : ""}${categorized.paraphraseUnmeasured ? ` No reproduction seen — but paraphrase is UNMEASURED by this instrument; 'invented' may be grounded-and-reworded company.${categorized.paraphraseCandidates ? ` The shadow chase named ${categorized.paraphraseCandidates} span(s) whose claim-vocabulary the sources' own sentences carry${categorized.paraphraseEquated ? `, and the RECORD equated ${categorized.paraphraseEquated} of them, FOR ${categorized.paraphraseChase?.whom?.face ?? "the empty hub of this fold"}, to its own claim rows (${(categorized.paraphraseChase?.equatedRows ?? []).slice(0, 2).map((r) => `“${r.row?.label ?? ""}”`).join(", ")}) — grounded-by-meaning on the record's ruler, never a model, moved to derived` : ` — the record holds no row that equates them FOR this fold's whom (${categorized.paraphraseChase?.whom?.face ?? "the empty hub"}), and they are NAMED un-equatable, disclosed, never laundered`}.` : ""}` : ""}`);
            }
            return rows.join("\n");
          })(),
        }
      : null,
    usage,
    truncated,
    // Stream-shape witnesses for the last draw (null on pre-model paths):
    // doneSeen/doneReason/serverEvalCount/streamErr/leftoverChars/tailParsedAs.
    stream: streamMeta ? { ...streamMeta, cuts: streamCuts } : null,
    // THE VISITED-SITES LIST (Mneme) — the sites this session's reading
    // actually opened, each with its resolution and chars. Named apart from
    // `shadow` above (the Bourdieu norm-standing RATE): the two are different
    // objects and `shadow: session.shadow` used to OVERWRITE the rate —
    // ONE-ENGINE-PLAN's named bug, fixed here by giving each its own name.
    shadowSites: session.shadow ?? [],
    // The MENO CHECK: the void was DEF'd when the composition started; here we
    // ask whether it is FILLED. We know we've learned when the void we
    // declared — across its nine operators — is filled by sections that pass
    // its admission test. Strain is the REC pressure the void demanded.
    satisfaction,
    // KELSEN: THE PRIMARY MODALITY — the essay's claims resolve by the norm
    // hierarchy (regime.js's PRECEDENCE_STEPS / precedenceOrderPhrase() —
    // this comment used to hand-type the order and, audited 2026-09-14, had
    // drifted to drop "regime"), and the resolutions are NAMED. This is the default
    // hyper-grounded posture: the essay is a set of claims in a hierarchy,
    // conflicts resolved by a declared order, never a silent pick. The
    // reader is taught the order by seeing each resolution.
    kelsen: resultKelsen,
    // COMPETENCY: does the essay reduce the surprise of its own opening
    // thesis? The opening asserts a surprising claim; the body's grounded
    // evidence must retroactively reduce that surprise. Competency is the
    // surprise-reduction — never length, never token volume (the gathering
    // gate's own stop: the piece is done when it explains the why).
    competency: documentLedger && rawEntries?.length && documentLines.length
      ? competencyGrade({
          opening: documentLines[0] ?? "",
          body: documentLines.slice(1),
          materialPropositions: notesFromEdges(rawEntries),
          index: sessionReferentIndex(session),
        })
      : null,
    // READABILITY: how the piece READS — textstat when reachable, else the
    // JS heuristic. A piece can avoid all repetition and still be too dense;
    // this is the "how good does it read" measure beside the redundancy
    // detectors.
    // STRUNK & WHITE: how the piece READS and the style rules it breaks. A
    // piece can avoid all repetition and still be dense or hedged; this is
    // the style agent's report beside the redundancy detectors.
    strunkAndWhite: documentLines.length ? readabilityOf(documentLines.join("\n\n")) : null,
    // MURCH'S PACING — the blink of an eye. The film is edited where the
    // blink falls: the reader's eye rests at a sentence boundary, and the
    // cut (the variation) lands where the thought turns. A piece that never
    // varies its sentence length has no blinks — a flatline, Murch's boredom
    // at the rhythm grain. The pacing grade reports the variance, the blink
    // points (a short sentence landing after long ones), and the dense
    // sentences — the emotional arc of the cut.
    murch: documentLines.length ? murchPacing(documentLines.join("\n\n")) : null,
    // VONNEGUT — the WRITER's arc: the shape of the piece's story, classified
    // into the full EO taxonomy (27 cells) and the reader-facing Vonnegut
    // eight. Fortune is the reader's conviction over the piece; the shape is
    // the arc it traces — man-in-hole (thesis surprises, body climbs),
    // rags-to-riches (steady creation), flatline (argues nothing).
    vonnegut: documentLedger && rawEntries?.length && documentLines.length
      ? classifyArc(vonnegutShape(documentLines, { materialPropositions: notesFromEdges(rawEntries), index: sessionReferentIndex(session) }))
      : null,
    // THE VOID HOLARCHY — the artifact's nested voids, every level a WHOLE (its
    // own nine-operator DEF) and a PART (a filler covering an extent in the
    // level above). OMNIMODAL (S6): the levels are structural — whole → part
    // → sub-part — and the modality only names them (the whole is the piece
    // in text, the work in music, the artifact in code). The law of holons:
    // low sets possibility for high, high probability for low — a sub-part's
    // void bounds what its part can assert; the whole's declared shape spawns
    // the part-voids. A level left under-specified is a visible gap.
    voidHolarchy: sections.length
      ? voidHolarchy({
          modality: isCode ? "code" : "text",
          fieldsByLevel: {
            whole: {
              slot: task.slice(0, 60),
              anchor: topicPhrase(task),
              admits: "a part",
              extent: sections.length ? { from: 1, to: sections.length + 1 } : null,
              relation: "is a part of",
              composition: sections.length ? "the parts compose the whole" : null,
              cardinality: sections.length || null,
              admission: "a part with real content, grounded, written as the artifact itself",
              reopensOn: "a part that is thin, ungrounded, or meta-commentary",
            },
            part: {
              slot: sections.length ? `${sections.length} part(s)` : null,
              admits: "a sub-part",
              extent: sections.length ? { from: 1, to: sections.length + 1 } : null,
              relation: "is a part of",
              cardinality: sections.length || null,
              admission: "a sub-part with real content, grounded",
              reopensOn: "a sub-part that is thin or ungrounded",
            },
          },
        })
      : null,
    totalStrain,
    thinking: thinkingBlock || null,
    answerShape: answerShape.shape,
    correctionRule: correction.rule ? {
      id: correction.rule.id,
      kind: correction.rule.kind,
      dimension: correction.rule.dimension,
      persisted: correction.persisted,
      falsifier: correction.rule.falsifier,
    } : null,
    mode: runMode,
    // The model that ANSWERED (plain-speech switch disclosed, never silent).
    model,
    // THE VOID, DEFINED AND SATISFIED — universal across every mode. The
    // shape names what the answer must be; the questions are the void the
    // answer had to fill; satisfied is the verdict the mode earned (a
    // projection's from its ledger satisfaction, a single answer's from the
    // void-fill check).
    void: {
      shape: answerShape.shape,
      modality: answerShape.modality,
      mode: runMode,
      questions: voidQuestions,
      cells: preVoid.cells.filter((c) => c.relevant).map((c) => ({ question: c.question, op: c.op, cell: c.cell })),
      satisfied: runMode === "projection"
        ? Boolean(documentLedger && (satisfaction?.ok ?? false))
        : Boolean(chatSatisfaction?.ok ?? false),
    },
  };
}

const ESSAY_LEDGER_DIR = path.join(HERE, "documents");

// ── document jobs: a composition as a detached, resumable, real-time file ──
// A long essay is not one blocking completion — it is a JOB. It starts
// detached, writes its projection to <dir>/<docId>.md in REAL TIME as each
// section lands, keeps the append-only JSONL ledger, and can be polled or
// picked back up at any moment (the state lives in the ledger file + the
// session, never only in a request).
const _jobs = new Map();
export function documentJobStatus(docId) {
  return _jobs.get(docId) ?? null;
}
export function documentJobIds() {
  return [..._jobs.keys()];
}

// Start a composition job. Returns { docId, sessionId } immediately; the
// work continues in the background. `onToken` receives each streamed chunk;
// the projection file is rewritten as sections land.
export async function startDocumentJob({ task, model, workspace = "", sessionId = null, holonLevel = "section", resumeDocId = null, webConsent = false, seed = null } = {}) {
  const sid = sessionId ?? `er7-doc-${Date.now()}`;
  const jobId = sid; // the essay's ledger lives at ${sessionId}:${turnCount} — use the SAME id so the projection finds it
  const job = {
    jobId, sessionId: sid, model, task, workspace, holonLevel,
    status: "writing", createdAt: Date.now(), updatedAt: Date.now(),
    chars: 0, sections: 0, error: null,
  };
  _jobs.set(jobId, job);
  _jobs.set(sid, job);
  // The essay's ledger is `${sessionId}:${turnCount}` — turnCount starts at 1
  // for a fresh session, so the file is ${sid}:1.jsonl. The .md projection
  // mirrors it. (A reused sessionId with a higher turnCount would shift this;
  // the job creates its own fresh session, so :1 is correct here.)
  const ledgerDocId = `${sid}:1`;
  // THE PROJECTION IS THE LIVE HTML, fed by the JSONL + citations on every
  // refresh — never a stale .md snapshot. MD and JSON are EXPORTS from that
  // HTML, not the default projection.
  const htmlFile = path.join(ESSAY_LEDGER_DIR, `${jobId.replace(/:/g, "_")}_1.html`);
  const jsonlFile = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
  const citationsFile = path.join(ESSAY_LEDGER_DIR, `${ledgerDocId.replace(/:/g, "_")}.citations.json`);
  try { fs.mkdirSync(ESSAY_LEDGER_DIR, { recursive: true }); } catch {}
  // CRASH RESILIENCE: if this session already has a ledger (a previous run
  // was interrupted), read the VOID PLAN (the full question set) and which
  // questions are ALREADY answered (the `part` titles) so a resumed run
  // continues the UNANSWERED cells and appends — never restarts, never
  // rewrites. The plan lives in the ledger, so the shape survives a crash.
  const existingFile = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
  let answeredTitles = [];
  let planQuestions = null;
  try {
    if (fs.existsSync(existingFile)) {
      const rows = fs.readFileSync(existingFile, "utf8").trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      answeredTitles = rows.filter((r) => r.role === "part" && r.title).map((r) => String(r.title).toLowerCase().trim());
      const plan = rows.find((r) => r.role === "plan");
      if (plan?.text) planQuestions = plan.text.split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
    }
  } catch {}
  job.resumedFrom = answeredTitles.length ? answeredTitles.length : 0;
  // Run detached — the caller returns immediately.
  (async () => {
    try {
      // The JSONL is the ARTIFACT: it appears first, growing append-only as
      // each section/revision lands. The .html is its LIVE PROJECTION — a
      // shell that fetches the JSONL + citations on every load and folds
      // client-side, so a refresh is always current. The shell is written
      // once (it reads the data, not the other way round); MD and JSON are
      // EXPORTS from it, never the default projection.
      const file = ledgerFilePath(ESSAY_LEDGER_DIR, ledgerDocId);
      const flushProjection = () => {
        try {
          const shell = renderLiveEssayHtml({
            docId: ledgerDocId, title: task.slice(0, 60),
            jsonlPath: `${jobId.replace(/:/g, "_")}_1.jsonl`,
            citationsPath: `${ledgerDocId.replace(/:/g, "_")}.citations.json`,
          });
          fs.writeFileSync(htmlFile, shell);
        } catch {}
      };
      flushProjection();
      // Re-fold the LIVE shell whenever the JSONL grows (each pass): poll the
      // ledger file's size; the shell itself needs no rewrite (it reads the
      // JSONL on refresh), but the job's in-memory projection status updates.
      let lastJsonlBytes = 0;
      try { lastJsonlBytes = fs.statSync(file).size; } catch {}
      const pollTimer = setInterval(() => {
        try {
          const size = fs.statSync(file).size;
          if (size !== lastJsonlBytes) { lastJsonlBytes = size; flushProjection(); }
        } catch {}
      }, 1500);
      // Transient-Ollama resilience: the preflight can fail when Ollama is
      // momentarily busy (unloading after a long job, or the residency ping's
      // request lingering). A bounded short retry rides out the blip instead
      // of failing the whole job. The retry waits on Ollama directly, so it
      // recovers as soon as the upstream answers.
      const result = await (async () => {
        let lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            return await runProxyTurn(
              { sessionId: sid, model, task, workspace, holonLevel: job.holonLevel, resumeAnswered: answeredTitles, resumePlan: planQuestions, mode: "projection", webConsent, seed },
              (chunk) => { job.chars += chunk.length; job.updatedAt = Date.now(); },
              (note) => { if (note?.move === "composing_section") job.sections++; },
              (thinking) => job.updatedAt = Date.now(),
            );
          } catch (err) {
            lastErr = err;
            const busy = /not responding|ECONNREFUSED|fetch failed|upstream_down/i.test(String(err?.message ?? ""));
            if (!busy || attempt === 2) break;
            await new Promise((r) => setTimeout(r, 8000 * (attempt + 1))); // 8s, 16s
          }
        }
        throw lastErr;
      })();
      clearInterval(pollTimer);
      flushProjection();
      // Completion is SATISFACTION-gated: the job is "complete" only when the
      // DEF shape is realized (all sections satisfied). If it is not satisfied
      // after the correction budget, it is "unsatisfied" — a finding about the
      // pipeline (mis-sized task, thin ground), never a silent pass.
      const sat = result?.satisfaction;
      job.status = result?.truncated ? "truncated" : (sat?.ok ? "complete" : "unsatisfied");
      job.satisfaction = sat ?? null;
      job.totalStrain = result?.totalStrain ?? 0;
      job.result = result;
      job.updatedAt = Date.now();
      flushProjection();
    } catch (err) {
      job.status = "error";
      job.error = err.message;
      job.updatedAt = Date.now();
    }
  })();
  return { jobId, sessionId: sid, status: job.status, htmlFile, ledgerFile: jsonlFile, citationsFile };
}