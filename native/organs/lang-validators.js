// native/organs/lang-validators.js — one hard validator per language, as a
// registry, not a ternary (CODING-LESSONS 21: the gate must be the strongest
// the language allows). A language whose toolchain is absent is reported
// `unchecked` and can never count toward a competency score — "the model
// can't write Go" and "nothing checked its Go" must stay different sentences.
//
// Two tiers per language:
//   check(source)            the FLOOR — compile/parse (+ run where safe).
//   run(source, harness)     the CALL — append a caller, execute, return
//                            stdout. Only a test that CALLS the code decides
//                            (lesson 21/24); floor passes are structure only.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TIMEOUT_MS = 20000;

// spawn + stdin.end (execFile has no stdin; a tool waiting on it hangs).
function exec(cmd, args, { cwd, input = "", timeout = TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let out = "", err = "", done = false;
    const p = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    const finish = (r) => { if (!done) { done = true; clearTimeout(t); resolve(r); } };
    const t = setTimeout(() => { try { p.kill("SIGKILL"); } catch {} finish({ code: null, out, err, timedOut: true }); }, timeout);
    p.stdout.on("data", (d) => { out += d; if (out.length > 1e6) out = out.slice(-1e6); });
    p.stderr.on("data", (d) => { err += d; if (err.length > 1e6) err = err.slice(-1e6); });
    p.on("error", (e) => finish({ code: null, out, err: String(e.message), spawnFailed: true }));
    p.on("close", (code) => finish({ code, out, err }));
    try { p.stdin.on("error", () => {}); p.stdin.end(input); } catch {}
  });
}

const which = async (bin) => (await exec("/usr/bin/env", ["which", bin], { timeout: 3000 })).code === 0;

function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "langval-"));
  return fn(dir).finally(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });
}

const finding = (kind, detail) => ({ kind, detail: String(detail).trim().slice(0, 400) });

// Each language: bin (must exist), ext, floor(dir,file,source) and call(dir,file).
// `floor` returns an exec result whose code 0 == pass.
const LANGS = {
  javascript: {
    bin: "node", ext: "mjs",
    floor: (d, f) => exec("node", ["--check", f], { cwd: d }),
    call: (d, f) => exec("node", [f], { cwd: d }),
  },
  typescript: {
    bin: "deno", ext: "ts",
    floor: (d, f) => exec("deno", ["check", "--quiet", f], { cwd: d }),
    call: (d, f) => exec("deno", ["run", "--quiet", "--no-prompt", f], { cwd: d }),
  },
  python: {
    bin: "python3", ext: "py",
    floor: (d, f) => exec("python3", ["-m", "py_compile", f], { cwd: d }),
    call: (d, f) => exec("python3", [f], { cwd: d }),
  },
  ruby: {
    bin: "ruby", ext: "rb",
    floor: (d, f) => exec("ruby", ["-c", f], { cwd: d }),
    call: (d, f) => exec("ruby", [f], { cwd: d }),
  },
  bash: {
    bin: "bash", ext: "sh",
    floor: (d, f) => exec("bash", ["-n", f], { cwd: d }),
    call: (d, f) => exec("bash", [f], { cwd: d }),
  },
  c: {
    bin: "gcc", ext: "c",
    floor: (d, f) => exec("gcc", ["-Wall", "-Werror=implicit-function-declaration", "-fsyntax-only", f], { cwd: d }),
    call: async (d, f) => {
      const b = await exec("gcc", ["-Wall", "-o", "a.out", f], { cwd: d });
      return b.code === 0 ? exec(join(d, "a.out"), [], { cwd: d }) : b;
    },
  },
  sql: {
    bin: "sqlite3", ext: "sql",
    // sqlite runs the script against an in-memory db: parse + execute in one.
    floor: (d, f) => exec("sqlite3", [":memory:"], { cwd: d, input: `.read ${f}\n` }),
    call: (d, f) => exec("sqlite3", [":memory:"], { cwd: d, input: `.read ${f}\n` }),
  },
};

// Aliases the language detector or a user might produce.
const ALIAS = { js: "javascript", node: "javascript", ts: "typescript", py: "python", python3: "python", rb: "ruby", sh: "bash", shell: "bash", zsh: "bash", cc: "c", sqlite: "sql" };
export const canonLanguage = (l) => { const k = String(l ?? "").toLowerCase().trim(); return LANGS[k] ? k : (ALIAS[k] ?? k); };

export const supportedLanguages = () => Object.keys(LANGS);

const availCache = new Map();
export async function toolchainAvailable(language) {
  const k = canonLanguage(language);
  const spec = LANGS[k];
  if (!spec) return false;
  if (!availCache.has(k)) availCache.set(k, await which(spec.bin));
  return availCache.get(k);
}

// The floor gate. Shape matches what proxy-runner's runValidator already
// consumes: { ok, findings, basis, unchecked? }.
export async function validateLanguage(language, source) {
  const k = canonLanguage(language);
  const spec = LANGS[k];
  if (!spec) return { ok: true, findings: [], unchecked: true, basis: `no hard validator for ${k || "this language"}` };
  if (!(await toolchainAvailable(k))) return { ok: true, findings: [], unchecked: true, basis: `${spec.bin} not installed — no validator ran for ${k}` };
  return withDir(async (dir) => {
    const file = `main.${spec.ext}`;
    writeFileSync(join(dir, file), String(source ?? ""));
    const r = await spec.floor(dir, file);
    if (r.timedOut) return { ok: false, findings: [finding("timeout", `${spec.bin} exceeded ${TIMEOUT_MS}ms`)], basis: `${spec.bin} floor gate` };
    if (r.code === 0) return { ok: true, findings: [], basis: `${spec.bin} floor gate (compile/parse)` };
    return { ok: false, findings: [finding("syntax", r.err || r.out || `exit ${r.code}`)], basis: `${spec.bin} floor gate` };
  });
}

// The call tier: source + a caller appended, executed, stdout returned.
export async function runWithHarness(language, source, harness) {
  const k = canonLanguage(language);
  const spec = LANGS[k];
  if (!spec) return { ran: false, unchecked: true, reason: `no runner for ${k}` };
  if (!(await toolchainAvailable(k))) return { ran: false, unchecked: true, reason: `${spec.bin} not installed` };
  return withDir(async (dir) => {
    const file = `main.${spec.ext}`;
    writeFileSync(join(dir, file), `${source ?? ""}\n${harness ?? ""}\n`);
    const r = await spec.call(dir, file);
    return { ran: true, code: r.code, out: r.out, err: r.err, timedOut: !!r.timedOut };
  });
}

// The installed toolchain's version line, recorded in every ledger row: a model
// that writes modern Ruby fails on Ruby 2.6 for a toolchain reason, not a
// competency one, and the row must say which toolchain judged it.
const VERSION_ARGS = { node: ["--version"], deno: ["--version"], python3: ["--version"], ruby: ["--version"], bash: ["--version"], gcc: ["--version"], sqlite3: ["--version"] };
const versionCache = new Map();
export async function toolchainVersion(language) {
  const k = canonLanguage(language);
  const spec = LANGS[k];
  if (!spec || !(await toolchainAvailable(k))) return null;
  if (!versionCache.has(k)) {
    const r = await exec(spec.bin, VERSION_ARGS[spec.bin] ?? ["--version"], { timeout: 5000 });
    versionCache.set(k, (r.out || r.err).split("\n")[0].trim().slice(0, 80) || null);
  }
  return versionCache.get(k);
}
