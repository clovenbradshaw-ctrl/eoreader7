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
const PRE = `import resource,sys,os
resource.setrlimit(resource.RLIMIT_AS,(8<<30,8<<30)); resource.setrlimit(resource.RLIMIT_CPU,(45,45))
os.makedirs("out",exist_ok=True)
def save(name="fig"):
    import matplotlib.pyplot as plt
    plt.savefig("out/%s.png"%name, dpi=110, bbox_inches="tight"); plt.close("all")
DATA={f:open("data/"+f).read() for f in os.listdir("data")} if os.path.isdir("data") else {}
`;
let isolation;
const canIsolate = () => (isolation ??= spawnSync("unshare", ["-rn", "true"]).status === 0);

export function runPython(code, files = {}, { timeoutMs = 60000 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nb-"));
  fs.mkdirSync(path.join(dir, "data"));
  for (const [name, f] of Object.entries(files)) {
    const safe = name.replace(/[^\w.-]/g, "_");
    fs.writeFileSync(path.join(dir, "data", `${safe}.txt`), f.text ?? "");
    (f.tables ?? []).forEach((t, i) => fs.writeFileSync(path.join(dir, "data", `${safe}${f.tables.length > 1 ? `.${t.name ?? i}` : ""}.csv`), csv(t)));
  }
  fs.writeFileSync(path.join(dir, "cell.py"), PRE + code);
  const iso = canIsolate();
  const t0 = Date.now();
  const r = iso ? spawnSync("unshare", ["-rn", "python3", "cell.py"], { cwd: dir, encoding: "utf8", timeout: timeoutMs, maxBuffer: 4e6, env: { ...process.env, MPLBACKEND: "Agg", OPENBLAS_NUM_THREADS: "1", MPLCONFIGDIR: dir } })
    : spawnSync("python3", ["cell.py"], { cwd: dir, encoding: "utf8", timeout: timeoutMs, maxBuffer: 4e6, env: { ...process.env, MPLBACKEND: "Agg", OPENBLAS_NUM_THREADS: "1", MPLCONFIGDIR: dir } });
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
  return recordExec(state, { cell: cellId, output: r.output, ok: r.ok, figures: r.figures, ms: r.ms });
}
