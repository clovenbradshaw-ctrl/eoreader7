// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 5 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-drive.mjs — drive a generated app the way a person would, and look at it.
//
//   driveApp({ dir, places, shots, port?, proxyEnv? }) -> { ok, steps:[{ place, ... }], errors, texts }
//
// Starts the app's own server (node server.mjs), opens it in the sandbox's headless Chromium at a phone
// width, searches each place, waits until the weather and fuel sections have drawn (or said why they could
// not), toggles units, walks the tabs, and writes a screenshot at each stop. What it reads back is what is
// on screen — the page's visible strings — so a claim like "it shows the weather for Paris" is checked
// against the page, not against the server's JSON.
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { openBrowser } from "./cdp.mjs";

const VISIBLE = `(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const el = n.parentElement; if (!el || el.closest('script,style,template,[hidden]')) continue; const t = n.textContent.trim(); if (t) out.push(t); } return out; })()`;

export async function startApp(dir, { port = 21000 + Math.floor(Math.random() * 8000), env = {} } = {}) {
  const child = spawn(process.execPath, [path.join(dir, "server.mjs"), String(port)], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_USE_ENV_PROXY: "1", ...env } });
  let log = "";
  child.stderr.on("data", (d) => (log += d)); child.stdout.on("data", (d) => (log += d));
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("app did not start: " + log.slice(0, 300))), 8000); child.stdout.on("data", (d) => { if (String(d).includes("http://")) { clearTimeout(t); res(); } }); child.on("exit", (c) => rej(new Error("app exited " + c + ": " + log.slice(0, 300)))); });
  return { port, url: `http://127.0.0.1:${port}/`, stop: () => child.kill(), log: () => log };
}

export async function driveApp({ dir, places = ["London"], shots, width = 390, height = 844, timeoutMs = 60000, env = {} }) {
  fs.mkdirSync(shots, { recursive: true });
  const app = await startApp(dir, { env });
  const br = await openBrowser({ width, height });
  const steps = [];
  try {
    for (const place of places) {
      const step = { place };
      await br.goto(app.url + "#" + encodeURIComponent(place));
      // a place in the URL hash is searched on load; wait for the page to settle into data or a stated gap
      step.settled = await br.waitFor(`(() => { const w = document.querySelector('#weather-body'), g = document.querySelector('#weather-gap'); return (w && !w.hidden) || (g && !g.hidden); })()`, { timeoutMs });
      await br.waitFor(`(() => { const f = document.querySelector('#fuel-body'), g = document.querySelector('#fuel-gap'); return !document.querySelector('#fuel') || (f && !f.hidden) || (g && !g.hidden); })()`, { timeoutMs: 40000 });
      step.texts = await br.eval(VISIBLE);
      step.shot = await br.screenshot(path.join(shots, `${place.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-metric.png`), { fullPage: true });
      step.source = await br.eval(`document.querySelector('#source')?.textContent ?? ''`);
      // imperial toggle
      await br.eval(`document.querySelector('.opts button[data-units=imperial]').click()`);
      await br.waitFor(`document.querySelector('#weather-body') && !document.querySelector('#weather-body').hidden && !document.body.classList.contains('busy')`, { timeoutMs });
      step.textsImperial = await br.eval(VISIBLE);
      step.shotImperial = await br.screenshot(path.join(shots, `${place.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-imperial.png`), { fullPage: true });
      // tabs: click the second day
      const tabs = await br.eval(`document.querySelectorAll('#tabs button').length`);
      step.tabs = tabs;
      if (tabs > 1) { await br.eval(`document.querySelectorAll('#tabs button')[1].click()`); step.dayTwoRows = await br.eval(`document.querySelectorAll('#entries .entry').length`); }
      await br.eval(`document.querySelector('.opts button[data-units=metric]').click()`);
      await br.waitFor(`!document.body.classList.contains('busy')`, { timeoutMs });
      steps.push(step);
    }
    return { ok: steps.every((s) => s.settled), steps, errors: br.consoleErrors(), appLog: app.log().slice(-500) };
  } finally { br.close(); app.stop(); }
}
