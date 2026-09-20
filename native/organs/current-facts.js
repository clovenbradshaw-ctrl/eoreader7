// organs/current-facts.js — the current-facts witness: KINDS and their dated
// LINKS in the hyperlexicon's environment, refreshed from live doors, learned
// from stigmergic trails.
// Handle: Wilson (the environment is the medium) over Ranke (chase the claim
// to the document its account cites) and Shizhen (one specimen placed in a
// ranked kind). This organ is the I/O side of kernel/hyperlexicon-routes.js
// + kernel/stigmergy.js: it owns WHERE kinds, links and trails live (one
// file, the shared environment), WHEN links are re-checked (a refresh job
// with a TTL), and how each door's bytes become a kind and a link.
//
// PRESIDENTS ARE KINDS OF THINGS THAT HAVE TERMS. When a door dates a link
// (Wikidata's P580/P582, or any dated ground), the role kind gains the
// has-term parameter and membership in the meta-kind kind:has-term
// (hyperlexicon-routes.js::withTermStructure) — the structural fact that the
// role is held for intervals, which is what makes "current" a date-check and
// not a guess. An undated web finding still becomes a kind and a link; it
// just cannot declare a term, and its link stays current by refresh date.
//
// THE ENVIRONMENT FILE. `{ schema, kinds, links, trails }` — kinds and links
// are the doors' findings, trails are the hops' own deposits. Every turn,
// every surface reads the SAME environment: a link learned from one
// session's check is the ground for every later session's answer, until it
// is refreshed or vetoed. That is the ant colony's medium.
//
// extractHolder(groundText, head) — the holder a ground's own bytes name for
// a role, read grammatically:
//   "Donald Trump is the 47th President of the United States" -> "Donald Trump"  (X is the <head>)
//   "The president is Donald Trump."                                          -> "Donald Trump"  (the <head> is X)
//   "Wikidata lists Donald Trump as the current President ..."               -> "Donald Trump"  (lists X as the current <head>)
// No vocabulary: any role works, and nothing that does not match is guessed.
//
// VETO. A resolved claim found to conflict with a link is an alarm trail
// (Wilson): the link is demoted — it still resolves (the environment
// remembers what it knew) but the refresh job re-checks it first and the
// gate treats a vetoed link as grounds for suspicion, never certainty.

import fs from "node:fs";
import path from "node:path";
import {
  buildRouteIndex, routeAsk, serializeRoutes, loadRoutes, parseRouteRequest, ROUTE_TYPES,
  kindId, linkId, withTermStructure, kindNotes, ALIAS_VERB,
} from "../kernel/hyperlexicon-routes.js";
import { assertionId } from "./hyperlexicon.js";
import { deposit as depositTrail, routeOrderFor } from "../kernel/stigmergy.js";
import { factShape } from "./fact-gate.js";

const DAY_MS = 86400000;
const LINK_TTL_DAYS = 30;      // a link older than this is re-checked before it grounds an answer
const VETO_SUSPICION_DAYS = 14; // a veto younger than this keeps the link demoted

const words = (s) => String(s ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];

/**
 * The holder a ground's own bytes name for a role. Grammar-only; returns
 * null when the bytes do not name one (the honest absence).
 */
export function extractHolder(groundText, head) {
  const text = String(groundText ?? "");
  const h = String(head ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!text || !h) return null;
  // \p{Lu}, never ASCII [A-Z] — a Cyrillic holder ("Владимир Путин") is a
  // proper noun like any other (LAVAR S103's \b-ascii lesson, same shape);
  // and NO \b anywhere: it is ASCII-anchored even with the /u flag, so it
  // silently fails on Cyrillic/Greek/Hebrew — a lookahead bounds instead.
  const cap = "([\\p{Lu}][\\p{L}\\p{N}.'’\\-]+(?:\\s+[\\p{Lu}][\\p{L}\\p{N}.'’\\-]+){0,5})";
  const bound = "(?=\\s|[.!?,;:]|$)";
  // FOUND LIVE 2026-09-19: these patterns carry the `i` flag (the head noun and copula are matched case-blind), and
  // under /iu the class \p{Lu} ALSO matches lowercase letters — so the capital that makes a holder a NAME was silently
  // off, and "the head of state and head" (a search snippet's definition of the office) was learned as the holder
  // of "president". The capital is therefore checked on the ORIGINAL bytes of each candidate, and a rejected candidate
  // does not end the scan: the next match may be the real name.
  const isName = (v) => /^\p{Lu}/u.test(v);
  const pick = (source) => {
    const re = new RegExp(source, "giu");
    let m;
    while ((m = re.exec(text))) {
      const v = m[1].replace(/[.!?]+$/, "").trim();
      if (isName(v)) return v;
      re.lastIndex = m.index + 1; // rejected: retry from the next character, the real name may sit INSIDE this span
    }
    return null;
  };
  // Pattern A: "X is [the] [<ordinal>] <head> [of ...]" — the holder is X.
  const a = pick(`(?:^|\\s)${cap}\\s+is\\s+(?:the\\s+)?(?:\\d+(?:st|nd|rd|th)\\s+)?${h}${bound}`);
  if (a) return a;
  // Pattern B: "[the] <head> [of ...] is Y" — the holder is Y.
  const b = pick(`(?:^|\\s)(?:the\\s+)?${h}\\s+(?:of\\s+(?:the\\s+)?[\\p{Lu}][\\p{L}\\p{N}.'\\-]+(?:(?:\\s+[\\p{Lu}][\\p{L}\\p{N}.'\\-]+)+)?\\s+)?is\\s+${cap}${bound}`);
  if (b) return b;
  // Pattern C: "lists X as the current <head>" — the dated-record shape.
  const c = pick(`lists\\s+${cap}\\s+as\\s+(?:the\\s+)?current\\s+${h}${bound}`);
  if (c) return c;
  return null;
}

