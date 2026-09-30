#!/usr/bin/env node
// podcast-kind-discovery.mjs — "it needs to do kindInduction on podcast
// app and know its relationship to other apps... image content needs to
// be turned into concepts in the holograph, folded, reasoned over."
//
// Three real screenshots (Pocket Casts, a Grafana dashboard — both real,
// freely-licensed, downloaded this session) plus our own live app's real
// DOM are each turned into CONCEPT SIGHTINGS (organs/image-concepts.js),
// landed on ONE real kernel/notes.js ledger (the SAME hear()/fold() this
// whole project already reasons over), then handed to the REAL kind-
// induction organs (kernel/entity-kind-induction.js) — never a hand-typed
// boolean table. `testKindMembers` asks, with a real random-subset null,
// whether a declared "podcast-app" membership set is a genuine kind
// relative to the rest of the population; `profileJaccard` measures how
// far each entity sits from that kind's own centroid.
//
// DISCLOSED LIMIT: population n=3 (Pocket Casts, Grafana, our app) — a
// real, small population, not padded with invented entities. A result
// here is a real, licensed measurement over a thin population, stated as
// exactly that, never oversold as a general claim about "all podcast
// apps vs all other apps."
import { cdpSession } from "./podcast-cdp-lib.mjs";
import { makeNotes } from "../kernel/notes.js";
import { imageConceptSighting, domConceptSighting } from "../organs/image-concepts.js";
import { induceEntityKindCandidates, testKindMembers, profileJaccard } from "../kernel/entity-kind-induction.js";
import { createStreamingDmd } from "../kernel/dmd-stream.js";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:8940/";
const CDP_URL = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const FEED_URL = process.env.FEED_URL ?? "https://feeds.npr.org/510289/podcast.xml";
const GIVER = "this session, direct visual inspection of the real downloaded images + a real live CDP check of our own app";

// Real regions, verified by directly viewing each downloaded image this
// session (eval/reference-images/pocket-casts-podcast-tab.png,
// grafana-dashboard.webp). Coordinates are normalized 0..1, approximate
// bounding boxes around the real feature — not pixel-exact, disclosed as
// a human/model visual estimate, never claimed as CV-measured.
const POCKET_CASTS_SIGHTINGS = [
  { concept: "artwork", region: { x0: 0.02, y0: 0.15, x1: 0.30, y1: 0.35 } },          // the "This American Life" cover tile
  { concept: "persistent-player", region: { x0: 0.0, y0: 0.83, x1: 1.0, y1: 0.90 } },  // the maroon "TED Talks Daily" mini-player bar
  { concept: "grid-layout", region: { x0: 0.0, y0: 0.14, x1: 1.0, y1: 0.80 } },        // the 3-column show-tile grid
  { concept: "tab-nav", region: { x0: 0.0, y0: 0.955, x1: 1.0, y1: 1.0 } },            // Podcasts/Playlists/Discover/Up Next/Profile
  { concept: "search", region: { x0: 0.63, y0: 0.06, x1: 0.68, y1: 0.10 } },           // the magnifying-glass icon
  { concept: "progress-scrubber", region: { x0: 0.0, y0: 0.895, x1: 1.0, y1: 0.905 } },// the thin red progress line under the player
];

const GRAFANA_SIGHTINGS = [
  { concept: "search", region: { x0: 0.34, y0: 0.01, x1: 0.62, y1: 0.035 } },          // "Search or jump to..."
  { concept: "line-chart", region: { x0: 0.01, y0: 0.13, x1: 0.99, y1: 0.22 } },       // "Rabbit Overview Messages/s"
  { concept: "filter-chips", region: { x0: 0.01, y0: 0.055, x1: 0.40, y1: 0.075 } },   // queue_vhost / /listenbrainz / ...
  { concept: "breadcrumb-nav", region: { x0: 0.01, y0: 0.005, x1: 0.16, y1: 0.02 } },  // Home > Dashboards > RabbitMQ
  { concept: "time-range-picker", region: { x0: 0.78, y0: 0.055, x1: 0.86, y1: 0.075 } }, // "Last 6 hours"
];

