// postprocess.mjs — the unconscious system's work AFTER the model writes but
// BEFORE the answer is printed: extract fenced code blocks, lint them with a
// real Python interpreter (pyodide, WASM — not a regex that guesses at
// syntax), and reorder top-level entities by dependency so each name is
// defined before the code that calls it. The model never sees this
// transcript — it only ever receives the repaired answer.
//
// This is the other half of the holonic trick: the small local model is
// trustworthy for SMALL pieces; the system threads the pieces together —
// lints them, orders them, and pins the seams.

// ── pyodide bootstrap ────────────────────────────────────────────────────────
// Loaded lazily once, from the installed node_modules copy (its own WASM +
// stdlib zip). If pyodide is unavailable the pipeline degrades to structural
// lint (undefined-name scanning by identifier sets) rather than halting.

let _pyodide = null;
let _pyodideError = null;
let _pyodideLoading = null;

// The repo's canonical pyodide runtime lives under native/eval/the-fold
// (the P21 wheel mirror, eoreader7-eval-the-fold-tools' own dependency); a
// root-level install is the fallback. The module is resolved BY FILE URL so
// its WASM/stdlib auto-resolve beside it — never by the bare "pyodide"
// package specifier, which only resolves where a node_modules actually sits.
function pyodideModuleCandidates() {
  return [
    new URL("./native/eval/the-fold/node_modules/pyodide/pyodide.mjs", import.meta.url),
    new URL("./node_modules/pyodide/pyodide.mjs", import.meta.url),
  ];
}

async function loadPyodideOnce() {
  if (_pyodide) return _pyodide;
  if (_pyodideLoading) return _pyodideLoading;
  _pyodideLoading = (async () => {
    for (const url of pyodideModuleCandidates()) {
      try {
        const mod = await import(url.href);
        const py = await mod.loadPyodide();
        _pyodide = py;
        return py;
      } catch (err) {
        _pyodideError = err;
      }
    }
    return null;
  })();
  return _pyodideLoading;
}

// ── thinking-marker stripping (qwen3 mouth hygiene) ────────────────────────
// A reasoning mouth's working must never reach the answer: <think> blocks
// (closed or truncated by the token budget) and stray /think + /no_think
// control tokens are stripped from PROSE, while fenced code rides through
// byte-exact (a code string '<think>' is content, not working). Returns the
// cleaned text and how many markers were removed (open+close count as 2).
// Case-insensitive on the tags; the bare tokens match only as whole tokens
// (/thinking, a/think are words/paths, never touched).
const THINK_BLOCK_RE = /<think\s*>[\s\S]*?(?:<\/think\s*>|$)/gi;
const THINK_BARE_RE = /(^|\s)\/(no_)?think\b/gi;

function stripThinkingFromProse(prose) {
  let stripped = 0;
  let out = String(prose ?? "");
  out = out.replace(THINK_BLOCK_RE, (m) => {
    stripped += /<\/think\s*>/i.test(m) ? 2 : 1;
    return "";
  });
  out = out.replace(THINK_BARE_RE, () => {
    stripped += 1;
    return "";
  });
  return { out, stripped };
}

export function stripThinking(text) {
  const src = String(text ?? "");
  // Fence-aware split: lines inside ``` fences (including an unclosed tail
  // fence) are code and pass through untouched; only prose is scrubbed.
  const lines = src.split("\n");
  let inFence = false;
  let stripped = 0;
  const proseBuf = [];
  const flush = () => {
    if (!proseBuf.length) return null;
    const { out, stripped: n } = stripThinkingFromProse(proseBuf.join("\n"));
    stripped += n;
    proseBuf.length = 0;
    return out;
  };
  const parts = [];
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      const f = flush();
      if (f !== null) parts.push(f);
      parts.push(line);
      inFence = !inFence;
      continue;
    }
    if (inFence) parts.push(line);
    else proseBuf.push(line);
  }
  const tail = flush();
  if (tail !== null) parts.push(tail);
  return { text: parts.join("\n"), stripped };
}

