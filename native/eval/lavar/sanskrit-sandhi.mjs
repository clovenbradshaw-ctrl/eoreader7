// sanskrit-sandhi.mjs — the external-sandhi instrument for Vedic running
// text (2026-09-18). GRETIL verse is fully sandhied (tvāgne, tavet, devo,
// 'gne); the treebank — and every prior built from it — holds unsandhied
// wordforms. Without a splitter, sandhi junctions cascade into gaps
// (measured RV 1.1: 30 unattested forms, most sandhied).
//
// THE CONTRACT (omnimodal: the instrument differs, the organ is identical).
// Rules propose, the PRIOR disposes: a split is accepted only if EVERY part
// is attested in the received POS prior (any UPOS). A wrong rule proposes
// unattested parts and dies quietly; a right rule earns its splits. No rule
// may consult meaning, case, or context — pure form + attestation.
// Two-part splits only (compounds/sāmāsa recurse later — declared scope).
//
// ATTESTATION AUTHORITY, MEASURED (2026-09-18): the prior is TRAIN tallies
// (31,132 forms). The Vedic DEV split was checked as a second TRAIN-side
// giver and REFUSED: 0 of 30 RV 1.1 gap forms appear in DEV (verse
// vocabulary is that sparse across hymns). Verse-form coverage (īḻe et al.)
// needs a Vedic-verse giver we do not hold — open instrument, measured
// shopping list, never faked with DEV.
//
// THE RULES are classical external sandhi (Aṣṭādhyāyī 6.1/8.2–3; Whitney
// §§120–180), each named with its mechanism:
//   hyphen   reduplication/compounding hyphen: dive-dive → dive + dive.
//   avagraha a-elision after e/o (6.1.109 enṅaḥ padāntād ati): 'gne → agne
//            (single); U'V → U + aV (both attested).
//   dīrgha   savarṇa coalescence (6.1.101 akaḥ savarṇe dīrghaḥ): surface long
//            L∈{ā,ī,ū} at a junction inverts to s+s | s+L | L+s | L+L where
//            s is L's short (tvā+agne → tvāgne inverts to tvā|agne, inter alia).
//   guṇa     a+i→e, a+u→o (6.1.87 ād guṇaḥ): surface e/o at a junction
//            inverts to a+i / a+u (and long-second variants a+ī, a+ū).
//   vṛddhi   a+e→ai, a+o→au (6.1.88 vṛddhir ādaij): surface ai/au invert to
//            a+e / a+o.
//   yaṇ      i+a→ya, u+a→va (6.1.77 iko yaṇ aci): surface yV/vV invert to
//            i+V / u+V (the triggering vowel belongs to the right part:
//            nadī+atra → nadyatra inverts to nadi|atra).
//   ru-o     -aḥ + voiced → -o (visarga to o before voiced: devaḥ+gacchati
//            → devo gacchati): surface final -o inverts to -aḥ (devo → devaḥ),
//            falling back to -as. Single-part restoration (no split):
//            returns {parts:[one], rule}.
//   direct   no sound change at the junction: any split point with both
//            parts attested (unsandhied compounds, tmesis-adjacent).
// Pure; testable; the prior is the only authority on attestation.
const SHORT_OF = { ā: "a", ī: "i", ū: "u", "ṝ": "ṛ" };
const LONG_OF = { a: "ā", i: "ī", u: "ū", "ṛ": "ṝ" };

const norm = (s) => String(s ?? "").toLowerCase();
const attested = (form, prior) => !!(prior?.forms?.[norm(form)]);

/** splitSurface(form, prior) — accepted two-part splits (and single-part
 * restorations) for a sandhied surface form, each {parts, rule}. Empty =
 * no rule yields attested parts: a gap, never a guess. */
export function splitSurface(form, prior) {
  const w = norm(form);
  const out = [];
  const accept = (parts, rule) => {
    // MINLEN 2 (2026-09-18, RV 1.1 eha → a+iha): single-letter residues
    // abuse attested particles ('a' is TRAIN-attested 1000×) to license
    // garbage splits. A one-letter "part" is never a word — refused.
    if (parts.length === 2 && parts.every((p) => p && p.length >= 2 && attested(p, prior))) {
      const key = parts.join("+");
      if (!out.some((o) => o.parts.join("+") === key)) out.push({ parts, rule });
    }
  };

  // hyphen: dive-dive → dive + dive (mechanical, attestation still required).
  if (w.includes("-") || w.includes("‐")) {
    const segs = w.split(/[-‐]/);
    if (segs.length === 2) accept(segs, "hyphen");
  }

  // avagraha: 'gne → agne (single restoration); U'V → U + aV.
  if (w.includes("'") || w.includes("’")) {
    const noAva = w.replace(/['’]/g, "");
    if (attested("a" + noAva, prior)) out.push({ parts: ["a" + noAva], rule: "avagraha" });
    const [u, ...rest] = w.split(/['’]/);
    if (u && rest.length) {
      const v = rest.join("");
      accept([u, "a" + v], "avagraha");
    }
  }

  // junction inverses at every split point.
  for (let i = 1; i < w.length; i += 1) {
    const L = w.slice(0, i), R = w.slice(i);
    // direct: no sound change.
    accept([L, R], "direct");
    const lc = L.slice(-1), rc = R[0];
    const lstem = L.slice(0, -1);
    // dīrgha: surface long vowel = s+s | s+L | L+s | L+L.
    if (SHORT_OF[lc]) {
      const s = SHORT_OF[lc];
      accept([lstem + s, s + R], "dīrgha");
      accept([lstem + s, R], "dīrgha");
      accept([lstem + lc, s + R], "dīrgha");
    }
    // guṇa: surface e/o = a+i | a+u (short and long second).
    if (lc === "e" || lc === "o") {
      const v = lc === "e" ? "i" : "u";
      accept([lstem + "a", v + R], "guṇa");
      accept([lstem + "a", LONG_OF[v] + R], "guṇa");
    }
    // vṛddhi: surface ai/au = a+e | a+o. (Two-char joints: reslice.)
    if ((lc === "i" && lstem.endsWith("a")) || (lc === "u" && lstem.endsWith("a"))) {
      const v = lc === "i" ? "e" : "o";
      accept([lstem, v + R], "vṛddhi");
    }
    void rc;
  }

  // yaṇ: surface yV/vV word-internal = i+V / u+V (the semivowel replaces
  // ī/ū; the triggering vowel belongs to the right part: nadī+atra →
  // nadyatra inverts to nadi|atra, never aatm-).
  for (let i = 1; i < w.length - 1; i += 1) {
    if ((w[i] === "y" || w[i] === "v") && /[aeiouāīūṛ]/.test(w[i + 1] ?? "")) {
      const v = w[i] === "y" ? "i" : "u";
      accept([w.slice(0, i) + v, w.slice(i + 1)], "yaṇ");
    }
  }

  // ru-o restoration: final -o → -aḥ (then -as). Single part.
  // Measured 2026-09-18: the treebank writes devaḥ, never devas — the -as
  // fallback is vestigial honesty for priors keyed otherwise.
  if (w.endsWith("o") && w.length > 2) {
    for (const restored of [w.slice(0, -1) + "aḥ", w.slice(0, -1) + "as"]) {
      if (attested(restored, prior)) { out.push({ parts: [restored], rule: "ru-o" }); break; }
    }
  }
  return out;
}
