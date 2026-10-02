// node --test proof.test.mjs
//
// The pure half of proof-seeking, tested offline — the web.js discipline:
// no fixture here ever came from a live call inside a test, and no test
// ever touches the network. The one seam test at the bottom pins that the
// chat page's own files still name no non-local host (P13's wall).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PROOF_PAGES_CONSULTED,
  PROOF_TARGETS_PER_TURN,
  PREFLIGHT_PAGES_CONSULTED,
  PREFLIGHT_QUERY_MAX_TERMS,
  PREFLIGHT_BARE_TOPIC_PAGES,
  assessPage,
  foldProof,
  preflightCeilingFor,
  preflightQuery,
  proofQuery,
  proofTargets,
  shouldPreflight,
} from "./proof.js";
import { checkGrounding, extractCheckableAtoms } from "../organs/grounding.js";
// The real engine closed class, not a stub — the same received register
// widget.js already injects (Amendment IV: a closed class lives in the
// engine's prior register, never as a private list in this repo).
import { ANAPHORIC_PRONOUNS } from "../adapters/text/priors.js";
// void-narration.test.mjs's own bootstrap, reused rather than re-derived:
// real `briefFor`/`declaredSlotShape` over the real engine cube, so
// `preflightCeilingFor`'s wiring is proven against the actual void a live
// turn declares — never a hand-typed brief a real one could disagree with.
import { briefFor } from "./void-brief.js";
import { declaredSlotShape } from "./web-claim.js";
import { cellOf } from "../kernel/cube.js";
import * as enginePriors from "../adapters/text/priors.js";

