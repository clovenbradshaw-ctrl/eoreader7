#!/usr/bin/env node
// podcast-fuzz-loop.mjs — the "loops on loops" fix. Every prior harm-gate
// falsification (podcast-harm-gate-falsify.mjs, -false-positives.mjs,
// -self-defense.mjs) checked the mechanism against a small, HAND-PICKED
// set of adversarial cases. That is a real check on a CLOSED question
// (three ethos values, four known bug shapes) — it says nothing about an
// OPEN one: what happens with a real episode title, drawn from the actual
// space of text a real feed can produce. The quote-injection bug (a real
// NPR title, "Based on a \"true\" story", breaking
// `download="${title}.mp3"` into garbage attributes) was invisible to
// every hand-picked case this session had written, because none of them
// happened to contain a quote.
//
// This loop is the fix: adversarial-but-realistic TITLES
// (adapters/build/fuzz-values.mjs, a declared, named sample of known
// injection-prone shapes — quotes, angle brackets, script content,
// ampersands, RTL text, emoji, the app's own template-literal syntax
// appearing inside user data) driven through the REAL, unmodified,
// currently-served app in a REAL browser (not a hand-rolled HTML parser
// standing in for one), reading back the REAL DOM's own attribute value
// after the browser has parsed whatever the app produced. A real browser
// is the only honest oracle for "did this attribute survive intact" —
// this session's earlier CDP-driven live test is what actually found the
// bug in the first place; this loop is that same technique, generalized
// from "one case I happened to try" into a standing, re-runnable suite.
//
// PREREQUISITES (both already proven working live this session): a
// server on 127.0.0.1:8933 serving the CURRENT ledger fold at "/" and a
// controllable "/api/subscribe?url=case:<id>" (podcast-fuzz-server.mjs,
// kept in scratch rather than committed — it is a TEST HARNESS, not part
// of the app), and a headless Chrome with CDP on 127.0.0.1:9222.
import { FUZZ_TITLES } from "../adapters/build/fuzz-values.mjs";

const APP_URL = process.env.FUZZ_APP_URL ?? "http://127.0.0.1:8933/";
const CDP_URL = process.env.FUZZ_CDP_URL ?? "http://127.0.0.1:9222";

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

/** runFuzzCase — navigates the REAL, currently-served app fresh, types
 * "case:<id>" as the feed url (the fuzz server maps that to the real
 * fuzzed title), clicks subscribe for real, and reads back what the REAL
 * BROWSER actually parsed — the download attribute's true value and the
 * visible text content — never a string comparison against source HTML,
 * which is exactly the check that would have missed this bug (the raw
 * HTML source technically "contains" the title; whether a real DOM
 * preserves it as one attribute value is the only question that matters). */
async function runFuzzCase(session, testCase) {
  const { send } = session;
  await send("Page.navigate", { url: APP_URL });
  await new Promise((r) => setTimeout(r, 400));
  await send("Runtime.evaluate", { expression: `document.getElementById('urlInput').value = ${JSON.stringify(`case:${testCase.id}`)}` });
  await send("Runtime.evaluate", { expression: `document.getElementById('subscribeButton').click()` });
  await new Promise((r) => setTimeout(r, 600));
  const result = await send("Runtime.evaluate", {
    expression: `(() => {
      const a = document.querySelector('#episodes a');
      const audio = document.querySelector('#episodes audio');
      const li = document.querySelector('#episodes li');
      return JSON.stringify({
        rendered: !!(a || audio),
        downloadAttr: a ? a.getAttribute('download') : null,
        hrefAttr: a ? a.getAttribute('href') : null,
        visibleText: li ? li.textContent.replace(/\\s+/g, ' ').trim() : null,
        // A real corruption often leaves stray boolean attributes behind
        // (the exact NPR specimen: download="" plus based="" on="" a=""
        // true="" story"="" ...). Count attributes on the anchor as a
        // structural tell — a well-formed anchor has exactly 2 (href,
        // download); more means the browser's own parser absorbed
        // leaked content as bogus attributes.
        anchorAttrCount: a ? a.attributes.length : null,
        anchorAttrNames: a ? [...a.attributes].map(x => x.name) : null,
      });
    })()`,
    returnByValue: true,
  });
  return JSON.parse(result.result.result.value);
}

function expectedFilename(title) {
  return `${title}.mp3`;
}

async function main() {
  console.log(`fuzzing ${FUZZ_TITLES.length} adversarial title(s) through the REAL app + REAL browser\n`);
  const session = await cdpSession();
  const results = [];
  for (const testCase of FUZZ_TITLES) {
    // eslint-disable-next-line no-await-in-loop
    const observed = await runFuzzCase(session, testCase);
    const expected = expectedFilename(testCase.value);
    const attrIntact = observed.downloadAttr === expected;
    const extraAttrs = (observed.anchorAttrNames ?? []).filter((n) => n !== "href" && n !== "download");
    const clean = observed.rendered && attrIntact && extraAttrs.length === 0;
    results.push({ ...testCase, observed, expected, attrIntact, extraAttrs, clean });
    console.log(`${clean ? "CLEAN" : "CORRUPTED"} — [${testCase.id}] ${testCase.class}`);
    if (!clean) {
      console.log(`  expected download="${expected.length > 60 ? expected.slice(0, 60) + "…" : expected}"`);
      console.log(`  observed download=${JSON.stringify(observed.downloadAttr)}`);
      if (extraAttrs.length) console.log(`  LEAKED into ${extraAttrs.length} bogus attribute(s): ${extraAttrs.slice(0, 8).join(", ")}${extraAttrs.length > 8 ? "…" : ""}`);
    }
    console.log();
  }
  session.close();

  const corrupted = results.filter((r) => !r.clean);
  console.log(`=== VERDICT: ${results.length - corrupted.length}/${results.length} clean, ${corrupted.length} corrupted ===`);
  if (corrupted.length) {
    console.log(`Corrupted classes: ${corrupted.map((r) => r.id).join(", ")}`);
    console.log(`This is the loop finding what hand-picked cases miss — real, not hypothetical: the naive template-literal markup this app generates is broken by ANY of these classes, not just the one NPR specimen happened to surface.`);
  }
  process.exitCode = corrupted.length ? 1 : 0;
}

main().catch((e) => { console.error("FATAL:", e); process.exitCode = 2; });
