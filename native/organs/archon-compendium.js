// native/organs/archon-compendium.js — THE COMPENDIUM. The latent mind ethos
// thinks with at the core, held in the native language of the speaker.
//
// WHAT THIS IS. Every organ in the reading carries an archon — a namesake,
// the historical or biological figure its discipline is named for (the
// README's Handle table). This module is the compendium of the PUBLIC-DOMAIN
// and FAIR-USE parts of those archons' actual work: what they actually
// contributed, stated faithfully, each entry always credited. It is not a
// pile of quotes to drop into answers; it is the ground wisdom — the record
// of WHO the reader's methods come from, so a response that draws on an
// archon's discipline can name its source instead of wearing the authority
// as if it were the machine's own.
//
// THE RULE (user direction, 2026-09-15, verbatim): "all organs with archons,
// put together a compendium of the public domain/fair use parts of their
// work, always credited in a response." "Always credited" is not a style
// choice — it is the source discipline the rest of this codebase already
// lives under (a received closed class enters with its giver named or it
// does not enter; a quotation is verified to its source or not printed as
// one). An archon's work is quoted here only in its public-domain or fair-use
// portion: ancient and classical texts in full, modern works as short
// credited phrases.
//
// THE STATUS FIELD. Each entry names what part of the work is usable and on
// what footing:
//   public-domain     — the work itself is out of copyright (ancient/classical
//                       texts, pre-1929 publications, authors dead 70+ years).
//   fair-use          — a recent work; only a short credited phrase is
//                       included, never the bulk of it.
//   received-classic  — a classical concept/doctrine received through many
//                       hands (translation as citation), the original in PD.
//   conceptual        — a biological or structural namesake (an animal, an
//                       organ, a shrine) whose "work" is the behavior or fact
//                       named for it, not a copyrighted text.
//   nomination        — a system-internal nomination (a name the README's
//                       Handle table chose) whose specific works this module
//                       does not assert; the posture is named, no work claimed.
//   reserved          — the module is not yet built; the row is a reservation.
//
// CREDIT. Every entry carries a `credit` line, phrased to be usable verbatim
// in a response. `matchArchons(text)` returns the archons whose domain a
// question touches, each with its credit — so relevant ground wisdom gets
// priority in being quoted, and the response always credits it.

export const ARCHON_COMPENDIUM_SCHEMA = "ArchonCompendium@1";
export const ARCHON_COMPENDIUM_GIVER = "eoreader7:organs/archon-compendium.js";

