// native/kernel/kind-universe.js — the child's universe: referents rolling
// up into kinds, dynamically, recursively, holonically. Pure over a store
// shape — no I/O, no engine, no model.
//
// THE UNIVERSE IS BUILT FROM RECOGNITIONS. Every recognized region is a
// REFERENT OCCURRENCE (a thing seen, at an address); every concept in the
// store is a KIND (a thing recognized as itself). The universe is not a
// fixed taxonomy — it is grown: an occurrence corroborates its kind, a
// novel occurrence proposes a provisional kind, a falsification refutes a
// lesson, and a kind whose own examples stop being mutually reachable
// SPLITS into sub-kinds. Each of those is one of the fold's own operations,
// by name:
//
//   SIG  — a novel thing is SIGNED as a provisional kind (high possibility:
//          it might be anything — that is what novelty means)
//   CON  — a kind is CORROBORATED by occurrences from distinct sources;
//          corroboration IS its probability (high frequency → high
//          probability; the floor is the house's own canonicalizationFloor)
//   SEG  — a kind SPLITS: its examples cluster into sub-kinds exactly when
//          its members are no longer mutually reachable at its own
//          within-kind distance (measured, never typed)
//   DEF  — a FALSIFICATION: a lesson is refuted and excluded from the
//          framework (a false memory is a memory that admits it is false)
//   REC  — a lesson is REVISED: superseded by a corrected one
//
// HOLONIC: a recognized thing's PARTS are themselves referents. The child
// can look inside a dog — its head, its body, its legs — and each part is
// its own occurrence that can roll up into its own kind. The universe is a
// lattice: what is a whole at one level is a part at the next, and the
// lattice is recomputed from the store on every snapshot, never stored
// separately (the store is the memory; the lattice is a view of it).

import { stableHash } from "./rng.js";
import { distanceOf, selfBoundOf, decodeDescriptor } from "./shadow-echo.js";

// the corroboration floor is the house's own canonicalizationFloor (ENTITY
// assembly): one arrival has no co-arrival to test.
export const CANONICALIZATION_FLOOR = 2;

export const occurrenceKey = (concept, source, region) =>
  stableHash(`mnemonic|${concept}|${String(source ?? "")}|${JSON.stringify(region ?? null)}`);

export const provisionalKindName = (descriptor) =>
  `kind:novel:${stableHash(`provisional|${descriptor.length}|${Array.from(descriptor.slice(0, 32)).join(",")}`)}`;

const decodeDescriptorOf = (item) => decodeDescriptor(item.d);

// ── SIG: sign a novel thing as a provisional kind ─────────────────────────
// A thing nothing recognizes is HIGH POSSIBILITY: it might be a new kind.
// It is signed provisionally under a name derived from its own descriptor
// (never from a guess about what it is), and becomes a real kind only when
// occurrences from distinct sources corroborate it (CON, below).
export function signProvisionalKind(store, { name, source, region, at = Date.now() }) {
  const entry = store.concepts[name] ?? {
    revision: 0,
    modality: "image",
    status: "provisional",
    signedAt: at,
    occurrences: [],
    items: [],
  };
  if (entry.status === "refuted") throw new TypeError(`signProvisionalKind: "${name}" is refuted — a refuted kind is not re-signed silently`);
  entry.revision += 1;
  const id = occurrenceKey(name, source, region);
  if (!entry.occurrences.some((o) => o.id === id)) {
    entry.occurrences.push({
      id,
      source: source ?? null,
      region: region ?? null,
      at,
      falsified: false,
      basis: "SIG:novel_occurrence",
    });
  }
  store.concepts[name] = entry;
  return { signed: name, status: entry.status };
}

// ── CON: corroboration — occurrences from DISTINCT sources ───────────────
// A kind's probability is its corroboration: distinct sources that have
// produced occurrences of it. One source repeating the same thing is one
// witness, not many. This is HISTORY (how often the kind has been seen),
// never a confidence SCORE — certainty is bounded geometry (the margin
// against the within-kind bound), and corroboration is the record that the
// geometry has been tested.
export function corroboration(store, concept) {
  const entry = store.concepts?.[concept];
  if (!entry?.occurrences?.length) return 0;
  return new Set(entry.occurrences.filter((o) => !o.falsified).map((o) => o.source ?? o.id)).size;
}

