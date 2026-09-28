// origins.mjs — WHERE A THING CAME FROM, AS A CHOICE THE PERSON MAKES.
//
// Fold invariant: NO SLOT IS FILLED BY AN UNNAMED METHOD. Every item in the
// dock carries the adapter that produced it, that adapter's own statement of
// what it finds and what it does NOT find, and an id for the configuration it
// ran under. The person can swap a slot's adapter and edit its configuration;
// nothing is hardwired to a medium. ("Cast" finds capitalised names that recur
// — a fine method for people and places, silent on a graph, a quantity, or a
// theorem. That is a property of ONE adapter, so it is one option among several
// and says so.)
//
// An adapter is { id, label, slots, finds, misses, runsIn, configHelp,
// parseConfig(text) -> config | {error}, run({ texts, config }) -> items[] }.
// `texts` = [{ name, text }]. An item = { id, title, kind, address, verbatim,
// count, origin }. THE ADDRESS IS SELF-VERIFIED: an item whose span does not
// read back as its own verbatim is dropped and counted in `refused` — never
// drawn (P5.2). Offsets are JS-string chars; the coordinate space is declared.
//
// Pure and browser-safe. The named-beings adapter needs the engine's cast
// organ, so it is INJECTED (the cast.js pattern) by a Node caller and reports
// runsIn: "node"; the rest run in the page.

export const ORIGINS_SCHEMA = "EOOrigins@1";
export const COORDINATE_SPACE = "chars";
export const MAX_MATCHES = 2000;      // declared ceiling per adapter run
export const MAX_PATTERN_CHARS = 200; // declared ceiling on a person's pattern

// small non-cryptographic id for a configuration (an id, not a seal)
function configId(v) { let h = 2166136261; for (const c of JSON.stringify(v ?? null)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, "0"); }

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function collect(texts, regexFor, describeItem, adapter, config) {
  const groups = new Map(); const refused = []; let truncated = false;
  let seen = 0;
  for (const t of texts) {
    for (const spec of regexFor) {
      const re = new RegExp(spec.re.source, spec.re.flags.includes("g") ? spec.re.flags : spec.re.flags + "g");
      let m;
      while ((m = re.exec(t.text))) {
        if (m[0] === "") { re.lastIndex++; continue; }
        if (++seen > MAX_MATCHES) { truncated = true; break; }
        const b0 = m.index, b1 = m.index + m[0].length;
        if (t.text.slice(b0, b1) !== m[0]) { refused.push({ doc: t.name, at: [b0, b1] }); continue; }
        const d = describeItem(m, spec);
        const key = `${d.kind}|${d.norm}`;
        const g = groups.get(key) ?? { ...d, addresses: [], count: 0 };
        g.count++; if (g.addresses.length < 5) g.addresses.push(`${t.name}#${b0}-${b1}`);
        groups.set(key, g);
      }
      if (truncated) break;
    }
    if (truncated) break;
  }
  const origin = { adapter: adapter.id, label: adapter.label, config: configId(config) };
  const items = [...groups.values()].map((g) => ({
    id: `${adapter.id}:${g.kind}:${g.norm}`, title: g.title, kind: g.kind, address: g.addresses[0], addresses: g.addresses,
    verbatim: g.verbatim, count: g.count, ...(g.extra ?? {}), origin,
  }));
  return { items, refused, truncated };
}

// ── the adapters ──────────────────────────────────────────────────────────
const lines = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

export const DECLARED_TERMS = {
  id: "declared-terms", label: "Terms you declare", slots: ["objects"], runsIn: "browser",
  finds: "every occurrence of each term you list, typed with the kind you give it (a graph, a theorem, an instrument, a person — your word).",
  misses: "anything you did not list. It finds no new objects; it makes YOUR objects addressable.",
  configHelp: "One per line:  term | kind      e.g.  Moser spindle | graph",
  parseConfig(text) {
    const terms = [];
    for (const l of lines(text)) { const [term, kind = "term"] = l.split("|").map((s) => s.trim()); if (!term) return { error: `empty term in: ${l}` }; terms.push({ term, kind: kind || "term" }); }
    return { terms };
  },
  run({ texts, config }) {
    const specs = (config?.terms ?? []).map((t) => ({ re: new RegExp(`(?<![A-Za-z0-9])${escRe(t.term)}(?![A-Za-z0-9])`, "gi"), kind: t.kind, term: t.term }));
    return collect(texts, specs, (m, s) => ({ kind: s.kind, norm: s.term.toLowerCase(), title: s.term, verbatim: m[0] }), this, config);
  },
};

export const QUANTITIES = {
  id: "quantities", label: "Quantities with uncertainty", slots: ["measures"], runsIn: "browser",
  finds: "a number, a ± (or +- or \\pm) and an uncertainty, with the unit that follows, e.g. 73.04+-1.04 km/s/Mpc or (67.4\\pm 0.5)$km/s/Mpc; parsed into value, uncertainty, unit.",
  misses: "quantities with no stated uncertainty, ranges written 'a to b', values in tables the text layer flattened, and a bare unit written after a space with no \"/\" or \"^\" (\"5 ± 1 km\" is read as 5 ± 1, unit unstated).",
  configHelp: "No configuration.",
  parseConfig() { return {}; },
  run({ texts, config }) {
    // The unit is taken only where it is structurally a unit: a token holding
    // a "/" or "^" (km/s/Mpc, m^2), or one glued on by "$" (LaTeX). A bare word
    // after a space ("with", "and") is prose, not a unit, and is left out of the span.
    const re = /(-?\d+(?:\.\d+)?)\s*(?:±|\+-|\+\/-|\\pm)\s*(\d+(?:\.\d+)?)(?:\s*\)?\$?\s*([A-Za-z][A-Za-z0-9^*.\-]*[\/^][A-Za-z0-9^*.\/\-]*)|\)?\$([A-Za-z][A-Za-z0-9^*.\-]*))?/g;
    return collect(texts, [{ re, kind: "quantity" }], (m) => {
      const value = Number(m[1]), uncertainty = Number(m[2]), unit = m[3] ?? m[4] ?? "";
      const title = `${m[1]} ± ${m[2]}${unit ? " " + unit : ""}`;
      return { kind: "quantity", norm: title, title, verbatim: m[0], extra: { value, uncertainty, unit } };
    }, this, config);
  },
};

