// output-claims.js — the claim-KIND extractors the falsification chase found
// missing: the pass could earn SVO edges but not CAUSAL, TEMPORAL, UTTERANCE,
// or CONDITIONAL claims — so the CAUSE/THEN/DIALOGUE probes fell through to
// word-overlap binds. This organ earns those four kinds from the material's
// own sentences, each with its byte address, in the same discipline every
// other claim carries: the words are the material's, the KIND is declared.
//
// THE S39 DISCIPLINE — LANGUAGE-BLIND CORE, PER-LANGUAGE SPECIALIZATION.
// The CORE is one act in every language: hear a sentence's own connective
// and classify which claim-kind it earns. The SPECIALIZATION is the trigger
// table — a declared, giver-named closed class per language, exactly as
// pronouns.js's PRONOUN_PRIORS holds one entry per language (a new language
// is a new entry, never a guess). A language with NO registered trigger set
// returns a typed gap, never a silent English match — the identical rule
// S39 holds for pronouns. The `language` parameter defaults to "en";
// byte-identical to the original English-only organ when omitted.
//
// THE FOUR KINDS, AND THEIR ARCHONS (Amendment XVII / compendium):
//   causal     — "X caused Y" / "because X, Y": Nagarjuna (refutes by
//                consequence — the consequence relation, asserted by the
//                material, not by us).
//   temporal   — "first A, then B" / "A preceded B": Partee (tense is
//                anaphora — the when is a reference, not a content).
//   utterance  — "X said: «…»" with the speaker bound: Terry Gross (the
//                interviewer who draws the guest out) + Scheherazade (nested
//                tellers, each "I" bound to its declared frame).
//   conditional— "if P, then Q": Liu Hui (rests on established premises or
//                doesn't count — a conditional's consequent rests on its
//                antecedent).
//
// PURE. splitSentences injected (the cast.js pattern); no model, no I/O.

export const OUTPUT_CLAIMS_SCHEMA = "OutputClaims@1";
export const OUTPUT_CLAIMS_LANGUAGE = "en";
export const OUTPUT_CLAIMS_LANGUAGE_META = Object.freeze({
  giver: "lang/en (English) · lang/heb (WLC Tanakh, OpenScriptures morphhb) · lang/grc (Homer, Greek Wikisource) · lang/la (Latin corpus)",
  scope: "connective trigger sets for the four claim-kinds; a language with no registered set is a typed gap, never a silent English match",
});

export const KINDS = Object.freeze(["causal", "temporal", "utterance", "conditional"]);

// ── THE PER-LANGUAGE REGISTRY (S39's shape) ────────────────────────────────
// Each entry is a closed class of the material's OWN connectives, per
// language, with its giver named. The words are the material's; the KIND is
// this organ's. A language absent here earns a typed gap.
const CLAIM_TRIGGERS = Object.freeze({
  en: Object.freeze({
    giver: "lang/en",
    causal: /(?:because|since|caused|caused by|as a result of|owing to|due to|therefore|hence|so that|which is why)/i,
    temporal: /(?:first|then|next|afterward|afterwards|before|after|when|while|once|at that time|then came)/i,
    utterance: /(?:\bsaid\b|\basked\b|\breplied\b|\banswered\b|\bcried\b|\bwhispered\b|\bsaid to\b|\bspoke\b|said:)/i,
    conditional: /(?:if|unless|provided that|on condition that|whether|had .* would|would have)/i,
  }),
  // Hebrew — measured from the WLC Tanakh (2Sam) itself: כי (because/that),
  // לכן (therefore), אז (then), אחרי (after), אם (if), אמר/ענה/השיב (said/
  // answered), ראשית/בתחילה (first). The triggers are written in BARE
  // letters (no niqqud — the material's niqqud is folded before matching),
  // and WITHOUT \b boundaries, because Hebrew prefixes (ו ה ל ב) attach to
  // the word (ויאמר is אמר with a vav prefix). Giver: the corpus's own
  // usage, read off the real bytes — never a guessed vocabulary.
  heb: Object.freeze({
    giver: "lang/heb (measured from WLC Tanakh, OpenScriptures morphhb)",
    causal: /(?:כי|לכן|משום|על כן|בגלל)/u,
    temporal: /(?:אז|אחרי|אחר כך|ראשית|בתחילה|אחרון|ואחרי|לפני)/u,
    utterance: /(?:אמר|ענה|השיב|קרא|לחש|צעק)/u,
    conditional: /(?:אם|אלא אם|לולא|אילולא)/u,
  }),
  // Greek — measured from the real Iliad (Homer, Greek Wikisource): εἰ (if),
  // ἐπεί/ἐπειδή (since/because), οὖν (therefore), πρῶτον/ἔπειτα (first/then),
  // μετὰ (after), ὅτι (that/because), ἔφη/εἶπεν (said). Triggers in BARE
  // letters (no polytonic accents — folded before matching), \b dropped for
  // the same prefix-attachment reason. Giver: Homer's own usage.
  grc: Object.freeze({
    giver: "lang/grc (measured from Homer, Greek Wikisource el.wikisource.org)",
    causal: /(?:επει|επειδη|οτι|διοτι|ουν|ουνεκα)/u,
    temporal: /(?:πρωτον|επειτα|μετα|τοτε|υστερον|προτερον|ως ταχιστα)/u,
    utterance: /(?:εφη|ειπεν|απεκριθη|ημειψεν|φατο)/u,
    conditional: /(?:ει|εαν|ην|ειπερ|ει μη)/u,
  }),
  // Latin — measured from the latin-originals corpus conventions (the
  // census already names Latin's case-marked reader as real work).
  la: Object.freeze({
    giver: "lang/la (Latin corpus, live_priors latin-originals)",
    causal: /(?:quia|quod|igitur|ergo|itaque|quapropter|propter)/i,
    temporal: /(?:primum|deinde|postea|postquam|antequam|cum|ubi|mox)/i,
    utterance: /(?:\bdixit\b|\bait\b|\binquit\b|\brespondit\b|\bclamavit\b)/i,
    conditional: /(?:si|nisi|dummodo|si modo|quod si)/i,
  }),
});

