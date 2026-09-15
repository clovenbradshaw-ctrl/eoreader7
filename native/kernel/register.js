// kernel/register.js — THE REGISTER (Halliday): a request is read for its
// FIELD (what staged social process is being invoked), TENOR (who it is
// for), and MODE (the medium it is carried in). There is NO hardcoded
// "essay mode" — an essay is one genre among many, registered the same way
// a story or a nocturne is. The pipeline is ONE: read → stage → feel →
// write → satisfy. The genre's STAGING (the sequence of phases and
// transitions) comes from the sidecar's accumulated knowledge when the genre
// has been seen before, else from the record's own seams — never from a
// hardcoded branch.
//
// Handle: Halliday — after M.A.K. Halliday, Systemic Functional Linguistics:
// "learning how to mean"; genre = staged, goal-oriented social process
// (Martin on Halliday); register = field/tenor/mode. A genre is a staging,
// and a staging is learned, not declared.

export const REGISTER_SCHEMA = "EORegister@1";

// ── FIELD: what staged process the request invokes. The recognition set is
// OPEN, not a closed list: the map registers known genre-nouns to their
// field; anything unknown falls to the generic staged pipeline (staging
// derived from the record's own seams). Adding a genre is registering a
// noun, never writing a new branch.
const FIELD_BY_NOUN = {
  story: "narrative", "short story": "narrative", tale: "narrative", fiction: "narrative", novel: "narrative",
  essay: "exposition", article: "exposition", paper: "exposition", report: "exposition", brief: "exposition", guide: "exposition", "write-up": "exposition",
  poem: "lyric", sonnet: "lyric", villanelle: "lyric", haiku: "lyric", ode: "lyric", verse: "lyric",
  song: "music", "piece of music": "music", sonata: "music", nocturne: "music", etude: "music", symphony: "music", tune: "music", melody: "music",
  code: "instrument", script: "instrument", program: "instrument", function: "instrument",
  tool: "instrument", cli: "instrument", application: "instrument", app: "instrument", module: "instrument", library: "instrument", package: "instrument", service: "instrument", server: "instrument", api: "instrument", class: "instrument", utility: "instrument", component: "instrument",
};
const NOUN_RE = /\b(?:short story|piece of music|write-up|[a-z]+)\b/gi;
const KNOWN = Object.keys(FIELD_BY_NOUN);

// ── CODE SIGNAL: a request that names code by EXTENSION or by code-shape
// vocabulary (def/import/class/function/CLI/endpoint) is an instrument even
// when no registered noun matched ("write a word counter in Python" has no
// noun in the table). Disclosed as a received sign, never a silent guess.
const CODE_SIGNAL = /\b(?:python|javascript|typescript|node|bash|shell|golang|rust)\b|\.(?:py|js|mjs|cjs|ts|tsx|sh|go|rs)\b|\b(?:def|class|function|argparse|cli|command-?line|endpoint|stdin|stdout)\b/i;

// The instrument artifact's LANGUAGE, read off the request's own words — an
// extension, a language name, or a code-shape keyword. Same open-table
// discipline as FIELD_BY_NOUN: the language is a received sign, never a
// default. null when the request names none (the instrument voice then stays
// language-neutral and the caller picks a safe default, disclosed).
const LANG_BY_SIGNAL = [
  [/\.py\b|python|python3/i, "python"],
  [/\.(tsx?)\b|typescript/i, "typescript"],
  [/\.(js|mjs|cjs|jsx)\b|javascript|node(?:\.js)?\b/i, "javascript"],
  [/\.sh\b|bash|shell|zsh/i, "shell"],
  [/\.go\b|golang/i, "go"],
  [/\.rs\b|rust/i, "rust"],
];
export function detectLanguage(task = "") {
  const t = String(task ?? "");
  for (const [re, lang] of LANG_BY_SIGNAL) if (re.test(t)) return lang;
  return null;
}

