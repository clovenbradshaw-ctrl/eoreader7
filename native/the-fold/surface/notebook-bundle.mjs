// notebook-bundle.mjs — TAKE THE WORK AWAY: one zip that re-runs in a clean python3, with no fold server, and says whether it
// reproduced what the ledger recorded.
//
// Fold invariant: WHAT IS RE-RUN IS WHAT RAN. For every code cell the bundle carries the CODE of its last recorded run (the exec
// entry's own `code`, not the cell's current source — an edited-but-not-rerun cell would otherwise be judged against output some
// other code produced), the data files exactly as the runner wrote them for that cell, and the helper library the runner put on the
// path. `run_all.py` runs each one in a fresh directory, the same way the fold's runner does (er7 preloaded, the last expression
// shown), and compares every `#finding` / `#result` line with the ledger's. A difference is printed and fails the run; nothing
// is smoothed.
//
//   notebook.ipynb     nbformat 4, ledger heads in metadata, a first setup cell so Jupyter finds er7py/ and data/
//   data/*             the ingested files as a cell sees them (tables as CSV, text as .txt)
//   er7py/*.py         the fold's python helpers (er7, turb, swarm)
//   run_all.py         the reproduction check          expected.json   the recorded #finding / #result lines per run
//   requirements.txt   the versions the runs recorded   README.md       the exact command
import fs from "node:fs"; import path from "node:path";
import { execsOf, sourceOf } from "./notebook.mjs";
import { toIpynb } from "./notebook-ipynb.mjs";
import { dataFiles, ER7PY_DIR, RUNNER } from "./notebook-run.mjs";

export const BUNDLE_SCHEMA = "EOBundle@1";
const MARK = /^#(finding|result) .*$/gm;
export const markedLines = (output) => [...String(output ?? "").matchAll(MARK)].map((m) => m[0].trimEnd());

