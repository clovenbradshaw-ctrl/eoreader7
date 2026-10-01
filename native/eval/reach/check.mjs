// native/eval/reach/check.mjs — executable checkers for the reach battery.
//
// A checker answers two questions about an artifact AFTER an edit, by running it:
//   requested — is the change that was asked for present?
//   intact    — does everything that worked before still work?
// Never a regex on source standing in for behaviour (the failure this battery
// exists to measure). Python runs under `python3 -I` with a scrubbed environment,
// node under its permission model (no writes, no children), SQL in an in-memory
// sqlite, HTML in a real Chromium with the network aborted. Code written by a
// model is small here (a few lines edited in a 10–30 line file), but it is still
// code a model wrote: nothing runs in this process.
//
// Every checker is validated against a known-good edit, a region-only edit and a
// no-op by native/tests/reach-battery.test.js — a checker that passes the
// region-only edit on a coupled task, or fails the known-good one, is broken.

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const run = (cmd, args, { input = "", timeoutMs = 10000, cwd } = {}) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd, env: { PATH: process.env.PATH, HOME: os.tmpdir(), LANG: "C.UTF-8" }, stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  let err = "";
  let done = false;
  const finish = (r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } };
  const t = setTimeout(() => { child.kill("SIGKILL"); finish({ ok: false, timedOut: true, out, err }); }, timeoutMs);
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  child.on("close", (code) => finish({ ok: code === 0, code, out, err }));
  child.on("error", (e) => finish({ ok: false, out, err: String(e) }));
  child.stdin.on("error", () => {});
  child.stdin.end(input);
});

async function withTmp(files, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reach-"));
  try {
    for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
    return await fn(dir);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
const lastJson = (r) => {
  if (!r.ok) return { error: r.timedOut ? "timed out" : (r.err.trim().split("\n").pop() || "failed") };
  try { return JSON.parse(r.out.trim().split("\n").pop()); } catch { return { error: "the probe printed no JSON" }; }
};

// ── python ───────────────────────────────────────────────────────────────────
const py = (artifact, probe) => withTmp({ "mod.py": artifact }, async (dir) => {
  const code = `import sys, json\nsys.path.insert(0, ${JSON.stringify(dir)})\nres = {}\ntry:\n    import mod\nexcept BaseException as e:\n    print(json.dumps({"error": "import failed: " + type(e).__name__}))\n    raise SystemExit(0)\n${probe}\nprint(json.dumps(res))\n`;
  return lastJson(await run("python3", ["-I", "-c", code], { cwd: dir }));
});
const attempt = (expr, key, dflt = "False") => `try:\n    res[${JSON.stringify(key)}] = bool(${expr})\nexcept BaseException:\n    res[${JSON.stringify(key)}] = ${dflt}\n`;

// ── javascript (node) ────────────────────────────────────────────────────────
const nodeRun = (artifact, probe) => withTmp({ "artifact.cjs": artifact, "probe.cjs": probe }, async (dir) => {
  const r = await run(process.execPath, ["--experimental-permission", `--allow-fs-read=${dir}`, path.join(dir, "probe.cjs")], { cwd: dir });
  return lastJson(r);
});
const nodeProbe = (requestedExpr, intactExpr) => `const res = {};
try { const m = require("./artifact.cjs"); res.requested = !!(${requestedExpr}); } catch (e) { res.requested = false; }
try { const m = require("./artifact.cjs"); res.intact = !!(${intactExpr}); } catch (e) { res.intact = false; }
console.log(JSON.stringify(res));`;

// ── sql (sqlite, in memory) ──────────────────────────────────────────────────
const sql = (artifact, probe) => {
  const code = `import sqlite3, sys, json\ncon = sqlite3.connect(":memory:")\nscript = sys.stdin.read()\nres = {"ran": True}\ntry:\n    con.executescript(script)\nexcept BaseException as e:\n    res["ran"] = False\n${probe}\nprint(json.dumps(res))\n`;
  return run("python3", ["-I", "-c", code], { input: artifact }).then(lastJson);
};

// ── markdown ─────────────────────────────────────────────────────────────────
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-");
const mdState = (text) => {
  const heads = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim());
  const slugs = new Set(heads.map(slug));
  const dangling = [...text.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]).filter((l) => !slugs.has(l));
  return { heads, dangling };
};
const count = (text, re) => (text.match(re) ?? []).length;
// A defined term is consistent when exactly one of its candidate names is in use
// and it is used everywhere the document used it (`uses` = the definition + its uses).
const termConsistent = (text, names, uses) => { const present = names.filter((n) => new RegExp(`\\b${n}\\b`).test(text)); return present.length === 1 && count(text, new RegExp(`\\b${present[0]}\\b`, "g")) === uses; };

