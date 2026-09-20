// mnemonic-referent.test.mjs — the kind IS a referent: one being, named in
// every language, recognized by any of its surfaces. The house's own
// omnilingual normalization (adapters/text/surfaces.js: NFKC + diacritic
// folding — Greek polytonic, Hebrew niqqud, Latin macrons all land on one
// form) is the binding seam: "dog", "κύων", "犬", "كلب", "kutya" address
// the same memory, and the reader binds prose to the same mnemonic kind.

import test from "node:test";
import assert from "node:assert/strict";
import { createSeededRng } from "../kernel/rng.js";
import {
  emptyStore,
  teachGrid,
  nameKind,
  kindByName,
  recognizeGrid,
} from "./mnemonic.js";

const W = 96;
const H = 96;
const noise = (seed) => (createSeededRng(seed)() - 0.5) * 2 * 0.02;

const triangleAt0 = ({ seed = 1 } = {}) => {
  const g = new Float64Array(W * H).fill(0.22);
  const top = H / 2 - 22;
  const base = H / 2 + 22;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const t = (y - top) / (base - top);
    if (y >= top && y <= base && Math.abs(x - W / 2) <= 22 * t) g[y * W + x] = 1;
  }
  for (let i = 0; i < g.length; i += 1) g[i] += noise(seed + i);
  return g;
};

test("a kind is named in many languages and resolves from any of them", () => {
  const store = emptyStore();
  for (let i = 0; i < 7; i += 1) {
    teachGrid(store, "triangle", { grid: triangleAt0({ seed: i * 10 + 1 }), w: W, h: H, source: `tri-${i}.png`, sourceBytes: 120000, label: "triangle" });
  }
  // the parent names the being in every language it has a name for
  nameKind(store, "triangle", "en", ["triangle", "triangular"]);
  nameKind(store, "triangle", "el", ["τρίγωνον", "τρίγωνο"]);
  nameKind(store, "triangle", "he", ["משולש"]);
  nameKind(store, "triangle", "ar", ["مثلث"]);
  nameKind(store, "triangle", "ja", ["三角形", "三角"]);
  nameKind(store, "triangle", "hu", ["háromszög"]);
  nameKind(store, "triangle", "zh", ["三角形"]);
  nameKind(store, "triangle", "la", ["triangulum"]);

  // every surface resolves to the same being, with the same bytes-identity
  const identities = new Set();
  for (const surface of ["triangle", "τρίγωνον", "τρίγωνο", "משולש", "مثلث", "三角形", "háromszög", "triangulum", "Triangular", "ΤΡΊΓΩΝΟΝ"]) {
    const hits = kindByName(store, surface);
    assert.ok(hits.length >= 1, `${surface} must resolve`);
    assert.equal(hits[0].concept, "triangle", `${surface} binds to the same kind`);
    identities.add(hits[0].identity);
  }
  assert.equal(identities.size, 1, "every name is one referent — one bytes-identity");

  // the diacritic fold: polytonic Greek, niqqud, and case all land on the
  // registered form (the house's diaNorm), so even an unfamiliar spelling
  // with full accentuation binds
  assert.equal(kindByName(store, "τρίγωνον")[0].lang, "el");
  assert.equal(kindByName(store, "משולש")[0].lang, "he");
  // the script is disclosed per surface
  assert.equal(kindByName(store, "三角形")[0].script, "cjk");
  assert.equal(kindByName(store, "τρίγωνο")[0].script, "greek");
  // an unknown surface resolves to nothing — never a guess
  assert.equal(kindByName(store, "dodecahedron").length, 0);
});

test("the referent and the recognition are the same being: the named kind is the recognized kind", () => {
  const store = emptyStore();
  for (let i = 0; i < 7; i += 1) {
    teachGrid(store, "triangle", { grid: triangleAt0({ seed: i * 10 + 1 }), w: W, h: H, source: `tri-${i}.png`, sourceBytes: 120000, label: "triangle" });
  }
  nameKind(store, "triangle", "el", ["τρίγωνον"]);
  // prose names the being; the bytes show the being — both bind to the same
  // referent identity
  const byName = kindByName(store, "τρίγωνον")[0];
  const rec = recognizeGrid(store, triangleAt0({ seed: 500 }), W, H);
  assert.ok(rec.regions[0].recognized.includes("triangle"), "the shape is recognized");
  const bySight = { concept: "triangle", identity: store.concepts.triangle.identity };
  assert.equal(byName.identity, bySight.identity, "named and seen are one referent");
});