// ── fenced code extraction ──────────────────────────────────────────────────
const FENCE_RE = /^```([\w.+-]*)\n([\s\S]*?)\n```$/gm;

function extractBlocks(text) {
  const blocks = [];
  let m;
  const re = new RegExp(FENCE_RE.source, "gm");
  while ((m = re.exec(text))) {
    blocks.push({ lang: (m[1] || "text").toLowerCase(), code: m[2], start: m.index, end: re.lastIndex });
  }
  return blocks;
}

// ── Python structural analysis (no Python runtime needed) ───────────────────
// Top-level `def`/`class` entities and their line ranges, so reordering can
// move whole definitions together.

const PY_DEF_RE = /^(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/gm;
const NAME_USE_RE = /\b([A-Za-z_]\w*)\b/g;
const PY_KEYWORDS = new Set(
  "def class async return if elif else for while with try except finally in and or not is None True False as pass break continue raise yield lambda global nonlocal del assert import from print self cls super".split(/\s+/),
);

function pythonEntities(code) {
  const lines = code.split("\n");
  const starts = [];
  let m;
  const defRe = new RegExp(PY_DEF_RE.source, "gm");
  while ((m = defRe.exec(code))) {
    starts.push({ name: m[2], line: code.slice(0, m.index).split("\n").length - 1 });
  }
  // Bare-name module-level assignments (NAME = ... at col 0).
  const assignRe = /^([A-Za-z_]\w*)\s*=(?!=)/gm;
  const linesText = code.split("\n");
  for (let i = 0; i < linesText.length; i++) {
    if (/^(?:[A-Za-z_]\w*)\s*=/.test(linesText[i].trim()) && !/^(if|elif|for|while|return|with)\b/.test(linesText[i].trim())) {
      const name = linesText[i].trim().match(/^([A-Za-z_]\w*)/)?.[1];
      if (name) starts.push({ name, line: i });
    }
  }

  starts.sort((a, b) => a.line - b.line);
  const entities = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const endLine = i + 1 < starts.length ? starts[i + 1].line : lines.length;
    entities.push({ name: s.name, start: s.line, end: endLine, body: lines.slice(s.line, endLine).join("\n") });
  }
  return entities;
}

function refsUsed(code) {
  const uses = new Set();
  let m;
  while ((m = NAME_USE_RE.exec(code))) {
    if (PY_KEYWORDS.has(m[1])) continue;
    uses.add(m[1]);
  }
  return uses;
}

const PY_BUILTINS = new Set(
  "abs all any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir "
  + "divmod enumerate eval exec filter float format frozenset getattr globals hasattr hash help hex id input int "
  + "isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow print property "
  + "range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip __name__ True "
  + "False None Exception ValueError TypeError RuntimeError KeyError IndexError AttributeError ImportError OSError "
  + "SystemExit NotImplemented".split(/\s+/),
);