// ── html (real chromium) ─────────────────────────────────────────────────────
let browserPromise = null;
async function getBrowser() {
  browserPromise ??= (async () => {
    const root = execSync("npm root -g", { encoding: "utf8" }).trim();
    const { chromium } = createRequire(import.meta.url)(path.join(root, "playwright"));
    return chromium.launch({ executablePath: process.env.ER7_CHROMIUM || chromium.executablePath(), args: ["--no-sandbox"] });
  })();
  return browserPromise;
}
export async function closeBrowser() {
  if (!browserPromise) return;
  try { await (await browserPromise).close(); } catch { /* already gone */ }
  browserPromise = null;
}
export async function htmlAvailable() {
  try { await getBrowser(); return true; } catch { browserPromise = null; return false; }
}
async function htmlProbe(artifact, fn) {
  const browser = await getBrowser();
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    await page.route("**/*", (route) => route.abort());
    await page.setContent(artifact, { waitUntil: "load", timeout: 5000 });
    return await fn(page);
  } catch (e) { return { error: String(e).split("\n")[0].slice(0, 160) }; } finally { await ctx.close(); }
}
const has = (page, id) => page.evaluate((i) => !!document.getElementById(i), id);
const click = (page, id) => page.evaluate((i) => { document.getElementById(i)?.click(); }, id);
const text = (page, id) => page.evaluate((i) => document.getElementById(i)?.textContent ?? null, id);
const bg = (page, id) => page.evaluate((i) => { const e = document.getElementById(i); return e ? getComputedStyle(e).backgroundColor : null; }, id);
const GREEN = "rgb(34, 170, 119)"; // #2a7

