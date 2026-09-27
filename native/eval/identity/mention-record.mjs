// mention-record.mjs — a person's (or place's) universe from EVERY mention
// in the text, not only the relation edges it ends up in: hop 1 = the
// content words of the sentence it is mentioned in; hop 2 = the other
// declared names present in that sentence (naming a node, masked by the
// kernel). Built because the edge-only universe was measured too thin:
// planted twins came back 18/20 "idle" (entity-eval.mjs, 2026-09-27).
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { tokenize } = await import(`${NATIVE}/organs/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "");
export function mentionRecord(bookPath, names, { bodyFrom = 0, html = false, foldMarks = true } = {}) {
  let raw = readFileSync(bookPath, "utf8").replace(/\r\n/g, "\n");
  if (html) raw = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, " ");
  // folding combining marks is right for Latin diacritics; it would strip Cyrillic й -> и, so it is declared per language
  const text = (foldMarks ? fold(raw) : raw.normalize("NFC")).slice(bodyFrom);
  const sorted = [...names].sort((a, b) => b.length - a.length); // longest first: "Prince Andrew" before "Andrew"
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}\\p{N}])`, "gu"); // Unicode boundary: \b is ASCII-only and never fires inside Cyrillic
  const rec = new Map(names.map((n) => [n, []]));
  const sentences = splitSentences(text).map((s) => s.text);
  let at = -1;
  for (const s of sentences) {
    at += 1;
    const found = [...s.matchAll(re)].map((m) => m[1]);
    if (!found.length) continue;
    const present = new Set(found);
    const lower = new Set(sorted.flatMap((n) => n.toLowerCase().split(" ")));
    const content = tokenize(s).filter((w) => !lower.has(w));
    for (const n of found) rec.get(n).push({ at, features: [...content.map((w) => ({ f: `w:${w}`, hop: 1 })), ...[...present].filter((m) => m !== n).map((m) => ({ f: `n2:${m}`, hop: 2 }))] });
  }
  return rec;
}
