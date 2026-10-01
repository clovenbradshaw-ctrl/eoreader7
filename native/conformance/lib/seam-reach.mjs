// conformance/lib/seam-reach.mjs — what a module graph asks the resolver for that a browser cannot give it.
//
// reached(entryHrefs) imports each entry in a CHILD process that is started the way a page would load it: under seam-load-hooks.mjs, which
// records every node built-in and every bare package the real resolver is asked for while the graph links, and with `process` removed from
// module code (seam-load-register.mjs). Nothing here reads source text, so a specifier built at run time, a re-export, or an import reached
// through five relative hops is seen exactly as the loader sees it.
//
//   offenders — { specifier, kind: "builtin" | "package", parent } for everything the graph reached that a browser cannot resolve
//   failures  — { entry, error } for every entry whose import then THREW (an unguarded `process` read at load, say): a crash is named, never
//               left to be inferred from a stack on stderr. An entry that does not exist is a failure too.
//   code      — the child's exit code (0 unless the child itself died)
//
// An import that sits inside a function and runs only when it is called is not recorded: a browser never runs it either.
// Used by conformance/seam-browser-safe.test.mjs (the organs seam) and by the-fold's page-native-browser-safe.test.mjs (every native module the
// page's load graph enters), so there is one harness and one reading of "browser-safe", not two.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REGISTER = pathToFileURL(path.join(HERE, "seam-load-register.mjs")).href;
const MARK = "SEAM_REACH_FAILURES ";

export function reached(entryHrefs, { timeout = 120000 } = {}) {
  const entries = [].concat(entryHrefs);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-reach-"));
  const log = path.join(dir, "reached.jsonl");
  // `process` is gone inside the child by design, so the entries travel in the script text, not in argv or env.
  const script = [
    "const failures = [];",
    `await Promise.all(${JSON.stringify(entries)}.map((href) => import(href).catch((err) => failures.push({ entry: href, error: String(err?.stack ?? err).split("\\n").slice(0, 3).join(" | ") }))));`,
    `console.log(${JSON.stringify(MARK)} + JSON.stringify(failures));`,
  ].join("\n");
  const r = spawnSync(process.execPath, ["--import", REGISTER, "--input-type=module", "-e", script], {
    encoding: "utf8", env: { ...process.env, SEAM_LOG: log }, timeout,
  });
  const offenders = fs.existsSync(log) ? fs.readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const line = (r.stdout ?? "").split("\n").find((l) => l.startsWith(MARK));
  const failures = line ? JSON.parse(line.slice(MARK.length)) : [{ entry: entries.join(" "), error: `the child did not report (exit ${r.status}): ${(r.stderr ?? "").split("\n").slice(0, 4).join(" | ")}` }];
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, stderr: r.stderr, offenders, failures };
}

/** offenders as the lines a failure message prints: `node:fs (builtin) <- native/organs/ingest.js`. */
export const describeOffenders = (offenders) =>
  offenders.map((o) => `${o.specifier} (${o.kind}) <- ${o.parent.replace(/^file:\/\/.*\/native\//, "native/")}`);

export { pathToFileURL };
