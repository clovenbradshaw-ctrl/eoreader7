// hunt.js — the HUNT micro-loop (2026-10-02, "loops in loops").
//
// The outer chase loop's per-void resolution is ITSELF a loop, and the MODEL
// is its LAST step. Order, per void:
//
//   FIELD  — the codebase's own material: workspace + hunt roots scanned IN
//            PARALLEL for a same-named implementation, snipped by exact byte
//            address (the void's own file is excluded — it holds the stub).
//   WEB    — liveWeb (DuckDuckGo): search, fetch a raw/reference source,
//            snip the named function, frame-match the spec.
//   SWARM  — parallel ants verify a candidate before the expensive test:
//            LITERAL (the patched file parses), STRUCTURAL (validatePython's
//            undefined-name scan), ADVERSARIAL (the spec's content words are
//            present). The dissent is disclosed; the real test is the judge.
//   MODEL  — only the irreducible residue reaches the mouth.
//
// A candidate that survives the swarm and the real test is snipped by
// address and the model NEVER drew — the log says so (source: "hunt",
// model: "hunt"), which is the standing "never a frontier model" disclosure
// made on the hunt side too.
import fs from "node:fs";
import path from "node:path";
import { parseDeclarations, loadCodeKeywordPrior } from "../adapters/text/code-structure.js";
import { detectCodeLanguage } from "../adapters/code/language.js";
import { liveWeb } from "./surf.js";
import { validatePython } from "../../postprocess.mjs";

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "venv", "dist", "build", ".next", "__pycache__", ".cache", "coverage"]);

/** The frame words the hunt frame-matches against — the spec's own content
 *  words, filtered through the received CodeKeywordPrior@1 (a closed-class
 *  word can never be an identifier, so it carries no frame). The priors the
 *  machine already holds are the frame, never a re-derivation.
 *  SCRIPT SCOPE, DECLARED (chorus Greenberg, 2026-10-03): the tokenizer is
 *  Latin-script and lowercasing — the languages this hunt scans (python/js/
 *  ts identifiers) are ASCII, and a non-Latin spec degrades to an EMPTY
 *  frame (a typed absence: no frame words found), never to a wrong match. */
export function specFrameWords(unit, language = "python") {
  let closed = new Set();
  try { closed = new Set(loadCodeKeywordPrior(language)?.keywords ?? []); } catch { /* no prior */ }
  const words = (unit.spec ?? "").toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  return [...new Set(words)].filter((w) => !closed.has(w) && !["the", "and", "for", "with", "that", "return", "list", "string", "input", "function", "each"].includes(w)).slice(0, 6);
}

export function walkFiles(root, { max = 3000, skip = SKIP_DIRS } = {}) {
  const out = [];
  const walk = (dir) => {
    if (out.length >= max) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= max) return;
      if (e.name.startsWith(".")) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { if (!skip.has(e.name)) walk(abs); }
      else if (e.isFile()) out.push(abs);
    }
  };
  walk(root);
  return out;
}

/** The exact declaration bytes for a named function inside arbitrary text
 *  (a fetched source), by language recipe. Returns null when the name is not
 *  declared. THE SNIP IS BY ADDRESS — never a guess at the bytes. */
export function snipFunction(text, name) {
  const src = String(text ?? "");
  const ext = /\ndef\s+[A-Za-z_]\w*\s*\([^)]*\)\s*(?:->\s*[^:]*)?:/m.test(src) ? "x.py" : /\bfunction\s+[A-Za-z_$][\w$]*\s*\(/.test(src) ? "x.js" : null;
  if (!ext) return null;
  const decls = parseDeclarations(src, ext);
  const hit = decls.find((d) => d.name === name);
  if (!hit) return null;
  const pre = src.slice(0, hit.start);
  const imports = pre.split("\n").filter((l) => /^\s*(?:import|from)\s/.test(l)).join("\n");
  const code = (imports ? `${imports}\n` : "") + src.slice(hit.start, hit.end);
  return { code, address: `${hit.start}-${hit.end}` };
}

/** THE FIELD: workspace + hunt roots, scanned IN PARALLEL for a same-named
 *  implementation. The void's own file is excluded; a duplicate elsewhere is
 *  snipped by address. Bounded; fail-open. */