test("the query is the claim's own words — atom quoted, context words following, nothing invented", () => {
  const q = proofQuery({
    kind: "name",
    text: "Kessington Report",
    tokens: ["Kessington", "Report"],
    sentence: "The Kessington Report was commissioned by the Marrowfen Harbour Board in 1974.",
  });
  assert.ok(q.startsWith('"Kessington Report"'), q);
  assert.ok(/Marrowfen|Harbour|commissioned/.test(q), q);
  // Stopwords and the atom's own words do not repeat in the tail.
  assert.ok(!/\bthe\b/.test(q.replace(/"[^"]*"/, "")), q);
  // A single-token atom is not quoted — there is no phrase to hold together.
  assert.ok(!proofQuery({ kind: "number", text: "1974", tokens: ["1974"], sentence: "" }).includes('"'));
});

test("proofQuery: a caller handing an entire clause as `text` (an unbound relation's composed sentence, not a short atom) is never quoted as one exact phrase", () => {
  // Measured live, 2026-09-09: exactly this shape — an unbound relation's
  // own composed sentence — reached this function and came back
  // `"The Mona Lisa was painted by Leonardo da Vinci"`, a quoted 8-word
  // phrase that found zero results on a real search, even with the correct
  // Wikipedia page already sitting in this turn's own pool.
  const q = proofQuery({
    text: "The Mona Lisa was painted by Leonardo da Vinci",
    sentence: "The Mona Lisa was painted by Leonardo da Vinci",
  });
  assert.ok(!q.includes('"'), q);
  assert.ok(/Leonardo|Vinci|Mona|Lisa/.test(q), q);
  // A genuine short name/figure — the common, intended case — still quotes.
  const short = proofQuery({
    text: "Kessington Report",
    tokens: ["Kessington", "Report"],
    sentence: "The Kessington Report was released in 1974.",
  });
  assert.ok(short.startsWith('"Kessington Report"'), short);
});

test("a page states a claim by the same containment rule the local check uses", () => {
  const claim = {
    kind: "name",
    text: "Marrowfen Harbour Board",
    tokens: ["Marrowfen", "Harbour", "Board"],
    sentence: "The Marrowfen Harbour Board commissioned the report in 1974.",
  };
  const page = "The harbour works at Marrowfen were overseen by the Harbour Board from 1974 onward.";
  const a = assessPage(claim, page);
  assert.equal(a.stated, true, JSON.stringify(a));
  assert.ok(a.context.shared > 0);
  assert.ok(a.context.of >= a.context.shared);

  // Absent stays absent, and the fold applies on both sides — an accented
  // page supports a plain-typed claim (P11's first consequence).
  const miss = assessPage(claim, "Nothing about harbours here at all.");
  assert.equal(miss.stated, false);
  assert.ok(miss.absent.includes("Marrowfen"));
  const folded = assessPage(
    { kind: "name", text: "Helene", tokens: ["Helene"], sentence: "" },
    "Pierre married Hélène in Petersburg.",
  );
  assert.equal(folded.stated, true);

  // A figure is a figure: matched as a number, not a word.
  const fig = assessPage({ kind: "number", text: "12", tokens: ["12"], sentence: "" }, "The rate was 12 percent.");
  assert.equal(fig.stated, true);
  assert.equal(assessPage({ kind: "number", text: "21", tokens: ["21"], sentence: "" }, "The rate was 12 percent.").stated, false);
});

test("the fold counts perspectives and never says true", () => {
  const claim = { kind: "name", text: "Marrowfen", tokens: ["Marrowfen"], sentence: "" };
  const page = (url, stated, gap = null) =>
    gap
      ? { url, gap }
      : { url, assessment: { stated, absent: stated ? [] : ["Marrowfen"], context: { shared: 1, of: 2 } } };
  const out = foldProof(claim, {
    query: "Marrowfen",
    pages: [
      page("https://en.wikipedia.org/wiki/Marrowfen", true),
      page("https://www.example.org/marrowfen-history", true),
      page("https://other.net/unrelated", false),
      page("https://blocked.site/x", false, { silence: "not-present", detail: "timeout" }),
    ],
  });
  assert.equal(out.verdict, "web-corroborated");
  assert.equal(out.consulted, 3);
  assert.equal(out.failed, 1);
  assert.equal(out.stating.length, 2);
  // Independence is distinct hosts, and the residue is NAMED on the result.
  assert.equal(out.independence.hosts, 2);
  assert.match(out.independence.basis, /syndication/);
  // Natural-frequency phrasing: counted perspectives, no verdict of truth.
  assert.match(out.sentence, /2 of the 3 page/);
  assert.ok(!/\btrue\b/i.test(out.sentence));

  // Zero statings is uncorroborated — a counted fact, not falsity.
  const none = foldProof(claim, { query: "q", pages: [page("https://a.com/1", false), page("https://b.com/2", false)] });
  assert.equal(none.verdict, "web-uncorroborated");
  assert.match(none.sentence, /0 of the 2/);
});

test("a failed crossing is a gap, not a zero", () => {
  const claim = { kind: "name", text: "Marrowfen", tokens: ["Marrowfen"], sentence: "" };
  const refused = foldProof(claim, { query: "q", gap: { silence: "refused-upstream", detail: "bot challenge" } });
  assert.equal(refused.verdict, "refused-upstream");
  assert.equal(refused.consulted, 0);
  assert.ok(refused.gap);
  const allFailed = foldProof(claim, {
    query: "q",
    pages: [{ url: "https://a.com", gap: { silence: "not-present", detail: "timeout" } }],
  });
  assert.equal(allFailed.verdict, "not-consulted");
  assert.equal(allFailed.failed, 1);
});

test("proof targets come from the turn's own checks, ordered by need, deduplicated", () => {
  const passages = [{ ref: "k.txt#0-90", text: "The report put the silting figure at 12 percent per decade." }];
  const grounding = checkGrounding(
    "The Kessington Report said 21 percent. Bryan TX PD cited the Kessington Report too.",
    passages,
    {},
  );
  const relationReport = {
    claims: [
      { sentence: "Pierre married Dolokhov.", subject: "Pierre", verb: "married", object: "Dolokhov", end1: "Pierre", label: "married", end2: "Dolokhov", verdict: "unbound" },
      { sentence: "Pierre loved Helene.", subject: "Pierre", verb: "loved", object: "Helene", end1: "Pierre", label: "loved", end2: "Helene", verdict: "contradicted" },
      { sentence: "He spoke.", subject: "He", verb: "spoke", object: "x", end1: "He", label: "spoke", end2: "x", verdict: "beyond-reach" },
    ],
  };
  const targets = proofTargets({ findings: grounding.findings, relationReport });
  // Contradicted first — the material actively disagrees, so a second
  // perspective matters most there.
  assert.equal(targets[0].why, "contradicted");
  assert.ok(targets.some((t) => t.why === "unsupported"));
  assert.ok(targets.some((t) => t.why === "unbound"));
  // beyond-reach is a limit of the instrument, never a crossing.
  assert.ok(!targets.some((t) => /spoke/.test(t.text)));
  // The Kessington Report appears in two sentences and is ONE thing to look up.
  const kess = targets.filter((t) => /Kessington/.test(t.text));
  assert.equal(kess.length, 1);
  // Every target carries the sentence it stood in, for the query's context.
  assert.ok(targets.every((t) => t.why !== "unsupported" || typeof t.sentence === "string"));
});

test("the declared budgets are declarations", () => {
  assert.equal(PROOF_PAGES_CONSULTED, 3);
  assert.equal(PROOF_TARGETS_PER_TURN, 4);
  assert.equal(PREFLIGHT_PAGES_CONSULTED, 3);
  assert.equal(PREFLIGHT_QUERY_MAX_TERMS, 12);
  assert.equal(PREFLIGHT_BARE_TOPIC_PAGES, 2);
});

// ── preflightCeilingFor: the void's own shape scoping the hunt ──────────────
// "Once we know the shape of an answer, we know the shape of what it needs
// to be fed" (user direction, 2026-09-10) — but never by reading declared
// CARDINALITY as an invitation to fetch less: that is the exact mistake
// void-brief.js's own header records and refuses ("'who was Lincoln's vice
// president?' is grammatically singular and factually two-valued").

test("preflightCeilingFor never narrows below the default on its own — pure arithmetic, checked directly", () => {
  assert.equal(preflightCeilingFor({ slotDeclared: false, anchorDeclared: false }, 3), 3, "no slot at all — nothing to act on");
  assert.equal(preflightCeilingFor({ slotDeclared: true, anchorDeclared: true }, 3), 3, "a relational slot — the Lincoln shape — stays at the full ceiling");
  assert.equal(preflightCeilingFor({ slotDeclared: true, anchorDeclared: false }, 3), 2, "a bare topic slot narrows to the corroborating floor");
  assert.equal(preflightCeilingFor({ slotDeclared: true, anchorDeclared: false }, 1), 1, "never widens past whatever ceiling it was handed");
  assert.deepEqual(preflightCeilingFor(), undefined, "no arguments at all — never throws, never invents a default");
});

test("preflightCeilingFor over REAL void briefs: a bare topic narrows, a relational anchor (the Lincoln shape) does not, an explanatory question passes through untouched", () => {
  const shapeOf = (q) =>
    declaredSlotShape(q, {
      definiteDeterminers: enginePriors.DEFINITE_DETERMINERS,
      inflectionalSuffixes: enginePriors.INFLECTIONAL_SUFFIXES,
      interrogativePronouns: enginePriors.INTERROGATIVE_PRONOUNS,
      mannerReasonPronouns: enginePriors.MANNER_REASON_PRONOUNS,
    });
  const brief = (q) => briefFor(q, [], { slotShapeOf: shapeOf, cellOf });
  const anchorDeclaredOf = (b) => Boolean(b?.declaration?.cells?.find((c) => c.field === "anchor")?.declared);
  const shapeFor = (b) => ({ slotDeclared: Boolean(b?.declaration), anchorDeclared: anchorDeclaredOf(b) });

  // The specimen the mistake was made on — void-brief.js's own header.
  // Wiring this in must never narrow it, on the real engine, not a stub.
  const vp = brief("Who was Abraham Lincoln's vice president?");
  assert.ok(vp, "a real slot is declared");
  assert.equal(anchorDeclaredOf(vp), true, "a real anchor is recovered — Lincoln");
  assert.equal(preflightCeilingFor(shapeFor(vp), PREFLIGHT_PAGES_CONSULTED), PREFLIGHT_PAGES_CONSULTED);

  // The specimen that motivated this: a bare topic, no second party for the
  // void's own multi-filler machinery to have ever protected against.
  const revolution = brief("What year did the French Revolution begin?");
  assert.ok(revolution, "a real slot is declared");
  assert.equal(anchorDeclaredOf(revolution), false, "no relational anchor — a bare topic");
  assert.equal(preflightCeilingFor(shapeFor(revolution), PREFLIGHT_PAGES_CONSULTED), PREFLIGHT_BARE_TOPIC_PAGES);

  // No slot at all — an explanatory question. Nothing here to act on.
  const explain = brief("How does photosynthesis work?");
  assert.equal(explain, null);
  assert.equal(preflightCeilingFor(shapeFor(explain), PREFLIGHT_PAGES_CONSULTED), PREFLIGHT_PAGES_CONSULTED);
});

// ── the preflight gate: search BEFORE a draft exists, not after ─────────────
// Measured live 2026-08-18: "research the weather in NYC right now" with
// nothing attached drafted "70 degrees, sunny" from nowhere; checkGrounding
// correctly declined to examine it (no material exists), and the no-material
// fallback then manufactured search candidates FROM the invented sentence.
// shouldPreflight asks the identical question one step earlier, so the
// answer can be "go get material" instead of "invent something to check."

test("shouldPreflight fires only on the exact structural conjunction: flat, nothing attached, both standing toggles on", () => {
  const base = { live: [], grounded: true, webProof: true, planMode: "flat" };
  assert.equal(shouldPreflight(base), true);
  assert.equal(shouldPreflight({ ...base, live: [{ ref: "x#0-1" }] }), false, "material already attached — nothing to preflight");
  assert.equal(shouldPreflight({ ...base, grounded: false }), false, "checking mode off — the whole ladder stands down, not just this door");
  assert.equal(shouldPreflight({ ...base, webProof: false }), false, "no standing web consent — no automatic egress, preflight included");
  assert.equal(shouldPreflight({ ...base, planMode: "model" }), false, "a decomposed task's parts retrieve per-part already — out of scope for this door");
  assert.equal(shouldPreflight({}), false, "every toggle defaults to off/absent — the gate defaults closed, never open");
});

test("preflightQuery anchors on the turn's own words; the discourse joins when those words point back or run few", () => {
  // The exact second-turn shape of the measured bug: "prove it" points back
  // anaphorically ("it"), so the discourse anchor is what still names the
  // topic. The anaphor door is the engine's own received closed class,
  // injected — the widget.js pattern, never a hand-typed intent list.
  const bare = preflightQuery("prove it", "", { anaphors: ANAPHORIC_PRONOUNS });
  assert.equal(bare, "prove");
  const anchored = preflightQuery("prove it", "NYC weather right now · asked and answered · NYC", {
    anaphors: ANAPHORIC_PRONOUNS,
  });
  assert.ok(/weather/i.test(anchored) && /nyc/i.test(anchored), anchored);
  // The opposite, newly-measured case (2026-08-19): a self-contained
  // question asked after another topic must NOT inherit the stale topic's
  // vocabulary — "research Robert Macnamera" after a greeting searched on
  // "Greeting exchange"'s own words and fetched a greeting-etiquette page.
  const selfContained = preflightQuery(
    "research Robert Macnamera",
    "Greeting exchange · Conversation starts with a simple greeting. · user, AI",
    { anaphors: ANAPHORIC_PRONOUNS },
  );
  assert.ok(/macnamera/i.test(selfContained), selfContained);
  assert.ok(!/greeting/i.test(selfContained), `stale discourse leaked into the anchor: ${selfContained}`);
  // A task with no content words at all still gets the discourse anchor.
  const empty = preflightQuery("so?", "NYC weather right now · asked and answered · NYC", {
    anaphors: ANAPHORIC_PRONOUNS,
  });
  assert.ok(/weather/i.test(empty), empty);
  // The widened case (2026-08-19, user direction: "our gating is too
  // strict, it needs to be more associative, people need to be able to use
  // poor grammar"): a task with FEW content words is exactly as
  // under-specified as one with none, even with no anaphoric pronoun.
  // Measured live: "what about johnson?" mid-conversation about Lincoln's
  // vice presidents reduced to the single word "johnson" and searched the
  // web straight into Johnson & Johnson, the company — not Andrew Johnson.
  const fewWords = preflightQuery(
    "what about johnson?",
    "Lincoln presidency · discussing Lincoln's vice presidents · Abraham Lincoln, Hannibal Hamlin",
    { anaphors: ANAPHORIC_PRONOUNS },
  );
  assert.match(fewWords, /johnson/i);
  assert.match(fewWords, /lincoln/i);
  // Still bounded: a self-contained question with MORE than a couple of
  // content words keeps its own scope — the "research Robert Macnamera"
  // wall above must survive the widened threshold too, not just the old one.
  // The turn's own words survive the cap ahead of the discourse line's —
  // built first, so a long combined anchor keeps what the reader just typed.
  const long = preflightQuery(
    "what is the current population of that place Springfield Illinois exactly today",
    "an entirely unrelated prior topic about lighthouses and shipping lanes and maritime law",
    { anaphors: ANAPHORIC_PRONOUNS },
  );
  assert.ok(/springfield/i.test(long), long);
  assert.ok(long.split(/\s+/).length <= PREFLIGHT_QUERY_MAX_TERMS);
  // No question, no discourse, no query — never a bare empty-string search.
  assert.equal(preflightQuery("", ""), "");
});

test("preflightQuery keeps an acronym: the length floor dropped the only word saying what was ASKED", () => {
  // Measured live on the real app, 2026-08-26, whole chain visible: this
  // question built the query "lincoln" (VP is two characters, under the
  // length floor), DuckDuckGo answered with eight Lincoln Motor Company
  // pages, the preflight fetched three, and a question about a vice
  // president was answered from luxury-SUV marketing copy.
  const vp = preflightQuery("who was lincoln's VP?", "");
  assert.match(vp, /VP/, `the acronym carrying the question's whole point was dropped: ${vp}`);
  assert.match(vp, /lincoln/i, vp);

  // LOWERCASE, and this is the case that matters most: the first version of
  // this fix keyed on capitals, and the very next real report was the same
  // question typed "vp" — still reduced to "lincoln", still fetched Lincoln
  // Motor Company. A rule that depends on the user shift-keying an
  // abbreviation is not a rule.
  const vpLower = preflightQuery("who was lincoln's vp?", "");
  assert.match(vpLower, /vp/, `lowercase abbreviation dropped — the capitals-only fix's own blind spot: ${vpLower}`);
  assert.match(vpLower, /lincoln/i, vpLower);

  // Written out, this always worked — which is why the bug hid: the same
  // question in longhand is fine, so only the abbreviated form fails.
  assert.match(preflightQuery("who was lincoln's vice president?", ""), /vice president/i);

  // An acronym bypasses CLAIM_STOPWORDS deliberately: lowercased, the set
  // cannot tell the COUNTRY "US" from the pronoun "us", or the agency "WHO"
  // from the interrogative "who". Casing is the only evidence in the text.
  // Before this fix "what did the US do" searched the EMPTY string.
  assert.equal(preflightQuery("what did the US do", ""), "US");
  assert.match(preflightQuery("what does the WHO recommend", ""), /WHO/);
  assert.match(preflightQuery("explain AI safety", ""), /AI/);

  // Lowercase behaviour is untouched — the floor and the stopword set both
  // still apply exactly as before to ordinary words.
  assert.equal(preflightQuery("the cat is on the mat", ""), "cat mat");
  assert.equal(preflightQuery("", ""), "");
});

test("preflightQuery earns the discourse join instead of always taking it — the trazodone/Lincoln incident, independently measured and merged in", () => {
  // The exact live bug (2026-08-19): turn 1 was about trazodone; turn 2 asked
  // a complete, self-sufficient question with nothing anaphoric in it. An
  // unconditional-join version would build a query where every discourse
  // word survives PREFLIGHT_QUERY_MAX_TERMS right alongside the real
  // question (12 total, none trimmed), the search would return a
  // trazodone/vaccine FAQ page, and the model would answer the wrong
  // question from real but entirely wrong material.
  const trazodoneDiscourse =
    "trazodone for dogs: uses, interactions, serotonin syndrome, and vaccine timing (unanswered) · moved from serotonin syndrome timing to whether any source addresses trazodone right after a vaccine — none do · trazodone, serotonin syndrome";
  const polluted = preflightQuery("who was Abraham Lincoln's vice president?", trazodoneDiscourse, { anaphors: ANAPHORIC_PRONOUNS });
  assert.ok(/lincoln/i.test(polluted) && /president/i.test(polluted), polluted);
  assert.ok(!/trazodone/i.test(polluted) && !/vaccine/i.test(polluted) && !/serotonin/i.test(polluted),
    `a self-sufficient question must not carry an unrelated prior topic's words into the search: got "${polluted}"`);

  // Omitted anaphors: unlike a design that gates the WHOLE earned-join
  // behavior on the caller opting in, PREFLIGHT_FEW_WORDS applies
  // unconditionally — "who was Abraham Lincoln's vice president?" carries
  // 4 content words regardless of whether an anaphor set was ever passed,
  // so it never joins either way. Stronger than reproducing an old bug on
  // omission: there is no bug left to reproduce.
  const stillClean = preflightQuery("who was Abraham Lincoln's vice president?", trazodoneDiscourse);
  assert.ok(!/trazodone/i.test(stillClean), "the few-words gate does not depend on anaphors being supplied");

  // An anaphoric task ("prove IT") still earns the join — this is the SAME
  // case the existing test above already covers without the pronoun set;
  // repeated here to pin that passing a real pronoun set doesn't regress it.
  const anaphoric = preflightQuery("prove it", "NYC weather right now · asked and answered · NYC", { anaphors: ANAPHORIC_PRONOUNS });
  assert.ok(/weather/i.test(anaphoric) && /nyc/i.test(anaphoric), anaphoric);

  // A task with no content words at all (every token is a stopword or too
  // short) still earns the join even with no anaphoric pronoun present —
  // the second, independent condition.
  const contentless = preflightQuery("and so", "NYC weather right now · asked and answered · NYC", { anaphors: ANAPHORIC_PRONOUNS });
  assert.ok(/weather/i.test(contentless), contentless);

  // A self-sufficient task with an unrelated discourse line, using the
  // engine's real pronoun set: still excludes the unrelated topic entirely
  // (stronger than the old cap-priority test above, which only guaranteed
  // the task's OWN words survived — not that pollution was absent).
  const clean = preflightQuery(
    "what is the current population of Springfield Illinois exactly today",
    "an entirely unrelated prior topic about lighthouses and shipping lanes and maritime law",
    { anaphors: ANAPHORIC_PRONOUNS },
  );
  assert.ok(/springfield/i.test(clean));
  assert.ok(!/lighthouse/i.test(clean) && !/maritime/i.test(clean), clean);
});

// ── the question travels with the finding, so a topic-less follow-up can
// still be searched for the real thing, not for the model's own words ─────
// Same measured case, read from the other end: even once material exists,
// the CHECK's own findings must carry the conversation's anchor forward
// into proofQuery — this is what actually fixes turn two, since proofQuery
// only ever reads `claim.text`/`claim.sentence`, never the question directly.

test("extractCheckableAtoms folds the question into the finding's sentence, so proofQuery inherits real topic words from an anaphoric draft", () => {
  const findings = extractCheckableAtoms("I did just check a weather app and it's showing sunny skies and 70 degrees.", {
    question: "prove it NYC weather right now",
  });
  const figure = findings.find((f) => f.text === "70");
  assert.ok(figure, "the figure must still be flagged");
  assert.ok(/NYC/.test(figure.sentence), figure.sentence);
  const q = proofQuery({ kind: "number", text: figure.text, tokens: ["70"], sentence: figure.sentence });
  assert.ok(/weather/i.test(q), q);
  assert.ok(!/\bapp\b/i.test(q) || /weather/i.test(q), "the query must not be dominated by the model's own unanchored words alone");
});

test("checkGrounding folds the question into its findings' sentences the same way", () => {
  const passages = [{ ref: "kessington#0-40", text: "The Kessington report covers 1974 harbor traffic.", terms: new Set(["kessington", "report", "cover", "1974", "harbor", "traffic"]) }];
  const report = checkGrounding("The 1974 figure was actually 12,000 vessels, per Marlborough.", passages, {
    question: "what did the report actually say about Marlborough?",
  });
  const finding = report.findings.find((f) => f.text === "Marlborough");
  assert.ok(finding);
  assert.ok(/Marlborough/.test(finding.sentence));
});

test("seam: the chat page's own files still fetch nothing remote", () => {
  // The same wall web.test.mjs pins for the Explore files, held here for
  // the files proof-seeking touches: every host named is localhost. The
  // egress stays in explore-server.mjs, where P13 put it.
  for (const file of ["proof.js", "app.js", "index.html"]) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    const hosts = [...text.matchAll(/https?:\/\/([^\s"'`/<)]+)/g)].map((m) => ({ h: m[1], at: m.index }));
    for (const { h, at } of hosts) {
      // A link the person FOLLOWS is not a fetch. Checked by its own context
      // rather than waived: the occurrence must sit in an href, so a literal
      // that became a request would fail here exactly as it would in II.13's
      // scan. (matrix.org: P177's sign-in and invite point someone with no
      // Matrix account at the place they can make one.)
      const inHref = /href\s*[:=]\s*["'`]$/.test(text.slice(Math.max(0, at - 40), at));
      assert.ok(
        // www.w3.org appears only inside SVG xmlns attributes — a namespace
        // identifier, never fetched (the same exception II.13's own scan
        // makes in constitution.test.mjs).
        /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(h) || h === "www.w3.org" || (h === "matrix.org" && inHref),
        `${file} names a non-local host: ${h}`,
      );
    }
  }
});

// ── result ranking: the claim's context picks the pages, not the engine ─────
// Measured live 2026-08-17: "70,000" from a Borodino casualties sentence
// consulted a Gaza casualty page the engine ranked first, while three
// Borodino pages sat lower. Overlap with the claim's own words orders the
// reads; ties keep the engine's order.
test("rankResults puts claim-context pages ahead of same-figure strangers", async (t) => {
  const { rankResults } = await import("./proof.js");
  const claim = {
    kind: "number",
    text: "70,000",
    tokens: ["70000"],
    sentence: "combined casualties are usually estimated at around 70,000 at Borodino during the Napoleonic Wars",
  };
  const results = [
    { title: "IDF believes 70,000 Gazans killed in war", url: "https://timesofisrael.com/x", snippet: "civilian-combatant ratio unclear" },
    { title: "Battle of Borodino - Wikipedia", url: "https://en.wikipedia.org/wiki/Battle_of_Borodino", snippet: "combined casualties estimated around 70,000, the bloodiest day of the Napoleonic Wars" },
    { title: "Borodino: Key Facts", url: "https://arcanepast.com/borodino", snippet: "casualties at Borodino" },
  ];
  const ranked = rankResults(claim, results);
  assert.equal(ranked[0].url, "https://en.wikipedia.org/wiki/Battle_of_Borodino");
  assert.equal(ranked[1].url, "https://arcanepast.com/borodino");
  assert.equal(ranked[2].url, "https://timesofisrael.com/x", "the same-figure stranger reads last");
  // No context at all → the engine's order is kept, not scrambled.
  const flat = rankResults({ kind: "number", text: "7", tokens: [], sentence: "" }, results);
  assert.deepEqual(flat.map((r) => r.url), results.map((r) => r.url));
});