// ── dependency ordering ─────────────────────────────────────────────────────
// Kahn's algorithm: entities that reference other entities must come AFTER
// the ones that define them. Names we cannot resolve (parameters, locals,
// imports, builtins) do not constrain order.
function reorderByDependency(code) {
  const entities = pythonEntities(code);
  if (entities.length < 2) return { text: code, reordered: false, moved: null };

  const defined = new Set(entities.map((e) => e.name));
  const deps = new Map();
  for (const e of entities) {
    const uses = refsUsed(e.body);
    const dependsOn = [...uses].filter((u) => defined.has(u) && u !== e.name);
    deps.set(e.name, dependsOn);
  }

  const indexOf = (name) => entities.findIndex((e) => e.name === name);
  const order = [];
  const remaining = new Set(entities.map((e) => e.name));
  while (remaining.size) {
    const ready = [...remaining].filter((n) => (deps.get(n) ?? []).every((d) => !remaining.has(d)));
    if (!ready.length) break; // cycle: keep original order of the rest
    ready.sort((a, b) => indexOf(a) - indexOf(b));
    order.push(...ready);
    for (const r of ready) remaining.delete(r);
  }
  const leftover = [...remaining].sort((a, b) => indexOf(a) - indexOf(b));
  order.push(...leftover);

  const original = entities.map((e) => e.name);
  if (order.join("|") === original.join("|")) return { text: code, reordered: false, moved: null };

  const byName = new Map(entities.map((e) => [e.name, e]));
  const lines = code.split("\n");
  // Preserve everything outside the entity block — imports, the module
  // docstring, trailing blank lines — and reorder only the entities between.
  const firstStart = Math.min(...entities.map((e) => e.start));
  const lastEnd = Math.max(...entities.map((e) => e.end));
  const prelude = lines.slice(0, firstStart);
  const postlude = lines.slice(lastEnd).join("").trim() ? lines.slice(lastEnd) : [];
  const middle = [];
  for (const name of order) {
    const e = byName.get(name);
    // Trim each entity's body to its meaningful lines (leading/trailing blank
    // lines are spacing, not definition) so joined entities read cleanly.
    let b = e.body.split("\n");
    while (b.length && b[0].trim() === "") b.shift();
    while (b.length && b[b.length - 1].trim() === "") b.pop();
    if (middle.length && b.length) middle.push("");
    middle.push(...b);
  }
  return { text: [...prelude, ...middle, ...postlude].join("\n").replace(/\n{3,}/g, "\n\n"), reordered: true, moved: order };
}

// ── pyodide real lint ───────────────────────────────────────────────────────
// Uses Python's own compile/ast on the body. True syntax errors, true
// undefined-name scans. No regex guessing at grammar.
async function lintPython(code) {
  const py = await loadPyodideOnce();
  const notes = [];
  if (!py) {
    // Degraded: structural undefined-name scan.
    const entities = pythonEntities(code);
    const defined = new Set(entities.map((e) => e.name));
    const uses = refsUsed(code);
    const missing = [...uses].filter((u) => !defined.has(u) && !PY_BUILTINS.has(u));
    if (missing.length) notes.push(`undefined names (structural): ${[...new Set(missing)].slice(0, 12).join(", ")}`);
    return { linted: notes.length === 0, notes };
  }

  try {
    py.runPython(`
import ast, builtins
def lint_a(source):
    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return ["SyntaxError: " + (e.msg or "") + (" at line " + str(e.lineno) if e.lineno else "")]
    defined = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
            defined.add(node.name)
            for a in node.args.args:
                defined.add(a.arg)
            if node.args.vararg:
                defined.add(node.args.vararg.arg)
            if node.args.kwarg:
                defined.add(node.args.kwarg.arg)
        elif isinstance(node, (ast.Lambda,)):
            for a in node.args.args:
                defined.add(a.arg)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for a in node.names:
                defined.add(a.asname or a.name.split(".")[0])
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name):
                    defined.add(t.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            defined.add(node.target.id)
    loads = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            loads.add(node.id)
    undef = sorted(loads - defined - set(dir(builtins)))
    if "__name__" in undef:
        undef.remove("__name__")
    return undef
`);
    py.globals.set("_lint_src", code);
    py.runPython("_lint_result = lint_a(_lint_src)");
    const undef = [...py.globals.get("_lint_result").toJs()];
    if (undef.length) notes.push(`undefined names: ${undef.slice(0, 12).join(", ")}`);
  } catch (err) {
    notes.push(String(err?.message ?? err));
  }
  return { linted: notes.length === 0, notes };
}

// ── the whole pass ──────────────────────────────────────────────────────────
// `timeboxMs` protects latency: if pyodide cold-load or a pathological lint
// runs long, the caller gets the ORIGINAL text back instead of a delayed
// answer. The unconscious system never holds the response hostage.
export function warmPostprocess({ budgetMs = 15000 } = {}) {
  return loadPyodideOnce()
    .then(() => ({ available: Boolean(_pyodide), error: _pyodideError?.message ?? null }))
    .catch(() => ({ available: false, error: _pyodideError?.message ?? null }));
}