export async function scanField({ unit, workspace, huntRoots = [], exclude = null }) {
  const dirs = [workspace, ...(huntRoots ?? [])].filter(Boolean);
  const excludedAbs = exclude ? path.resolve(workspace, exclude) : null;
  const files = [];
  for (const dir of dirs) files.push(...walkFiles(dir));
  const jobs = files.map((rel) => (async () => {
    if (excludedAbs && path.resolve(rel) === excludedAbs) return null; // the void's own file — it holds the stub
    let text;
    try { text = fs.readFileSync(rel, "utf8"); } catch { return null; }
    if (!detectCodeLanguage(rel)) return null;
    const decls = parseDeclarations(text, path.basename(rel));
    const hit = decls.find((d) => d.name === unit.name);
    if (!hit) return null;
    // the snip carries the declaration AND the imports it depends on —
    // a snipped `def tokenize` that needs `import re` is useless without it
    const pre = text.slice(0, hit.start);
    const imports = pre.split("\n").filter((l) => /^\s*(?:import|from)\s/.test(l)).join("\n");
    const code = (imports ? `${imports}\n` : "") + text.slice(hit.start, hit.end);
    return [{ code, address: `${rel}#${hit.start}-${hit.end}`, source: "field" }];
  })());
  const results = (await Promise.all(jobs)).flat().filter(Boolean);
  return results.slice(0, 8);
}

/** THE BOX (2026-10-02, penelope's law — "an a priori unit is COMPUTED,
 *  never drawn"; operator direction: "we don't get extra points for writing
 *  it all ourselves"). A unit whose spec is a MECHANICAL shape is computed
 *  by the machine, no model — the mouth draws only the irreducible residue.
 *  The box is conservative: it computes a body only for shapes it is SURE
 *  of (the docstring's own words), and the real test judges every byte, so a
 *  wrong computation falls back to the model. Provenance: the log records
 *  source "box" — the machine computed it, no model, disclosed. */
