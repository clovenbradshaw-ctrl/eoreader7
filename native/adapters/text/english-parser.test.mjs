// english-parser.test.mjs — HOW WE KNOW THE ENGLISH READER IS COMPETENT, narrow.
//
// The same discipline as sanskrit-competence.test.mjs. Two witnesses agree:
// the parser's analysis and the English treebank's hand annotation, on the
// held-out tenth the parser never trained on. This is not proof of truth — a
// golden is a witness, not an oracle, and the parser learned from the same
// tradition — but it establishes that the reader and the treebank are not
// broken in the same way on sentences the reader never saw.
//
// Measured 2026-09-21 on 1,254 held-out sentences (20,034 words):
//   word class 95.2 · head 81.2 · head+relation 77.0 · lemma 97.4 ·
//   features 91.3 · tokenizer F1 96.2
// The floors sit BELOW the measurement, so a regression trips them and no
// aspiration is written as a gate.
//
// THE NULL ARM: attaching every word to its neighbour must score far below the
// parser — if it did not, the floor would be licensing a trivial reader.
// PROVENANCE: the model must say what taught it — the treebank, the exact
// file by content hash, its genre, period and region — or it is refused.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadModel, analyse, tokenize, parseText, eotFromText } from "./english-parser.js";
import { parseConllu, toEot } from "../../kernel/eot-rich.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const MODEL = path.join(ROOT, "native", "priors", "parser-eng-ewt.json");
const EWT = path.join(ROOT, "legacy-eoreader6.1", "scripts", "corpus", "en_ewt-ud-train.conllu");
const ready = fs.existsSync(MODEL) && fs.existsSync(EWT);
const json = ready ? JSON.parse(fs.readFileSync(MODEL, "utf8")) : null;
const model = ready ? Object.assign(loadModel(json), { provenance: json.provenance }) : null;

test("PROVENANCE: the model says what taught it, down to the file's content hash", { skip: !ready }, () => {
  const p = json.provenance?.trainedOn;
  assert.ok(p, "a parser with no provenance is refused");
  for (const k of ["treebank", "genre", "period", "region", "sha256", "sentences"]) assert.ok(p[k], `provenance missing ${k}`);
  const sha = crypto.createHash("sha256").update(fs.readFileSync(EWT)).digest("hex");
  assert.equal(p.sha256, sha, "the model claims a treebank whose bytes are not the file on disk");
  assert.match(json.provenance.split.rule, /every tenth sentence/, "the held-out rule must be stated");
});

test("COMPETENCE on the held-out tenth the parser never saw, with floors below measurement", { skip: !ready }, () => {
  const held = parseConllu(fs.readFileSync(EWT, "utf8")).filter((_, i) => i % 10 === 9);
  let n = 0, upos = 0, uas = 0, las = 0, lemma = 0, feats = 0, adj = 0;
  for (const s of held) {
    const rows = analyse(model, s.tokens.map((t) => t.form));
    s.tokens.forEach((g, k) => {
      const r = rows[k]; n++;
      if (r.upos === g.upos) upos++;
      if (r.head === g.head) { uas++; if (r.deprel === g.deprel) las++; }
      if (r.lemma === g.lemma) lemma++;
      if (r.feats === g.feats) feats++;
      if (g.head === k + 2) adj++; // null arm: attach to the right neighbour
    });
  }
  const pct = (a) => (100 * a) / n;
  assert.ok(pct(upos) >= 94, `word class ${pct(upos).toFixed(1)}`);
  assert.ok(pct(uas) >= 80, `head ${pct(uas).toFixed(1)}`);
  assert.ok(pct(las) >= 75, `head+relation ${pct(las).toFixed(1)}`);
  assert.ok(pct(lemma) >= 96, `lemma ${pct(lemma).toFixed(1)}`);
  assert.ok(pct(feats) >= 90, `features ${pct(feats).toFixed(1)}`);
  assert.ok(pct(uas) > 2 * pct(adj), `the parser (${pct(uas).toFixed(1)}) is not clear of attach-to-neighbour (${pct(adj).toFixed(1)})`);
});

test("the tokenizer splits clitics the treebank's way, with either apostrophe", () => {
  assert.deepEqual(tokenize("I don't know.").map((t) => t.form), ["I", "do", "n't", "know", "."]);
  assert.deepEqual(tokenize("Huck’s raft won’t sink").map((t) => t.form), ["Huck", "’s", "raft", "wo", "n’t", "sink"]);
  assert.deepEqual(tokenize("See www.gutenberg.org now").map((t) => t.form), ["See", "www.gutenberg.org", "now"]);
});

test("OFFSETS ARE EXACT: text.slice(start, end) reproduces every sentence and every token", { skip: !ready }, () => {
  const text = "  The flood of May 2010 crested at 51.86 feet.\n\nIt put the downtown riverfront under water; Nashville's port closed.  ";
  const recs = eotFromText(model, text, { source: "t", toEot, parseConllu });
  assert.equal(recs.length, 2);
  for (const r of recs) {
    assert.ok(r.span, "a record without its span has lost its provenance");
    assert.equal(text.slice(r.span[0], r.span[1]).replace(/\s+/g, " "), r.surface.text);
    assert.equal(r.gaps.length, 0);
  }
  for (const s of parseConllu(parseText(model, text))) {
    for (const t of s.tokens) {
      const at = Number(/Offset=(\d+)/.exec(t.misc)[1]);
      assert.equal(text.slice(at, at + t.form.length), t.form, `token ${t.form} is not at its offset`);
    }
  }
});

test("every rich record carries the parser's provenance beside it", { skip: !ready }, () => {
  const [r] = eotFromText(model, "Everyone has the right to life.", { source: "t", toEot, parseConllu });
  assert.equal(r.parser?.trainedOn?.treebank, "UD_English-EWT");
});