export function confirmKind(store, concept) {
  const entry = store.concepts?.[concept];
  if (!entry) return null;
  const c = corroboration(store, concept);
  if (c >= CANONICALIZATION_FLOOR && entry.status === "provisional") {
    entry.status = "confirmed";
    entry.confirmedAt = Date.now();
    return { confirmed: concept, corroboration: c };
  }
  return { confirmed: null, corroboration: c };
}

// ── DEF: falsification — the memory admits it was wrong ───────────────────
// The parent re-read the source and contradicted the lesson; the occurrence
// is marked refuted AND the lesson item it taught is marked refuted (they
// are the same lesson — one falsification, one memory line), and the
// concept's revision bumps, so every framework built from it is rebuilt
// without it. The refuted lines stay on file — a revision line, never an
// edit (the fold's own discipline).
export function falsifyOccurrence(store, concept, occurrenceId, { by = null, reason = null } = {}) {
  const entry = store.concepts?.[concept];
  if (!entry) return { falsified: 0 };
  let hit = 0;
  for (const o of entry.occurrences) {
    if (o.id !== occurrenceId || o.falsified) continue;
    o.falsified = true;
    o.falsifiedAt = Date.now();
    o.falsifiedBy = by;
    o.falsifyReason = reason;
    // the lesson that taught this occurrence is refuted with it
    for (const item of entry.items) {
      if (!item.refuted && String(item.source ?? "") === String(o.source ?? "") && JSON.stringify(item.region ?? null) === JSON.stringify(o.region ?? null)) {
        item.refuted = true;
        item.refutedBy = by;
        item.refuteReason = reason;
      }
    }
    hit += 1;
  }
  if (hit) entry.revision += 1;
  return { falsified: hit, revision: entry.revision };
}

// ── SEG: split — a kind whose members stop being mutually reachable ───────
// The derived split criterion: build the graph over the concept's own
// examples with an edge when the distance is within the concept's own
// within-kind bound (leave-one-out nearest bound); the connected components
// ARE the proposed sub-kinds. A kind splits exactly when its members stop
// being reachable from one another at the distance the kind itself
// established — "dogs will be hard" is exactly when the dog framework
// contains two clusters that no longer touch.
export function splitProposals(store, concept, { bound = null } = {}) {
  const entry = store.concepts?.[concept];
  if (!entry) return { concept, components: [] };
  const items = entry.items.filter((it) => !it.refuted);
  if (items.length < 2) return { concept, components: [] };
  const descriptors = items.map(decodeDescriptorOf);
  const b = bound ?? withinKindBound(store, concept);
  // bound 0 is a real bound (identical lessons connect); only a missing
  // bound (no lessons, no gap) is empty
  if (b < 0) return { concept, components: [] };
  const parent = items.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < descriptors.length; i += 1) {
    for (let j = i + 1; j < descriptors.length; j += 1) {
      if (distanceOf(descriptors[i], descriptors[j]) <= b) {
        const ri = find(i);
        const rj = find(j);
        if (ri !== rj) parent[ri] = rj;
      }
    }
  }
  const groups = new Map();
  for (let i = 0; i < items.length; i += 1) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(items[i]);
  }
  const components = [...groups.values()].sort((a, z) => z.length - a.length);
  return { concept, bound: b, components: components.length > 1 ? components : [] };
}

// the within-kind bound for the SPLIT — the RAW leave-one-out nearest
// structure, WITHOUT the twin compensation the recognition bound applies
// (shadow-echo.js::selfBoundOf). The split asks: at the kind's own local
// density, are the members mutually reachable? A hand-multiplicity or a
// symmetry orbit that RECOGNITION refuses to count as distance is exactly
// the redundancy the split is allowed to see — the split proposes sub-kinds
// at the density, and the recognition bound then decides what the sub-kinds
// recognize. (Measured, mnemonic-shapes.test.mjs: the twin-compensated
// bound connected a wide/tall rectangle family at the cross-cluster
// distance and the split vanished — the raw bound restores it.)
export function withinKindBound(store, concept) {
  const entry = store.concepts?.[concept];
  if (!entry?.items?.length) return 0;
  const live = entry.items.filter((it) => !it.refuted);
  if (live.length < 2) return 0;
  const items = live.map((it) => ({ descriptor: decodeDescriptorOf(it) }));
  let worst = 0;
  for (let i = 0; i < items.length; i += 1) {
    let nearest = Infinity;
    for (let j = 0; j < items.length; j += 1) {
      if (i === j) continue;
      const d = distanceOf(items[i].descriptor, items[j].descriptor);
      if (d < nearest) nearest = d;
    }
    if (nearest > worst) worst = nearest;
  }
  return worst;
}