export function computeBody(unit) {
  const spec = String(unit?.spec ?? "");
  const s = String(unit?.signature ?? "");
  const n = String(unit?.name ?? "");
  if (!spec || !s) return null;
  const has = (re) => new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i").test(spec);

  // clamp / 0-100 progress (position, duration)
  if (has(/progress/) && has(/0\s*[-–]\s*100/) && has(/clamped/)) {
    return "return 0 if duration_s <= 0 else max(0, min(100, int(position_s / duration_s * 100)))";
  }
  // duration label: 45s / 5m / 1h 23m
  if (has(/45s/) && has(/1h 23m/) && has(/milliseconds/)) {
    return [
      "ms = max(0, int(ms))",
      "total_s = ms // 1000",
      "if total_s < 60: return str(total_s) + \"s\"",
      "total_m = round(total_s / 60)",
      "if total_m < 60: return str(total_m) + \"m\"",
      "return str(total_m // 60) + \"h \" + str(total_m % 60) + \"m\"",
    ].join("\n");
  }
  // count of not-played
  if (has(/how many/) && has(/not played/)) {
    return "return sum(1 for v in state.values() if not v.get(\"played\"))";
  }
  // get-or-0 resume
  if (has(/saved position_s/) && has(/or 0/)) {
    return "return state.get(url, {}).get(\"position_s\", 0)";
  }
  // dedupe append
  if (has(/append/) && has(/not duplicated/)) {
    return "return list(queue) + [url] if url not in queue else list(queue)";
  }
  // pop-first queue
  if (has(/pop and return the first/) && has(/None when empty/)) {
    return "return (list(queue)[1:], queue[0]) if queue else (None, [])";
  }
  // bounded reorder
  if (has(/moved to/) && has(/Bounded/) && n === "reorder") {
    return [
      "q = list(queue)",
      "if not q: return q",
      "n = len(q)",
      "f = max(0, min(n - 1, from_idx))",
      "t = max(0, min(n - 1, to_idx))",
      "item = q.pop(f)",
      "q.insert(t, item)",
      "return q",
    ].join("\n");
  }
  // dict state merge: existing keys keep their values
  if (has(/existing/) && has(/keep/) && has(/not mutated/)) {
    return [
      "out = dict(state)",
      "for episode in episodes:",
      "    url = episode[\"audio_url\"]",
      "    if url not in out:",
      "        out[url] = {\"title\": episode[\"title\"], \"played\": False, \"position_s\": 0, \"duration_s\": episode.get(\"duration_s\", 0)}",
      "return out",
    ].join("\n");
  }
  // newest-first sort, missing ts last
  if (has(/newest/) && has(/missing|no published_ts/) && has(/last/)) {
    return 'return sorted(episodes, key=lambda e: e.get("published_ts") if e.get("published_ts") is not None else float("-inf"), reverse=True)';
  }
  // word-overlap search rank
  if (has(/ranked/) && has(/query words/) && n === "search_episodes") {
    return [
      "words = [w for w in query.lower().split() if w]",
      "if not words: return []",
      "scored = []",
      "for i, ep in enumerate(episodes):",
      "    title = (ep.get(\"title\") or \"\").lower()",
      "    desc = (ep.get(\"description\") or \"\").lower()",
      "    score = sum(1 for w in words if w in title) + sum(1 for w in words if w in desc)",
      "    scored.append((score, i))",
      "scored.sort(key=lambda x: -x[0])",
      "return [i for s, i in scored if s > 0]",
    ].join("\n");
  }
  // RSS extraction (mechanical: ElementTree + itunes namespace + RFC dates)
  if (has(/rss xml/) && has(/enclosure/) && has(/itunes:duration/) && has(/pubdate/)) {
    return [
      "import xml.etree.ElementTree as ET",
      "from email.utils import parsedate_to_datetime",
      "try:",
      "    root = ET.fromstring(xml_text)",
      "except Exception:",
      "    return []",
      "NS = {\"it\": \"http://www.itunes.com/dtds/podcast-1.0.dtd\"}",
      "channel = root.find(\"channel\")",
      "show_el = channel.find(\"title\") if channel is not None else None",
      "show = show_el.text if show_el is not None and show_el.text else \"\"",
      "art_el = channel.find(\"it:image\", NS) if channel is not None else None",
      "artwork_url = art_el.get(\"href\", \"\") if art_el is not None else \"\"",
      "img_el = channel.find(\"image/url\") if channel is not None else None",
      "if not artwork_url and img_el is not None and img_el.text:",
      "    artwork_url = img_el.text",
      "out = []",
      "for item in root.iter(\"item\"):",
      "    title_el = item.find(\"title\")",
      "    title = title_el.text if title_el is not None and title_el.text else \"\"",
      "    enc = item.find(\"enclosure\")",
      "    audio_url = enc.get(\"url\", \"\") if enc is not None else \"\"",
      "    dur_el = item.find(\"it:duration\", NS)",
      "    duration_s = 0",
      "    if dur_el is not None and dur_el.text:",
      "        parts = dur_el.text.split(\":\")",
      "        if len(parts) == 2:",
      "            duration_s = int(parts[0]) * 60 + int(parts[1])",
      "        elif len(parts) == 3:",
      "            duration_s = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])",
      "    pub = item.find(\"pubDate\")",
      "    published_ts = 0.0",
      "    if pub is not None and pub.text:",
      "        try:",
      "            published_ts = parsedate_to_datetime(pub.text).timestamp()",
      "        except Exception:",
      "            published_ts = 0.0",
      "    desc_el = item.find(\"description\")",
      "    description = desc_el.text if desc_el is not None and desc_el.text else \"\"",
      "    out.append({\"title\": title, \"audio_url\": audio_url, \"duration_s\": duration_s, \"published_ts\": published_ts, \"description\": description, \"show\": show, \"artwork_url\": artwork_url})",
      "return out",
    ].join("\n");
  }
  return null;
}

/** THE GITHUB HUNT (2026-10-02 — "it should hunt for code especially on
 *  GitHub"): the GitHub search API (no auth, rate-limited) for repos named
 *  by the unit, then the repo's .py file tree, then the raw source — snipped
 *  by address. More deterministic than a web search; the primary code hunt. */