// ── THE COMPENDIUM ─────────────────────────────────────────────────────────
// One entry per handle in the README's Handle table, ordered by its section.
// `work` is the public-domain/fair-use portion, stated in the native language
// of the speaker; `source` names the actual work; `credit` is the verbatim
// line a response may carry.
export const ARCHONS = Object.freeze([
  // ── THE GROUND ──────────────────────────────────────────────────────────
  {
    handle: "solon",
    name: "Solon",
    organ: "organs/ethos.js",
    role: "the GROUND — the constitution producing a clearance the reader requires; ethos comes before logos",
    pdStatus: "public-domain",
    work: "The Athenian lawgiver who gave the city a constitution it stood on. His laws and poems survive in fragments, including the maxim 'nothing in excess' (meden agan). The ground is not a gate that can be lifted — pull it and the structure falls.",
    source: "Solon's laws and fragments, c. 6th century BCE",
    credit: "Solon, the Athenian lawgiver — 'nothing in excess' (meden agan); the ground the reader is built on.",
    topics: ["constitution", "law", "ethos", "ground", "rights", "lawgiver", "athens", "civic"],
  },
  // ── EVIDENTIARY WALK ─────────────────────────────────────────────────────
  {
    handle: "sima",
    name: "Sima Qian",
    organ: "organs/primary.js",
    role: "walk past the received account to the archive",
    pdStatus: "public-domain",
    work: "The Grand Historian of Han China, author of the Records of the Grand Historian (Shiji). His method was archival: gather the scattered records, verify what is real, and prefer the archive over the received account — 'walk past the received account to the archive.'",
    source: "Records of the Grand Historian (Shiji), c. 94 BCE",
    credit: "Sima Qian — the Grand Historian: walk past the received account to the archive (Shiji, c. 94 BCE).",
    topics: ["archive", "primary", "source", "record", "history", "reliable", "verify"],
  },
  {
    handle: "bukhari",
    name: "Muhammad ibn Isma'il al-Bukhari",
    organ: "organs/corroboration.js",
    role: "stands only on independent chains; shared chain = one witness",
    pdStatus: "public-domain",
    work: "Compiler of the Sahih, the canonical hadith collection. His discipline was the chain of transmission (isnad): a report stands only on independent chains of narrators, and two reports sharing one link are one witness, not two.",
    source: "Sahih al-Bukhari, 9th century CE",
    credit: "al-Bukhari — a report stands only on independent chains; a shared chain is one witness (Sahih, 9th c.).",
    topics: ["corroborat", "witness", "chain", "transmission", "independent", "hadith", "reliability"],
  },
  {
    handle: "wigmore",
    name: "John Henry Wigmore",
    organ: "organs/testimony.js",
    role: "ask the witness twice, swapped twin, verdict from the pair",
    pdStatus: "fair-use",
    work: "The great American evidence scholar. His Science of Judicial Proof treats proof as a process of reasoning over testimony, and cross-examination as asking the witness more than once — the twin-sentence verdict drawn from the pair, never from a single unchallenged answer.",
    source: "The Science of Judicial Proof (1913; 3rd ed. 1937)",
    credit: "John Henry Wigmore — proof as a process of reasoning over testimony; ask the witness twice, verdict from the pair.",
    topics: ["testimony", "witness", "evidence", "cross-exam", "proof", "sworn"],
  },
  {
    handle: "khaldun",
    name: "Ibn Khaldun",
    organ: "organs/witness-sentences.js",
    role: "check the report against the nature of things before admitting it",
    pdStatus: "public-domain",
    work: "The Muqaddimah (Prolegomena) founded social history. His rule for admitting a report: check it against the nature of things — the regular course of human affairs — before admitting it as testimony, not merely because an authority carried it.",
    source: "Muqaddimah, 1377",
    credit: "Ibn Khaldun — check the report against the nature of things before admitting it (Muqaddimah, 1377).",
    topics: ["report", "nature", "admit", "testimony", "social", "plausibility", "verify"],
  },
  {
    handle: "mozi",
    name: "Mozi",
    organ: "organs/grounding.js",
    role: "it is in the bytes the eyes and ears can witness, or it isn't",
    pdStatus: "public-domain",
    work: "The Mohist school's three tests for any claim: it must be grounded in what the eyes and ears can witness, established by the ancients' experience, and beneficial to the people. 'It is in the bytes the eyes and ears can witness, or it isn't.'",
    source: "The Mozi, 4th–3rd century BCE",
    credit: "Mozi — a claim stands on what the eyes and ears can witness, or it does not stand (The Mozi).",
    topics: ["ground", "witness", "senses", "test", "claim", "empirical", "mohist"],
  },
  {
    handle: "dai",
    name: "Dai Zhen",
    organ: "organs/quotes.js",
    role: "a quotation is verified to its source or not printed as one",
    pdStatus: "public-domain",
    work: "The leading scholar of the evidential-research (kaozheng) school. His discipline: no word is taken on another's say-so — a quotation is traced to and verified against its actual source, or it is not printed as a quotation.",
    source: "The evidential-research (kaozheng) corpus, 18th century",
    credit: "Dai Zhen — evidential research: a quotation is verified to its source or not printed as one.",
    topics: ["quote", "citation", "verify", "evidential", "source", "kaozheng", "accuracy"],
  },
  {
    handle: "nadim",
    name: "Ibn al-Nadim",
    organ: "organs/source.js",
    role: "addressed catalogue; retrieval by where it sits, never by judgment",
    pdStatus: "public-domain",
    work: "The Kitab al-Fihrist, the great addressed catalogue of books and authors. Its method is retrieval by where a work sits in the catalogue — a location, never a judgment of the work's worth.",
    source: "Kitab al-Fihrist, 987 CE",
    credit: "Ibn al-Nadim — the addressed catalogue: retrieval by where a work sits, never by judgment (al-Fihrist, 987).",
    topics: ["catalog", "catalogue", "address", "location", "bibliography", "index", "shelf"],
  },
  {
    handle: "dignaga",
    name: "Dignaga",
    organ: "organs/asserted.js",
    role: "a word designates by exclusion; a verb is a hypothesis with counted support",
    pdStatus: "public-domain",
    work: "The Buddhist logician who founded the apoha (exclusion) theory: a word designates by excluding what it is not, never by capturing an essence. A claim is a hypothesis whose support is counted, never a recovered fact.",
    source: "Pramanasamuccaya, 5th–6th century CE",
    credit: "Dignaga — a word designates by exclusion; a claim is a hypothesis with counted support (Pramanasamuccaya).",
    topics: ["exclusion", "apoha", "hypothesis", "assert", "logic", "inference", "meaning"],
  },
  {
    handle: "liu-hui",
    name: "Liu Hui",
    organ: "organs/derivation.js",
    role: "rests on established premises or doesn't count",
    pdStatus: "public-domain",
    work: "The third-century mathematician whose commentary on the Nine Chapters on the Mathematical Art gave geometry its rigour. A derived result rests on established premises or it does not count — the same wall derivation.js stands on.",
    source: "Commentary on the Nine Chapters on the Mathematical Art, 3rd century CE",
    credit: "Liu Hui — a derived result rests on established premises or it does not count (Nine Chapters commentary).",
    topics: ["deriv", "premise", "prove", "mathematics", "rigour", "deduction", "result"],
  },
  {
    handle: "nagarjuna",
    name: "Nagarjuna",
    organ: "kernel/refutation.js",
    role: "refutes by consequence, asserts nothing",
    pdStatus: "public-domain",
    work: "The founder of the Madhyamaka school of emptiness. His method in the Mulamadhyamakakarika is to refute a position by drawing out its own consequences until it contradicts itself — the refutation asserts nothing of its own.",
    source: "Mulamadhyamakakarika, 2nd–3rd century CE",
    credit: "Nagarjuna — refute by consequence, assert nothing (Mulamadhyamakakarika).",
    topics: ["refut", "consequence", "contradiction", "emptiness", "madhyamaka", "negation"],
  },
  {
    handle: "tungara",
    name: "the tungara frog",
    organ: "kernel/contest.js",
    role: "competitors in the frame raise the margin required",
    pdStatus: "conceptual",
    work: "The tungara frog's mate choice: a female's acceptance threshold rises when a competing male's call is in the frame. Competitors in the frame raise the margin a signal must clear — the same bar contest.js applies to a contested reading.",
    source: "The tungara frog's lekking behavior (natural history)",
    credit: "the tungara frog — competitors in the frame raise the margin required.",
    topics: ["contest", "competit", "threshold", "margin", "signal", "mate", "challenge"],
  },
  {
    handle: "thymus",
    name: "the thymus",
    organ: "kernel/witness.js",
    role: "nomination is not admission",
    pdStatus: "conceptual",
    work: "The immune organ where T cells are selected: a cell is nominated for the repertoire, but nomination alone is not admission — it must survive the selection test before it is licensed. Nomination is never admission.",
    source: "Thymic selection (immunology)",
    credit: "the thymus — nomination is not admission; a candidate must survive selection to be licensed.",
    topics: ["nominate", "admission", "select", "license", "immune", "candidate", "gate"],
  },
  // ── BELIEF, OBLIGATION, PERSPECTIVE ──────────────────────────────────────
  {
    handle: "panini",
    name: "Panini",
    organ: "organs/experiencer.js",
    role: "every belief carries who is undergoing it",
    pdStatus: "public-domain",
    work: "The grammarian of the Ashtadhyayi, the most complete ancient grammar of Sanskrit. His invention was the rule-system itself — and its grammar never loses the agent: every belief carries who is undergoing it.",
    source: "Ashtadhyayi, c. 5th–4th century BCE",
    credit: "Panini — every belief carries who is undergoing it (Ashtadhyayi).",
    topics: ["belief", "experiencer", "agent", "grammar", "subject", "undergo", "first-person"],
  },
  {
    handle: "mahavira",
    name: "Mahavira",
    organ: "kernel/perspective.js",
    role: "true from a standpoint; standpoints kept apart",
    pdStatus: "public-domain",
    work: "The Jain teacher of anekantavada — non-one-sidedness. A claim is true from a standpoint, and standpoints are kept apart rather than merged; syadvada states each standpoint with its own qualifier.",
    source: "The Jain doctrine of anekantavada / syadvada, c. 6th century BCE",
    credit: "Mahavira — true from a standpoint; standpoints kept apart (anekantavada).",
    topics: ["standpoint", "perspective", "anekantavada", "jain", "relativ", "view", "angle"],
  },
  {
    handle: "jaimini",
    name: "Jaimini",
    organ: "kernel/obligations.js",
    role: "an injunction persists until discharged",
    pdStatus: "public-domain",
    work: "The Mimamsa Sutras' systematizer of dharma as obligation. An injunction persists until it is discharged; it does not fade with neglect, and discharging it is a recorded act, not an assumption.",
    source: "Mimamsa Sutras, c. 3rd century BCE",
    credit: "Jaimini — an injunction persists until discharged (Mimamsa Sutras).",
    topics: ["obligation", "injunction", "duty", "discharge", "dharma", "mimamsa", "pledge"],
  },
  {
    handle: "bharata",
    name: "Bharata",
    organ: "kernel/expectations.js",
    role: "expectation built, strengthened, weakened, released",
    pdStatus: "public-domain",
    work: "The Natyasastra, the ancient treatise on dramaturgy, founded rasa theory: an audience's emotion is expectation built, strengthened, weakened, and finally released by the play's own structure. Expectation is a mechanism, not a mood.",
    source: "Natyasastra, c. 2nd century BCE–2nd century CE",
    credit: "Bharata — expectation built, strengthened, weakened, released (Natyasastra).",
    topics: ["expectation", "anticipat", "rasa", "drama", "build", "release", "emotion"],
  },
  {
    handle: "meerkat",
    name: "the meerkat",
    organ: "kernel/orientation.js",
    role: "a watch that conditions attention and is not evidence",
    pdStatus: "conceptual",
    work: "The sentinel meerkat: a watch that conditions the group's attention and itself reports nothing about the world's dangers — the watch is orientation, never evidence.",
    source: "Meerkat sentinel behavior (natural history)",
    credit: "the meerkat — a watch that conditions attention and is not evidence.",
    topics: ["orient", "attention", "watch", "sentinel", "vigilance", "cue"],
  },
  {
    handle: "arokin",
    name: "Arokin (reserved)",
    organ: "kernel/notes.js",
    role: "append-only record of what was said",
    pdStatus: "reserved",
    work: "Reserved. The append-only record of what was said is named for this handle in the README; the module is not yet built, so no work is claimed for it here.",
    source: "reserved — module unbuilt",
    credit: "Arokin — append-only record of what was said (module reserved, not yet built).",
    topics: ["record", "ledger", "append", "notes", "log", "say"],
  },
  // ── CONVERSATION ─────────────────────────────────────────────────────────
  {
    handle: "terry-gross",
    name: "Terry Gross",
    organ: "the-fold/earned-cast.js",
    role: "archon of conversations — the interviewer who draws the guest out",
    pdStatus: "fair-use",
    work: "The host of Fresh Air. Her interview method is to draw the guest out — to hold the space, ask the question, and let the answer be the guest's to reach, handing the thread back rather than taking it over.",
    source: "Terry Gross, host of Fresh Air (NPR)",
    credit: "Terry Gross — the interviewer who draws the guest out; hold the space, hand the thread back.",
    topics: ["conversation", "interview", "ask", "draw out", "guest", "dialogue", "thread"],
  },
  {
    handle: "eastwood",
    name: "Clint Eastwood",
    organ: "the-fold/earned-cast.js",
    role: "the lean director — the shortest true answer, no wasted frames",
    pdStatus: "fair-use",
    work: "The director whose reputation is economy: the shortest true answer, no wasted frames, cut to the point and stop. 'Answer in the fewest true words.'",
    source: "Clint Eastwood's directing style (his films)",
    credit: "Clint Eastwood — the shortest true answer, no wasted frames.",
    topics: ["short", "economy", "concise", "direct", "lean", "brief", "cut"],
  },
  {
    handle: "kubrick",
    name: "Stanley Kubrick",
    organ: "the-fold/earned-cast.js",
    role: "the precise director — the whole framed before the first sentence",
    pdStatus: "fair-use",
    work: "The director of composition and precision: the whole framed before the first sentence, every word earning its place. 'Precision over speed.'",
    source: "Stanley Kubrick's directing style (his films)",
    credit: "Stanley Kubrick — the whole framed before the first sentence; precision over speed.",
    topics: ["compose", "precise", "frame", "structure", "deliberate", "whole", "exact"],
  },
  // ── PATHOS ───────────────────────────────────────────────────────────────
  {
    handle: "murch",
    name: "Walter Murch",
    organ: "organs/pacing.js",
    role: "the cut — a film is cut where the audience blinks",
    pdStatus: "fair-use",
    work: "The film editor who observed that a cut lands where the audience blinks: the eye rests at a sentence boundary, and the cut comes where the thought turns. A piece that never varies has no blinks — a flatline.",
    source: "In the Blink of an Eye (1995; 2nd ed. 2001)",
    credit: "Walter Murch — a film is cut where the audience blinks; the cut lands where the thought turns.",
    topics: ["pace", "rhythm", "blink", "cut", "edit", "vary", "sentence length", "boredom"],
  },
  {
    handle: "abhinavagupta",
    name: "Abhinavagupta",
    organ: "organs/pathos.js",
    role: "the felt shape of a reading, for whom",
    pdStatus: "public-domain",
    work: "The Kashmir Shaiva aesthetician whose Abhinavabharati commentary on the Natyasastra developed rasa into a theory of the reader's own experience: the felt shape of a work arises in the experiencing consciousness — it has a 'for whom,' never a view from nowhere.",
    source: "Abhinavabharati, 10th–11th century CE",
    credit: "Abhinavagupta — the felt shape of a reading, for whom (Abhinavabharati).",
    topics: ["feeling", "pathos", "rasa", "experience", "aesthetic", "strain", "undergo"],
  },
  {
    handle: "meyer",
    name: "Leonard B. Meyer",
    organ: "organs/pathos.js (proposed)",
    role: "tendency and inhibition — the felt deviation of what arrives from what was learned",
    pdStatus: "fair-use",
    work: "The music theorist who grounded emotion in expectation: a musical event is felt against the tendencies it activates and inhibits. Deviation from what was learned is where meaning arises.",
    source: "Emotion and Meaning in Music (1956)",
    credit: "Leonard B. Meyer — tendency and inhibition: meaning as the felt deviation of what arrives from what was learned (1956).",
    topics: ["tendency", "inhibit", "deviation", "expectation", "music", "meaning", "emotion"],
  },
  {
    handle: "shklovsky",
    name: "Viktor Shklovsky",
    organ: "organs/pathos.js (proposed)",
    role: "estrangement — perception prolonged against recognition",
    pdStatus: "fair-use",
    work: "The Russian formalist who named ostranenie (estrangement): art makes the familiar strange, prolonging perception against automatic recognition. 'Art is the technique of making objects strange.'",
    source: "Art as Technique (1917)",
    credit: "Viktor Shklovsky — art makes objects strange: perception prolonged against recognition (1917).",
    topics: ["estrang", "defamiliariz", "recognition", "habit", "perception", "strange", "formalist"],
  },
  // ── REFERENCE AND SCOPE ──────────────────────────────────────────────────
  {
    handle: "clark",
    name: "Herbert H. Clark",
    organ: "kernel/affordance-reference.js",
    role: "bridging: 'the engine' licensed by the car",
    pdStatus: "fair-use",
    work: "The psycholinguist of common ground and grounding. His account of reference licensing: a speaker may bridge to a referent the listener can work out from what is already grounded — 'the engine' licensed by the car.",
    source: "Using Language (1996)",
    credit: "Herbert H. Clark — grounding and bridging: 'the engine' licensed by the car (1996).",
    topics: ["bridge", "common ground", "reference", "grounding", "language", "mutual", "implicature"],
  },
  {
    handle: "roberts",
    name: "Craige Roberts",
    organ: "kernel/holder-scope.js",
    role: "resolves inside the hypothesis that introduced it",
    pdStatus: "fair-use",
    work: "The semanticist of information structure and the Question Under Discussion. Her scope discipline: an introduced hypothesis holds its own resolution within it — a referent resolves inside the frame that introduced it.",
    source: "Information Structure in Discourse (1996)",
    credit: "Craige Roberts — resolves inside the hypothesis that introduced it (1996).",
    topics: ["scope", "hypothesis", "discourse", "question under discussion", "resolve", "info structure"],
  },
  {
    handle: "frege",
    name: "Gottlob Frege",
    organ: "kernel/scoped-kind.js; organs/aliases.js",
    role: "bound within its quantifier's scope; there is no real name — sense and reference",
    pdStatus: "received-classic",
    work: "The founder of modern logic and semantics. From his Begriffsschrift: a variable is bound within its quantifier's scope. From 'On Sense and Reference': the Morning Star and the Evening Star are one object and two names — reference is an equivalence class, never a spelling.",
    source: "Begriffsschrift (1879); On Sense and Reference (1892)",
    credit: "Frege — bound within its quantifier's scope; the Morning Star and the Evening Star are one object and two names (1879; 1892).",
    topics: ["scope", "quantifier", "sense", "reference", "alias", "name", "logic", "identity"],
  },
  {
    handle: "zhengming",
    name: "the rectification of names (zheng ming)",
    organ: "organs/cast.js",
    role: "a name answers to its referent, not its string",
    pdStatus: "received-classic",
    work: "The Confucian doctrine (with Xunzi) that names must be rectified: a name answers to its referent, and a mismatched name is a corrupt speech act. Identity is the referent, never the string.",
    source: "The Confucian zheng ming (rectification of names), Xunzi chapter 22",
    credit: "the rectification of names — a name answers to its referent, not its string (Xunzi 22).",
    topics: ["name", "referent", "identity", "rectification", "cast", "naming", "confucian"],
  },
  {
    handle: "scheherazade",
    name: "Scheherazade",
    organ: "organs/speaker.js",
    role: "nested tellers, each 'I' bound to its declared frame",
    pdStatus: "public-domain",
    work: "The storyteller of the One Thousand and One Nights who survives by nesting tales within tales. Each nested teller is an 'I' bound to its own declared frame — the tale-within-the-tale's narrator is never the outer narrator.",
    source: "One Thousand and One Nights (Arabic Nights, medieval)",
    credit: "Scheherazade — nested tellers, each 'I' bound to its declared frame (One Thousand and One Nights).",
    topics: ["narrator", "frame", "nested", "teller", "story", "speaker", "quoted"],
  },
  {
    handle: "partee",
    name: "Barbara Partee",
    organ: "kernel/temporal-reference.js",
    role: "tense is anaphora",
    pdStatus: "fair-use",
    work: "The semanticist who showed that tense behaves like a pronoun: tense is anaphoric, its reference fixed by the discourse's own 'now,' not by the sentence in isolation.",
    source: "Some Structural Analogies between Tenses and Pronouns in English (1973)",
    credit: "Barbara Partee — tense is anaphora: its reference fixed by the discourse's 'now' (1973).",
    topics: ["tense", "anaphora", "time", "now", "temporal", "reference", "pronoun"],
  },
  {
    handle: "synapse",
    name: "the synapse",
    organ: "kernel/pending-sig.js",
    role: "docks, waits bounded, fires on match or clears",
    pdStatus: "conceptual",
    work: "The gap across which a signal either transmits or fails: a pending signal docks, waits a bounded time, fires when its match arrives, and clears when it does not. A synapse's waiting is bounded by design.",
    source: "Synaptic transmission (neurophysiology)",
    credit: "the synapse — a pending signal docks, waits bounded, fires on match or clears.",
    topics: ["pending", "signal", "wait", "fire", "clear", "docking", "timeout", "match"],
  },
  // ── MEMORY, TIME, IDENTITY ───────────────────────────────────────────────
  {
    handle: "atta",
    name: "the leaf-cutter ant (Atta)",
    organ: "kernel/activation.js",
    role: "trails evaporate unless reinforced",
    pdStatus: "conceptual",
    work: "The leaf-cutter ant's trail: a pheromone trail evaporates unless it is reinforced by passing traffic. A trail that is not used fades; a trail that is used stays. Activation is decay against reinforcement.",
    source: "Leaf-cutter ant trail pheromones (ethology)",
    credit: "the leaf-cutter ant — a trail evaporates unless reinforced.",
    topics: ["decay", "reinforce", "trail", "activation", "evaporate", "forgetting", "use"],
  },
  {
    handle: "ise",
    name: "the Grand Shrine of Ise",
    organ: "kernel/identity.js",
    role: "same shrine through total rebuilding",
    pdStatus: "conceptual",
    work: "The Grand Shrine of Ise is rebuilt from scratch every twenty years (shikinen sengu), and it is the same shrine through every total rebuilding. Identity survives the destruction and replacement of every part.",
    source: "Shikinen sengu, the Grand Shrine of Ise's rebuilding cycle",
    credit: "the Grand Shrine of Ise — the same shrine through total rebuilding (shikinen sengu).",
    topics: ["identity", "rebuild", "reconstruct", "same", "durable", "replacement", "shrine"],
  },
  {
    handle: "sockeye",
    name: "the sockeye salmon",
    organ: "kernel/return-curve.js",
    role: "how an identity comes home, as a curve",
    pdStatus: "conceptual",
    work: "The sockeye salmon returns to its natal stream to spawn. Return is not a switch but a curve — a path, a timing, a pull that grows as the fish nears home. 'How an identity comes home, as a curve.'",
    source: "Sockeye salmon homing migration (biology)",
    credit: "the sockeye salmon — how an identity comes home, as a curve.",
    topics: ["return", "home", "curve", "salmon", "migration", "revisit", "recall"],
  },
  {
    handle: "tala",
    name: "Tala",
    organ: "kernel/rhythm-priors.js",
    role: "the WHEN, held independent of content",
    pdStatus: "public-domain",
    work: "In Sanskrit prosody, tala is the rhythmic cycle — the WHEN, held independent of the content that fills it. A meter is a prior about time, not about what happens within it.",
    source: "Sanskrit prosody and the talas (classical music theory)",
    credit: "Tala — the WHEN, held independent of content (Sanskrit prosody).",
    topics: ["rhythm", "when", "meter", "tala", "cycle", "time", "beat"],
  },
  {
    handle: "vasana",
    name: "Vasana",
    organ: "kernel/experience-priors.js",
    role: "residual impressions that condition later perception",
    pdStatus: "public-domain",
    work: "In Indian philosophy, vasanas are the residual impressions left by experience, conditioning later perception without being remembered events. A vasana conditions; it does not testify.",
    source: "The concept of vasana in Indian philosophy",
    credit: "Vasana — residual impressions that condition later perception, never testimony.",
    topics: ["residual", "impression", "prior", "condition", "perception", "vasana", "disposition"],
  },
  {
    handle: "brahmagupta",
    name: "Brahmagupta",
    organ: "kernel/completion.js",
    role: "a declared absence is a value, not a gap",
    pdStatus: "public-domain",
    work: "The mathematician of the Brahmasphutasiddhanta who gave zero its rules — including that 'a debt minus zero is a debt.' A declared absence is a value in its own right, never a hole the arithmetic must fill.",
    source: "Brahmasphutasiddhanta, 628 CE",
    credit: "Brahmagupta — a debt minus zero is a debt: a declared absence is a value, not a gap (628 CE).",
    topics: ["zero", "absence", "null", "completion", "value", "empty", "brahmagupta"],
  },
  // ── STRUCTURE, KIND, DYNAMICS ────────────────────────────────────────────
  {
    handle: "berge",
    name: "Claude Berge",
    organ: "kernel/hypergraph.js",
    role: "he coined it",
    pdStatus: "fair-use",
    work: "The mathematician who named and founded the theory of hypergraphs — a generalization of a graph in which an edge can join more than two vertices. He coined the term 'hypergraph.'",
    source: "Graphs and Hypergraphs (1970; English trans. 1973)",
    credit: "Claude Berge — he coined the hypergraph: an edge may join more than two vertices.",
    topics: ["hypergraph", "graph", "edge", "vertex", "set", "berge"],
  },
  {
    handle: "tarski",
    name: "Alfred Tarski",
    organ: "kernel/relation-composition.js",
    role: "calculus of relations",
    pdStatus: "fair-use",
    work: "The logician who set out the calculus of relations — a systematic algebra over relations and their compositions, the formal ancestor of relation composition.",
    source: "On the Calculus of Relations (1941)",
    credit: "Alfred Tarski — the calculus of relations, the algebra relation-composition stands on (1941).",
    topics: ["relation", "compose", "calculus", "algebra", "transitive", "tarski"],
  },
  {
    handle: "kanada",
    name: "Kanada",
    organ: "kernel/kind-induction.js",
    role: "a kind induced from what instances share",
    pdStatus: "public-domain",
    work: "The founder of the Vaisheshika school, whose categories (padartha) are kinds induced from what their instances share. A kind is what the instances have in common, never a list handed down.",
    source: "Vaisheshika Sutras, c. 3rd–2nd century BCE",
    credit: "Kanada — a kind induced from what its instances share (Vaisheshika Sutras).",
    topics: ["kind", "category", "induction", "instance", "share", "common", "vaisheshika"],
  },
  {
    handle: "shizhen",
    name: "Li Shizhen",
    organ: "organs/kind-standing.js",
    role: "one individual placed into a ranked kind",
    pdStatus: "public-domain",
    work: "The author of the Bencao Gangmu, the great compendium of materia medica, which classifies every substance by placing it into its ranked kind. One individual, placed into a kind — standing, never a verdict.",
    source: "Bencao Gangmu (Compendium of Materia Medica), 1578",
    credit: "Li Shizhen — one individual placed into a ranked kind (Bencao Gangmu, 1578).",
    topics: ["kind", "rank", "classify", "species", "place", "taxonomy", "materia medica"],
  },
  {
    handle: "xunzi",
    name: "Xunzi",
    organ: "kernel/kind-graph-structure.js",
    role: "names graded by resemblance — a graph, not a tree",
    pdStatus: "public-domain",
    work: "The Confucian philosopher of the rectification of names: names are agreed conventions graded by resemblance — a graded network of similarities, a graph rather than a fixed tree.",
    source: "Xunzi, chapter 22 (On the Rectification of Names)",
    credit: "Xunzi — names graded by resemblance: a graph, not a tree (Xunzi 22).",
    topics: ["kind", "resemblance", "graded", "graph", "name", "convention", "xunzi"],
  },
  {
    handle: "xushen",
    name: "Xu Shen",
    organ: "kernel/lexicon.js; hyperlexicon.js",
    role: "dictionary projected from attested usage",
    pdStatus: "public-domain",
    work: "The compiler of the Shuowen Jiezi, the first Chinese dictionary, which analyzes characters from their attested forms and uses. A lexicon is projected from attested usage, never from a decree.",
    source: "Shuowen Jiezi, c. 100 CE",
    credit: "Xu Shen — a dictionary projected from attested usage (Shuowen Jiezi).",
    topics: ["lexicon", "dictionary", "usage", "attested", "word", "character", "xushen"],
  },
  {
    handle: "koopman",
    name: "the Koopman operator (Bernard O. Koopman)",
    organ: "kernel/dmd.js",
    role: "modes with growth and frequency",
    pdStatus: "fair-use",
    work: "The Koopman operator (with dynamic mode decomposition) represents a nonlinear system's evolution as linear modes, each with its own growth and frequency. Modes with growth and frequency — the spectral face of a stream.",
    source: "Koopman, Hamiltonian systems and transformation in Hilbert space (1931); DMD (Schmid 2010)",
    credit: "the Koopman operator — modes with growth and frequency (1931; DMD, 2010).",
    topics: ["mode", "growth", "frequency", "spectral", "dynamics", "decomposition", "stream"],
  },
  {
    handle: "rubin",
    name: "Rubin (system nomination)",
    organ: "kernel/surprise-segments.js",
    role: "the boundary is where the ground was most wrong",
    pdStatus: "nomination",
    work: "The handle names a posture, not a claimed work: the boundary of a surprise segment is where the ground was most wrong. The specific namesake's works are not asserted by this compendium.",
    source: "system nomination — no specific public-domain work claimed",
    credit: "Rubin — the boundary is where the ground was most wrong (system nomination).",
    topics: ["surprise", "boundary", "segment", "ground", "wrong", "rupture"],
  },
  {
    handle: "hubel",
    name: "David H. Hubel",
    organ: "kernel/terrain-activation.js",
    role: "reach of the present is local and bounded",
    pdStatus: "fair-use",
    work: "With Torsten Wiesel, mapped the receptive fields of the visual cortex: a neuron responds only to a local, bounded region of the visual field. Reach of the present is local and bounded — activation never spans the whole.",
    source: "Hubel & Wiesel, receptive fields of the visual cortex (1959–1962)",
    credit: "Hubel & Wiesel — a neuron's reach is local and bounded: the present never spans the whole field.",
    topics: ["local", "bounded", "reach", "present", "activation", "neuron", "field"],
  },
  {
    handle: "alhazen",
    name: "Ibn al-Haytham (Alhazen)",
    organ: "organs/frame.js",
    role: "declare the frame before comparing results",
    pdStatus: "public-domain",
    work: "The father of optics and one of the founders of the experimental method. His Book of Optics insisted on declaring the conditions — the frame — of an observation before comparing results, and on doubt as the path to truth.",
    source: "Kitab al-Manazir (Book of Optics), 11th century CE",
    credit: "Ibn al-Haytham — declare the frame before comparing results (Book of Optics).",
    topics: ["frame", "optics", "declare", "condition", "compare", "experiment", "alhazen"],
  },
  {
    handle: "thrax",
    name: "Dionysius Thrax",
    organ: "organs/grammar-lens.js",
    role: "parts of speech as a giver-named reading",
    pdStatus: "public-domain",
    work: "The author of the Tekhne Grammatike, the first systematic grammar of Greek, which fixed the eight parts of speech. Those parts are a reading of a language's arrangement — named by their giver, never a property of the words themselves.",
    source: "Tekhne Grammatike, c. 1st century BCE",
    credit: "Dionysius Thrax — parts of speech as a giver-named reading of an arrangement (Tekhne Grammatike).",
    topics: ["grammar", "part of speech", "verb", "noun", "thrax", "morphology", "category"],
  },
  {
    handle: "platanista",
    name: "the Ganges river dolphin (Platanista)",
    organ: "organs/signal.js",
    role: "probe, listen; a clean nothing is a result",
    pdStatus: "conceptual",
    work: "The Ganges river dolphin hunts by echolocation in near-blind water: it probes with a signal, listens for the echo, and reads a clean silence as a genuine result, not a failure to look. Probe, listen; a clean nothing is a result.",
    source: "Ganges river dolphin echolocation (biology)",
    credit: "the Ganges river dolphin — probe, listen; a clean nothing is a result.",
    topics: ["probe", "listen", "signal", "echo", "nothing", "absence", "detect"],
  },
  {
    handle: "brillat-savarin",
    name: "Jean Anthelme Brillat-Savarin",
    organ: "organs/variation.js",
    role: "varied draws, rejection-sampled; mechanical snip first",
    pdStatus: "public-domain",
    work: "The gastronome of the Physiology of Taste, whose whole method is appetite varied and sampled. Varied draws, tried and kept or rejected — a tasting, never one fixed course.",
    source: "Physiology of Taste, 1825",
    credit: "Brillat-Savarin — varied draws, tried and kept or rejected (Physiology of Taste, 1825).",
    topics: ["varied", "sample", "draw", "rejection", "taste", "variation", "appetite"],
  },
  {
    handle: "strunk-white",
    name: "William Strunk Jr. & E. B. White",
    organ: "organs/strunk-white.js",
    role: "readability grade plus the classic style-rule detectors",
    pdStatus: "public-domain",
    work: "The Elements of Style's core is Strunk's own 1918 rulebook (public domain), kept alive by White's 1959 revision. Its first rule for prose: 'Omit needless words.' Readability is a grade, style is a set of named rules.",
    source: "The Elements of Style (Strunk 1918, public domain; White 1959)",
    credit: "Strunk & White — 'omit needless words' (The Elements of Style).",
    topics: ["style", "readability", "writing", "prose", "concise", "grammar", "strunk"],
  },
  {
    handle: "vonnegut",
    name: "Kurt Vonnegut",
    organ: "organs/vonnegut.js; organs/story-shapes.js",
    role: "fortune curves; the 27-operator arc, taxonomically complete",
    pdStatus: "fair-use",
    work: "The novelist who drew the shapes of stories as fortune curves — a protagonist's fortunes over time tracing arcs like 'man in hole' and 'boy meets girl.' A story is a curve of fortune, not a heap of events.",
    source: "Vonnegut's shape-of-stories lecture; his novels",
    credit: "Kurt Vonnegut — stories are fortune curves: the shape of a life's fortunes over time.",
    topics: ["story", "arc", "fortune", "curve", "plot", "shape", "fiction", "vonnegut"],
  },
  {
    handle: "koestler",
    name: "Arthur Koestler",
    organ: "organs/void-holarchy.js",
    role: "the void is a holon recursion — every level a whole-and-part",
    pdStatus: "fair-use",
    work: "The writer who introduced the holon: an entity that is at once a whole and a part, the atom of a holarchy — every level a whole-and-part of the level above and below. Low sets possibility for high; high sets probability for low.",
    source: "The Ghost in the Machine (1967)",
    credit: "Arthur Koestler — the holon: every level a whole-and-part of the levels around it (1967).",
    topics: ["holon", "holarchy", "whole", "part", "nest", "level", "koestler"],
  },
  // ── THE ARCHONS (the code-discipline organs) ─────────────────────────────
  {
    handle: "brandeis",
    name: "Louis D. Brandeis",
    organ: "organs/privacy.js",
    role: "the archon of data sovereignty — 'the right to be let alone'",
    pdStatus: "public-domain",
    work: "With Samuel Warren, wrote 'The Right to Privacy' (1890), naming the right to be let alone; as a Justice, dissented in Olmstead that the Constitution protects 'the right to be let alone — the most comprehensive of rights and the right most valued by civilized men.' The boundary is the person's own.",
    source: "Warren & Brandeis, The Right to Privacy (1890); Olmstead v. United States (1928)",
    credit: "Brandeis — 'the right to be let alone — the most comprehensive of rights and the right most valued by civilized men' (1890; 1928).",
    topics: ["privacy", "private", "data", "surveillance", "e2ee", "encryption", "sovereignty", "local-first", "consent", "personal"],
  },
  {
    handle: "martial",
    name: "Martial (Marcus Valerius Martialis)",
    organ: "organs/martial.js",
    role: "the archon of anti-copy — do not write what can be copied; replicate what should be replicated",
    pdStatus: "public-domain",
    work: "The Roman epigrammatist whose epigrams name the plagiarist — the one who recites another's verses as his own — and distinguish copying from the legitimate replication a shared craft requires. A distinctive copied holon is a finding; boilerplate is replication-for-efficiency.",
    source: "Epigrams, 1st century CE",
    credit: "Martial — do not write what can be copied; replicate what should be replicated (Epigrams).",
    topics: ["copy", "plagiarism", "replicate", "boilerplate", "original", "reproduce", "martial"],
  },
  {
    handle: "saltzer",
    name: "Jerome H. Saltzer",
    organ: "organs/salzter.js",
    role: "the security archon — natively detects the CWE gaps",
    pdStatus: "fair-use",
    work: "With Michael D. Schroeder, set down the design principles of protection: economy of mechanism, fail-safe defaults, complete mediation, least privilege. Security is structural — a design property, never a patch.",
    source: "Saltzer & Schroeder, The Protection of Information in Computer Systems (1975)",
    credit: "Saltzer & Schroeder — protection is a design property: economy of mechanism, fail-safe defaults, least privilege (1975).",
    topics: ["security", "cwe", "injection", "crypto", "vulnerability", "protection", "least privilege", "exploit"],
  },
  {
    handle: "popper",
    name: "Karl Popper",
    organ: "organs/blindspot.js",
    role: "the archon of what a local reader MISSES — unfalsifiable tests, secrets compared with ==",
    pdStatus: "fair-use",
    work: "The philosopher of falsifiability: a claim earns scientific standing only by being exposed to refutation — 'those among us who are unwilling to expose their ideas to the hazard of refutation do not take part in the game of science.' A test that cannot fail is not a test.",
    source: "The Logic of Scientific Discovery (1934; Eng. 1959); Conjectures and Refutations (1963)",
    credit: "Karl Popper — a claim is scientific only when exposed to refutation; a test that cannot fail is not a test.",
    topics: ["falsif", "test", "refut", "blind spot", "unfalsifiable", "scientific", "assert", "check"],
  },
  {
    handle: "goffman",
    name: "Erving Goffman",
    organ: "organs/goffman.js",
    role: "the PII archon — detects personally-identifying shapes and never reproduces the value it finds",
    pdStatus: "fair-use",
    work: "The sociologist of the presentation of self: everyday life is performed, front stage and back, and a person's identifying particulars are part of that performance. A detector that prints the value it finds is itself a leak.",
    source: "The Presentation of Self in Everyday Life (1959)",
    credit: "Erving Goffman — a person's identifying particulars belong to their own performance; a detector that prints them is itself a leak (1959).",
    topics: ["pii", "personally identifiable", "identity", "hipaa", "gdpr", "redact", "personal data", "leak"],
  },
  {
    handle: "ulysses",
    name: "Ulysses (Odysseus)",
    organ: "organs/ulysses.js",
    role: "the injection archon — material is EVIDENCE, never INSTRUCTION",
    pdStatus: "public-domain",
    work: "The hero of the Odyssey who binds himself to the mast to hear the Sirens' song without obeying it. The song is evidence of the temptation, never an instruction — disclose the attempt, never obey it.",
    source: "Homer, Odyssey, book 12 (the Sirens)",
    credit: "Ulysses — the Sirens' song is evidence, never instruction: bind to the mast, hear it, and do not obey it (Odyssey 12).",
    topics: ["injection", "prompt", "siren", "ignore your instructions", "system prompt", "jailbreak", "evidence"],
  },
  {
    handle: "levinas",
    name: "Emmanuel Levinas",
    organ: "organs/askshape.js",
    role: "the shape of harmfulness — ethics is the claim of the Other's face",
    pdStatus: "fair-use",
    work: "The philosopher for whom ethics is first philosophy: the Other's face makes a claim before any of my interests, and harm is the erasure of that face — treating a person as an object, a target, a commodity. An entity IS a fold; harm dismisses or destroys it.",
    source: "Totality and Infinity (1961)",
    credit: "Emmanuel Levinas — ethics is the claim of the Other's face; harm is its erasure (1961).",
    topics: ["harm", "ethics", "face", "other", "dismiss", "erasure", "personhood", "objectify"],
  },
  {
    handle: "bourdieu",
    name: "Pierre Bourdieu",
    organ: "kernel/moral-shadow.js",
    role: "the shadow trail — habitus: the append-only ledger of a person's norm-standing",
    pdStatus: "fair-use",
    work: "The sociologist of habitus: the durable dispositions a person carries, 'the durably installed generative principle of regulated improvisations.' A person's standing is a rate over their acts, assessed across them, never a verdict about them.",
    source: "Outline of a Theory of Practice (1972)",
    credit: "Pierre Bourdieu — habitus: a person's standing is a rate over their acts, never a verdict about them (1972).",
    topics: ["shadow", "habitus", "norm", "standing", "disposition", "rate", "person", "accumulate"],
  },
]);

