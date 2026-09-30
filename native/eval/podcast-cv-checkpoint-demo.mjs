#!/usr/bin/env node
// podcast-cv-checkpoint-demo.mjs — live proof of visual-checkpoint.mjs,
// honestly scoped: this app has NO clipping/overflow CSS today (checked
// directly against its real <style> block), so it cannot currently
// exhibit the failure this checkpoint exists for. Two cases, both real:
// (1) the ACTUAL current app, a real feed subscribe, as a clean baseline
// — OCR should agree with the DOM because there is nothing to hide it
// behind; (2) a CONSTRUCTED fixture with real CSS clipping added, proving
// the mechanism catches the gap the moment one exists, rather than
// claiming a finding this app does not currently have.
import fs from "node:fs";

const CDP_URL = "http://127.0.0.1:9222";

async function cdpSession() {
  const targets = await (await fetch(`${CDP_URL}/json`)).json();
  let page = targets.find((t) => t.type === "page");
  if (!page) page = await (await fetch(`${CDP_URL}/json/new?about:blank`, { method: "PUT" })).json();
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

async function screenshotAndDom(session, { url, evalExpr, domSelector }) {
  const { send } = session;
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 500));
  if (evalExpr) {
    await send("Runtime.evaluate", { expression: evalExpr });
    await new Promise((r) => setTimeout(r, 800));
  }
  const domResult = await send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(domSelector)})?.textContent ?? ""`, returnByValue: true });
  const shot = await send("Page.captureScreenshot", { format: "png" });
  return { domText: domResult.result.result.value, pngBuffer: Buffer.from(shot.result.data, "base64") };
}

async function main() {
  const { visualFidelityCheck } = await import("../adapters/build/visual-checkpoint.mjs");
  const session = await cdpSession();

  console.log("=== Case 1: the REAL current app, real fuzz-server subscribe (baseline — no clipping CSS exists in this app) ===");
  const case1 = await screenshotAndDom(session, {
    url: "http://127.0.0.1:8933/",
    evalExpr: `document.getElementById('urlInput').value='case:apostrophe'; document.getElementById('subscribeButton').click();`,
    domSelector: "#episodes li",
  });
  fs.writeFileSync("/tmp/cv-case1-baseline.png", case1.pngBuffer);
  const result1 = await visualFidelityCheck({ domText: case1.domText, pngBuffer: case1.pngBuffer, expectSubstrings: ["trap"] });
  console.log(`DOM text: "${case1.domText.trim()}"`);
  console.log(`OCR text: "${result1.ocrText.trim().slice(0, 200)}"`);
  console.log(`visually intact: ${result1.visuallyIntact}`);
  console.log(`finding: ${result1.finding}\n`);

  console.log("=== Case 2: a CONSTRUCTED fixture with real CSS clipping added (proving the mechanism, not claiming this bug exists in the live app) ===");
  const clippedHtml = `<!DOCTYPE html><html><body>
    <div id="episodes" style="width:120px; height:20px; overflow:hidden; white-space:nowrap; font-family:sans-serif;">
      This sentence is much longer than the box that contains it and most of it is genuinely invisible
    </div>
  </body></html>`;
  const dataUrl = `data:text/html,${encodeURIComponent(clippedHtml)}`;
  const case2 = await screenshotAndDom(session, { url: dataUrl, domSelector: "#episodes" });
  fs.writeFileSync("/tmp/cv-case2-clipped.png", case2.pngBuffer);
  const result2 = await visualFidelityCheck({ domText: case2.domText, pngBuffer: case2.pngBuffer, expectSubstrings: ["invisible"] });
  console.log(`DOM text (${case2.domText.trim().length} chars): "${case2.domText.trim()}"`);
  console.log(`OCR text (${result2.ocrText.trim().length} chars): "${result2.ocrText.trim()}"`);
  console.log(`visually intact: ${result2.visuallyIntact}`);
  console.log(`finding: ${result2.finding}\n`);

  session.close();

  console.log("=== VERDICT ===");
  console.log(result1.visuallyIntact && !result2.visuallyIntact
    ? "SURVIVED: the real app's own content (no clipping CSS) reads back cleanly via OCR — no false alarm on a genuinely fine page. The constructed clipping fixture is correctly flagged: real DOM content that a real screenshot shows is NOT actually visible to a person, caught by OCR, invisible to any DOM/attribute-level check alone."
    : "FALSIFIED — reported honestly, see the two cases above.");
}

main().catch((e) => { console.error("FATAL:", e); process.exitCode = 1; });
