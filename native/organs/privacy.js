// native/organs/privacy.js — the Privacy archon: owns data sovereignty as an
// ethos, in both its faces. Handle: Brandeis — Louis D. Brandeis, co-author of
// "The Right to Privacy" (1890), the paper that defined privacy as "the right
// to be let alone."
//
// WHAT IT IS. The constructive + defensive twin of the Charter (Grotius). Where
// the Charter governs PRESCRIPTIVE prose against the UDHR, the Privacy archon
// governs CODE against the data-sovereignty instruments (UDHR Art. 12, EU
// Charter Art. 8, Convention 108+, CARE/OCAP). Two faces of one coin:
//
//   CONSTRUCTIVE — `sovereigntyHint(task)`: when a code task handles people's
//   stored or communicated data, this CONDITIONS ORIENTATION toward E2EE,
//   local-first, zero-knowledge, minimization, consent, deletion/portability,
//   federation. A soft pull, never a gate: it shapes the ground the mouth
//   composes from, the same way the language-law hint shapes it.
//
//   DEFENSIVE — `privacyFindings(code)`: a static lint for the shapes that
//   betray the data-sovereignty boundary — a raw key written to
//   localStorage, a weak KDF, a hardcoded secret, a sensitive source routed
//   to a remote sink. Each finding is a WEAK SIGNAL (GuardDog's own law:
//   "the rules are heuristics meant as weak signals, not proof"), so the
//   verdict is corroboration across independent signals — never a single
//   match, never a model verdict, never a governor that can be toggled off.
//
// THE PRIOR IS THE GROUND, NOT THE RULE. The sovereignty prior
// (live_priors/derived-priors/code-priors/data-sovereignty-prior-v1.json) is
// loaded as ground — the same depth as the language-law prior — so removing
// this archon removes the ground the code universe stands on, not a filter
// sitting downstream of it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askShapeBest } from "./askshape.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── the sovereignty prior (ground, loaded once) ─────────────────────────────
let _prior = null;
let _priorLoaded = false;
export function loadSovereigntyPrior() {
  if (_priorLoaded) return _prior;
  _priorLoaded = true;
  try {
    const p = path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "code-priors", "data-sovereignty-prior-v1.json");
    _prior = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch { _prior = null; }
  return _prior;
}