// Every concept EITHER app-kind uses, so an absence can be checked for
// real (a concept never checked reads null, never a silently-assumed
// false).
const ALL_CONCEPTS = [...new Set([...POCKET_CASTS_SIGHTINGS, ...GRAFANA_SIGHTINGS].map((s) => s.concept))];

async function checkOurApp() {
  const { send, close } = await cdpSession(CDP_URL);
  await send("Page.navigate", { url: APP_URL });
  await new Promise((r) => setTimeout(r, 500));
  await send("Runtime.evaluate", { expression: `document.querySelector("input[type=text]").value = ${JSON.stringify(FEED_URL)}` });
  await send("Runtime.evaluate", { expression: "subscribe()" });
  await new Promise((r) => setTimeout(r, 2500));
  const expr = `(() => {
    const hasImg = document.querySelectorAll(".episode img").length > 0;
    const hasFixedPlayer = [...document.querySelectorAll("body *")].some((el) => {
      const cs = getComputedStyle(el);
      return cs.position === "fixed" && (el.querySelector("audio") || el.tagName === "AUDIO");
    });
    const container = document.querySelector(".container");
    const hasGrid = container ? getComputedStyle(container).display.includes("grid") : false;
    const hasTabNav = [...document.querySelectorAll("body *")].some((el) => {
      const cs = getComputedStyle(el);
      return cs.position === "fixed" && cs.bottom === "0px" && !el.querySelector("audio") && el.querySelectorAll("*").length >= 3;
    });
    const hasSearch = !!document.querySelector('input[type="search"], [aria-label*="search" i], [placeholder*="search" i]');
    const hasCustomScrubber = !!document.querySelector('.episode input[type="range"]');
    const hasLineChart = !!document.querySelector("canvas, svg[class*=chart], .chart");
    const hasFilterChips = document.querySelectorAll('[class*="chip"], [class*="filter"]').length > 0;
    const hasBreadcrumb = !!document.querySelector('[class*="breadcrumb"], nav ol, nav ul');
    const hasTimeRangePicker = !!document.querySelector('[class*="time-range"], [class*="daterange"]');
    return JSON.stringify({
      "artwork": hasImg, "persistent-player": hasFixedPlayer, "grid-layout": hasGrid, "tab-nav": hasTabNav,
      "search": hasSearch, "progress-scrubber": hasCustomScrubber, "line-chart": hasLineChart,
      "filter-chips": hasFilterChips, "breadcrumb-nav": hasBreadcrumb, "time-range-picker": hasTimeRangePicker,
    });
  })()`;
  const result = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
  close();
  return JSON.parse(result.result.result.value);
}

function toEntityFeatures(notes, log) {
  const noteList = notes.fold(log);
  const byEntity = new Map();
  for (const note of noteList) {
    if (note.label !== "shows") continue;
    if (!byEntity.has(note.end1)) byEntity.set(note.end1, new Map());
    byEntity.get(note.end1).set(note.end2, {
      featureKey: "concept", featureValue: note.end2,
      evidenceIds: new Set([note.id]), firstAt: 0, lastAt: 0,
    });
  }
  return byEntity;
}

function centroid(entityFeatures, entityRef, allConcepts) {
  const features = entityFeatures.get(entityRef) ?? new Map();
  return allConcepts.map((c) => (features.has(c) ? 1 : 0));
}