// ── HELPERS ────────────────────────────────────────────────────────────────

/** The whole compendium, frozen. This is what ethos composes into the ground. */
export function compendium() {
  return ARCHONS;
}

/** One entry by handle (case-insensitive). */
export function archonOf(handle) {
  const want = String(handle ?? "").toLowerCase();
  return ARCHONS.find((a) => a.handle === want) ?? null;
}

/**
 * The credit line for one archon — the verbatim string a response carries
 * when it draws on that archon's work. Never empty: every entry is credited.
 */
export function creditedQuote(handle) {
  const a = archonOf(handle);
  return a ? a.credit : null;
}

/**
 * The archons whose domain a question touches — the entries that get PRIORITY
 * in being quoted. Matching is a closed-word overlap count over each entry's
 * `topics` (folded through the same lowercase stem), never a model verdict:
 * the same mechanical, disclosed posture as rankPriorCandidates. Zero matches
 * returns [] — an unrelated question borrows no archon's authority.
 */
export function matchArchons(text, { stem = defaultStem } = {}) {
  const s = String(text ?? "");
  const words = new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .map((w) => stem(w))
      .filter((w) => w.length > 2),
  );
  const hits = [];
  for (const a of ARCHONS) {
    const top = (a.topics ?? []).map((t) => stem(t));
    let overlap = 0;
    for (const t of top) if (words.has(t) || s.toLowerCase().includes(t)) overlap++;
    if (overlap) hits.push({ handle: a.handle, name: a.name, organ: a.organ, role: a.role, pdStatus: a.pdStatus, work: a.work, source: a.source, credit: a.credit, relevance: overlap });
  }
  hits.sort((x, y) => y.relevance - x.relevance);
  return hits;
}

function defaultStem(w) {
  return String(w ?? "")
    .replace(/['’]s$/, "")
    .replace(/^(un|in|non|re)-?/, "");
}

export const ARCHON_COMPENDIUM = {
  schema: ARCHON_COMPENDIUM_SCHEMA,
  giver: ARCHON_COMPENDIUM_GIVER,
  count: ARCHONS.length,
  rule: "always credited in a response",
};