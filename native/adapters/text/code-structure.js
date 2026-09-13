// code-structure.js — a code-shaped gist, for material the prose organs
// correctly refuse to read as narrative (native/the-fold/resolutions.js's
// three resolutions; see live_priors/digested/source-code__flask-app-py-RAW.json,
// a disclosed NEGATIVE CONTROL: raw code forms zero referents/edges under
// the causal text perceiver, and that is CORRECT — a function name is not
// a proper noun and granting it referent identity by token shape (camelCase,
// snake_case) would be the exact unlicensed, un-generalized rule this
// codebase already refuses one level up (reading-log.js's own refused
// "SAE-shaped" possessive-stripping rule is the same class of mistake).
//
// So this is a SEPARATE channel, never feeding the referent/cast system and
// never fed by it. Code genuinely has "characters, more or less" — declared
// functions/classes/methods — and "acts" — call sites between them — but
// both are read off the language's OWN declaration syntax (the same
// discipline postprocess.mjs's PY_DEF_RE already uses for Python), never
// guessed from an identifier's letter-casing. Casing is used only to find a
// token's BOUNDARIES (tokenize), the same way it is used everywhere else in
// this codebase — never to grant IDENTITY.
//
// DMD-GATED, NOT TOP-N. A code gist that just lists "the N most-called
// functions" is exactly the failure P9/dmdWindow exists to refuse: the
// declared budget standing in for a measured one. `codeGist` reuses
// resolutions.js's OWN `dmdCut` (imported, never re-derived) — rows ordered
// by real structural signal (call-graph degree), cut at the shallowest
// depth that reproduces the full reach, same as Lens/Paradigm.
//
// GENERIC VS DISTINCTIVE, MEASURED. `init`, `main`, `run`, `close` recur in
// nearly every real codebase (live_priors/derived-priors/code-priors/
// code-name-prior-v1.json — CodeNamePrior@1, 26 real files across 16
// distinct security-audited/landmark repos, C/Go/Python/TypeScript). A name
// this material calls often but that ALSO recurs across many independent
// projects is boilerplate; a name only this material's own record has ever
// seen is what makes the material distinctive. The prior is optional and
// disclosed when absent — never a silent skip.

const IDENT = /^[A-Za-z_$][\w$]*$/;

// ── per-language declaration recipes ─────────────────────────────────────
// Same recipes as live_priors/scripts/build-code-name-prior.mjs's own
// header documents (the two files are kept in step by hand, not by import,
// because a corpus-measurement script and a reading organ have different
// packaging needs; the RECIPE ITSELF — which shape counts as a declaration
// per language — is the one fact that must not drift between them).
const RECIPES = [
  { lang: "c", exts: [".c", ".h"], re: /^(?:[A-Za-z_][\w\s*]*[\s*])([A-Za-z_]\w*)\s*\(([^;{}]*)\)\s*(?:\n|\s)*\{/gm, kind: "function" },
  { lang: "go", exts: [".go"], re: /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*\(/gm, kind: "function" },
  { lang: "python-def", exts: [".py"], re: /^[ \t]*(?:async\s+)?def\s+([A-Za-z_]\w*)/gm, kind: "function" },
  { lang: "python-class", exts: [".py"], re: /^[ \t]*class\s+([A-Za-z_]\w*)/gm, kind: "class" },
  { lang: "js-function", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$][\w$]*)/gm, kind: "function" },
  { lang: "js-class", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm, kind: "class" },
  { lang: "js-const-arrow", exts: [".ts", ".tsx", ".js", ".mjs", ".jsx"], re: /^[ \t]*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*?\)?\s*=>/gm, kind: "function" },
];

function extOf(fileName) {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

// A declaration's BODY EXTENT — brace-matched from wherever its own regex
// left off, to the closing brace at the same depth. Indentation-only
// languages (Python) have no brace to match; their extent is measured to
// the next line at or below the declaration's own indent, or end of text.
function braceExtent(text, fromIndex) {
  let i = text.indexOf("{", fromIndex);
  if (i === -1) return text.length;
  let depth = 0;
  for (; i < text.length; i++) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") { depth -= 1; if (depth === 0) return i + 1; }
  }
  return text.length;
}

function indentExtent(text, declLineStart) {
  const lines = text.slice(declLineStart).split("\n");
  const declLine = lines[0];
  const declIndent = (declLine.match(/^[ \t]*/) ?? [""])[0].length;
  let offset = declLine.length + 1;
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (line.trim() === "") { offset += line.length + 1; continue; }
    const indent = (line.match(/^[ \t]*/) ?? [""])[0].length;
    if (indent <= declIndent) return declLineStart + offset;
    offset += line.length + 1;
  }
  return text.length;
}