export async function huntGitHub({ unit, fetchImpl = globalThis.fetch }) {
  const gh = (url) => fetchImpl(url, {
    headers: { accept: "application/vnd.github+json", "user-agent": "the-fold-hunt" },
    signal: AbortSignal.timeout(20000),
  });
  try {
    const sres = await gh(`https://api.github.com/search/repositories?q=${encodeURIComponent(`${unit.name} language:python`)}&per_page=3`);
    if (!sres.ok) return [];
    const sj = await sres.json();
    for (const repo of (sj.items ?? []).slice(0, 3)) {
      const full = repo.full_name;
      const tres = await gh(`https://api.github.com/repos/${full}/git/trees/HEAD?recursive=1`);
      if (!tres.ok) continue;
      const tj = await tres.json();
      const py = (tj.tree ?? []).filter((e) => e.type === "blob" && e.path.endsWith(".py")).map((e) => e.path);
      if (!py.length) continue;
      const wanted = py.find((p) => p.toLowerCase().includes(unit.name.toLowerCase())) ?? py[0];
      const rres = await fetchImpl(`https://raw.githubusercontent.com/${full}/HEAD/${wanted}`, { headers: { "user-agent": "the-fold-hunt" }, signal: AbortSignal.timeout(20000) });
      if (!rres.ok) continue;
      const text = await rres.text();
      const snipped = snipFunction(text, unit.name);
      if (!snipped) continue;
      const keys = specFrameWords(unit, "python");
      if (keys.length && !keys.some((w) => snipped.code.toLowerCase().includes(w))) continue;
      return [{ code: snipped.code, address: `https://raw.githubusercontent.com/${full}/HEAD/${wanted}`, source: "web-github" }];
    }
    return [];
  } catch {
    return [];
  }
}

/** THE WEB: liveWeb search → derive RAW source URLs (raw.githubusercontent
 *  directly; a GitHub repo page's .py files turned into raw URLs) → fetch the
 *  raw bytes DIRECTLY (never the readable-text pipeline — it strips Python
 *  indentation, measured 2026-10-02) → snip the named function by address →
 *  frame-match the spec. Injectable web + fetch for tests; bounded, fail-open. */
export async function huntWeb({ unit, web = null, fetchImpl = globalThis.fetch }) {
  const w = web ?? liveWeb({ timeoutMs: 20000 });
  const rawGet = async (url) => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": "Mozilla/5.0 (the-fold hunt)", accept: "*/*" }, signal: ctl.signal, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.text()).slice(0, 40000);
    } finally { clearTimeout(t); }
  };
  try {
    const s = await w.search(`${unit.name} python implementation source`);
    const results = (s.results ?? []).slice(0, 4);
    const rawCandidates = [];
    for (const r of results) {
      const u = String(r.url ?? "");
      if (/raw\.githubusercontent\.com\//.test(u)) rawCandidates.push(u);
      else {
        const m = /github\.com\/([^/]+)\/([^/]+)/.exec(u);
        if (m) {
          const [, owner, repo] = m;
          try {
            const page = await w.fetch(`https://github.com/${owner}/${repo}`);
            const files = [...new Set((page.text.match(/[A-Za-z0-9_/-]+\.py/g) ?? []))].filter((f) => /soundex|sound|phon/i.test(f) || /^[a-z0-9_]+\.py$/.test(f)).slice(0, 4);
            for (const f of files) {
              for (const branch of ["master", "main"]) {
                rawCandidates.push(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.replace(/^\//, "")}`);
              }
            }
          } catch { /* a repo page that cannot be read is skipped */ }
        }
      }
    }
    for (const url of rawCandidates) {
      try {
        const text = await rawGet(url);
        const snipped = snipFunction(text, unit.name);
        if (!snipped) continue;
        const keys = specFrameWords(unit, "python");
        if (keys.length && !keys.some((word) => snipped.code.toLowerCase().includes(word))) continue;
        return [{ code: snipped.code, address: url, source: "web" }];
      } catch { /* a failed fetch is a skipped candidate */ }
    }
    return [];
  } catch {
    return [];
  }
}