// REC: a lesson is superseded — mark the old occurrence superseded and add
// the corrected lesson. The corrected lesson is the current memory; the
// superseded one stays on file as its revision history.
export function supersedeLesson(store, concept, occurrenceId, correctedLesson) {
  const entry = store.concepts?.[concept];
  if (!entry) return null;
  for (const o of entry.occurrences) {
    if (o.id === occurrenceId && !o.falsified && !o.superseded) {
      o.superseded = true;
      o.supersededAt = Date.now();
    }
  }
  entry.revision += 1;
  entry.items.push({ ...correctedLesson, refuted: false });
  return { revised: concept, revision: entry.revision };
}

// ── the universe snapshot: the whole lattice, recomputed from the store ───
// Kinds with their status/history (occurrences, corroboration), the DMD
// bound each kind recognizes within, and the VOID each kind is read against
// (the nearest example of any other kind, measured from the kind's OWN
// examples — a kind that sits inside another kind's void is a containment,
// disclosed, which is exactly how dog reads against mammal). Holonic PARTS
// edges: a kind whose occurrences sit inside another kind's region at the
// same source is a part of it. Pure view — the store is the memory, the
// lattice is derived from it.
export function voidOfKind(store, concept) {
  const entry = store.concepts?.[concept];
  if (!entry?.items?.length) return null;
  const shape = entry.items[0].shape ?? 0;
  let voidBest = null;
  let voidD = Infinity;
  for (const [otherName, otherEntry] of Object.entries(store.concepts ?? {})) {
    if (otherName === concept || !otherEntry?.items?.length) continue;
    if ((otherEntry.items[0].shape ?? 0) !== shape) continue;
    for (const mine of entry.items) {
      for (const item of otherEntry.items) {
        const d = distanceOf(decodeDescriptorOf(mine), decodeDescriptorOf(item));
        if (d < voidD) { voidD = d; voidBest = otherName; }
      }
    }
  }
  return voidBest ? { kind: voidBest, distance: voidD } : null;
}

export function universeSnapshot(store) {
  const kinds = {};
  for (const [name, entry] of Object.entries(store.concepts ?? {})) {
    kinds[name] = {
      status: entry.status ?? "provisional",
      modality: entry.modality ?? null,
      occurrences: entry.occurrences?.length ?? 0,
      falsified: entry.occurrences?.filter((o) => o.falsified).length ?? 0,
      distinctSources: corroboration(store, name),
      lessons: entry.items?.filter((it) => !it.refuted).length ?? 0,
      bound: withinKindBound(store, name),
      void: voidOfKind(store, name),
    };
  }
  const parts = [];
  const bySource = new Map();
  for (const [name, entry] of Object.entries(store.concepts ?? {})) {
    for (const o of entry.occurrences ?? []) {
      if (!o.source) continue;
      if (!bySource.has(o.source)) bySource.set(o.source, []);
      bySource.get(o.source).push({ kind: name, region: o.region, id: o.id });
    }
  }
  for (const occs of bySource.values()) {
    for (const a of occs) {
      for (const b of occs) {
        if (a.kind === b.kind || !a.region || !b.region) continue;
        // b's region strictly inside a's region, at the same source → b is a
        // part of a (holonic edge)
        const [ax, ay, aw, ah] = a.region;
        const [bx, by, bw, bh] = b.region;
        if (bx >= ax && by >= ay && bx + bw <= ax + aw && by + bh <= ay + ah) {
          parts.push({ whole: a.kind, part: b.kind, source: b.source, region: b.region });
        }
      }
    }
  }
  return { kinds, parts, kindCount: Object.keys(kinds).length, partCount: parts.length };
}