export function deriveField(task = "", { genres = [] } = {}) {
  const t = String(task ?? "").toLowerCase();
  for (const noun of KNOWN) if (new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t)) {
    const field = FIELD_BY_NOUN[noun];
    // HOLMES (SIG): the sign is recognized — but is it LEARNED from the
    // meaning potential, or RECEIVED from the standing table? A genre the
    // sidecar has actually read is a learned sign; a noun with no reading
    // behind it is a received prior, disclosed as such — never a read.
    const learned = genres.some((g) => String(g ?? "").toLowerCase().includes(field.toLowerCase()));
    const language = field === "instrument" ? detectLanguage(task) : null;
    return {
      field, noun, language,
      provenance: learned ? "learned" : "received",
      basis: learned
        ? `"${noun}" → ${field}: the sidecar has ${field} reading(s), so the sign is LEARNED from the meaning potential`
        : `"${noun}" → ${field}: a received sign — the machine has not read this ${field} yet`,
    };
  }
  // Code signal fallback — a request that names code by shape, not by noun.
  if (CODE_SIGNAL.test(t)) {
    const language = detectLanguage(task);
    return {
      field: "instrument", noun: null, language,
      provenance: "received",
      basis: `code signal (${language ? `${language}, ` : ""}no registered genre-noun) — the request names code by ${language ? "language" : "shape"}`,
    };
  }
  return { field: null, noun: null, provenance: "staged", basis: "no registered genre-sign — the staged pipeline falls to the record's own seams" };
}

// ── MODE: the medium the artifact is carried in. Open, from the request's
// vocabulary and the record's lens. Text is the default when no medium is
// named; a musical request routes to the midi/audio lens.
const MODE_BY_SIGNAL = [
  [/music|song|sonata|nocturne|etude|symphony|melody|tune|compose|notes? (?:on|for)/i, "midi"],
  [/image|picture|photo|painting|drawing|visual/i, "image"],
  [/video|film|footage|shot/i, "video"],
  [/audio|recording|sound/i, "audio"],
];
export function deriveMode(task = "") {
  const t = String(task ?? "");
  for (const [re, mode] of MODE_BY_SIGNAL) if (re.test(t)) return mode;
  return "text";
}

// ── TENOR: who the artifact is for — the relationship the staging enacts.
// Declared from the request's audience words; defaults to a general reader.
export function deriveTenor(task = "") {
  const t = String(task ?? "").toLowerCase();
  if (/children|kids|child/i.test(t)) return { tenor: "children", basis: "named for children" };
  if (/expert|professional|specialist/i.test(t)) return { tenor: "expert", basis: "named for experts" };
  if (/lay|general|everyone|public/i.test(t)) return { tenor: "general", basis: "named for a general audience" };
  return { tenor: "general", basis: "defaulted — no audience named" };
}

export function deriveRegister(task = "", { genres = [] } = {}) {
  const field = deriveField(task, { genres });
  const mode = deriveMode(task);
  const tenor = deriveTenor(task);
  return Object.freeze({
    schema: REGISTER_SCHEMA, task: String(task ?? "").slice(0, 120),
    field, mode, tenor,
    basis: `${field.basis}; carried in ${mode}; ${tenor.basis}`,
  });
}

// ── STAGING QUESTION FORM: the register's FIELD shapes the question the void
// asks of a phase. An exposition asks what a thing is; a narrative asks what
// HAPPENS there. One open table, like FIELD_BY_NOUN — a genre is registered,
// never a branch.
const QUESTION_BY_FIELD = {
  narrative: (phase, topic) => `What happens at ${phase} — what changes, and how does it carry the course toward its resolution?`,
  lyric: (phase, topic) => `What is the shape of ${phase} — its images, its turn, its return?`,
  music: (phase, topic) => `What is the gesture of ${phase} — its interval, its motion, its rest?`,
  instrument: (phase, topic) => `What is ${phase} — its parts, its seams, its behavior?`,
  exposition: (phase, topic) => `What is ${phase}, and how does it relate to ${topic}?`,
};
export function questionFor(register, phase, topic = "the subject") {
  const f = register?.field?.field;
  return (QUESTION_BY_FIELD[f] ?? QUESTION_BY_FIELD.exposition)(String(phase ?? ""), String(topic ?? "the subject"));
}