async function main() {
  console.log("# turning image content into notes on the real kernel/notes.js ledger...\n");
  const notes = makeNotes();
  let log = notes.createNotes({ frame: { reader: "this session", medium: "mixed: two real screenshots + one live DOM" } });

  for (const s of POCKET_CASTS_SIGHTINGS) {
    log = notes.hear(log, imageConceptSighting({ imagePath: "reference-images/pocket-casts-podcast-tab.png", concept: s.concept, region: s.region, giver: GIVER }));
  }
  for (const s of GRAFANA_SIGHTINGS) {
    log = notes.hear(log, imageConceptSighting({ imagePath: "reference-images/grafana-dashboard.webp", concept: s.concept, region: s.region, giver: GIVER }));
  }

  console.log("checking our own live app's real DOM...\n");
  const appFlags = await checkOurApp();
  console.log("app DOM facts:", JSON.stringify(appFlags), "\n");
  for (const concept of ALL_CONCEPTS) {
    const s = domConceptSighting({ appUrl: APP_URL, concept, selector: `(mechanical check: ${concept})`, giver: GIVER, present: !!appFlags[concept] });
    if (s.present) log = notes.hear(log, s); // absence is not a sighting — nothing to hear
  }

  console.log(`ledger: ${notes.fold(log).length} real notes landed, addressed and witnessed.\n`);

  const entityFeatures = toEntityFeatures(notes, log);
  console.log("entities discovered:", [...entityFeatures.keys()], "\n");
  for (const [ref, feats] of entityFeatures) console.log(`  ${ref}: ${[...feats.keys()].join(", ") || "(none)"}`);
  console.log("");

  const entityIds = [...entityFeatures.keys()];
  console.log("=== induceEntityKindCandidates (fully unsupervised — no declared members) ===\n");
  const induced = induceEntityKindCandidates(entityFeatures, { population: "app-screenshots" });
  console.log(JSON.stringify(induced.diagnostics, null, 2));
  if (induced.candidates.length) console.log("candidates:", JSON.stringify(induced.candidates, null, 2));
  else console.log("no candidate kind survived — population too small or too diffuse for this organ's own structural floor.\n");

  const ourApp = entityIds.find((id) => id === APP_URL);
  const pocketCasts = entityIds.find((id) => id.includes("pocket-casts"));
  if (ourApp && pocketCasts) {
    console.log("\n=== testKindMembers: is {our app, Pocket Casts} a genuine 'podcast-app' kind? ===\n");
    const result = testKindMembers(entityFeatures, [ourApp, pocketCasts], { population: "app-screenshots" });
    console.log(JSON.stringify(result, null, 2));
  }

  console.log("\n=== profileJaccard: real similarity between each entity and Pocket Casts' own profile ===\n");
  const pcVec = pocketCasts ? centroid(entityFeatures, pocketCasts, ALL_CONCEPTS) : null;
  const similarities = [];
  for (const id of entityIds) {
    const v = centroid(entityFeatures, id, ALL_CONCEPTS);
    const j = pcVec ? profileJaccard(pcVec, v) : null;
    similarities.push({ id, jaccardToPocketCasts: j });
    console.log(`  ${id}: Jaccard-to-Pocket-Casts = ${j}`);
  }

  console.log("\n=== DMD over the similarity sequence, ordered by declared distance from Pocket Casts ===\n");
  console.log("DISCLOSED: DMD (kernel/dmd-stream.js) measures a state's growth rate over an ORDERED push sequence.");
  console.log("There is no time axis across app kinds — this pushes similarity-to-Pocket-Casts in DECLARED order");
  console.log("(most similar to least), reporting the eigenvalue as how sharply similarity falls off across that");
  console.log("ordering, not a temporal signal. A genuinely different reuse of the organ, named as exactly that.\n");
  const ordered = [...similarities].filter((s) => s.jaccardToPocketCasts != null).sort((a, b) => b.jaccardToPocketCasts - a.jaccardToPocketCasts);
  console.log("declared order:", ordered.map((s) => `${s.id}(${s.jaccardToPocketCasts})`).join(" -> "));
  if (ordered.length < 3) {
    console.log("\nDMD needs at least a few pushed states to fit a mode — this population is too small (n=" + ordered.length + ") to license a real DMD read. Refusing rather than reporting a number from 2 points.");
  } else {
    const dmd = createStreamingDmd({ dims: 1 });
    for (const s of ordered) dmd.push([s.jaccardToPocketCasts]);
    console.log(JSON.stringify(dmd.modes({ rank: 1 }), null, 2));
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
