// organs/strunk-white.js — the style agent: readability + the rules.
//
// Handle: Strunk & White — after The Elements of Style. The style-checking
// family lives under one agent: how the piece READS (Flesch/grade/fog via
// the textstat subprocess when reachable, a JS heuristic in-process
// otherwise) PLUS the classic rule detectors — weak verbs, weak adverbs,
// weasel words, clichés, passive voice, nominalizations, needless words.
// Each violation is a named rule with a fix hint and byte spans, mechanical
// and auditable.
//
// The textstat function is INJECTED (the runner wires the venv subprocess);
// this organ never shells out itself.

// JS-heuristic readability: Flesch Reading Ease + grade, trend-accurate
// (not dictionary-exact — the exact numbers come from textstat).
function heuristicReadability(text = "") {
  const sentences = String(text).split(/(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim().length).length || 1;
  const words = String(text).split(/\s+/).filter(Boolean).length || 1;
  const syllables = (() => {
    const clean = String(text).toLowerCase().replace(/[^a-z\s]/g, " ");
    const countWord = (w) => {
      if (!w.length) return 0;
      const groups = w.replace(/[^aeiouy]+/g, " ").trim().split(" ").filter(Boolean).length;
      return Math.max(1, w.endsWith("e") && !w.endsWith("le") ? groups - 1 : groups);
    };
    return clean.split(/\s+/).reduce((a, w) => a + countWord(w), 0);
  })();
  const perWord = syllables / words;
  const flesch = Number((206.835 - 1.015 * (words / sentences) - 84.6 * perWord).toFixed(1));
  const grade = Number((0.39 * (words / sentences) + 11.8 * perWord - 15.59).toFixed(1));
  return { flesch, grade, fog: Number(((flesch + grade) / 2).toFixed(1)), band: flesch >= 60 ? "readable" : "dense", words, heuristic: true };
}

// The classic Elements-of-Style rule detectors. Each names a rule, finds the
// violating spans, and carries a fix hint. All mechanical — the report is a
// FINDING the reader can act on, never a rewrite on its own.
const RULE_DETECTORS = [
  {
    name: "weak-verb",
    detail: "a weak verb (to be / to have) carrying a noun that could be the verb itself",
    fix: "make the noun the verb — the sentence gets its spine",
    re: /\b(?:is|are|was|were|be|been|being|have|has|had)\s+(?:a|an|the)?\s*([a-z]+(?:ation|tion|sion|ment|ness|ance|ence|ity|al))\b/gi,
  },
  {
    name: "weak-adverb",
    detail: "an adverb leaning on a verb that should stand alone",
    fix: "cut the adverb or make the verb carry the weight",
    re: /\b(?:really|very|quite|rather|somewhat|extremely|incredibly|absolutely|definitely|basically|actually|just|simply|totally|completely|highly)\b/gi,
  },
  {
    name: "weasel-word",
    detail: "a word that hedges the claim into meaninglessness",
    fix: "say what is true plainly, or say it is not established",
    re: /\b(?:arguably|supposedly|allegedly|reportedly|seemingly|ostensibly|sort of|kind of|in some sense|to some extent|it could be said)\b/gi,
  },
  {
    name: "cliche",
    detail: "a tired phrase doing the work of plain words",
    fix: "say it directly — the cliché is the author's day off",
    re: /\b(?:at the end of the day|in this day and age|the bottom line|a double-edged sword|tip of the iceberg|elephant in the room|all things considered|when it comes down to it|in the grand scheme of things|easier said than done)\b/gi,
  },
  {
    name: "passive-voice",
    detail: "the subject receives the action instead of doing it",
    fix: "name the actor and make them act",
    re: /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ed|\w+en|\w+own)\b/gi,
  },
  {
    name: "nominalization",
    detail: "a verb turned into a noun so the sentence loses its pulse",
    fix: "restore the verb — the nominalization hides who does what",
    re: /\b[a-z]+(?:ization|ition|ation|tion|sion|ment|ness|ance|ence)\b/gi,
  },
  {
    name: "needless-word",
    detail: "a word that adds nothing and was put in to sound full",
    fix: "cut it — the sentence is stronger shorter",
    re: /\b(?:in order to|due to the fact that|for the purpose of|with regard to|in the event that|it is important to note that|it should be noted that|at this point in time|in my opinion|generally speaking|the fact that)\b/gi,
  },
];

export function styleGrade(text = "", { textstat = null } = {}) {
  const t = String(text ?? "");
  const readability = textstat ? { ...textstat } : heuristicReadability(t);
  const violations = [];
  for (const rule of RULE_DETECTORS) {
    let m;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(t)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      // Deduplicate overlapping spans of the same rule.
      if (violations.some((v) => v.rule === rule.name && v.span[0] === start && v.span[1] === end)) { rule.re.lastIndex = start + 1; continue; }
      violations.push({ rule: rule.name, detail: rule.detail, fix: rule.fix, span: [start, end], text: t.slice(start, end).trim() });
      rule.re.lastIndex = start + 1;
    }
  }
  return {
    schema: "EOStrunkWhite@1",
    readability,
    violations: violations.slice(0, 24),
    count: violations.length,
    basis: violations.length
      ? `${violations.length} style rule violation(s) — ${readability.band === "readable" ? "readable" : "dense"} prose (Flesch ${readability.flesch}, grade ${readability.grade})`
      : `clean prose (Flesch ${readability.flesch}, grade ${readability.grade})`,
  };
}