// ── WRITE VOICE: the register's FIELD shapes not only the question but the
// prose. An exposition argues (thesis → why it matters); a narrative SHOWS
// (a scene in motion — never a claim, never a meta-commentary on its own
// writing). One open table, like FIELD_BY_NOUN — a genre is registered,
// never a branch.
const VOICE_BY_FIELD = {
  narrative: {
    opening: (topic) => `We're writing a story on ${topic}. ${topic} is the world; the piece is a story set in it.\n\nOPEN THE STORY IN MEDIAS RES: drop the reader into a place and a moment — the light, the keeper, the sea — using the material's own names, places, and details, but TOLD AS A SCENE: someone is there, something is happening, the senses are engaged. No thesis, no "why this matters", no commentary about writing. Ground every concrete detail in what the material holds.`,
    body: (topic) => `WRITE THIS AS A SCENE IN THE STORY: what happens here, who acts, what changes, what the character sees and feels. Ground it in the material's real names, places, and figures, told as narrative prose with motion and tension. Do NOT analyze the chapter's title, the writing, the question, or the material itself — SHOW the moment. Continue the story already told, transition from it, do not restate it.`,
  },
  exposition: {
    opening: (topic) => `OPEN THE PIECE WITH A THESIS: a single, definite, surprising claim about ${topic} that the reader would not expect — a position, never a description. It must be grounded in what the material holds (a real fact or relation), but stated as an argument: something someone could disagree with. Then in 1-2 sentences, name why the claim matters. This is the opening of the piece itself — no introduction, no "in this essay", no commentary about writing.`,
    body: (topic) => `Now answer this part as a substantial passage of the piece itself. ANSWER WITH THE MATERIAL'S OWN FACTS about ${topic}: its real names, places, numbers, and relationships as the sources state them. Do not discuss the essay, the writing, the question, or the material itself. It continues what the piece has already established — build on it, transition from it, do not restate it.`,
  },
  // INSTRUMENT (code): the mouth emits SOURCE CODE, not prose. This is a
  // fallback voice — the proxy builds the code prompt directly (language,
  // part, the code-so-far), but any path that reaches writeVoiceFor with an
  // instrument register must not fall back to the essay voice.
  instrument: {
    opening: (topic) => `WRITE ONLY SOURCE CODE for ${topic}: the file's header and imports. Emit code only — no explanation, no prose, no markdown fences.`,
    body: (topic) => `WRITE ONLY SOURCE CODE for ${topic}: this part of the file. Emit code only — no explanation, no prose, no markdown fences — composing with the parts already written.`,
  },
};
export function writeVoiceFor(register, topic = "the subject") {
  const f = register?.field?.field;
  return VOICE_BY_FIELD[f] ?? VOICE_BY_FIELD.exposition;
}

// ── STAGING: the genre's phases-and-transitions. The sidecar's accumulated
// knowledge wins when the genre has been seen; else the record's own seams;
// the essay's classical form is ONE registered genre in the sidecar, never a
// branch. `staging` is a list of phases; `transitions` between them.
export function stagingFor(register, { sidecar = null, record = null, outline = null } = {}) {
  const f = register?.field?.field;
  // 1. the sidecar: has this genre been seen? its movements ARE the staging.
  if (sidecar?.entries?.length && f) {
    const seen = sidecar.entries.filter((e) => e.genre === f || e.field === f || (e.subgenre ?? "").includes(f));
    if (seen.length) {
      const moves = seen.flatMap((e) => e.movements ?? []);
      const foci = [...new Set(moves.map((m) => m.focus).filter(Boolean))].slice(0, 7);
      return { from: "sidecar", genre: f, seen: seen.length, phases: foci, basis: `the sidecar has ${seen.length} ${f} reading(s); their movements are the staging` };
    }
  }
  // 2. the record: the generic staged pipeline — the record's own seams.
  if (outline?.phases?.length) return { from: "record", genre: f ?? "staged", seen: 0, phases: outline.phases.map((p) => p.focus), transitions: outline.phases.slice(1).map((p) => p.transition), basis: `no ${f ?? "registered"} genre in the sidecar — staged from the record's own seams` };
  // 3. nothing: a declared single artifact, staged by the reader as it goes.
  return { from: "fallback", genre: f ?? "staged", seen: 0, phases: [], basis: "no sidecar knowledge, no record — the artifact is staged as it is written" };
}