export async function postprocessAnswer(text, { onNote = null, timeboxMs = 0 } = {}) {
  // Thinking blocks are stripped FIRST (prose-face only, code never touched):
  // the mouth's working must never reach the answer, on any route.
  const notes = [];
  const note = (msg) => {
    notes.push(msg);
    if (onNote) onNote({ span: "post", kind: "note", message: msg });
  };
  const cleaned = stripThinking(text);
  if (cleaned.stripped > 0) note(`stripped ${cleaned.stripped} thinking marker(s) — the mouth's working, never the answer`);
  text = cleaned.text;
  const blocks = extractBlocks(text);
  if (!blocks.length) {
    return { text, blocks: [], linted: false, reordered: false, notes, timedOut: false };
  }

  let out = text;
  let anyLinted = false;
  let anyReordered = false;
  let timedOut = false;

  // Timebox wraps the whole pass; hitting it returns the original text so the
  // answer is never delayed by the tooling that cleans it up.
  const deadline = timeboxMs > 0 ? Date.now() + timeboxMs : 0;
  const over = () => deadline > 0 && Date.now() > deadline;

  // In reverse so earlier indexes stay valid as we rewrite blocks.
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.lang !== "python" && b.lang !== "py") continue;
    if (over()) {
      timedOut = true;
      if (onNote) onNote({ span: "post", kind: "timeout", blocks_total: blocks.length });
      break;
    }
    const src = b.code;
    const ordered = reorderByDependency(src);
    const lintTarget = ordered.text;
    if (ordered.reordered) {
      anyReordered = true;
      note(`python: top-level entities reordered by dependency (${ordered.moved.join(" → ") || "…"})`);
    }
    const perCall = deadline > 0 ? Math.max(250, deadline - Date.now()) : 0;
    const linted = await withBudget(lintPython(lintTarget), perCall);
    if (linted === null) {
      timedOut = true;
      if (onNote) onNote({ span: "post", kind: "timeout", block_lang: b.lang });
      if (lintTarget !== src) {
        out = out.slice(0, b.start) + `\`\`\`${b.lang}\n${lintTarget}\n\`\`\`` + out.slice(b.end);
      }
      continue;
    }
    if (linted.linted) anyLinted = true;
    if (linted.notes.length) {
      for (const n of linted.notes) note(`python lint: ${n}`);
    } else if (!ordered.reordered) {
      note("python lint: clean");
    }
    if (lintTarget !== src) {
      out = out.slice(0, b.start) + `\`\`\`${b.lang}\n${lintTarget}\n\`\`\`` + out.slice(b.end);
    }
  }

  return { text: out, blocks, linted: anyLinted, reordered: anyReordered, notes, timedOut };
}

async function withBudget(work, budgetMs) {
  if (!budgetMs) return work;
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), budgetMs);
  });
  const result = await Promise.race([work, timeout]);
  clearTimeout(timer);
  return result;
}

