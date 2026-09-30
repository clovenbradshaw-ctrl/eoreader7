#!/usr/bin/env node
// podcast-visual-hierarchy-read.mjs — the real crossing: walk the LIVE,
// rendered page over CDP (getComputedStyle + getBoundingClientRect on
// every visible text/interactive element), extract exactly the shape
// organs/visual-hierarchy.js's pure functions need, and produce a real,
// graded report against the actual currently-served podcast app. Never
// reads the source CSS/HTML as text — every number here is what a real
// browser actually computed and painted.
import { visualHierarchyRead } from "../organs/visual-hierarchy.js";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:8940/";
const CDP_URL = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const FEED_URL = process.env.FEED_URL ?? "https://feeds.npr.org/510289/podcast.xml";

async function cdpSession() {
  const targets = await (await fetch(`${CDP_URL}/json`)).json();
  const page = await (await fetch(`${CDP_URL}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  await new Promise((r) => ws.addEventListener("open", r));
  const send = (method, params = {}) => new Promise((resolve) => {
    const myId = ++id;
    pending.set(myId, resolve);
    ws.send(JSON.stringify({ id: myId, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  return { send, close: () => ws.close() };
}

// Runs INSIDE the real page — the extraction itself is real DOM reading,
// never a guess from source text. Returns exactly the element shape
// visual-hierarchy.js's pure functions consume: rgb triples (not "rgb(...)"
// strings), px numbers (not "16px" strings), a bounding rect.
const EXTRACT_EXPR = `(() => {
  const parseRgb = (s) => {
    const m = /rgba?\\(([^)]+)\\)/.exec(s);
    if (!m) return [255, 255, 255];
    return m[1].split(",").slice(0, 3).map((n) => parseFloat(n));
  };
  const els = [];
  let n = 0;
  for (const el of document.querySelectorAll("h1, h3, p, button, input, .ethos-badge")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const cs = getComputedStyle(el);
    n += 1;
    els.push({
      id: el.tagName.toLowerCase() + "-" + n,
      tag: el.tagName.toLowerCase(),
      className: el.className || null,
      text: (el.textContent || "").trim().slice(0, 60),
      fontSizePx: parseFloat(cs.fontSize),
      bold: parseInt(cs.fontWeight, 10) >= 600,
      color: parseRgb(cs.color),
      backgroundColor: parseRgb(cs.backgroundColor === "rgba(0, 0, 0, 0)" ? getComputedStyle(document.body).backgroundColor : cs.backgroundColor),
      areaPx: rect.width * rect.height,
      rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
    });
  }
  return JSON.stringify(els);
})()`;

async function main() {
  const { send, close } = await cdpSession();
  await send("Page.navigate", { url: APP_URL });
  await new Promise((r) => setTimeout(r, 500));
  await send("Runtime.evaluate", { expression: `document.querySelector("input[type=text]").value = ${JSON.stringify(FEED_URL)}` });
  await send("Runtime.evaluate", { expression: "subscribe()" });
  await new Promise((r) => setTimeout(r, 3000));
  const result = await send("Runtime.evaluate", { expression: EXTRACT_EXPR, returnByValue: true });
  const elements = JSON.parse(result.result.result.value);
  close();

  console.log(`extracted ${elements.length} visible elements from the real rendered page\n`);

  const h1 = elements.find((e) => e.tag === "h1");
  const firstH3 = elements.find((e) => e.tag === "h3");
  const firstBadge = elements.find((e) => e.className && e.className.includes("ethos-badge"));
  const firstP = elements.find((e) => e.tag === "p");

  const read = visualHierarchyRead({
    experiencer: {
      who: "a first-time visitor scanning for one episode to play, on a laptop, ordinary indoor lighting",
      read: `${APP_URL} (subscribed to ${FEED_URL})`,
    },
    elements,
    focalId: firstH3?.id ?? h1.id,
    popOutThreshold: { value: 0.15, giver: "this driver's own declared regime dial", basis: "a round, disclosed starting point — no primary source in the literature review gives a numeric pop-out cutoff; this is named as a dial precisely so it is never mistaken for one" },
    groups: firstH3 && firstP ? [{ id: "episode-1", memberIds: [firstH3.id, firstP.id] }] : [],
    groupingMargin: { value: 8, giver: "this driver's own declared regime dial", basis: "same disclosed-starting-point posture as popOutThreshold" },
    regime: "grid-systematic",
    // FOUND LIVE, FIXED HERE: the first cut labeled every element's
    // background "bg" uniformly, so the button's intentionally-different
    // accent green was reported as an "inconsistency" against the page's
    // near-black — a false positive from a role label too coarse to
    // distinguish "this IS the page background" from "this is a button's
    // own accent color," two genuinely different semantic roles that have
    // no reason to share a value. Roled by tag/class, matching what the
    // CSS itself actually targets (button vs. page vs. badge vs. text
    // container) — still real, still measured (a real rgb() from the real
    // computed style), just not force-flattened into one bucket.
    tokenUsage: elements.map((e) => ({
      value: `rgb(${e.backgroundColor.join(",")})`,
      role: e.tag === "button" ? "button-bg"
        : e.tag === "input" ? "form-field-bg" // a text input's own white field is a distinct, legitimate role from the page's dark background — the SAME class of false positive the button already surfaced once
        : (e.className && e.className.includes("ethos-badge")) ? "badge-bg" : "container-bg",
    })),
  });

  console.log("=== CONTRAST (well-evidenced, W3C WCAG) ===");
  for (const f of read.contrast) {
    console.log(`${f.clears ? "PASS" : "FAIL"} — ${f.id}: ratio ${f.ratio} vs floor ${f.floor}`);
  }

  console.log("\n=== POP-OUT (well-evidenced, Wolfe & Horowitz) ===");
  console.log(`focal: ${read.popOut.focalId}, min difference from any neighbor: ${read.popOut.minDifference}`);
  console.log(`flatline: ${read.popOut.flatline} (threshold ${read.popOut.thresholdGiver ? read.popOut.perNeighbor && "declared" : ""})`);

  console.log("\n=== GROUPING (well-evidenced-in-principle, Palmer) ===");
  for (const g of read.grouping) {
    console.log(`${g.groupId}: within ${g.maxWithinGap}px, nearest outside ${g.nearestOutsideGap}px, clears=${g.clears}`);
  }

  console.log("\n=== REGIME (practitioner-grade, disclosed) ===");
  console.log(`declared: ${read.regime.declaredRegime}, contested: ${read.regime.contested}`);
  if (read.regime.inconsistentRoles?.length) {
    console.log(`inconsistent roles: ${JSON.stringify(read.regime.inconsistentRoles)}`);
  }

  console.log("\n=== RAW ELEMENT DUMP (first 8) ===");
  console.log(JSON.stringify(elements.slice(0, 8), null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