// ── CONSTRUCTIVE FACE ───────────────────────────────────────────────────────
// A task that handles people's stored/communicated data gets its ground biased
// toward the sovereignty shapes. Soft pull, never a refusal.
export function sovereigntyHint(task) {
  const prior = loadSovereigntyPrior();
  if (!prior) return "";
  const t = String(task ?? "").toLowerCase();
  // Prefix match (word-boundary at the start only) so "message" also matches
  // "messaging"/"messages", "store" matches "storage"/"storing".
  const domain = (prior.signals?.domain ?? []).some((d) => new RegExp(`\\b${d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t));
  if (!domain) return "";
  const principles = (prior.principles ?? []).map((p) => p.name).join(", ");
  const protocols = (prior.signals?.protocols ?? []).join("/");
  return `\nThis tool handles people's stored or communicated data, so bias the design toward DATA SOVEREIGNTY (grounded in UDHR Art. 12, EU Charter Art. 8, Convention 108+, and the CARE principles): ${principles}. Prefer ${protocols}-style end-to-end encrypted, local-first, federated architecture over a single operator holding plaintext.`;
}

// ── DEFENSIVE FACE ──────────────────────────────────────────────────────────
// Heuristic, disclosed: each rule is a weak signal, not proof. A finding
// NOMINATES; it never convicts on its own (corroboration across independent
// signals is the caller's job). The patterns are the ones a real E2EE codebase
// audit turns up — see live_priors/09-source-code/clovenbradshaw_bare-metal-
// eo-matrix-app/PRIVACY-LINT.md.
const KDF_FLOOR = 300_000; // below OWASP's PBKDF2-HMAC-SHA256 floor
const SENSITIVE_SOURCES = /\b(clipboard|keystroke|keylog|geolocation|location\.|navigator\.mediaDevices|camera|microphone|contacts|credentials?|password|token)\b/i;
const REMOTE_SINK = /\b(fetch|XMLHttpRequest|axios|websocket|WebSocket|sendBeacon|\.post\(|\.send\()/i;
const PLAINTEXT_STORE = /localStorage\.(setItem|set)\s*\(\s*[^,]+,\s*(?:[^)]*key|b64|exportKey)/i;

export function privacyFindings(code, { task = "" } = {}) {
  const findings = [];
  const src = String(code ?? "");

  // 1. a raw key / secret written to localStorage (plaintext at rest).
  if (PLAINTEXT_STORE.test(src)) {
    findings.push({ kind: "key_at_rest", detail: "key material appears to be written to localStorage un-wrapped — anyone with this origin can read it (XSS blast radius = the whole vault)" });
  }
  // 2. a hardcoded secret.
  if (/\b(api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(src)) {
    findings.push({ kind: "hardcoded_secret", detail: "a literal secret is embedded in the source" });
  }
  // 3. a weak KDF.
  const kdf = /PBKDF2_ITERATIONS\s*=\s*(\d+)/.exec(src) ?? /iterations\s*[:=]\s*(\d+)/i.exec(src);
  if (kdf && Number(kdf[1]) < KDF_FLOOR) {
    findings.push({ kind: "weak_kdf", detail: `PBKDF2 iterations ${kdf[1]} below the ${KDF_FLOOR} floor — the password-derived key is brute-forceable offline` });
  }
  // 4. the collector/exfil shape: a sensitive source routed to a remote sink.
  if (SENSITIVE_SOURCES.test(src) && REMOTE_SINK.test(src)) {
    findings.push({ kind: "sensitive_to_remote", detail: "a sensitive source (credential/clipboard/media) appears alongside a remote send — the collector/exfil shape (weak signal, corroborate before acting)" });
  }

  return { findings, prior: loadSovereigntyPrior() ? "sovereignty-prior-loaded" : "no-sovereignty-prior", basis: "privacy archon (Brandeis) — heuristic weak signals, disclosed; a finding is a nomination, never a verdict" };
}

// ── DEFENSIVE FACE, AT THE ASK: refuse a problematic request ───────────────
// The gate that runs BEFORE a single token is drawn. Two corroborating signals
// (never one — "no single feature gives it away"):
//   CAPABILITY  — the request names a harmful capability (keylogger,
//                 credential harvest, ransomware, exfiltration, backdoor…).
//   NON-CONSENT / CONCEALMENT — it targets people who did not agree, or asks
//                 to hide the code from the person it runs on.
// and the intent is to CREATE (write/build/make), not to UNDERSTAND
// (analyze/audit/defend — a defender's ask passes). A single signal alone is a
// nomination, never a refusal — this is Bukhari's corroboration, aimed at the
// spec. Heuristic, disclosed.
// The ACT vocabulary, the COLLAPSE arms and the ask's own grammar (create vs
// understand) now live in the LENSES (adapters/text/askshape-lens. en +
// multilingual, Levinas): harmfulness is judged as a SHAPE — an act on an other
// that collapses their experience, humanity or autonomy — and the words that
// name those shapes are surface forms in the adapter, never in the kernel
// (LAVAR.md §8). The kernel judges under EVERY lens, so the ask is heard in its
// own language.

export function specRefusal(task, { charter = null, charterGate = null, disposition = null } = {}) {
  const t = String(task ?? "");
  let voice = { verdict: null, prescriptive: false, descriptive: false };
  // THE SHAPE (Levinas + Mahavira): the reading is a RELATION — what would the
  // ask do to a standpoint — not a keyword. The shape names its witnesses, and
  // the ask's own grammar decides whether it is a request to DO the thing.
  // THE ACCUMULATED PATTERN IS A WITNESS: if the person's cross-session shadow
  // trail is a corroborated `repeated-conflict` (Bourdieu), the pattern itself
  // supplies the second signal a single request cannot — the sequential-monitor
  // mechanism. It never convicts on history alone: it lowers the bar for a real
  // shape in THIS act.
  const corroborated = disposition?.corroborated === true;
  const shape = askShapeBest(t, { charter });
  // THE EXISTENCE FACE reads first, in the reader's own register: an ask whose
  // realization is to END a standpoint is declined because the reader's work is
  // to keep standpoints in the whole and integrate them — this would take one
  // out. The coupling (a means sought as capacity, the widest foreclosure, or
  // the means to end one's own life) IS the create-intent; it does not wait on
  // the code-authoring grammar. The witnesses already speak the reading.
  if (shape.forecloses) {
    return { refused: true, reason: shape.witnesses.join("; "), shape, voice };
  }
  // The charter family (Grotius) is the ground the reader stands on, not a
  // citation it wields: prescriptive prose that would prescribe the erasure of a
  // standpoint. The voice (prescriptive vs descriptive) is returned so the
  // caller can leave the right SHADOW (THE-MORAL-CORE.md: three trails, never
  // merged).
  if (charter && charterGate) {
    try {
      const v = charterGate(charter, t);
      voice = { verdict: v.verdict ?? null, prescriptive: !!v.prescriptive, descriptive: !!v.descriptive };
      if (v.verdict === "conflict") return { refused: true, reason: `prescribes the erasure of a standpoint the reader exists to integrate (${v.conflicts.map((c) => c.act ?? c.right ?? c.kind).join(", ")})`, voice, shape };
    } catch {}
  }
  // The create-intent rides the SHAPE (per lens), so an ask in ANY language is
  // judged on its own grammar: `shape.create` is what the matched lens heard,
  // not an English verb tested against foreign text.
  const create = shape.create || shape.instrumentalCreate || shape.inherent;
  if (create && (shape.harmful || (shape.capability && corroborated))) {
    const signals = [...shape.witnesses];
    if (shape.inherent) signals.unshift("names a means whose only realization collapses another's fold");
    if (corroborated && !shape.experience && !shape.humanity && !shape.autonomy) signals.push("a repeated norm-conflict history corroborates (the accumulated shadow trail supplies the second witness)");
    return { refused: true, reason: `asks to author work whose SHAPE collapses a standpoint — ${signals.join("; ")}`, shape, voice };
  }
  return { refused: false, shape, voice };
}

export const PRIVACY_ARCHON = { handle: "Brandeis", organ: "privacy", instruments: ["UDHR Art. 12", "EU Charter Art. 8", "Convention 108+", "CARE/OCAP"] };

// ── CONSTRUCTIVE FACE, MADE OPERATIVE: the sovereign data substrate ─────────
// A hint cannot make a small model write correct E2EE — measured: the hint
// alone produced a plaintext stub. The machine must OWN the deterministic
// substrate, exactly as it owns the HTML design shell. This organ emits a
// complete, working, self-contained data-holding app where:
//   - every change is an append-only event, AES-GCM encrypted under a
//     password-derived key (PBKDF2, WebCrypto) — the homeserver/disk never
//     sees plaintext;
//   - the visible state is the FOLD of events (replay), never a mutable row;
//   - delete is a TOMBSTONE event, never an in-place erase;
//   - the key lives in memory only (local-first, encrypted at rest).
// The model proposes only the SCHEMA — the record's name and fields — and the
// machine renders the substrate around it. The hard part is never the model's
// to get wrong.

// The substrate is COMPOSED from four organs at their seams — never a
// monolith. Each is a small, named, self-contained primitive; the composition
// below wires them together. The mouth never writes any of it.
//   CRYPTO — snipped from the bare-metal app's own envelope.js (the same
//            b64/[iv][ct]/PBKDF2/AES-GCM primitives), never re-implemented.
//   LEDGER — the append-only event log (notes.js / document-ledger's law:
//            append, never rewrite).
//   FOLD   — the operator replay (INS create, DEF snip, SEG cut) — the kernel's
//            fold specialized to records.
//   UI     — the composition: render, and the seams where the others connect.
const CRYPTO_ORGAN = `
  function b64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function unb64(s) {
    var bin = atob(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function rnd(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  async function deriveKey(password, salt) {
    var material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: 250000 },
      material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptObj(obj) {
    var iv = rnd(12);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(obj)));
    return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  }
  async function decryptObj(blob) {
    var iv = unb64(blob.iv), ct = unb64(blob.ct);
    var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct);
    return JSON.parse(dec.decode(plain));
  }
`;
const LEDGER_ORGAN = `
  function getSalt() {
    var s = localStorage.getItem(SALT_KEY);
    if (!s) { s = b64(rnd(16)); localStorage.setItem(SALT_KEY, s); }
    return unb64(s);
  }
  function loadEvents() { try { return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'); } catch (e) { return []; } }
  function saveEvents(evs) { localStorage.setItem(EVENTS_KEY, JSON.stringify(evs)); }
  async function append(operator, payload) {
    var evs = loadEvents();
    var ev = Object.assign({ id: crypto.randomUUID(), op: operator }, payload || {});
    evs.push(await encryptObj(ev));
    saveEvents(evs);
  }
`;
const FOLD_ORGAN = `
  async function fold() {
    // Replay the operator events into current state — the fold IS the query.
    //   INS  create a record        (its event id becomes the record id)
    //   DEF  snip — surgically set ONE field, recorded, never an in-place write
    //   SEG  cut   — remove the record (tombstone), still on the ledger
    var records = {};
    var evs = loadEvents();
    for (var i = 0; i < evs.length; i++) {
      try {
        var ev = await decryptObj(evs[i]);
        if (ev.op === 'INS') records[ev.id] = Object.assign({ id: ev.id }, ev.rec);
        else if (ev.op === 'DEF' && records[ev.target]) records[ev.target][ev.field] = ev.value;
        else if (ev.op === 'SEG') delete records[ev.target];
      } catch (e) { /* tampered or wrong key */ }
    }
    return Object.keys(records).map(function (k) { return records[k]; });
  }
`;
const UI_ORGAN = `
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (children) n.innerHTML = children;
    return n;
  }
  function renderForm() {
    var form = document.getElementById('add-form');
    form.innerHTML = '';
    SCHEMA.fields.forEach(function (f) {
      var label = el('label', {}, f.label || f.name);
      var input = el(f.type === 'textarea' ? 'textarea' : 'input', { name: f.name, placeholder: f.label || f.name });
      form.appendChild(label); form.appendChild(input);
    });
    form.appendChild(el('button', { type: 'submit' }, 'Add ' + SCHEMA.recordName));
  }
  async function renderList() {
    var list = document.getElementById('list');
    list.innerHTML = '';
    var records = await fold();
    if (!records.length) { list.appendChild(el('p', { class: 'empty' }, 'No ' + SCHEMA.recordName + 's yet.')); return; }
    records.forEach(function (rec) {
      var row = el('li', {});
      var values = el('div', { class: 'values' });
      SCHEMA.fields.forEach(function (f) {
        values.appendChild(el('span', { class: 'f-' + f.name }, rec[f.name] || ''));
      });
      row.appendChild(values);
      var actions = el('div', { class: 'actions' });
      var editBtn = el('button', { class: 'edit' }, 'snip');
      var delBtn = el('button', { class: 'del' }, 'cut');
      actions.appendChild(editBtn); actions.appendChild(delBtn);
      row.appendChild(actions);
      delBtn.addEventListener('click', function () { append('SEG', { target: rec.id }).then(renderList); });
      editBtn.addEventListener('click', function () {
        // SNIP: turn values into inputs; save appends ONE DEF event per
        // changed field — a surgical, recorded revision, never an in-place
        // write. The old value stays on the ledger; the fold projects the new.
        var form = el('form', { class: 'edit-form' });
        SCHEMA.fields.forEach(function (f) {
          var input = el(f.type === 'textarea' ? 'textarea' : 'input', { name: f.name });
          input.value = rec[f.name] || '';
          form.appendChild(input);
        });
        var save = el('button', { type: 'submit' }, 'save');
        var cancel = el('button', { type: 'button', class: 'cancel' }, 'cancel');
        form.appendChild(save); form.appendChild(cancel);
        row.replaceChildren(form);
        cancel.addEventListener('click', renderList);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var snips = [];
          SCHEMA.fields.forEach(function (f) {
            var input = form.querySelector('[name="' + f.name + '"]');
            if (input && input.value !== (rec[f.name] || '')) snips.push({ field: f.name, value: input.value });
          });
          Promise.all(snips.map(function (s) { return append('DEF', { target: rec.id, field: s.field, value: s.value }); }))
            .then(renderList);
        });
      });
      list.appendChild(row);
    });
  }

  async function unlock(password) {
    key = await deriveKey(password, getSalt());
    document.getElementById('unlock').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    renderForm(); renderList();
  }

  document.getElementById('unlock-btn').addEventListener('click', function () {
    unlock(document.getElementById('password').value);
  });
  document.getElementById('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var rec = {};
    SCHEMA.fields.forEach(function (f) {
      var input = document.querySelector('#add-form [name="' + f.name + '"]');
      rec[f.name] = input ? input.value : '';
    });
    append('INS', { rec: rec }).then(function () { renderList(); e.target.reset(); });
  });
`;

// The seams: the shared state each organ reads/writes, and the order they
// compose in (crypto first, then the ledger over it, then the fold over the
// ledger, then the UI wiring the whole).
const SOVEREIGN_ORGANS = [CRYPTO_ORGAN, LEDGER_ORGAN, FOLD_ORGAN, UI_ORGAN];

function composeSovereignScript(schema) {
  return `(function () {
  var SCHEMA = ${schema};
  var SALT_KEY = 'sovereign:salt';
  var EVENTS_KEY = 'sovereign:events';
  var key = null;
  var enc = new TextEncoder();
  var dec = new TextDecoder();
${SOVEREIGN_ORGANS.join("\n")}
})();`;
}

export function sovereignDataShell({ title = "Sovereign Data", recordName = "record", fields = [{ name: "title", label: "Title", type: "text" }] }) {
  const schema = JSON.stringify({ recordName, fields });
  const script = composeSovereignScript(schema);
  const fieldHints = fields.map((f) => `${f.label ?? f.name} (${f.type})`).join(", ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
:root { --bg: #faf6f0; --fg: #2d2a26; --card: #ffffff; --muted: #8a8078; --accent: #2f7d5d; }
[data-theme="dark"] { --bg: #1f1c19; --fg: #ece7e0; --card: #2a2622; --muted: #a89f96; --accent: #57b894; }
* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); transition: background .3s, color .3s; }
.container { max-width: 640px; margin: 0 auto; padding: 2rem 1.5rem; }
h1 { font-size: 1.9rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
.tagline { color: var(--muted); font-size: 1rem; margin: 0 0 1.5rem; }
.card { background: var(--card); border-radius: 14px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.card h2 { margin: 0 0 .75rem; font-size: .95rem; text-transform: uppercase; letter-spacing: .08em; color: var(--accent); }
label { display: block; font-size: .85rem; color: var(--muted); margin: .5rem 0 .2rem; }
input, textarea { width: 100%; padding: .55rem .7rem; border: 1px solid var(--muted); border-radius: 8px; background: var(--bg); color: var(--fg); font: inherit; }
textarea { min-height: 4rem; resize: vertical; }
button { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: .55rem 1rem; cursor: pointer; font: inherit; }
button:hover { filter: brightness(1.06); }
#app { display: none; }
#unlock { text-align: center; }
#unlock input { margin: 1rem auto; max-width: 300px; }
ul { list-style: none; padding: 0; margin: 0; }
li { display: flex; justify-content: space-between; align-items: center; gap: .5rem; padding: .6rem .25rem; border-bottom: 1px solid var(--muted); }
li .values { display: flex; flex-wrap: wrap; gap: .5rem; overflow-wrap: anywhere; }
li .values span { padding: .1rem .4rem; border-radius: 6px; background: var(--bg); }
li .actions { display: flex; gap: .3rem; flex-shrink: 0; }
li .edit { background: var(--muted); font-size: .8rem; padding: .3rem .6rem; }
li .del { background: #b44; font-size: .8rem; padding: .3rem .6rem; }
.edit-form { display: flex; flex-direction: column; gap: .4rem; width: 100%; }
.edit-form .cancel { background: var(--muted); }
.empty { color: var(--muted); }
.theme-toggle { position: fixed; top: 1rem; right: 1rem; background: var(--accent); border-radius: 999px; padding: .6rem 1.1rem; font-size: .9rem; }
</style>
</head>
<body>
<button class="theme-toggle" id="themeToggle">Dark mode</button>
<div class="container">
  <div id="unlock">
    <h1>${title}</h1>
    <p class="tagline">Your data is encrypted on this device. Unlock with your password — nothing you enter is ever readable by a server.</p>
    <input id="password" type="password" placeholder="Password" autocomplete="current-password">
    <button id="unlock-btn">Unlock</button>
  </div>
  <div id="app">
    <h1>${title}</h1>
    <p class="tagline">A ${recordName} is ${fieldHints}. Every change is an encrypted, append-only OPERATOR event — INS creates, DEF snips one field, SEG cuts — and this list is the fold of those events. Edits are surgical and recorded; nothing is ever written in place.</p>
    <div class="card">
      <h2>Add ${recordName}</h2>
      <form id="add-form"></form>
    </div>
    <div class="card">
      <h2>${recordName}s</h2>
      <ul id="list"></ul>
    </div>
  </div>
</div>
<script>
(function () {
  var btn = document.getElementById("themeToggle");
  var saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  btn.addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
    localStorage.setItem("theme", cur);
    btn.textContent = cur === "dark" ? "Light mode" : "Dark mode";
  });
})();
</script>
${script ? `<script>${script}</script>` : ""}
</body>
</html>`;
}

// ── detection + the schema the model proposes (its ONLY job) ───────────────
// A data-holding task is one in the sovereignty domain that asks to build an
// app/tool that STORES records. The model is asked for the schema only — the
// record name and its fields — never for the crypto, the fold, or the deletes.
const HOLD_VERBS = /\b(build|make|create|write)\b/i;
const HOLD_NOUNS = /\b(note|notes|contact|contacts|ledger|record|records|task|tasks|list|todo|tracker|journal|diary|bookmark|bookmarks|database|table|log|entry|entries|account|accounts)\b/i;
export function isDataHoldingTask(task) {
  const t = String(task ?? "");
  // Exclude real-time/transport apps (chat, sync) — those are a different
  // shape than a data-holding app. "server"/"api" are NOT excluded: "never
  // readable by a server" is the sovereignty case, not a server build.
  return HOLD_VERBS.test(t) && HOLD_NOUNS.test(t) && !/\b(chat|message|messaging|sync|matrix|live\s+stream)\b/i.test(t);
}

export function sovereignSchemaPrompt(task, name) {
  return `We're building ${name} — a data-holding app where every change is an encrypted, append-only event and the visible list is the fold of those events (the substrate already exists; do NOT write crypto, storage, or the fold). The complete specification:\n\n"""\n${task}\n"""\n\nPropose ONLY the record schema as one line of JSON: {\"recordName\": \"<singular noun>\", \"fields\": [{\"name\":\"<camelCase>\",\"label\":\"<Human Label>\",\"type\":\"text|textarea|number\"}]}. Use 2-5 fields that match the specification. Emit the JSON object only — no prose, no markdown fences, no commentary.`;
}

export function extractSovereignSchema(text) {
  const t = String(text ?? "");
  const anchor = t.indexOf('"recordName"');
  if (anchor === -1) return null;
  // Backtrack to the enclosing '{' (the schema object may be nested inside the
  // fields array, so a naive flat-brace regex fails — balance instead).
  const start = t.lastIndexOf("{", anchor);
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) {
      try {
        const schema = JSON.parse(t.slice(start, i + 1));
        if (!schema?.recordName || !Array.isArray(schema?.fields) || !schema.fields.length) return null;
        schema.fields = schema.fields
          .filter((f) => f && f.name && ["text", "textarea", "number"].includes(f.type))
          .slice(0, 6)
          .map((f) => ({ name: String(f.name), label: String(f.label ?? f.name), type: f.type }));
        return schema.fields.length ? schema : null;
      } catch { return null; }
    }}
  }
  return null;
}