/** The term a dated record names, if any: "since 2025-01-20, term ending 2029-01-20". */
export const termFromRecord = (text) => {
  const since = /\bsince\s+(\d{4}-\d{2}-\d{2})/i.exec(String(text ?? ""))?.[1] ?? null;
  const until = /\bterm\s+ending\s+(\d{4}-\d{2}-\d{2})/i.exec(String(text ?? ""))?.[1] ?? null;
  return { since, until };
};
/** The ordinal a ground names for a role, if any ("47th"). */
const ordinalOf = (text) => /\b(\d+(?:st|nd|rd|th))\b/i.exec(String(text ?? ""))?.[1]?.toLowerCase() ?? null;
/** The jurisdiction a ground names for a role, if any ("United States"). */
const jurisdictionOf = (text, head) => {
  const h = String(head ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`${h}\\s+of\\s+(?:the\\s+)?([\\p{Lu}][\\p{L}\\p{N}.'\\-]+(?:\\s+[\\p{Lu}][\\p{L}\\p{N}.'\\-]+)*)`, "iu").exec(String(text ?? ""));
  return m ? m[1].replace(/[.!?]+$/, "").trim() : null;
};

const norm = (s) => String(s ?? "").trim().toLowerCase();

export function createCurrentFactsStore({ file = null, search = null, now = () => new Date(), lensForAsk = null } = {}) {
  let kinds = [];
  let links = [];
  let aliasNotes = []; // THE LEDGER: (surface, is-alias-of, kindId) admission acts
  let trails = {};
  let index = buildRouteIndex(kinds, links, aliasNotes);
  let dirty = false;

  const dateStr = () => (now() instanceof Date ? now() : new Date(now())).toISOString().slice(0, 10);
  const rebuild = () => { index = buildRouteIndex(kinds, links, aliasNotes); };

  function load() {
    if (!file) return;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const env = loadRoutes(data);
      kinds = env.kinds;
      links = env.links;
      aliasNotes = env.aliasNotes;
      trails = env.trails;
      rebuild();
    } catch { kinds = []; links = []; aliasNotes = []; trails = {}; rebuild(); }
  }
  function save() {
    if (!file) return false;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(serializeRoutes({ kinds, links, aliasNotes, trails }), null, 2));
      dirty = false;
      return true;
    } catch { return false; }
  }
  if (file) load();

  // ── THE LEDGER: ALIAS ADMISSIONS (the hyperlexicon's own shape) ─────────
  // A surface word binds to its REFERENT by an admission act, never by a
  // string field: (POTUS, is-alias-of, kind:role:president) — the same
  // end1/label/end2 shape the hyperlexicon ledger speaks, deduped by the
  // hyperlexicon's own identity (noteId).
  //
  // THE CONTEST (falsified live, 2026-09-19): a second admission binding the
  // SAME surface to a DIFFERENT referent is not an overwrite and not a
  // duplicate — it is a DISAGREEMENT about which referent the surface names.
  // The ledger's own discipline (notes.js disputes/contests; "an untyped
  // disagreement needs typing rather than a winner") refuses the new act and
  // returns a typed refusal; the route then resolves the contested surface to
  // NOTHING (the honest ambiguity) and discloses the contest. A surface is
  // never silently routed to whichever admission was written last.
  const ALIAS_REFUSALS = Object.freeze({
    NO_WITNESS: "no-witness",        // every admission names its giver (constitution II.2)
    NO_ENDS: "no-ends",
    CONTESTED: "contested-surface",  // the surface already binds to a DIFFERENT referent
  });
  function hearAlias({ subject, object, witness = null, because = null }) {
    const note = {
      subject: String(subject ?? "").trim(),
      verb: ALIAS_VERB,
      object: String(object ?? "").trim(),
      witness: String(witness ?? "").trim() || null,
      because: because ?? null,
      id: assertionId(subject, ALIAS_VERB, object),
    };
    if (!note.subject || !note.object) return { refused: true, reason: ALIAS_REFUSALS.NO_ENDS };
    if (!note.witness) return { refused: true, reason: ALIAS_REFUSALS.NO_WITNESS, note };
    if (aliasNotes.some((n) => n.id === note.id)) return { refused: true, reason: "duplicate" };
    const conflict = aliasNotes.find((n) => n.subject === note.subject && n.object !== note.object);
    if (conflict) return { refused: true, reason: ALIAS_REFUSALS.CONTESTED, note, existing: conflict };
    aliasNotes = [...aliasNotes, note];
    rebuild();
    dirty = true;
    return { admitted: true, note };
  }
  const aliasesOf = (kindId_) => aliasNotes.filter((n) => n.object === kindId_).map((n) => n.subject);
  // surfaces with TWO or more distinct referent bindings on file — the typed
  // ambiguity; keyed by the normed surface, the same key the route index uses
  const contestedSurfaces = () => {
    const bySurface = new Map();
    for (const n of aliasNotes) {
      const set = bySurface.get(norm(n.subject)) ?? new Set();
      set.add(n.object);
      bySurface.set(norm(n.subject), set);
    }
    const out = {};
    for (const [surface, objects] of bySurface) if (objects.size > 1) out[surface] = [...objects];
    return out;
  };

  // ── THE KIND ────────────────────────────────────────────────────────────
  function upsertKind(entry) {
    // an incoming `aliases` list is a batch of admission acts, heard into
    // the ledger — the kind itself never carries the strings; a refused
    // admission (contested surface, no witness) is a typed refusal, never a
    // silent drop. The refusals ride the RETURN VALUE only — they are a
    // per-call disclosure, and they must never reach the environment file.
    const refused = [];
    for (const a of entry?.aliases ?? []) {
      const r = hearAlias({ subject: a, object: kindId(entry.label), witness: entry.giver ?? null, because: "upsertKind batch" });
      if (r?.refused) refused.push({ surface: a, reason: r.reason });
    }
    const e = { id: kindId(entry.label), label: String(entry.label ?? "").trim(), jurisdiction: entry.jurisdiction ?? null, parameters: [], memberOf: [], ...entry, aliases: [] };
    if (!e.label) return null;
    const stored = { ...e }; // the persisted copy never carries the refusals
    const prev = kinds.find((k) => k.id === e.id);
    if (prev) {
      const next = { ...prev, ...e, parameters: [...new Set([...(prev.parameters ?? []), ...(e.parameters ?? [])])], memberOf: [...new Set([...(prev.memberOf ?? []), ...(e.memberOf ?? [])])] };
      const storedNext = { ...next };
      kinds = kinds.map((k) => (k.id === e.id ? storedNext : k));
      next.refusedAliases = refused;
      return next;
    }
    kinds = [...kinds, stored];
    rebuild();
    dirty = true;
    e.refusedAliases = refused;
    return e;
  }

  // ── THE LINK ────────────────────────────────────────────────────────────
  function upsertLink(entry) {
    const e = { ...entry };
    e.kindId = e.kindId ?? kindId(e.label);
    e.holder = String(e.holder ?? "").trim();
    e.at = e.at ?? dateStr();
    if (!e.kindId || !e.holder) return null;
    e.id = e.id ?? linkId(e.kindId, e.holder);
    const prev = links.find((l) => l.id === e.id);
    links = prev ? links.map((l) => (l.id === e.id ? { ...prev, ...e } : l)) : [...links, e];
    const kind = kinds.find((k) => k.id === e.kindId);
    if (kind) upsertKind(withTermStructure(kind, e));
    rebuild();
    dirty = true;
    return e;
  }

  function kindFor(head) {
    if (!head) return null;
    const direct = kinds.find((k) => norm(k.label) === norm(head));
    if (direct) return direct;
    // RESOLUTION BY REFERENT THROUGH THE LEDGER: the surface binds to a
    // referent id by an admission act — the kind is whoever the note names.
    // A CONTESTED surface names no single referent: the honest absence.
    if (contestedSurfaces()[norm(head)]) return null;
    const note = aliasNotes.find((n) => n.verb === ALIAS_VERB && norm(n.subject) === norm(head));
    if (!note) return null;
    return kinds.find((k) => k.id === note.object) ?? null;
  }

  function aliasTo(head, label, { witness = null, because = null } = {}) {
    const kind = kinds.find((k) => norm(k.label) === norm(label));
    if (!kind || !head || norm(head) === norm(label)) return { refused: true, reason: "no-kind-or-self" };
    return hearAlias({ subject: head, object: kind.id, witness, because });
  }

  /**
   * THE ROUTE — the stigmergic resolution, with the deposit made here, in
   * the environment: the hop that resolves reinforces its own trail (and
   * touches the link — recruitment); the hop that fails deposits nothing and
   * evaporates on its own. Latency is measured here, where the clock is.
   */
  function resolve(ask, { rng } = {}) {
    const lens = lensForAsk ? lensForAsk(ask) : null;
    const request = parseRouteRequest(ask, factShape, lens);
    if (!request.head && !request.holder) return { route: null, kind: null, link: null, ms: 0, request, ok: false, lens };
    const t0 = Date.now();
    const living = links.filter((l) => !(l.vetoedAt && (new Date(dateStr()) - new Date(l.vetoedAt)) / DAY_MS < VETO_SUSPICION_DAYS));
    const hit = routeAsk(buildRouteIndex(kinds, living, aliasNotes), request, { kinds, links: living, trails, rng });
    const ms = Date.now() - t0;
    // A CONTESTED SURFACE is disclosed, never silently routed: the ask's
    // head names two referents in the ledger — the resolution is the honest
    // EMPTY (no kind, no link, no deposit), and the contest is named.
    const contested = request.head && contestedSurfaces()[norm(request.head)] ? [request.head] : [];
    if (contested.length) return { route: null, kind: null, link: null, ms, request, ok: false, lens, order: hit.order, contested };
    trails = depositTrail(trails, { head: request.head ?? request.holder, route: hit.route, ok: hit.ok, ms, at: now().getTime() });
    // USAGE NEVER ADVANCES A LINK'S DATE: `at` is the door's refresh date —
    // the refresh job's staleness measure. A read deposits a trail (the
    // stigmergic reinforcement) and touches nothing.
    if (dirty) save();
    return { route: hit.route, kind: hit.kind, link: hit.link, ms, request, ok: hit.ok, lens, order: hit.order, contested: [] };
  }

  /** The web's own finding becomes a kind and an undated link (recruitment). */
  function adoptWebFinding({ head, groundText, query, jurisdiction = null, ordinal = null }) {
    const value = extractHolder(groundText, head);
    if (!value) return null;
    const kind = upsertKind({ label: head, jurisdiction: jurisdiction ?? jurisdictionOf(groundText, head) });
    return upsertLink({
      label: head, kindId: kind.id, holder: value,
      at: dateStr(), ref: query ? `web-search:${query}` : null, query: query ?? null, giver: "web-witness",
      ordinal: ordinal ?? ordinalOf(groundText),
    });
  }

  /** A dated record's own finding (current-holder.js's Wikidata ground). */
  function adoptDatedRecord({ head, text, ref }) {
    const value = extractHolder(text, head);
    if (!value) return null;
    const term = termFromRecord(text);
    const kind = upsertKind({ label: head, jurisdiction: jurisdictionOf(text, head) });
    return upsertLink({
      label: head, kindId: kind.id, holder: value,
      since: term.since ?? null, until: term.until ?? null,
      at: term.since ?? dateStr(), ref: ref ?? null, query: null, giver: "dated-record",
      ordinal: ordinalOf(text),
    });
  }

  /** A resolved claim found to conflict with a link — the alarm trail. */
  function markVetoed(head, { route = "veto" } = {}) {
    const kind = kindFor(head);
    const today = dateStr();
    if (kind) {
      links = links.map((l) => (l.kindId === kind.id ? { ...l, vetoedAt: today } : l));
      rebuild(); dirty = true;
    }
    trails = depositTrail(trails, { head, route, ok: false, ms: 0, at: now().getTime() });
    if (dirty) save();
    return kind ?? null;
  }

  /** Re-check stale links through the live doors; record what happened. */
  async function refreshStale({ ttlDays = LINK_TTL_DAYS, searchFn = search, datedLookup = null } = {}) {
    if (!searchFn && !datedLookup) return { checked: 0, changed: 0, failed: 0 };
    const today = dateStr();
    const todayMs = new Date(today).getTime();
    // A link whose TERM covers now is current by its own interval — staleness
    // applies to links whose term has passed or that never carried one. A
    // VETOED link is ALWAYS a candidate: the alarm is exactly the signal that
    // the door must be asked again, and asking clears it.
    const termCovers = (l) => {
      const s = l.since ? new Date(l.since).getTime() : NaN;
      const u = l.until ? new Date(l.until).getTime() : NaN;
      return (Number.isNaN(s) || s <= todayMs) && (Number.isNaN(u) || todayMs < u);
    };
    const stale = links.filter((l) => (l.vetoedAt || !termCovers(l)) && (new Date(today) - new Date(l.at)) / DAY_MS >= ttlDays);
    let changed = 0, failed = 0;
    for (const l of stale) {
      const kind = kinds.find((k) => k.id === l.kindId);
      const head = kind?.label ?? l.kindId.replace(/^kind:role:/, "");
      let ground = null;
      if (datedLookup && kind?.jurisdiction) {
        const rec = await datedLookup({ role: head, jurisdiction: kind.jurisdiction }).catch(() => null);
        if (rec?.found) ground = { text: rec.text, ref: rec.ref };
      }
      if (!ground && searchFn) {
        const q = l.query ?? `${head} is`;
        ground = await searchFn(q).catch(() => null);
        if (ground?.found) ground = { text: ground.text, ref: `web-search:${q}` };
      }
      if (!ground) { failed += 1; continue; }
      const value = extractHolder(ground.text, head);
      if (value) {
        const term = termFromRecord(ground.text);
        const prev = links.find((x) => x.id === l.id);
        links = links.map((x) => (x.id === l.id ? { ...x, holder: value, at: today, ref: ground.ref ?? x.ref, since: term.since ?? x.since, until: term.until ?? x.until, vetoedAt: null } : x));
        rebuild();
        if (norm(value) !== norm(prev?.holder)) changed += 1;
      } else {
        // the door answered but the lens could not read the answer — a
        // typed miss, counted as a failure, never a silent no-op
        failed += 1;
      }
      trails = depositTrail(trails, { head, route: "refresh", ok: Boolean(value), ms: 0, at: now().getTime() });
    }
    if (dirty) save();
    return { checked: stale.length, changed, failed };
  }

  /**
   * THE LEDGER PROJECTION — the environment as hyperlexicon notes, the same
   * shapes kindNotes() and the organs hyperlexicon's `hear` speak: the kind
   * memberships (a role word keeps-company its kind; a kind of things that
   * have terms keeps-company kind:has-term) and the dated links themselves
   * (the role holds-office the holder, witnessed by the ground, because of
   * the term). Every note is addressable by noteId(subject, verb, object).
   */
  function notes() {
    const kn = kindNotes(kinds, { witness: "current-facts@1" });
    const an = aliasNotes.map((n) => ({
      subject: n.subject, verb: n.verb, object: n.object,
      witness: n.witness ?? "current-facts@1",
      because: n.because ?? "the ask resolved to this kind — a learned surface, never an invented one",
    }));
    const ln = links.map((l) => {
      const kind = kinds.find((k) => k.id === l.kindId);
      const term = [l.since && `since ${l.since}`, l.until && `until ${l.until}`].filter(Boolean).join(", ");
      return {
        subject: kind?.label ? `the ${kind.label}` : l.kindId,
        verb: "holds-office",
        object: l.holder,
        witness: l.ref ?? l.giver ?? "current-facts@1",
        because: term ? `${term}; grounded ${l.at} by ${l.giver ?? "current-facts@1"}` : `grounded ${l.at} by ${l.giver ?? "current-facts@1"}`,
      };
    });
    return { kinds: kn, aliases: an, links: ln };
  }

  return {
    load, save,
    kinds: () => kinds.map((k) => ({ ...k, aliases: aliasesOf(k.id), parameters: [...(k.parameters ?? [])], memberOf: [...(k.memberOf ?? [])] })),
    links: () => links.map((l) => ({ ...l })),
    aliasNotes: () => aliasNotes.map((n) => ({ ...n })),
    trails: () => JSON.parse(JSON.stringify(trails)),
    index: () => buildRouteIndex(kinds, links, aliasNotes),
    kindFor, upsertKind, upsertLink, aliasTo, adoptWebFinding, adoptDatedRecord, markVetoed,
    resolve, refreshStale, notes,
    routeOrder: (head, opts = {}) => routeOrderFor(trails, head, { routes: ROUTE_TYPES, ...opts }),
    dateStr,
  };
}