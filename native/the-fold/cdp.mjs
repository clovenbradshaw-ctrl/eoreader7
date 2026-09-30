// cdp.mjs — the smallest browser driver that can look at a generated app: launch the
// headless Chromium that ships in the sandbox, speak the DevTools protocol over Node's
// own WebSocket, evaluate in the page, wait for a condition, take a screenshot.
// No dependency. Used to (a) see the running app, (b) fingerprint its rendering for the
// copy check, (c) drive it the way a person would (search, tab, units).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME_BIN ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export async function openBrowser({ width = 720, height = 1280, mobile = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
  const port = 30000 + Math.floor(Math.random() * 20000);
  const proc = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let info;
  for (let i = 0; i < 100 && !info; i++) { try { info = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); info = info.find((t) => t.type === "page"); } catch { await new Promise((r) => setTimeout(r, 150)); } }
  if (!info) { proc.kill(); throw new Error("the browser did not start"); }
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  const evalJs = async (expression) => { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
  return {
    goto: async (url) => { await send("Page.navigate", { url }); await new Promise((r) => setTimeout(r, 300)); },
    eval: evalJs,
    waitFor: async (expression, { timeoutMs = 30000, everyMs = 250 } = {}) => { const t0 = Date.now(); for (;;) { try { if (await evalJs(expression)) return true; } catch {} if (Date.now() - t0 > timeoutMs) return false; await new Promise((r) => setTimeout(r, everyMs)); } },
    screenshot: async (file, { fullPage = false } = {}) => { let clip; if (fullPage) { const m = await send("Page.getLayoutMetrics"); clip = { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 }; } const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: fullPage, ...(clip ? { clip } : {}) }); fs.writeFileSync(file, Buffer.from(r.data, "base64")); return file; },
    consoleErrors: () => events.filter((e) => e.method === "Runtime.exceptionThrown" || (e.method === "Runtime.consoleAPICalled" && e.params.type === "error")).map((e) => JSON.stringify(e.params).slice(0, 300)),
    close: () => { try { ws.close(); } catch {} proc.kill(); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
