// gemma2-tokenizer.mjs — the gemma2:2b BPE tokenizer, vendored for LOGIT
// PUSHING. The mouth's output is tiny (one claim, ~30 tokens), so the token
// space is small enough to constrain: we encode the claim's own words to
// token ids, and push logits_bias onto those ids so the model's sampling is
// pulled toward the record's wording — fidelity becomes mechanical, not hoped
// for. This is the "much smaller model calls with logit pushing" design the
// voice pipeline names (the-fold voice.js / one-proposition-at-a-time-note.md).
//
// The vocab + merges were extracted from the gemma2:2b GGUF (Ollama embeds the
// tokenizer in the model blob, not a separate layer) and cross-checked against
// the HuggingFace tokenizer.json (unsloth mirror): 255,969/256,000 tokens
// byte-identical, the remaining 31 differ only in the multi-space display
// convention (GGUF spells "  " literally, HF spells "▁▁") — the id ORDER is
// identical, so ids map 1:1 to what Ollama's logits_bias consumes.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(HERE, "gemma2-tokenizer.json"), "utf8"));

export const TOKENIZER_MODEL = DATA.type;
export const UNK_ID = DATA.vocab[DATA.unk] ?? 3;
export const VOCAB_SIZE = Object.keys(DATA.vocab).length;

// Merge rank: merge string -> rank (0 is most preferred). Built once.
// Gemma's tokenizer.json encodes each merge as "<left> <right>" — the two
// component tokens separated by a literal space — and the SentencePiece
// space-marker is written literally in some spots and as "▁" in others. So
// we split each merge on its FIRST space into its two tokens and match pairs
// by exact token equality, handling ▁/space equivalence.
const MERGE_RANK = new Map();
for (let i = 0; i < DATA.merges.length; i++) {
  const m = DATA.merges[i];
  const sp = m.indexOf(" ");
  if (sp > 0) MERGE_RANK.set(`${m.slice(0, sp)}|${m.slice(sp + 1)}`, i);
}

// Byte-fallback: <0xXX> -> the raw byte char. Used when a char is not in vocab.
const BYTE_FALLBACK = DATA.byte_fallback !== false;
const byteToken = (b) => `<0x${b.toString(16).toUpperCase().padStart(2, "0")}>`;
const BYTE_TOKENS = new Map();
for (let b = 0; b < 256; b++) BYTE_TOKENS.set(byteToken(b), b);

// Normalize: Gemma's SentencePiece normalizer replaces " " with "▁". Keep it
// simple — the corpus is already lowercase ASCII prose; the single normalizer
// rule is space→▁ (the tokenizer.json's Replace normalizer).
const normalize = (s) => String(s).replaceAll(" ", "▁");

/**
 * Encode one pre-tokenized word (already ▁-normalized, no internal ▁) into
 * token pieces via greedy BPE merges. Returns an array of token strings
 * (▁-prefixed pieces), matching SentencePiece's BPE on gemma2.
 */
function encodeWord(word) {
  // Split into bytes/UTF-8 chars; a char may not be in vocab → byte-fallback.
  let pieces = [];
  for (const ch of word) {
    if (DATA.vocab[ch] !== undefined) {
      pieces.push(ch);
    } else if (BYTE_FALLBACK) {
      const bytes = new TextEncoder().encode(ch);
      for (const b of bytes) pieces.push(byteToken(b));
    } else {
      pieces.push(DATA.unk);
    }
  }
  if (pieces.length === 1) return pieces;
  // Greedy merge: repeatedly find the lowest-rank adjacent pair in merges.
  // Merge keys are "<left>|<right>" (split from the tokenizer.json's
  // space-joined pair form) — match by exact token equality.
  while (pieces.length > 1) {
    let best = -1, bestRank = Infinity;
    for (let i = 0; i < pieces.length - 1; i++) {
      const r = MERGE_RANK.get(`${pieces[i]}|${pieces[i + 1]}`);
      if (r !== undefined && r < bestRank) { bestRank = r; best = i; }
    }
    if (best === -1) break;
    pieces[best] = pieces[best] + pieces[best + 1];
    pieces.splice(best + 1, 1);
  }
  return pieces;
}

/**
 * Encode text into gemma2 token ids. Returns the id array; `pieces` (the
 * token strings) is available via the returned array's `.pieces`.
 */
export function tokenize(text) {
  const normalized = normalize(text);
  // No pre-tokenizer split: gemma's pre_tokenizer is "Split on ' '" but the
  // normalizer already turned spaces into ▁, so there are no literal spaces
  // left — the whole string is ONE BPE sequence and ▁ is an ordinary char
  // that participates in merges (SentencePiece semantics).
  const ids = [];
  for (const piece of encodeWord(normalized)) {
    const id = DATA.vocab[piece];
    if (id !== undefined) ids.push(id);
    else if (BYTE_FALLBACK && BYTE_TOKENS.has(piece)) {
      const b = BYTE_TOKENS.get(piece);
      const bt = byteToken(b);
      const bid = DATA.vocab[bt];
      if (bid !== undefined) ids.push(bid);
    } else ids.push(UNK_ID);
  }
  ids.pieces = encodeWord(normalized);
  return ids;
}

/**
 * Build the logit push for a claim's own words: encode each significant
 * surface and return a Map<tokenId, bias>. The bias is the push strength —
 * a positive add on the claim's tokens so the sampler prefers them.
 */
export function logitBiasFor(claim, { strength = 6, words = true } = {}) {
  const bias = new Map();
  const push = (text) => {
    if (!text) return;
    for (const id of tokenize(text)) {
      if (id === UNK_ID) continue;
      bias.set(id, (bias.get(id) ?? 0) + strength);
    }
  };
  if (words) push(`${claim.end1 ?? claim.subject ?? ""}`);
  if (words) push(`${claim.end2 ?? claim.object ?? ""}`);
  if (words) push(`${claim.label ?? claim.verb ?? ""}`);
  return bias;
}

/**
 * Convert a Map<id,bias> to Ollama's logits_bias payload (plain object).
 */
export const logitsBiasObject = (biasMap) => {
  const out = {};
  for (const [id, b] of biasMap) out[String(id)] = b;
  return out;
};

export const vocabToken = (id) => Object.keys(DATA.vocab).find((k) => DATA.vocab[k] === id) ?? null;