// ── the hard code validator (logos lint) ────────────────────────────────────
// Code is validated the way Python itself validates it, in the WASM runtime:
//   compile() — a real syntax gate over the WHOLE module;
//   ast       — an undefined-name scan (used-but-never-defined/imported);
//   exec()    — actually RUN the module top-level in a guarded namespace;
//   smoke     — when a callable entry exists, drive it with a known input.
// Every gate is a typed finding; the caller's REC loop hands them back to the
// mouth to fix. This is the "unconscious" half — the model never sees the
// validator, only the findings that made a part fail.
export async function validatePython(source, { smokeInput = null } = {}) {
  const py = await loadPyodideOnce();
  if (!py) return { ok: false, findings: [{ kind: "validator", detail: "pyodide unavailable — no hard validator ran" }], basis: "no runtime" };
  try {
    py.globals.set("_validate_src", String(source ?? ""));
    py.globals.set("_validate_smoke", smokeInput);
    py.runPython(`
import ast, builtins, sys, io, contextlib

def _validate(src, smoke_input):
    findings = []
    # 1. compile gate — real syntax, whole module.
    try:
        compile(src, "<generated>", "exec")
    except SyntaxError as e:
        findings.append({"kind": "syntax", "detail": (e.msg or "SyntaxError") + (" at line " + str(e.lineno) if e.lineno else "")})
        return {"findings": findings, "executed": False, "out": "", "smoke": None}
    # 2. undefined-name scan via ast.
    tree = ast.parse(src)
    defined = set()
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
            defined.add(node.name)
            for a in node.args.args: defined.add(a.arg)
            if node.args.vararg: defined.add(node.args.vararg.arg)
            if node.args.kwarg: defined.add(node.args.kwarg.arg)
        elif isinstance(node, ast.Lambda):
            for a in node.args.args: defined.add(a.arg)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            for a in node.names: defined.add(a.asname or a.name.split(".")[0])
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name): defined.add(t.id)
        elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            defined.add(node.target.id)
    loads = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load): loads.add(node.id)
    undef = sorted(loads - defined - set(dir(builtins)) - {"__name__"})
    if undef:
        findings.append({"kind": "undefined", "detail": "undefined names: " + ", ".join(undef[:12])})
    # 3. exec gate — run the module top-level in a guarded namespace.
    g = {"__name__": "__main__"}
    captured = io.StringIO()
    executed = False
    try:
        with contextlib.redirect_stdout(captured), contextlib.redirect_stderr(captured):
            exec(compile(src, "<generated>", "exec"), g)
        executed = True
    except SystemExit as e:
        # the module ran through its entry point (argparse --help / a CLI's
        # normal exit path). Not a finding: exit codes are the program's own.
        executed = True
    except BaseException as e:
        findings.append({"kind": "runtime", "detail": type(e).__name__ + ": " + str(e)[:300]})
    # 4. smoke — drive a callable entry with the known input, if any.
    smoke = None
    if smoke_input is not None and executed:
        try:
            if "main" in g and callable(g["main"]):
                inp = io.StringIO(smoke_input)
                _stdin = sys.stdin
                sys.stdin = inp
                buf = io.StringIO()
                try:
                    with contextlib.redirect_stdout(buf):
                        g["main"]([])
                finally:
                    sys.stdin = _stdin
                smoke = {"ran": True, "out": buf.getvalue().strip()[:400]}
            else:
                smoke = {"ran": False, "out": None}
        except BaseException as e:
            smoke = {"ran": False, "error": type(e).__name__ + ": " + str(e)[:200]}
    return {"findings": findings, "executed": executed, "out": captured.getvalue().strip()[:400], "smoke": smoke}
`);
    py.runPython("_validate_result = _validate(_validate_src, _validate_smoke)");
    const res = py.globals.get("_validate_result").toJs({ dict_converter: Object.fromEntries });
    const findings = Array.isArray(res.findings) ? res.findings : [];
    const ok = findings.length === 0;
    return { ok, findings, executed: res.executed, out: res.out ?? null, smoke: res.smoke ?? null, basis: "pyodide compile + ast + exec + smoke" };
  } catch (err) {
    return { ok: false, findings: [{ kind: "validator", detail: String(err?.message ?? err) }], basis: "validator error" };
  }
}

// The whole-file code pass: dependency-reorder + lint, on RAW code (not
// fenced blocks). postprocessAnswer handles fenced blocks in prose answers;
// a generated code artifact is raw, so it gets this path — the reorderer and
// the pyodide lint are the same organs, applied to the whole file at once.
export async function postprocessCode(text, { language = null, onNote = null, timeboxMs = 0 } = {}) {
  const t = String(text ?? "");
  const notes = [];
  const note = (msg) => { notes.push(msg); if (onNote) onNote({ span: "post", kind: "note", message: msg }); };
  if (language !== "python") return { text: t, linted: false, reordered: false, notes, timedOut: false };
  const deadline = timeboxMs > 0 ? Date.now() + timeboxMs : 0;
  const ordered = reorderByDependency(t);
  const lintTarget = ordered.text;
  if (ordered.reordered) note(`python: top-level entities reordered by dependency (${ordered.moved.join(" → ") || "…"})`);
  const perCall = deadline > 0 ? Math.max(250, deadline - Date.now()) : 0;
  const linted = await withBudget(lintPython(lintTarget), perCall);
  if (linted === null) return { text: ordered.reordered ? lintTarget : t, linted: false, reordered: ordered.reordered, notes, timedOut: true };
  if (linted.notes.length) for (const n of linted.notes) note(`python lint: ${n}`);
  else if (!ordered.reordered) note("python lint: clean");
  return { text: lintTarget, linted: linted.linted, reordered: ordered.reordered, notes, timedOut: false };
}