// ── a stored (uncompressed) zip: small, dependency-free, readable by every unzip ──
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function zip(files) {
  const parts = [], cd = []; let off = 0;
  for (const [name, data] of Object.entries(files)) {
    const nb = Buffer.from(name, "utf8"), raw = Buffer.isBuffer(data) ? data : Buffer.from(String(data), "utf8"), crc = crc32(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(raw.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(raw.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(lh, nb, raw); cd.push(ch, nb); off += 30 + nb.length + raw.length;
  }
  const cdb = Buffer.concat(cd), end = Buffer.alloc(22), n = cd.length / 2;
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(n, 8); end.writeUInt16LE(n, 10); end.writeUInt32LE(cdb.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdb, end]);
}

const RUN_ALL = (runner) => `#!/usr/bin/env python3
"""Re-run every recorded code run of this notebook in a fresh directory and compare its #finding / #result lines with the
ledger's (expected.json). Plain python3 + the packages in requirements.txt; no fold server, no network needed.

    python3 run_all.py            # exit 0 only if every line matched
"""
import json, os, shutil, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = ${JSON.stringify(runner)}
exp = json.load(open(os.path.join(HERE, "expected.json"), encoding="utf8"))
bad = 0
for run in exp["runs"]:
    d = tempfile.mkdtemp(prefix="er7-")
    try:
        shutil.copytree(os.path.join(HERE, "data"), os.path.join(d, "data")) if os.path.isdir(os.path.join(HERE, "data")) else os.makedirs(os.path.join(d, "data"))
        open(os.path.join(d, "user.py"), "w", encoding="utf8").write(open(os.path.join(HERE, run["code"]), encoding="utf8").read())
        open(os.path.join(d, "cell.py"), "w", encoding="utf8").write(RUNNER)
        env = dict(os.environ, MPLBACKEND="Agg", PYTHONPATH=os.path.join(HERE, "er7py"), OPENBLAS_NUM_THREADS="1", MPLCONFIGDIR=d)
        r = subprocess.run([sys.executable, "cell.py"], cwd=d, capture_output=True, text=True, env=env, timeout=900)
        got = [l.rstrip() for l in r.stdout.splitlines() if l.startswith("#finding ") or l.startswith("#result ")]
        same = got == run["lines"]
        bad += 0 if same else 1
        print(("MATCH   " if same else "DIFFER  ") + run["cell"] + " (run " + str(run["n"]) + ", " + str(len(run["lines"])) + " marked line(s))")
        if not same:
            for l in run["lines"]: print("   ledger:", l)
            for l in got: print("   now:   ", l)
            if r.returncode: print("   stderr:", r.stderr[-600:])
    finally:
        shutil.rmtree(d, ignore_errors=True)
print("reproduced %d of %d recorded run(s)" % (len(exp["runs"]) - bad, len(exp["runs"])))
sys.exit(1 if bad else 0)
`;

/** bundle(state, { title, notes }) -> { files: {path: string|Buffer}, zip: Buffer, runs, skipped } */
export function bundle(state, { title = "notebook" } = {}) {
  // the bundle's runner is the fold's own, with the resource limits made optional (not every OS has them)
  const runner = RUNNER.replace(/^import resource,sys,os,ast\nresource\.setrlimit[^\n]*\n/, "import sys,os,ast\ntry:\n    import resource\n    resource.setrlimit(resource.RLIMIT_AS,(8<<30,8<<30)); resource.setrlimit(resource.RLIMIT_CPU,(45,45))\nexcept Exception: pass\n");
  const files = {}, runs = [], skipped = []; const envs = new Map();
  const code = state.nb.entries.filter((e) => e.kind === "cell" && e.type === "code");
  for (const c of code) {
    const last = execsOf(state.nb, c.id).at(-1);
    if (!last) { skipped.push({ cell: c.id, why: "never run — nothing recorded to reproduce" }); continue; }
    if (c.lang !== "python") { skipped.push({ cell: c.id, why: `a ${c.lang} cell — ran in the fold's vm, not in python3` }); continue; }
    const rel = `code/${c.id.replace(/[^\w.-]/g, "_")}.py`; files[rel] = last.code;
    runs.push({ cell: c.id, n: last.n, code: rel, hash: last.hash, codeSha: last.codeSha, lines: markedLines(last.output), edited: last.code !== sourceOf(state.nb, c.id) });
    if (last.env) envs.set(JSON.stringify(last.env), last.env);
  }
  Object.assign(files, dataFiles(state.files));
  for (const f of fs.readdirSync(ER7PY_DIR).filter((x) => x.endsWith(".py")).sort()) files[`er7py/${f}`] = fs.readFileSync(path.join(ER7PY_DIR, f), "utf8");
  const ip = toIpynb(state);
  ip.cells.unshift({ cell_type: "code", metadata: { er7: { setup: true } }, execution_count: null, outputs: [], source: ["# bundle setup: the fold's runner puts these on the path and imports them for every cell\n", "import sys; sys.path.insert(0, 'er7py')\n", "from er7 import *\n", "import numpy as np\n"] });
  ip.metadata.er7.bundle = BUNDLE_SCHEMA;
  files["notebook.ipynb"] = JSON.stringify(ip, null, 1);
  const head = state.nb.entries.at(-1)?.hash ?? null, benchHead = state.bench.entries.at(-1)?.hash ?? null;
  files["expected.json"] = JSON.stringify({ schema: BUNDLE_SCHEMA, head, benchHead, runs, skipped, envs: [...envs.values()] }, null, 1);
  files["run_all.py"] = RUN_ALL(runner);
  const env = [...envs.values()][0] ?? {};
  files["requirements.txt"] = [env.numpy ? `numpy==${env.numpy}` : "numpy", env.matplotlib ? `matplotlib==${env.matplotlib}` : "matplotlib"].join("\n") + "\n";
  files["README.md"] = `# ${title}\n\nExported from a fold notebook. Ledger head \`${head ?? "(empty)"}\`, claim ledger head \`${benchHead ?? "(empty)"}\`.\n\n` +
    `Reproduce every recorded run and compare it with the ledger:\n\n    python3 -m pip install -r requirements.txt\n    python3 run_all.py\n\n` +
    `\`run_all.py\` runs, in a fresh directory each, the exact code of each cell's last recorded run (\`code/\`), with \`data/\` and \`er7py/\` as the fold's runner provided them, and compares every \`#finding\` and \`#result\` line with \`expected.json\`. It exits 0 only if all ${runs.length} run(s) match.\n\n` +
    `Recorded environment${envs.size > 1 ? "s" : ""}: ${[...envs.values()].map((e) => `python ${e.python}, numpy ${e.numpy}, matplotlib ${e.matplotlib}, er7py ${e.er7py}${e.isolated ? ", network-isolated" : ""}`).join("; ") || "none recorded"}.\n\n` +
    `\`notebook.ipynb\` opens in Jupyter from this directory (its first cell puts \`er7py/\` on the path). Outputs in it are the ledger's, produced by the fold; re-running them is what \`run_all.py\` checks.\n\n` +
    (skipped.length ? `Not reproduced here: ${skipped.map((s) => `${s.cell} (${s.why})`).join("; ")}.\n\n` : "") +
    (runs.some((r) => r.edited) ? `Edited since their last run (the bundle re-runs the code that RAN): ${runs.filter((r) => r.edited).map((r) => r.cell).join(", ")}.\n` : "");
  return { files, zip: zip(files), runs, skipped };
}
