// adapters/build/prose-medium.js — prose as a MEDIUM of the one build
// pipeline. The outline is built by organs/talk-build.js like any build: the
// request ("a novella with 5 characters, each with an age and a job, in 6
// chapters of 4 scenes each, about …") becomes counted parts; the mouth names
// the cast and their details and says one line for each chapter and scene.
// Its bodies are written by organs/long-form.js (Dickens), a part at a time.
// This says what makes prose prose:
//
//   the whole    a story (novella, novel, tale, book …)
//   the leaves   the parts nothing else sits in (scenes): each gets a body
//   the cast     the characters: their details are the facts a working note
//                carries into every part they are in
//   drawing      the outline as text, one line per thing, each line mapped to
//                the claim it came from (the book itself: long-form's render)
//
// No regular expressions.
const esc = (s) => String(s ?? "").split("\n").join(" ").trim();

/** The outline as text: the title, the cast with their details, then each
 *  part's line in order. Every line maps to the claims it came from. */
function renderOutline(belief) {
  const byId = new Map(belief.map((t) => [t.id, t]));
  const whole = belief.find((t) => t.kind === "story" && !t.parent) ?? null;
  const out = [], map = [];
  const put = (text, src) => { out.push(text); map.push({ text: esc(text), src: src.filter(Boolean) }); };
  if (whole?.name) put(whole.name, [whole.nameNote]); else put("Untitled", ["engine:untitled"]);
  const walk = (t, depth) => {
    for (const c of t.children.map((id) => byId.get(id)).filter(Boolean)) {
      const said = c.props.find((p) => p.label === "says");
      if (c.name) put(c.name, [c.nameNote]);
      if (said) put(said.value, [said.note]);
      for (const p of c.props.filter((q) => q.label !== "says")) put(`${p.label}: ${p.value}`, [p.note]);
      walk(c, depth + 1);
    }
  };
  if (whole) walk(whole, 0);
  return { artifact: `${out.map(esc).join("\n")}\n`, map, engineWords: { untitled: "Untitled" }, style: null };
}

const outlineLeaves = (text) => String(text).split("\n").map((l) => l.trim()).filter(Boolean).map((text) => ({ text, where: "line" }));

export const PROSE_MEDIUM = Object.freeze({
  kind: "prose",
  root: "story",
  wholeFallback: "the story",
  wholeWords: new Set(["story", "novella", "novel", "tale", "book", "saga", "serial"]),
  fieldHolders: new Set(),
  numericDetails: new Set(["age"]),
  showsVerb: "has",
  askWhatPartsShow: false,
  // a line of a story is what happens in it, and the mouth hears who the
  // people are, by name, before it says any line (facts, not instructions)
  saysVerb: "Say what happens in",
  saysWhat: "what happens",
  factsFor: (belief) => {
    const names = belief.filter((t) => t.kind === "character" && t.name).map((t) => t.name);
    if (!names.length) return "";
    return `The people in the story are ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]}.`;
  },
  render: renderOutline,
  leaves: outlineLeaves,
  // the book (organs/long-form.js)
  bodyKind: "scene",
  castKind: "character",
  storyWord: "story",
  untitled: "Untitled",
  partBreak: "* * *",
  // a body's and a line's length are the mouth's num_predict, never words in
  // the prompt (panel, Gary) — set by hand 2026-09-27 from one 1.5b scene
  // (~350 tokens for ~300 words)
  bodyTokens: 360,
  lineTokens: 60,
});
