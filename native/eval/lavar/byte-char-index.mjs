// byte-char-index.mjs — COORDINATE SPACE, DECLARED NEVER MIXED. Ported
// from the-fold/explore.js's own `byteCharIndex` (CLAUDE.md: "b0/b1 are
// UTF-8 BYTE offsets... c0/c1 are JS-string CHAR offsets... converts,
// built once per source, measured not guessed") rather than imported —
// that function lives inside a browser-DOM page with no clean module
// boundary to cross, and this directory is where the SECOND real
// consumer (recoverability.mjs, checking what eot-jsonl.mjs wrote) made
// a single shared copy worth having instead of two that could drift
// (this repo's own postmortems — P22/P24/P39 — are the reason to not
// let a second copy of anything address-related happen quietly).
//
// WHY THIS EXISTS AT ALL: every regex/string operation in this
// directory's readers works in JS-STRING (UTF-16 code unit) space — the
// only space `RegExp`/`String` understand — but every address a reader
// WRITES (or checks) claims (P5.2, "byte-offset self-verification is
// mandatory") to be a real UTF-8 byte offset. A pure-ASCII book never
// exposes the gap (the two spaces are numerically identical there);
// found on Pride and Prejudice, whose curly-quote typography (each 3
// UTF-8 bytes but 1 JS-string char) drifts the two spaces by 9,200 units
// by the file's own end — measured directly (`Buffer.byteLength` vs
// `.length` on the real file).
export function charToByte(text) {
  const idx = new Uint32Array(text.length + 1);
  let bytes = 0;
  let i = 0;
  while (i < text.length) {
    idx[i] = bytes;
    const code = text.codePointAt(i);
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (code > 0xffff) { idx[i + 1] = idx[i]; i += 2; } else i += 1; // low surrogate maps to the same byte start
  }
  idx[text.length] = bytes;
  return (charIndex) => idx[Math.max(0, Math.min(charIndex, text.length))];
}
