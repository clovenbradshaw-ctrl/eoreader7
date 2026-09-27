// inspect.mjs — what a build returned, decided by parsers, never by patterns:
// the text inside the first code fence (cut by position), then Python's own
// ast (a program, which is also run with no input) or Python's own HTML
// parser (a page, via page-facts.py), or nothing.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The text inside the first fenced block, or the whole text when unfenced.
 *  Cut by position: the fence line ends at its first newline. */
export function unfence(text) {
  const s = String(text ?? "");
  const open = s.indexOf("```");
  if (open < 0) return s.trim();
  const bodyStart = s.indexOf("\n", open);
  if (bodyStart < 0) return "";
  const close = s.indexOf("```", bodyStart + 1);
  return (close < 0 ? s.slice(bodyStart + 1) : s.slice(bodyStart + 1, close)).trim();
}

const py = (args, input, timeout = 15000, cwd = undefined) => spawnSync("python3", args, { input, timeout, encoding: "utf8", cwd, maxBuffer: 8 * 1024 * 1024 });

/** What came back: a program (Python's ast parses it), a page (the HTML parser
 *  finds elements), or nothing. A program is also run, with no input. */
export function inspect(code) {
  if (!code.trim()) return { kind: "none" };
  const parses = py(["-c", "import ast, sys; ast.parse(sys.stdin.read())"], code);
  if (parses.status === 0) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "build-battery-"));
    fs.writeFileSync(path.join(dir, "program.py"), code);
    const r = py([path.join(dir, "program.py")], "", 15000, dir);
    return { kind: "program", run: { exit: r.status, stdout: (r.stdout ?? "").slice(0, 20000), stderr: (r.stderr ?? "").slice(0, 4000), timedOut: r.error?.code === "ETIMEDOUT" } };
  }
  const facts = py([path.join(HERE, "page-facts.py")], code);
  if (facts.status !== 0) return { kind: "none", error: (facts.stderr ?? "").slice(0, 500) };
  const page = JSON.parse(facts.stdout);
  const hasElements = (page.tree?.c ?? []).length > 0;
  return hasElements ? { kind: "page", page } : { kind: "none", page };
}