export const USER_PATTERN = {
  id: "user-pattern", label: "A pattern you write", slots: ["objects", "measures"], runsIn: "browser",
  finds: "every match of each regular expression you write, typed with the kind you give it.",
  misses: "whatever your pattern does not describe. A too-broad pattern draws noise — that is drawn honestly, with its count.",
  configHelp: `One per line:  /regex/flags | kind      e.g.  /\\b[A-Z]\\d{2,}\\b/ | code      (max ${MAX_PATTERN_CHARS} chars)`,
  parseConfig(text) {
    const patterns = [];
    for (const l of lines(text)) {
      const i = l.lastIndexOf("|"); const body = (i >= 0 ? l.slice(0, i) : l).trim(); const kind = (i >= 0 ? l.slice(i + 1).trim() : "") || "match";
      const m = body.match(/^\/(.*)\/([a-z]*)$/s);
      if (!m) return { error: `not /regex/flags: ${l}` };
      if (m[1].length > MAX_PATTERN_CHARS) return { error: `pattern longer than ${MAX_PATTERN_CHARS} characters` };
      try { new RegExp(m[1], m[2]); } catch (e) { return { error: `bad pattern: ${e.message}` }; }
      patterns.push({ source: m[1], flags: m[2], kind });
    }
    return { patterns };
  },
  run({ texts, config }) {
    const specs = (config?.patterns ?? []).map((p) => ({ re: new RegExp(p.source, p.flags), kind: p.kind }));
    return collect(texts, specs, (m, s) => ({ kind: s.kind, norm: m[0], title: m[0], verbatim: m[0] }), this, config);
  },
};

/** The engine's cast organ, injected. `castTexts` is block-cast.mjs's export. */
export function namedBeings(castTexts) {
  return {
    id: "named-beings", label: "Names that recur (the cast)", slots: ["objects"], runsIn: "node",
    finds: "capitalised surfaces that recur, folded into one being when they corefer (Nelson, Isbell, Planck, HST).",
    misses: "anything not written as a recurring capitalised name — a graph, a bound, a construction, a quantity. It also admits page furniture that happens to be capitalised twice. It does not know what KIND of thing a name is.",
    configHelp: "No configuration.",
    parseConfig() { return {}; },
    run({ texts, config }) {
      const c = castTexts({ texts });
      const origin = { adapter: "named-beings", label: "Names that recur (the cast)", config: configId(config) };
      const items = [...c.referents].map((id) => {
        const title = String(id).replace(/^ref:auto:/, "").replace(/_/g, " ");
        return { id: `named-beings:being:${id}`, title, kind: "being", address: `cast#${id}`, addresses: [`cast#${id}`], verbatim: title, count: 1, origin };
      });
      return { items, refused: [], truncated: false };
    },
  };
}

export function makeRegistry({ castTexts = null } = {}) {
  const list = [DECLARED_TERMS, QUANTITIES, USER_PATTERN, ...(castTexts ? [namedBeings(castTexts)] : [])];
  return Object.freeze(Object.fromEntries(list.map((a) => [a.id, a])));
}

/** resolveOrigins(config, registry) -> { chosen, disclosed }
 *  config = { [slot]: { adapter, text } }. An unknown adapter, an adapter that
 *  does not serve the slot, or an unparsable config falls back to "no origin
 *  chosen" for that slot and is DISCLOSED — never a silent default. */
export function resolveOrigins(config = {}, registry) {
  const chosen = {}; const disclosed = [];
  for (const [slot, sel] of Object.entries(config ?? {})) {
    const a = registry[sel?.adapter];
    if (!a) { disclosed.push({ slot, reason: `unknown adapter "${sel?.adapter}"` }); continue; }
    if (!a.slots.includes(slot)) { disclosed.push({ slot, reason: `${a.label} does not serve ${slot}` }); continue; }
    const parsed = a.parseConfig(sel.text ?? "");
    if (parsed?.error) { disclosed.push({ slot, reason: parsed.error }); continue; }
    chosen[slot] = { adapter: a, config: parsed, text: sel.text ?? "" };
  }
  return { chosen, disclosed };
}

/** fillSlots({ config, registry, texts }) -> { content, disclosed }
 *  Runs each chosen adapter and returns dock content per slot, with the
 *  adapter's statement of finds/misses attached as the slot's `origin`. */
export function fillSlots({ config, registry, texts }) {
  const { chosen, disclosed } = resolveOrigins(config, registry);
  const content = {};
  for (const [slot, c] of Object.entries(chosen)) {
    const r = c.adapter.run({ texts, config: c.config });
    content[slot] = { items: r.items, origin: { id: c.adapter.id, label: c.adapter.label, finds: c.adapter.finds, misses: c.adapter.misses, runsIn: c.adapter.runsIn }, refused: r.refused, truncated: r.truncated };
  }
  return { content, disclosed };
}