export async function pyodideAvailable() {
  await loadPyodideOnce();
  return { available: Boolean(_pyodide), error: _pyodideError?.message ?? null };
}

// The shared pyodide singleton — one WASM runtime, reused by every caller
// (postprocess lint, web-content shell detection). Importing pyodide twice
// boots a second interpreter; callers must go through this accessor.
export async function getPyodide() {
  const py = await loadPyodideOnce();
  if (!py && _pyodideError) throw new Error(`pyodide unavailable: ${_pyodideError.message}`);
  return py;
}
// ── the HTML validator (the Structure face, for a markup artifact) ──────────
// Same posture as validatePython: the law is the language's own engine, here
// Python's stdlib HTMLParser (already in pyodide). A markup artifact's
// open/close/nest is decidable by parsing: unbalanced tags, a missing
// <style>/<script>/<body>, or near-empty content are typed findings the code
// REC loop hands back to the mouth. No browser DOM — so interactivity is
// checked structurally (a non-empty <script>), never behaviorally.
export async function validateHtml(source) {
  const py = await loadPyodideOnce();
  if (!py) return { ok: false, findings: [{ kind: "validator", detail: "pyodide unavailable — no validator ran" }], basis: "no runtime" };
  try {
    py.globals.set("_h", String(source ?? ""));
    py.runPython(`
import html.parser
class _V(html.parser.HTMLParser):
    VOID = {"meta","link","img","br","hr","input","source","area","base","col","embed","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.findings = []
        self.has_style = self.has_script = self.has_body = False
        self.text_chars = 0
    def handle_starttag(self, tag, attrs):
        if tag == "style": self.has_style = True
        elif tag == "script": self.has_script = True
        elif tag == "body": self.has_body = True
        if tag not in self.VOID:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if not self.stack:
            self.findings.append({"kind":"unexpected_close","detail":"</"+tag+"> with no open tag"}); return
        if self.stack[-1] == tag:
            self.stack.pop(); return
        self.findings.append({"kind":"mismatch","detail":"</"+tag+"> but <"+self.stack[-1]+"> is open"})
        if tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.findings.append({"kind":"unclosed","detail":"<"+self.stack.pop()+"> never closed"})
            if self.stack: self.stack.pop()
    def handle_data(self, data):
        self.text_chars += len(data.strip())
_v = _V(); _v.feed(_h); _v.close()
for _t in reversed(_v.stack):
    _v.findings.append({"kind":"unclosed","detail":"<"+_t+"> never closed"})
if not _v.has_style: _v.findings.append({"kind":"missing","detail":"no <style> block — CSS is not inlined"})
if not _v.has_script: _v.findings.append({"kind":"missing","detail":"no <script> block — no interactivity"})
if not _v.has_body: _v.findings.append({"kind":"missing","detail":"no <body>"})
if _v.text_chars < 40: _v.findings.append({"kind":"thin","detail":"almost no text content"})
_result = {"findings": _v.findings, "hasStyle": _v.has_style, "hasScript": _v.has_script, "hasBody": _v.has_body, "textChars": _v.text_chars}
`);
    const res = py.globals.get("_result").toJs({ dict_converter: Object.fromEntries });
    const findings = Array.isArray(res.findings) ? res.findings : [];
    return { ok: findings.length === 0, findings, hasStyle: res.hasStyle, hasScript: res.hasScript, hasBody: res.hasBody, textChars: res.textChars, basis: "pyodide HTMLParser tag balance + structure" };
  } catch (err) {
    return { ok: false, findings: [{ kind: "validator", detail: String(err?.message ?? err) }], basis: "validator error" };
  }
}
