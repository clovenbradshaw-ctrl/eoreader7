// notebook-run.mjs — the crossing: run a cell, record what ran.
//
// python: a fresh `python3` in a temp directory with the notebook's ingested files
//   written under ./data/ (tables as CSV, text as .txt), CPU/memory limits set by
//   resource.setrlimit, and — where the host allows it — NO NETWORK (`unshare -rn`).
//   When network isolation is unavailable the run says so in its own record; it is never
//   silently assumed. This is an authority wall by construction, not a hardened sandbox
//   (P14's own posture): the person's code runs as the person.
// js: the fold's own vm sandbox (sandboxed-agent.js), nothing granted.
// Figures: any PNG the code writes to ./out/ (≤ 3, ≤ 1.5 MB each) is stored, hashed, on the entry.
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runSandboxedJs } from "../sandboxed-agent.js";
import { sourceOf, cellOf, recordExec } from "./notebook.mjs";

const csv = (t) => [t.header, ...t.rows].map((r) => r.map((c) => (/[",\n]/.test(c ?? "") ? `"${String(c).replace(/"/g, '""')}"` : c ?? "")).join(",")).join("\n");
const ER7PY = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../organs/er7py");
// The runner: limits, the fold's tools already imported (`from er7 import *`, np, plt), and Jupyter's rule —
// the LAST expression of a cell is displayed. The person's code lives in user.py so tracebacks name its own lines.
const RUNNER = `import resource,sys,os,ast
resource.setrlimit(resource.RLIMIT_AS,(8<<30,8<<30)); resource.setrlimit(resource.RLIMIT_CPU,(45,45))
os.makedirs("out",exist_ok=True)
from er7 import *
try:
    import numpy as np
    import matplotlib.pyplot as plt
except Exception: pass
src=open("user.py").read()
tree=ast.parse(src,"user.py")
last=tree.body.pop() if tree.body and isinstance(tree.body[-1],ast.Expr) else None
g=globals()
exec(compile(tree,"user.py","exec"),g)
if last is not None:
    v=eval(compile(ast.Expression(last.value),"user.py","eval"),g)
    if v is not None: print(repr(v))
`;
let isolation;
const canIsolate = () => (isolation ??= spawnSync("unshare", ["-rn", "true"]).status === 0);

/** dataFiles(files) -> { "data/<name>": text } — exactly the files a python cell sees (the export bundle writes the same ones). */
export function dataFiles(files = {}) {
  const out = {};
  for (const [name, f] of Object.entries(files)) {
    const safe = name.replace(/[^\w.-]/g, "_");
    out[`data/${safe}.txt`] = f.text ?? "";
    (f.tables ?? []).forEach((t, i) => { out[`data/${safe}${f.tables.length > 1 ? `.${t.name ?? i}` : ""}.csv`] = csv(t); });
  }
  return out;
}
export const ER7PY_DIR = ER7PY;
export { RUNNER };
/** envOf() -> { python, numpy, matplotlib, er7py } — the environment a run happens in, recorded on every exec entry so a Methods
 *  paragraph can name it FROM THE LEDGER. er7py is the SHA-256 of the helper library's files (the library's version, by content). */
let envCache;
export function envOf() {
  if (envCache) return envCache;
  const r = spawnSync("python3", ["-c", "import sys,json\nv={'python':sys.version.split()[0]}\nfor m in ('numpy','matplotlib'):\n    try:\n        v[m]=__import__(m).__version__\n    except Exception:\n        v[m]=None\nprint(json.dumps(v))"], { encoding: "utf8" });
  let v = {}; try { v = JSON.parse(r.stdout); } catch { v = { python: null, numpy: null, matplotlib: null }; }
  const h = createHash("sha256"); for (const f of fs.readdirSync(ER7PY).filter((x) => x.endsWith(".py")).sort()) h.update(f + "\0" + fs.readFileSync(path.join(ER7PY, f)));
  return (envCache = { ...v, er7py: h.digest("hex").slice(0, 16), isolated: canIsolate() });
}

export function runPython(code, files = {}, { timeoutMs = 60000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nb-"));
  fs.mkdirSync(path.join(dir, "data"));
  for (const [rel, text] of Object.entries(dataFiles(files))) fs.writeFileSync(path.join(dir, rel), text);
  fs.writeFileSync(path.join(dir, "user.py"), code); fs.writeFileSync(path.join(dir, "cell.py"), RUNNER);
  const iso = canIsolate();
  const t0 = Date.now();
  const r = iso ? spawnSync("unshare", ["-rn", "python3", "cell.py"], { cwd: dir, encoding: "utf8", timeout: timeoutMs, maxBuffer: 4e6, env: { ...process.env, MPLBACKEND: "Agg", PYTHONPATH: ER7PY, ER7_ISOLATED: iso ? "1" : "", OPENBLAS_NUM_THREADS: "1", MPLCONFIGDIR: dir } })
    : spawnSync("python3", ["cell.py"], { cwd: dir, encoding: "utf8", timeout: timeoutMs, maxBuffer: 4e6, env: { ...process.env, MPLBACKEND: "Agg", PYTHONPATH: ER7PY, ER7_ISOLATED: iso ? "1" : "", OPENBLAS_NUM_THREADS: "1", MPLCONFIGDIR: dir } });
  const figures = [];
  const od = path.join(dir, "out");
  for (const f of fs.existsSync(od) ? fs.readdirSync(od).filter((x) => x.endsWith(".png")).slice(0, 3) : []) {
    const b = fs.readFileSync(path.join(od, f));
    if (b.length <= 1.5e6) figures.push({ name: f, sha: createHash("sha256").update(b).digest("hex"), png: b.toString("base64") });
  }
  const timedOut = r.error?.code === "ETIMEDOUT" || r.signal === "SIGTERM";
  const out = [r.stdout ?? "", r.stderr ? `\n[stderr]\n${r.stderr.slice(-1500)}` : "", timedOut ? "\n[stopped: time limit]" : "", iso ? "" : "\n[note: network isolation unavailable on this host; this run was NOT network-isolated]"].join("");
  fs.rmSync(dir, { recursive: true, force: true });
  return { ok: r.status === 0 && !timedOut, output: out.trim(), figures, ms: Date.now() - t0 };
}

/** runCell(state, cellId) -> { state, exec } | { error } */
export function runCell(state, cellId) {
  const c = cellOf(state.nb, cellId);
  if (!c || c.type !== "code") return { error: "not a code cell" };
  const code = sourceOf(state.nb, cellId);
  const r = c.lang === "js" ? (() => { const t = Date.now(); const x = runSandboxedJs(`(function(){\n${code}\n})()`); return { ...x, figures: [], ms: Date.now() - t }; })() : runPython(code, state.files);
  return recordExec(state, { cell: cellId, output: r.output, ok: r.ok, figures: r.figures, ms: r.ms, env: c.lang === "js" ? { js: "vm" } : envOf() });
}