// The body's own START offset — strictly AFTER the declaration's header
// (its name, its parameter list, its own `{` or its own colon/newline).
// callEdges scans from here, never from the declaration's own start: a
// function's own name sitting in its own signature ("function dmdWindow(")
// is not a call site, and the earlier index-0-only guard missed this
// because the header text precedes the name inside the sliced body
// (found live: "function dmdWindow(x) {...}" wrongly counted dmdWindow as
// calling itself once, from its own signature).
function bodyStartOf(text, fromIndex, isPython) {
  if (isPython) {
    const lineStart = text.lastIndexOf("\n", fromIndex) + 1;
    const lineEnd = text.indexOf("\n", fromIndex);
    return lineEnd === -1 ? text.length : lineEnd + 1;
  }
  const i = text.indexOf("{", fromIndex);
  return i === -1 ? text.length : i + 1;
}

/**
 * parseDeclarations(text, fileName) -> [{ name, kind, start, end }]
 * Every declaration this file's own syntax actually states, read off the
 * matching recipe for its extension. `start`/`end` are the declaration's
 * own byte range in `text` (the header through its body's closing brace,
 * or its indent-delimited extent for Python) — never a guessed span.
 */
export function parseDeclarations(text, fileName) {
  const ext = extOf(fileName);
  const out = [];
  for (const recipe of RECIPES) {
    if (!recipe.exts.includes(ext)) continue;
    const re = new RegExp(recipe.re.source, recipe.re.flags);
    let m;
    while ((m = re.exec(text))) {
      const name = m[1];
      if (!IDENT.test(name)) continue;
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      const isPython = recipe.lang.startsWith("python");
      const end = isPython ? indentExtent(text, lineStart) : braceExtent(text, re.lastIndex);
      const bodyStart = bodyStartOf(text, isPython ? lineStart : re.lastIndex, isPython);
      out.push({ name, kind: recipe.kind, start: m.index, end: Math.max(end, m.index + name.length), bodyStart: Math.min(bodyStart, Math.max(end, m.index + name.length)) });
    }
  }
  // Longest-declaration-wins on an exact duplicate start (a name matched by
  // more than one recipe on the same declaration, e.g. a JS class matching
  // both js-class and, spuriously, nothing else) — kept simple: de-dup by
  // (name, start).
  const seen = new Set();
  return out.filter((d) => {
    const k = `${d.name}@${d.start}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * callEdges(text, entities) -> [{ caller, callee, count }]
 * Within EACH declared entity's own body span, every OTHER declared name in
 * this same file that appears immediately followed by `(` (a real call
 * SITE, word-bounded — never a substring match) is one witnessed edge.
 * Recursion (a name calling itself) is counted too; it is a real, disclosed
 * fact about the material, not filtered.
 */
export function callEdges(text, entities) {
  if (!entities.length) return [];
  const byName = new Map();
  for (const e of entities) { if (!byName.has(e.name)) byName.set(e.name, []); byName.get(e.name).push(e); }
  const names = [...byName.keys()].filter((n) => n.length >= 2);
  if (!names.length) return [];
  const callRe = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*\\(`, "g");
  const tally = new Map(); // "caller\u0000callee" -> count
  for (const caller of entities) {
    const bodyStart = caller.bodyStart ?? caller.start;
    const body = text.slice(bodyStart, caller.end);
    callRe.lastIndex = 0;
    let m;
    while ((m = callRe.exec(body))) {
      const callee = m[1];
      const key = `${caller.name}\u0000${callee}`;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }
  return [...tally.entries()].map(([k, count]) => { const [caller, callee] = k.split("\u0000"); return { caller, callee, count }; });
}

/**
 * buildCodeIndex(files) -> { entities, edges, resolve, describe, fileOf }
 * `files` is [{ fileName, text }, ...] (already-read workspace/session
 * files). Merges every file's own declarations and call edges into one
 * project-level structure. `resolve(name)` is EXACT, case-sensitive match
 * against a declared name — code identity is a real, exact fact (unlike
 * prose coreference, there is no fuzziness to earn here: two identifiers
 * differing by one character are two different bindings, full stop).
 */
export function buildCodeIndex(files = []) {
  const entities = new Map(); // name -> [{ name, kind, file, start, end }]
  const edgeTally = new Map(); // "caller\u0000callee" -> { count, files: Set }
  for (const f of files ?? []) {
    const decls = parseDeclarations(f.text, f.fileName);
    for (const d of decls) {
      if (!entities.has(d.name)) entities.set(d.name, []);
      entities.get(d.name).push({ ...d, file: f.fileName });
    }
    const edges = callEdges(f.text, decls);
    for (const e of edges) {
      const key = `${e.caller}\u0000${e.callee}`;
      if (!edgeTally.has(key)) edgeTally.set(key, { count: 0, files: new Set() });
      const rec = edgeTally.get(key);
      rec.count += e.count;
      rec.files.add(f.fileName);
    }
  }
  const edges = [...edgeTally.entries()].map(([k, v]) => { const [caller, callee] = k.split("\u0000"); return { caller, callee, count: v.count, files: [...v.files] }; });
  const resolve = (name) => (entities.has(String(name ?? "")) ? new Set([String(name)]) : new Set());
  const describe = (name) => {
    const decls = entities.get(name) ?? [];
    const calls = edges.filter((e) => e.caller === name);
    const calledBy = edges.filter((e) => e.callee === name);
    return { name, declaredIn: decls.map((d) => d.file), kind: decls[0]?.kind ?? null, calls, calledBy };
  };
  const fileOf = (name) => (entities.get(name) ?? [])[0]?.file ?? null;
  return { entities, edges, resolve, describe, fileOf, fileCount: new Set((files ?? []).map((f) => f.fileName)).size };
}

/**
 * degreeOf(index, name) -> total call-edge degree (out + in), the real
 * structural signal `codeGist` orders candidate rows by — never raw
 * occurrence count, never alphabetical, never insertion order.
 */
function degreeOf(index, name) {
  let d = 0;
  for (const e of index.edges) { if (e.caller === name) d += e.count; if (e.callee === name) d += e.count; }
  return d;
}

/**
 * genericityOf(prior, name) -> distinct-repo attestation count for `name`
 * in the CodeNamePrior@1 baseline (live_priors/derived-priors/code-priors),
 * or null if the prior is absent or the name was never attested there —
 * `null` is a disclosed "no signal", never coerced to 0 (0 IS a signal:
 * "measured absent from 16 real repos", a different claim than "no prior
 * loaded at all").
 */
export function genericityOf(prior, name) {
  if (!prior?.names) return null;
  if (!(name in prior.names)) return null;
  return prior.names[name].repos;
}

/**
 * codeGist({ index, question, dmdCut, dmdWindow, prior, genericFloor }) ->
 * { declared: {rows, window, basis}, calls: {rows, window, basis}, disclosure }
 *
 * `dmdCut` is IMPORTED from native/the-fold/resolutions.js (never
 * re-derived) — this reuses the exact same rows/window/basis contract the
 * Lens and Paradigm blocks already use, with code's own `active` (the
 * names the question resolves against this index, exact-match) and code's
 * own `reachOf` (the distinct OTHER names a row's edge carries).
 *
 * Rows are pre-filtered by genericity BEFORE the cut, not after: a name
 * attested in >= genericFloor independent real repos is boilerplate this
 * material's own record does not need retelling, and dropping it before
 * the measurement means the DMD window is spent on what is actually
 * distinctive here, not padded with `init`/`main`/`run`.
 */
export function codeGist({ index, question = "", dmdCut, prior = null, genericFloor = 2 } = {}) {
  if (typeof dmdCut !== "function") throw new TypeError("codeGist: dmdCut is injected (native/the-fold/resolutions.js's own export) — never re-derived here");
  const askedTokens = String(question ?? "").match(/[A-Za-z_$][\w$]*/g) ?? [];
  const asked = new Set(askedTokens.filter((t) => index.entities.has(t)));

  const isGeneric = (name) => {
    const g = genericityOf(prior, name);
    return g !== null && g >= genericFloor;
  };

  // "declared" rows: every entity this material declares, minus what the
  // baseline shows recurs across >= genericFloor independent real repos.
  // Ordered by call-graph degree — the structural signal, not frequency of
  // the identifier as a bare string.
  const distinctiveNames = [...index.entities.keys()].filter((n) => !isGeneric(n));
  const declaredRows = distinctiveNames
    .map((name) => ({ name, ids: new Set([name]), degree: degreeOf(index, name), file: index.fileOf(name) }))
    .sort((a, b) => b.degree - a.degree);

  const activeForDeclared = asked.size ? asked : new Set(declaredRows.slice(0, 1).map((r) => r.name));
  const declaredCut = dmdCut(declaredRows, activeForDeclared, { reachOf: (r) => [...r.ids] });

  // "calls" rows: edges between distinctive names, same pre-filter, ordered
  // by witnessed count (real call-site occurrences, not an assumption).
  const edgeRows = index.edges
    .filter((e) => !isGeneric(e.caller) && !isGeneric(e.callee))
    .map((e) => ({ caller: e.caller, callee: e.callee, count: e.count, ids: new Set([e.caller, e.callee]) }))
    .sort((a, b) => b.count - a.count);
  const activeForCalls = asked.size ? asked : new Set(edgeRows.slice(0, 1).flatMap((r) => [...r.ids]));
  const callsCut = dmdCut(edgeRows, activeForCalls, { reachOf: (r) => [...r.ids] });

  const genericDropped = [...index.entities.keys()].filter(isGeneric);
  return {
    declared: declaredCut,
    calls: callsCut,
    disclosure: {
      totalEntities: index.entities.size,
      totalEdges: index.edges.length,
      files: index.fileCount,
      genericDropped: genericDropped.length,
      genericFloor,
      priorLoaded: Boolean(prior),
      basis: prior
        ? `${genericDropped.length} of ${index.entities.size} declared names recur in >= ${genericFloor} independent real repos (live_priors CodeNamePrior@1) and were dropped before the DMD cut`
        : "no CodeNamePrior@1 loaded — every declared name treated as equally distinctive (disclosed, not a silent skip)",
    },
  };
}