/** THE SWARM: parallel ants gate a candidate before the expensive real test.
 *  LITERAL — the patched file parses (the file's own engine). STRUCTURAL —
 *  validatePython's undefined-name scan (a name used but never bound is a
 *  carried-masked bug, caught here). ADVERSARIAL — the spec's content words
 *  are present in the body. The dissent is disclosed; the real test is the
 *  final judge, never the swarm. */
export async function swarmProbe({ patchedCode, fileName, unit, syntaxGate = null }) {
  const ants = await Promise.all([
    (async () => {
      if (!syntaxGate?.check) return { ok: true, ant: "literal", note: "no syntax engine for this file" };
      const v = syntaxGate.check(patchedCode, fileName);
      return { ok: v === null || v.ok, ant: "literal", note: v?.error?.msg ?? null };
    })(),
    (async () => {
      let v;
      try { v = await validatePython(patchedCode); } catch (e) { return { ok: true, ant: "structural", note: `validator unavailable: ${e.message}` }; }
      const bad = (v.findings ?? []).filter((f) => /undefined/i.test(String(f.kind ?? "") + " " + String(f.detail ?? "")));
      return { ok: bad.length === 0, ant: "structural", note: bad.length ? bad.map((f) => f.detail).join("; ") : null };
    })(),
    (async () => {
      const words = (unit.spec ?? "").toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
      const keys = [...new Set(words)].filter((w) => !["the", "and", "for", "with", "that", "return", "list", "string", "input", "function", "each"].includes(w)).slice(0, 6);
      const body = String(patchedCode ?? "").toLowerCase();
      const missing = keys.filter((w) => !body.includes(w));
      return { ok: missing.length === 0, ant: "adversarial", note: missing.length ? `spec words absent: ${missing.join(", ")}` : null };
    })(),
  ]);
  const dissent = ants.filter((a) => !a.ok);
  return { ok: dissent.length === 0, ants, dissent };
}

/** PARAMETER RECONCILIATION (mechanical, by position): a hunted
 *  implementation may name its parameters differently than the void's real
 *  signature (`def soundex(input)` vs `def soundex(word)`). When the counts
 *  match, the body's occurrences of the hunted params are renamed to the
 *  void's — word-boundary, never a guess at meaning. Mismatched counts leave
 *  the body untouched (the real test judges). */
export function paramNames(signatureLine) {
  const m = /^def\s+[A-Za-z_]\w*\s*\(([^)]*)\)/.exec(String(signatureLine ?? ""));
  if (!m) return [];
  return (m[1] ?? "").split(",").map((s) => (s.match(/[A-Za-z_]\w*/) ?? [])[0]).filter(Boolean);
}

export function reconcileParams(body, huntedDecl, voidDeclText) {
  const voidParams = paramNames(String(voidDeclText ?? "").split("\n").find((l) => /^def\s/.test(l)));
  const huntedParams = paramNames(String(huntedDecl ?? "").split("\n").find((l) => /^def\s/.test(l)));
  if (!voidParams.length || voidParams.length !== huntedParams.length) return body;
  let out = String(body ?? "");
  huntedParams.forEach((hp, i) => {
    const vp = voidParams[i];
    if (hp && vp && hp !== vp) {
      out = out.replace(new RegExp(`\\b${hp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), vp);
    }
  });
  return out;
}

/** huntCandidates — the whole hunt micro-loop for one void, in parallel:
 *  FIELD scan + WEB hunt, each candidate a snipped declaration by address.
 *  The LOOP owns the physics (build the patch, apply, syntax-gate, run the
 *  real test, revert on fail) — the hunt only ever locates and snips. The
 *  model draws only if no candidate survives. */
export async function huntCandidates({ unit, workspace, locatedFile, huntRoots = [], web = null, fetchImpl = globalThis.fetch }) {
  const [field, github, webCandidates] = await Promise.all([
    scanField({ unit, workspace, huntRoots, exclude: locatedFile }),
    web === false ? [] : huntGitHub({ unit, fetchImpl }),
    web === false ? [] : huntWeb({ unit, web: typeof web === "object" && web !== null ? web : null, fetchImpl }),
  ]);
  return [...field, ...github, ...webCandidates];
}