const triggerGap = (language) =>
  language && language !== "en" && !CLAIM_TRIGGERS[language]
    ? { type: "no_claim_trigger_prior_for_language", language, detail: `the claim-kind trigger sets are declared for ${Object.keys(CLAIM_TRIGGERS).join(", ")}; ${language} has none — a typed gap, never a silent English match` }
    : null;

export const claimKindTriggerGap = triggerGap;

const quoteMark = (s) => {
  const m = String(s ?? "").match(/[«"'“‘]([^»"”’]{2,160})[»"”’]/);
  return m ? m[1].trim() : null;
};

// THE FOLD, SCRIPT-AWARE (the S39 lesson, applied to connectives): Hebrew
// carries niqqud and cantillation between letters (כִּי is כ+ִ+י), Greek
// carries polytonic accents, Latin none. The trigger set is written in the
// language's BARE letters; the material's sentence must be folded to those
// before matching — the same NFD-strip dialogue.js::fold uses, extended so
// the match is over the bare script, never the pointed one. A language
// whose script marks vowels (heb, grc) folds; one that does not (la, en)
// folds to itself.
const foldScript = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f\u0591-\u05c7]/g, "");

/**
 * claimKindsOf(text, { splitSentences, source, language }) →
 *   { kinds, basis, gap }
 * Every sentence of `text`, classified into the four kinds by its OWN
 * connectives, under the DECLARED language's trigger set. A language with
 * no registered set returns `{ kinds: [], gap }` — never an English match.
 * Each kind entry carries: the sentence, its byte span, the trigger word,
 * and for utterances the quoted words and the speaker candidate.
 */
export function claimKindsOf(text = "", { splitSentences = null, source = null, language = "en" } = {}) {
  const t = String(text ?? "");
  const gap = triggerGap(language);
  if (gap) return { kinds: [], basis: `no trigger set for ${language}`, gap };
  if (!t.trim()) return { kinds: [], basis: "no text", gap: null };
  const trig = CLAIM_TRIGGERS[language];
  const sentences = (splitSentences ? (() => { try { return splitSentences(t); } catch { return [t]; } })() : [t])
    .map((s) => (typeof s === "string" ? s : s?.text ?? ""))
    .filter((s) => String(s).trim().length > 4);

  const kinds = [];
  const seen = new Set();
  for (const s of sentences) {
    const st = String(s).trim();
    if (seen.has(st)) continue;
    seen.add(st);
    const start = t.indexOf(st);
    const end = start >= 0 ? start + st.length : 0;
    // match against the folded script (bare letters), report the original
    const folded = foldScript(st).toLowerCase();
    for (const kind of KINDS) {
      const m = folded.match(trig[kind]);
      if (!m) continue;
      // utterance also needs the quoted words to be a real utterance
      if (kind === "utterance") {
        const quoted = quoteMark(st);
        if (!quoted) continue;
        // speaker: leading ("Prince Andrew said: …") or trailing ("…," replied Pierre)
        const speaker =
          (st.match(/^([A-Z][\w'’\- ]{1,40}?)\s+(?:said|asked|replied|answered|cried|whispered|spoke)\b/) ||
            st.match(/(?:replied|answered|cried|whispered)\s+([A-Z][\w'’\- ]{1,40})[,.]?$/) ||
            [])[1] ?? null;
        kinds.push({ kind, sentence: st, trigger: m[0], quoted, speaker, ref: source ?? null, span: { start, end }, from: "utterance" });
        continue;
      }
      kinds.push({
        kind,
        sentence: st,
        trigger: m[0],
        ...(kind === "temporal" ? { position: (st.match(/^(first|then|next|afterward|afterwards)/i) || [])[1] ?? "ordered" } : {}),
        ref: source ?? null,
        span: { start, end },
        from: "connective",
      });
    }
  }
  return { kinds, gap: null, basis: `${kinds.length} claim-kind(s) heard under ${language} (${KINDS.filter((k) => kinds.some((x) => x.kind === k)).join(", ")})` };
}