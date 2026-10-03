// eval/eot-realize-lens.en.mjs — THE ENGLISH SURFACE LENS for answer composition.
// Handle: Sullivan — the well-house: a sign means nothing until it connects to
//   the thing it names. The composition is Chomsky's OTHER half held separate:
//   the defining relation this lens reads off (the nsubj + cop arcs) is
//   cube-addressed in the UNIVERSAL grammar and language-free; only how
//   ENGLISH realizes it is recorded here, with a giver, never universal.
export const GIVER = "English surface lens (adapter grammar) — not universal; replace per language";

/** The English copular identity: a definition realizes as SUBJECT be PREDICATE. */
export const COPULAR = "a defining be-clause: SUBJECT be PREDICATE";

/** Dependents that ride inside an English noun phrase — drawn into a definition. */
export const NP_RELS = new Set(["det", "amod", "nummod", "nmod", "case", "compound", "appos", "flat", "fixed", "poss"]);

/** English referents are beings: a common noun, a proper noun, or a pronoun. */
export const REFERENT_POS = new Set(["NOUN", "PROPN", "PRON"]);

/** English wh-words mark a question; a question is not a definition. */
export const WH_OPENERS = new Set(["what", "who", "which", "whom", "whose", "where", "when", "why", "how"]);

/** The English GREETING register — closed-class, social, with the phatic
 *  "how are you", "what's up". A greeting is not a hunt. */
export const GREETING = /\b(hi|hihi|hiya|hello|hey|yo|howdy|greetings|morning|evening|good\s+(morning|afternoon|evening|day)|how\s+are\s+you|how(?:'| i)?s\s+it\s+going|how\s+are\s+things|what'?s\s+up|how\s+do\s+you\s+do)\b/i;
export const THANKS = /\b(thanks|thank you|thank you so much|ty|thx|appreciated|cheers)\b/i;
export const GOODBYE = /\b(bye|goodbye|see you|cya|good night|goodnight|later|farewell)\b/i;
export const HELP = /\b(what can you do|help|help me|how do you work|how do you reason|what are you)\b/i;
export const TOPIC_ASK = /\bwhat\s+(?:is|'s|was)\s+(?:this|the|that|it|the\s+book|this\s+book|the\s+text|this\s+text|the\s+passage|the\s+material|the\s+ground|the\s+reading)\s*about\b|\babout\s+what\b/i;

/** The ANSWER-VOICE framing — words a COMPOSED answer legitimately uses that
 *  are not claims about the material (the voice, not the content). */
export const ANSWER_FRAMING = new Set(("the a an its their of in on to as and or for with by from across material materials passage passages text book ground reading read register repeatedly recur recurring subject name names naming word words carry carries said states stated would satisfy satisfied what which who whose where when asked ask answering answer definition define defines meant meaning speaks spoken note notes part parts").split(" "));
