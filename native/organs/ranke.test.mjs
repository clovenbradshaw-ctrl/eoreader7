// ranke.test.mjs — Ranke, the primary-source chase, offline: the REAL
// Austerlitz page fixture (its real outbound links), the REAL Dracula
// bytes as the novel control, stub fetch/search organs that serve declared
// faces, the real ledger door. No network anywhere.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { makeHyperlexicon } from "./hyperlexicon.js";
import { RANKE, PRIMARY_KIND, QUOTE_MIN_WORDS, claimOfNote, primaryWitness, standsOnAccountsOnly, leadsOf, footnoteLeads as leadsOfFootnotes, footnoteLeadsForNote, markersIn, markersOfSpan, documentMatches, archiveAddressFor, chase, chaseLedger } from "./ranke.js";
import { kindOfWitness, sourceOfWitness } from "../kernel/notes.js";
import { distinctSources, independentReadings } from "./corroboration.js";
import { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect } from "./testimony.js";
import { splitSentences } from "../adapters/text/spans.js";

// A stub WITNESS over the real select protocol: the model is replaced by a
// picker that answers "yes" ONLY for claims the test DECLARES as stated —
// and then points at the first listed sentence carrying the claim's words
// — and "no" for every other claim, including the same-index arm's
// sibling-swapped twin (the protocol is armed: a picker that says yes to
// the swap too is refused `indiscriminate`, which is what a containment
// stub would earn — and did, on the first cut of this test). It proves the
// WIRING (a "states" lands, a "no" does not, no witness lands nothing);
// it is not evidence about any real source.
const stubWitness = (stated = []) => ({
  ask: async () => ({ verdict: "silent" }),
  selectAsk: async (messages) => {
    const user = messages[messages.length - 1].content;
    const claim = (user.match(/Claim: "([^"]*)"/) ?? [])[1] ?? "";
    if (!stated.some((c) => c.toLowerCase() === claim.toLowerCase())) return { stated: "no", sentence: 0 };
    const want = claim.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
    const lines = user.split("\n").filter((l) => /^\d+\. /.test(l));
    const idx = lines.findIndex((l) => want.every((w) => l.toLowerCase().includes(w)));
    return idx >= 0 ? { stated: "yes", sentence: idx + 1 } : { stated: "no", sentence: 0 };
  },
  testimony: { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect },
  splitSentences,
});
import * as nativeTaskLog from "../kernel/task-log.js";
import { cellOf, GRAINS } from "../kernel/cube.js";

const FIX = new URL("../eval/the-fold/fixtures/", import.meta.url).pathname;
const html = readFileSync(`${FIX}/wikipedia-battle-of-austerlitz.html`, "utf8");
const hl = makeHyperlexicon({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf });
const PAGE = "wikipedia-battle-of-austerlitz.html";
const pages = [{ ref: PAGE, html, host: "en.wikipedia.org", text: "" }];

// A served face carries the citation's own title words, as the cited
// document does — the identity check (documentMatches) reads them; a stub
// face without them is, correctly, the wrong document.
const titled = (url, text, links) => `${(links ?? []).find((l) => l.url === url)?.text ?? ""} ${text}`;

const ledger = () => {
  let log = hl.createHyperlexicon({ frame: { reader: "test", walls: true } });
  log = hl.hear(log, { subject: "Napoleon", verb: "defeated", object: "the Third Coalition", witness: `${PAGE}#100-160~walls-v1`, spans: [{ ref: PAGE, at: `${PAGE}#100-160`, text: "x" }] });
  log = hl.hear(log, { subject: "Kutuzov", verb: "commanded", object: "the Allied army", witness: `${PAGE}#300-360~walls-v1`, spans: [{ ref: PAGE, at: `${PAGE}#300-360`, text: "y" }] });
  return log;
};

