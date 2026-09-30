#!/usr/bin/env node
// podcast-visual-pathos-read.mjs — the same real CDP extraction
// eval/podcast-visual-hierarchy-read.mjs already uses, now composed
// through organs/visual-pathos.js instead of the flat four-finding
// report: one real ground_holds/stale/collapse/contested verdict, on
// real bytes, proving THE-THEORY-OF-PATHOS.md's composition transfers
// to a real, live artifact — not only to hand-built test fixtures.
import { visualPathosOf } from "../organs/visual-pathos.js";

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:8940/";
const CDP_URL = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const FEED_URL = process.env.FEED_URL ?? "https://feeds.npr.org/510289/podcast.xml";

async function cdpSession() {
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

  const firstH3 = elements.find((e) => e.tag === "h3");
  const firstP = elements.find((e) => e.tag === "p");

  const report = visualPathosOf({
    experiencer: {
      who: "a first-time visitor scanning for one episode to play, on a laptop, ordinary indoor lighting",
      read: `${APP_URL} (subscribed to ${FEED_URL})`,
    },
    elements,
    focalId: firstH3.id,
    popOutThreshold: { value: 0.15, giver: "this driver's own declared regime dial", basis: "same disclosed starting point as podcast-visual-hierarchy-read.mjs" },
    groups: firstP ? [{ id: "episode-1", memberIds: [firstH3.id, firstP.id] }] : [],
    groupingMargin: { value: 8, giver: "this driver's own declared regime dial", basis: "same disclosed starting point as podcast-visual-hierarchy-read.mjs" },
    regime: "grid-systematic",
    tokenUsage: elements.map((e) => ({
      value: `rgb(${e.backgroundColor.join(",")})`,
      role: e.tag === "button" ? "button-bg" : e.tag === "input" ? "form-field-bg" : (e.className && e.className.includes("ethos-badge")) ? "badge-bg" : "container-bg",
    })),
  });

  const contrastFails = report.contrast.filter((f) => !f.clears);
  console.log("=== CONTRAST (disclosed alongside, never folded into the ladder) ===");
  console.log(`${report.contrast.length - contrastFails.length}/${report.contrast.length} clear WCAG; ${contrastFails.length} fail:`);
  for (const f of contrastFails) console.log(`  FAIL — ${f.id}: ratio ${f.ratio} vs floor ${f.floor}`);

  console.log("\n=== RHYTHM (from pop-out) ===");
  console.log(`flatline: ${report.read.rhythm.flatline}, min difference: ${report.popOut.minDifference}`);

  console.log("\n=== STRAIN ===");
  console.log(`rung: ${report.read.strain}, contradictions: ${report.strainState.contradictions.length}`);
  for (const c of report.strainState.contradictions) console.log(`  - [${c.kind}] ${c.detail}`);

  console.log("\n=== CURVE ===");
  console.log(`measured: ${report.read.curve.measured} (${report.read.curve.unmeasured})`);

  console.log("\n=== COMPOSED VERDICT (the real reGroundCondition, from organs/pathos.js) ===");
  console.log(`${report.condition.kind} — ${report.condition.basis}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