// ── the checkers, by task ────────────────────────────────────────────────────
export const CHECKERS = {
  // `intact` is judged on the button under WHICHEVER id it carries, so it is true of an
  // unedited page and false of one whose script or style no longer finds the button.
  "html-id-a": (a) => htmlProbe(a, async (page) => {
    const [n, o] = [await has(page, "startBtn"), await has(page, "startButton")];
    const id = n ? "startBtn" : o ? "startButton" : null;
    if (id) await click(page, id);
    return { requested: n && !o, intact: !!id && (await text(page, "status")) === "Running" && (await bg(page, id)) === GREEN };
  }),
  "html-id-b": (a) => htmlProbe(a, async (page) => {
    const [n, o] = [await has(page, "amount"), await has(page, "qty")];
    await click(page, "go");
    const linked = await page.evaluate(() => { const l = document.querySelector("label"); const i = document.querySelector("input"); return !!l && !!i && l.control === i; });
    return { requested: n && !o, intact: (await text(page, "out")) === "6" && linked };
  }),
  "html-control": (a) => htmlProbe(a, async (page) => {
    const [n, o] = [await has(page, "note"), await has(page, "footnote")];
    await click(page, "startButton");
    return { requested: n && !o, intact: (await text(page, "status")) === "Running" && (await bg(page, "startButton")) === GREEN };
  }),

  "py-sig-a": (a) => py(a, attempt('mod.area({"w": 2, "h": 3}) == 6', "requested") + attempt('mod.report(mod.BOXES) == "a: area=6 perimeter=10\\nb: area=20 perimeter=18"', "intact")),
  "py-sig-b": (a) => py(a, attempt('mod.parse("a,3") == {"name": "a", "value": 3}', "requested") + attempt('mod.total(["a,3", "b,4"]) == 7 and mod.names(["a,3", "b,4"]) == ["a", "b"]', "intact")),
  "py-control": (a) => py(a, `import inspect\n` + attempt('"acc" in inspect.getsource(mod.total) and "s +=" not in inspect.getsource(mod.total)', "requested") + attempt('mod.total(["a,3", "b,4"]) == 7', "intact")),
  "dyn-key": (a) => py(a, attempt('"user_key" in mod.ROW and "user_id" not in mod.ROW', "requested") + attempt('mod.label() == "#7"', "intact")),

  "js-key-a": (a) => nodeRun(a, nodeProbe('m.config.maxRetries === 3 && !("retryLimit" in m.config)', "m.attempts(10) === 3")),
  "js-key-b": (a) => nodeRun(a, nodeProbe('m.DEFAULTS.httpPort === 8080 && !("port" in m.DEFAULTS)', 'm.url("/x") === "http://localhost:8080/x"')),
  "js-control": (a) => nodeRun(a, nodeProbe("m.config.timeoutMs === 750", "m.attempts(10) === 3")),

  "sql-col-a": (a) => sql(a, `try:\n    cols = [r[1] for r in con.execute("PRAGMA table_info(people)")]\n    res["requested"] = "display_name" in cols and "fullname" not in cols\nexcept BaseException:\n    res["requested"] = False\ntry:\n    res["intact"] = bool(res["ran"]) and [list(r) for r in con.execute("SELECT * FROM adults")] == [["Bo", 41]]\nexcept BaseException:\n    res["intact"] = False\n`),
  "sql-col-b": (a) => sql(a, `try:\n    cols = [r[1] for r in con.execute("PRAGMA table_info(items)")]\n    res["requested"] = "unit_price" in cols and "price" not in cols\nexcept BaseException:\n    res["requested"] = False\ntry:\n    res["intact"] = bool(res["ran"]) and [list(r) for r in con.execute("SELECT * FROM expensive")] == [["b"]]\nexcept BaseException:\n    res["intact"] = False\n`),
  "sql-control": (a) => sql(a, `try:\n    d = {r[1]: r[4] for r in con.execute("PRAGMA table_info(people)")}\n    res["requested"] = d.get("age") == "0"\nexcept BaseException:\n    res["requested"] = False\ntry:\n    res["intact"] = bool(res["ran"]) and [list(r) for r in con.execute("SELECT fullname FROM adults")] == [["Bo"]]\nexcept BaseException:\n    res["intact"] = False\n`),

  "md-anchor-a": async (a) => { const s = mdState(a); return { requested: s.heads.includes("Installation") && !s.heads.includes("Setup"), intact: s.dangling.length === 0 }; },
  "md-anchor-b": async (a) => { const s = mdState(a); return { requested: s.heads.includes("Schema") && !s.heads.includes("Data model"), intact: s.dangling.length === 0 }; },
  "md-control": async (a) => { const s = mdState(a); return { requested: /^Apache-2\.0$/m.test(a) && !/^MIT$/m.test(a), intact: s.dangling.length === 0 && s.heads.includes("Setup") }; },

  "term-a": async (a) => ({ requested: /"Vendor" means/.test(a) && !/"Supplier" means/.test(a), intact: termConsistent(a, ["Supplier", "Vendor"], 4) && /within 30 days/.test(a) }),
  "term-b": async (a) => ({ requested: /"Customer" means/.test(a) && !/"Client" means/.test(a), intact: termConsistent(a, ["Client", "Customer"], 4) && /within 10 days/.test(a) }),
  "term-control": async (a) => ({ requested: /within 45 days/.test(a) && !/within 30 days/.test(a), intact: count(a, /\bSupplier\b/g) === 4 && count(a, /\bClient\b/g) === 2 }),
};

/** checkTask(task, artifactAfter) → { requested, intact, error? } — never throws. */
export async function checkTask(task, artifactAfter) {
  const fn = CHECKERS[task.id];
  if (!fn) return { requested: false, intact: false, error: `no checker for ${task.id}` };
  const r = await fn(artifactAfter);
  if (r?.error) return { requested: false, intact: false, error: r.error };
  return { requested: !!r.requested, intact: !!r.intact };
}