test("leads: a citing page's outbound links are leads and the page's own host and family are not; a note's claim is its ends' content words", () => {
  const l = leadsOf(pages[0]);
  assert.equal(l.citing, true);
  assert.ok(l.links.length > 20, `the real page links out to ${l.links.length} sources`);
  assert.ok(l.links.every((c) => c.host !== "en.wikipedia.org" && !/wik/i.test(c.host)), "self and family links are navigation");
  const claim = claimOfNote({ end1: "Napoleon", label: "defeated", end2: "the Third Coalition" });
  assert.deepEqual(claim.tokens, ["napoleon", "coalition"], "ordinals are stopwords in grounding.js's own list");
  assert.equal(claimOfNote({ end1: "the", label: "is", end2: "of" }), null, "no content word, no claim");
  assert.equal(primaryWitness("archive.org", { start: 5, end: 9 }), "primary:archive.org#5-9~ranke-v1");
  assert.equal(kindOfWitness(primaryWitness("archive.org", { start: 5, end: 9 })), PRIMARY_KIND);
  assert.equal(sourceOfWitness(primaryWitness("archive.org", { start: 5, end: 9 })), "archive.org");
  assert.equal(RANKE.recipe, "ranke-v1");
});

test("THE GATE: a novel cites nothing, so its thousands of quotation marks are not leads — typed no_citations, zero searches, zero fetches", async () => {
  const book = "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const text = existsSync(book) ? readFileSync(book, "utf8").slice(100000, 400000) : `“I am glad you found your way in here, for I am sure there is much that will interest you,” he said. `.repeat(400);
  assert.ok((text.match(/[“”"]/g) ?? []).length > 500, "the control is full of quotation marks"); // both curly marks: the fallback text has no straight quotes
  const novel = { ref: "dracula.txt", html: text, text, host: "" };
  const l = leadsOf(novel);
  assert.equal(l.citing, false);
  assert.equal(l.refused.type, "no_citations");
  assert.deepEqual(l.quotes, []);
  let log = hl.createHyperlexicon({ frame: { reader: "test" } });
  log = hl.hear(log, { subject: "Renfield", verb: "grows", object: "more interesting", witness: "dracula.txt#10-40~walls-v1", spans: [] });
  let searches = 0, fetches = 0;
  const r = await chaseLedger(log, hl, [novel], { fetchFace: async () => { fetches += 1; return { gap: { type: "x" } }; }, search: async () => { searches += 1; return []; }, maxFetches: 10, maxSearches: 10 });
  assert.equal(r.pagesRefused.length, 1);
  assert.equal(r.notesConsidered, 0, "a page that cites nothing is not an account to chase from");
  assert.equal(searches, 0); assert.equal(fetches, 0);
});

test("a note that only a citing page states stands on accounts only; a chased note does not", () => {
  const isAccount = (ref) => ref === PAGE;
  assert.equal(standsOnAccountsOnly({ witnesses: [`${PAGE}#1-2~r`, `testimony:${PAGE}`] }, { isAccount }), true, "a sighting and a vote from the same account are still accounts");
  assert.equal(standsOnAccountsOnly({ witnesses: [`${PAGE}#1-2~r`, "primary:archive.org#5-9~ranke-v1"] }, { isAccount }), false);
  assert.equal(standsOnAccountsOnly({ witnesses: [`${PAGE}#1-2~r`, "book.txt#1-2~r"] }, { isAccount }), false, "a non-account witness is not chased from");
  assert.equal(standsOnAccountsOnly({ witnesses: [] }, { isAccount }), false);
});

test("chase by link: the stating primary attests the note with an addressed primary: witness; a silent primary is a result, not a refutation; a failed fetch is a typed gap; standing keeps the kinds apart", async () => {
  const log = ledger();
  const note = hl.foldHyperlexicon(log).find((n) => n.subject === "Napoleon");
  const leads = leadsOf(pages[0]);
  const faces = {
    stating: "In the winter of 1805 the Emperor took the field. Napoleon defeated the armies of the Third Coalition at Austerlitz on 2 December. The peace followed within weeks.",
    silent: "A catalogue of uniforms of the period, with plates. Nothing here about the campaign.",
  };
  let i = 0;
  const fetchFace = async (url) => {
    i += 1;
    if (i === 1) return { text: titled(url, faces.stating, leads.links), url, host: "archive.org", path: "/faces/1.txt" };
    if (i === 2) return { gap: { type: "http", status: 503 } };
    return { text: titled(url, faces.silent, leads.links), url, host: "example.edu", path: "/faces/3.txt" };
  };
  // no witness injected: the lead is REPORTED and nothing lands
  i = 0;
  const unwitnessed = await chase(log, hl, note, { leads, fetchFace, consult: 3 });
  assert.equal(unwitnessed.consulted[0].snipsFound, 1);
  assert.equal(unwitnessed.consulted[0].unwitnessed, true, "a containment lead without a witness is disclosed, never landed");
  assert.equal(unwitnessed.attested.length, 0);
  // a witness that says no: the lead stays a lead
  i = 0;
  const denied = await chase(log, hl, note, { leads, fetchFace, consult: 3, witness: stubWitness([]) });
  assert.equal(denied.attested.length, 0);
  assert.equal(denied.consulted[0].witness?.refused, "no-testimony", "the witness's own no is typed on the lead");
  i = 0;
  const r = await chase(log, hl, note, { leads, fetchFace, consult: 3, witness: stubWitness(["Napoleon defeated the Third Coalition"]) });
  assert.equal(r.consulted.length, 3);
  assert.equal(r.consulted[0].via, "link");
  assert.equal(r.consulted[0].snipsFound, 1);
  assert.equal(r.consulted[0].witness?.verdict, "states");
  assert.equal(r.consulted[1].gap.type, "http");
  assert.equal(r.consulted[2].snipsFound, 0);
  assert.equal(r.attested.length, 1);
  const w = r.attested[0];
  assert.match(w, /^primary:archive\.org#\d+-\d+~ranke-v1$/);
  const [start, end] = w.slice(w.indexOf("#") + 1, w.indexOf("~")).split("-").map(Number);
  assert.equal(titled(r.consulted[0].url, faces.stating, leads.links).slice(start, end), "Napoleon defeated the armies of the Third Coalition at Austerlitz on 2 December.", "the address reproduces the stating sentence in the served face (P5.2)");
  const after = hl.foldWithStanding(r.log).find((n) => n.id === note.id);
  assert.equal(after.sources, 2);
  assert.deepEqual(after.kinds, { sighting: 1, primary: 1 });
  assert.equal(after.standing, "corroborated-independently", "the page's reader and Ranke are different instruments");
  assert.equal(distinctSources(after.witnesses).size, 2, "corroboration.js reads the kernel's one sourceOfWitness — primary: is a kind, not a source named primary");
  assert.equal(independentReadings(after.witnesses).count, 2);
  assert.equal(hl.foldWithStanding(r.log).find((n) => n.id !== note.id).sources, 1, "the other note was never touched");
  await assert.rejects(() => chase(log, hl, note, { leads }), /fetchFace is injected/);
  const gated = await chase(log, hl, note, { leads: { citing: false, refused: { type: "no_citations" } }, fetchFace, witness: stubWitness([]) });
  assert.equal(gated.refused.type, "no_citations");
});

test("chase by quote: an unsourced quotation on a citing page is searched, the result read, and the note attested only if the found face states it; the quote itself is reported found or not", async () => {
  const text = `The dispatch reached Vienna that night. “The enemy has been routed at every point and the Emperor is master of the field,” the messenger read. Later accounts differ.`;
  const page = { ref: "report.html", host: "history.example", text, html: `<p>See <a href="https://gazette.example/1805/dec">the gazette</a>.</p>` };
  const l = leadsOf(page);
  assert.equal(l.citing, true);
  assert.equal(l.links.length, 1);
  assert.equal(l.quotes.length, 1, "one quotation of >= QUOTE_MIN_WORDS words with no link of its own");
  assert.ok(l.quotes[0].words.length >= QUOTE_MIN_WORDS);
  assert.equal(text.slice(l.quotes[0].start, l.quotes[0].end), l.quotes[0].text, "the quote is addressed into the text face");
  let log = hl.createHyperlexicon({ frame: { reader: "test" } });
  log = hl.hear(log, { subject: "the Emperor", verb: "is", object: "master of the field", witness: "report.html#60-120~walls-v1", spans: [] });
  const [note] = hl.foldHyperlexicon(log);
  const searched = [];
  const search = async (q) => { searched.push(q); return [{ url: "https://archive.example/bulletin-30", host: "archive.example", title: "30th Bulletin" }]; };
  const fetchFace = async (url) => ({ url, host: "archive.example", text: url.includes("gazette") ? "Prices of grain in December." : "Bulletin of the Grande Armée. The enemy has been routed at every point and the Emperor is master of the field, Marshal Berthier wrote. Signed at Austerlitz." }); // the stating sentence carries a competing name (Berthier), so the select protocol can ARM its same-index check — a stating sentence with no other capitalized surface refuses `unarmed-select` by the protocol's own posture (competingFiller draws the arm from the candidate sentences themselves)
  const r = await chase(log, hl, note, { leads: l, fetchFace, search, consult: 3, witness: stubWitness(["the Emperor is master of the field"]) });
  assert.equal(searched.length, 1, "the relevant quote was searched once");
  const viaQuote = r.consulted.find((c) => c.via === "quote");
  assert.ok(viaQuote, "a search result became a candidate");
  assert.equal(viaQuote.quoteFound, true);
  assert.equal(viaQuote.snipsFound, 1);
  assert.equal(r.attested.length, 1);
  assert.match(r.attested[0], /^primary:archive\.example#/);
  const noSearch = await chase(log, hl, note, { leads: l, fetchFace, consult: 3, witness: stubWitness(["the Emperor is master of the field"]) });
  assert.equal(noSearch.consulted.every((c) => c.via === "link"), true, "without a search organ, quotes are not chased");
});

test("chaseLedger: one face is read once across notes, budgets are declared and typed when spent, and the redealt control attests nothing the real ledger did", async () => {
  const log = ledger();
  const face = "Napoleon defeated the armies of the Third Coalition at Austerlitz. Kutuzov commanded the Allied army that day.";
  let fetches = 0;
  const links = leadsOf(pages[0]).links;
  const fetchFace = async (url) => { fetches += 1; return { text: titled(url, face, links), url, host: "archive.org", path: "/f" }; };
  const r = await chaseLedger(log, hl, pages, { fetchFace, maxFetches: 2, consult: 1, witness: stubWitness(["Napoleon defeated the Third Coalition", "Kutuzov commanded the Allied army"]) });
  assert.equal(r.witnessed, true);
  assert.equal(r.notesConsidered, 2);
  // only a link sharing a word with the note's claim is a lead for it, so
  // the fixture's citations decide which notes can be chased at all
  assert.ok(r.notesAttested >= 1, "the Napoleon/Coalition note has leads on the real page");
  assert.equal(r.chased.find((c) => c.note.startsWith("Napoleon")).attested.length, 1);
  assert.ok(r.fetches <= 2 && r.fetches === fetches);
  assert.equal(r.pagesRefused.length, 0);
  await assert.rejects(() => chaseLedger(log, hl, pages, { fetchFace }), /maxFetches is declared/);
  await assert.rejects(() => chaseLedger(log, hl, pages, { fetchFace, maxFetches: 1, search: async () => [] }), /maxSearches is declared/);
  // CONTROL (II.23): the same face, the ends redealt — end2 of each note
  // swapped for the other's. Containment now needs both ends' words in one
  // sentence, which the real face does not offer for the swapped pairs.
  let bad = hl.createHyperlexicon({ frame: { reader: "test" } });
  bad = hl.hear(bad, { subject: "Napoleon", verb: "defeated", object: "the Allied army", witness: `${PAGE}#100-160~walls-v1`, spans: [] });
  bad = hl.hear(bad, { subject: "Kutuzov", verb: "commanded", object: "the Third Coalition", witness: `${PAGE}#300-360~walls-v1`, spans: [] });
  const c = await chaseLedger(bad, hl, pages, { fetchFace, maxFetches: 2, consult: 1, witness: stubWitness(["Napoleon defeated the Third Coalition", "Kutuzov commanded the Allied army"]) });
  assert.equal(c.notesAttested, 0, "the redealt ledger earns no primary witness from the same face");
  // a face that is one long sentence naming everything DOES attest the
  // redeal — containment is not a verdict, which is why the control is
  // reported beside the number and the witness tier judges the sentence
  const glued = async (url) => ({ text: titled(url, face.replace(". ", ", and "), links), url, host: "archive.org" });
  // a witness that (wrongly) declares the redealt claim stated DOES land it
  // on the glued face — the landing is exactly as good as the witness's read,
  // which is why the live witness is a model and the control is reported
  // beside every number
  const g = await chaseLedger(bad, hl, pages, { fetchFace: glued, maxFetches: 2, consult: 1, witness: stubWitness(["Napoleon defeated the Allied army"]) });
  assert.equal(g.notesAttested, 1);
  // budget: a spent budget is a typed gap on the consulted list, never a silent skip
  const b = await chaseLedger(log, hl, pages, { fetchFace, maxFetches: 0, consult: 1 });
  assert.equal(b.fetches, 0);
  assert.ok(b.chased.some((c) => c.consulted.length && c.consulted[0].gap?.type === "budget"), "a spent budget is a typed gap");
  // an account predicate that names nothing chases nothing
  const none = await chaseLedger(log, hl, pages, { fetchFace, maxFetches: 2, isAccount: () => false });
  assert.equal(none.notesConsidered, 0);
});

test("footnote binding: a marker in the prose is an in-page link to one numbered note, and that note's outbound links are the lead for THAT sentence — bound first, before any overlap-ranked link", async () => {
  const apollo = readFileSync(`${FIX}/wikipedia-apollo-11.html`, "utf8");
  const pg = { ref: "apollo", html: apollo, host: "en.wikipedia.org", url: "https://en.wikipedia.org/wiki/Apollo_11" };
  const fn = leadsOfFootnotes(pg);
  assert.ok(fn.markers > 200, `the real page carries ${fn.markers} markers`);
  assert.ok(fn.byNumber.size > 100, `${fn.byNumber.size} numbered notes carry an outbound link`);
  for (const [, links] of fn.byNumber) for (const l of links) assert.ok(!/wikipedia|wikimedia/.test(l.host), "self and family links are never leads");
  // "[ 139 ] At 02:51 Armstrong began his descent to the lunar surface." — the text face keeps the marker
  assert.deepEqual(markersIn("[ 139 ] At 02:51 Armstrong began his descent."), [139]);
  assert.deepEqual(markersIn("no marker here"), []);
  // a footnote that cites a book carries no outbound link — an honest empty binding
  assert.deepEqual(footnoteLeadsForNote({ spans: [{ text: "[ 139 ] At 02:51 Armstrong began his descent." }] }, { byNumber: new Map() }), []);
  // pick a numbered note that DOES link out, and a span carrying its marker
  const [num] = fn.byNumber.keys();
  const note = { subject: "Armstrong", verb: "began", object: "his descent to the lunar surface", end1: "Armstrong", end2: "his descent to the lunar surface", witnesses: ["apollo#1-2~r"], spans: [{ ref: "apollo", at: "apollo#1-2", text: `At 02:51 Armstrong began his descent to the lunar surface. [ ${num} ]` }] };
  const bound = footnoteLeadsForNote(note, fn);
  assert.ok(bound.length >= 1, "the note's own footnote binds to at least one outbound link");
  assert.equal(bound[0].footnote, num);
  // a note with no marker binds nothing — and is still chased by overlap
  assert.deepEqual(footnoteLeadsForNote({ ...note, spans: [{ text: "At 02:51 Armstrong began his descent." }] }, fn), []);
  // in chase, the footnote lead is consulted FIRST
  let log = hl.createHyperlexicon({ frame: { reader: "test" } });
  log = hl.hear(log, { subject: "Armstrong", verb: "began", object: "his descent to the lunar surface", witness: "apollo#1-2~r", spans: [{ ref: "apollo", at: "apollo#1-2", text: note.spans[0].text }] });
  const [n] = hl.foldHyperlexicon(log);
  const urls = [];
  const r = await chase(log, hl, n, { leads: leadsOf(pg), footnotes: fn, fetchFace: async (u) => { urls.push(u); return { gap: { type: "x" } }; }, consult: 2 });
  assert.equal(r.consulted[0].via, "footnote");
  assert.equal(urls[0], bound[0].url);
});

test("a marker at the start of a span is the previous sentence's; the sentence's own marker trails it — and a fetched face that lacks the citation's title words is the wrong document, so the archive copy is read", async () => {
  assert.deepEqual(markersOfSpan("[ 139 ] At 02:51 Armstrong began his descent.", "[ 140 ] Aldrin followed."), [140], "the leading marker is excluded, the trailing one (in the text after the span) is this sentence's");
  assert.deepEqual(markersOfSpan("Aldrin joined Armstrong on the surface. [ 152 ]", ""), [152]);
  assert.deepEqual(markersOfSpan("[ 5 ] plain sentence", "no marker follows"), []);
  const cite = `"The Apollo Lunar Surface Journal: Apollo 11 landing transcript". NASA History. Retrieved 2024.`;
  assert.equal(documentMatches("Explore the Apollo Lunar Surface Journal and Apollo Flight Journal to discover detailed historical resources.", cite).matches, true);
  assert.equal(documentMatches("NASA's Dark Universe-Seeking Nancy Grace Roman Space Telescope Launches", cite).matches, false);
  assert.equal(documentMatches("anything", "NASA").matches, null, "a citation with fewer than three content words cannot be checked");
  assert.equal(archiveAddressFor("https://hq.nasa.gov/alsj/a11/a11.landing.html"), "https://web.archive.org/web/2/https://hq.nasa.gov/alsj/a11/a11.landing.html");
  // in chase: a bound lead whose face is another document → the archive copy is fetched and read
  const fn = { byNumber: new Map([[7, [{ url: "https://hq.nasa.gov/alsj/a11/a11.landing.html", host: "hq.nasa.gov", text: cite, index: 0, structuralClass: "other", overlap: 0 }]]]) };
  let log = hl.createHyperlexicon({ frame: { reader: "test" } });
  log = hl.hear(log, { subject: "Aldrin", verb: "joined", object: "Armstrong on the surface", witness: "apollo#1-2~r", spans: [{ ref: "apollo", at: "apollo#1-2", text: "Aldrin joined Armstrong on the surface. [ 7 ]" }] });
  const [n] = hl.foldHyperlexicon(log);
  const fetched = [];
  const fetchFace = async (u) => { fetched.push(u); return /web\.archive\.org/.test(u)
    ? { text: "Apollo Lunar Surface Journal. Apollo 11 landing transcript. Aldrin joined Armstrong on the surface at 109:43, and Houston acknowledged. Collins circled above.", url: u, host: "hq.nasa.gov" }
    : { text: "NASA's Dark Universe-Seeking Nancy Grace Roman Space Telescope Launches. Explore missions.", url: "https://www.nasa.gov/", host: "nasa.gov" }; };
  const r = await chase(log, hl, n, { leads: { citing: true, links: [], quotes: [] }, footnotes: fn, fetchFace, consult: 2, witness: stubWitness(["Aldrin joined Armstrong on the surface"]) });
  assert.equal(fetched.length, 2, "the portal face failed the identity check, so the archive address was read");
  assert.match(fetched[1], /^https:\/\/web\.archive\.org\/web\/2\//);
  assert.equal(r.consulted[0].viaArchive, true);
  assert.equal(r.consulted[0].snipsFound, 1);
  assert.equal(r.attested.length, 1);
});

// ── hubs, lost paths, chrome (2026-09-02) ─────────────────────────────────
import { redirectHubs, pathLost, normalizedPath, chromeLines, stripChrome } from "./ranke.js";
{
  const index = {
    a: { url: "https://www.hq.nasa.gov/alsj/a11/a11.step.html", finalUrl: "https://www.nasa.gov/history/alsj-and-afj/" },
    b: { url: "https://history.nasa.gov/afj/ap11fj/01launch.html", finalUrl: "https://www.nasa.gov/history/alsj-and-afj/" },
    c: { url: "https://www.nasa.gov/mission_pages/apollo/missions/apollo11.html", finalUrl: "https://www.nasa.gov/history/apollo-11-mission-overview/" },
    d: { url: "http://www.nasa.gov/x.html", finalUrl: "https://www.nasa.gov/x" },
    e: { url: "https://x.org/gone", gap: { type: "http" } },
  };
  const hubs = redirectHubs(index);
  assert.ok(hubs.has("nasa.gov/history/alsj-and-afj"), "two different transcripts resolving to one portal make it a hub");
  assert.ok(!hubs.has("nasa.gov/history/apollo-11-mission-overview"), "one citation moving to one new address is a move, not a hub");
  assert.strictEqual(normalizedPath(index.d.url), normalizedPath(index.d.finalUrl), "scheme/www/.html are not a different path");
  assert.ok(pathLost(index.a.url, index.a.finalUrl), "a11.step lost its own segment");
  assert.ok(!pathLost(index.d.url, index.d.finalUrl), "a normalisation-only redirect loses nothing");
  // archive copies: two snapshots of one target under two schemes are ONE document, not a hub (measured: three same-sentence hits lost to this, 2026-09-02)
  const arch = {
    p: { url: "https://web.archive.org/web/2/http://www.hq.nasa.gov/alsj/a11/images11.html", finalUrl: "https://web.archive.org/web/20200224163200/https://www.hq.nasa.gov/alsj/a11/images11.html" },
    q: { url: "https://web.archive.org/web/2/https://www.hq.nasa.gov/alsj/a11/images11.html#Mag37", finalUrl: "https://web.archive.org/web/20200224163200/https://www.hq.nasa.gov/alsj/a11/images11.html" },
  };
  assert.strictEqual(redirectHubs(arch).size, 0, "snapshots of one target are that target");
  assert.strictEqual(normalizedPath(arch.p.url), "archive:hq.nasa.gov/alsj/a11/images11");
}
{
  const nav = "Suggested Searches\n- Humans in Space\n- The Universe";
  const foot = "Keep Exploring\nWas this page helpful?";
  const f1 = `${nav}\nArmstrong began his descent.\nThe crew rested.\n${foot}`;
  const f2 = `${nav}\nFive sites were considered.\n${foot}`;
  const lone = "Only page on its host.\nNothing shared.";
  const c = chromeLines([f1, f2]);
  assert.strictEqual(c.head, 3); assert.strictEqual(c.tail, 2);
  const s = stripChrome(f1, [f2]);
  assert.strictEqual(s.text, "Armstrong began his descent.\nThe crew rested.", "body survives, chrome does not");
  assert.deepStrictEqual(stripChrome(lone, []), { text: lone, head: 0, tail: 0 }, "no sibling: nothing removed, typed as zero");
  assert.strictEqual(stripChrome(f2, [f2]).text, "", "a face identical to its sibling is all chrome — an empty face, which is the honest answer");
}
console.log("ranke: hubs, lost paths, chrome — ok");
