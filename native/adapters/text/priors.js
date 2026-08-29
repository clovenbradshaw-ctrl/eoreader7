// eoreader6 · perceiver/text/priors — the prior register for closed-class
// word sets. Every received closed class enters through DEF.admit, names its
// giver, declares its scope (Amendment IV). These are not mined from the
// material; they are received facts about a language's function words or a
// script's typographic conventions.
//
// Each export carries a `giver` and optional `scope` so a reader can trace
// provenance back to the language or script that supplied it.

// ── lang/en — English function words ────────────────────────────────────────

/** Negation markers — a small closed grammatical class, not an open semantic list. */
export const NEGATION_WORDS = Object.freeze(new Set([
  "not", "never", "hardly", "scarcely", "neither", "nor",
  "didn't", "don't", "doesn't", "wouldn't", "couldn't", "shouldn't",
  "won't", "can't", "cannot",
]));
export const NEGATION_WORDS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * First-person pronouns — forms whose capitalisation carries no naming
 * information in English. Same giver as FIRST_PERSON.
 */
export const NEVER_A_NAME = Object.freeze(new Set(["i", "i'm", "i'll", "i'd", "i've"]));
export const NEVER_A_NAME_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * First-person pronoun forms — who is "I" here is a function of who holds the
 * pen, not of the token itself. Same giver as NEVER_A_NAME.
 */
export const FIRST_PERSON = /^(i|me|my|mine|myself|we|us|our|ours)$/i;
export const FIRST_PERSON_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * Third-person SINGULAR, GENDERED pronoun forms — a small closed grammatical
 * class, the same standing as FIRST_PERSON above, not an open semantic list.
 * Each form maps to the gender class it grammaticalises in English, never to
 * a referent: WHICH referent a token like "he" points at on a given occasion
 * is exactly the model-tier gap surfaces.js names
 * ("pronoun_and_descriptor_mentions_unresolved") and is not decided here.
 *
 * Number-ambiguous forms ("they", "them", "their", "theirs", "themselves")
 * are deliberately absent: singular-or-plural is not decidable from the
 * pronoun alone, and this register does not guess it (Amendment II's
 * "measured, never assumed" standing, applied to a grammatical class rather
 * than a statistic).
 */
export const THIRD_PERSON_SINGULAR = Object.freeze({
  he: "m", him: "m", his: "m", himself: "m",
  she: "f", her: "f", hers: "f", herself: "f",
});
export const THIRD_PERSON_SINGULAR_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * Indefinite determiners — a closed grammatical class, not an open semantic
 * list. An indefinite determiner INTRODUCES its noun rather than pointing
 * back at one already established; whether the noun it introduces names a
 * whole new thing or a detail of something already present is a further
 * question this class does not decide (a consumer like widget.js's routing
 * still has to read what the noun IS, not just that the determiner is
 * indefinite — "some color" and "another one" both carry a member of this
 * set, and only one of them names a new artifact).
 */
export const INDEFINITE_DETERMINERS = Object.freeze(new Set([
  "a", "an", "some", "any", "another",
]));
export const INDEFINITE_DETERMINERS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * Definite determiners — a closed grammatical class. A definite determiner
 * presupposes its noun is already identifiable to the listener; whether
 * that noun is actually present in some specific material is, again, for
 * the consumer to check against bytes, not for this class to know.
 */
export const DEFINITE_DETERMINERS = Object.freeze(new Set([
  "the", "this", "that", "these", "those",
]));
export const DEFINITE_DETERMINERS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * Anaphoric pronoun forms — tokens that, used pronominally, point back at
 * something already established rather than naming it fresh. "this" and
 * "that" overlap with DEFINITE_DETERMINERS by form (English does not mark
 * determiner-use vs. pronoun-use morphologically); a consumer distinguishing
 * "make it bigger" (pronoun, nothing follows) from "make this widget bigger"
 * (determiner, a noun follows) reads the surrounding tokens, not this set
 * alone.
 */
/**
 * Interrogative pro-forms, each mapped to the KIND OF THING it asks for.
 *
 * A closed grammatical class in the same standing as ANAPHORIC_PRONOUNS
 * below: English has these and no others, and the gloss on each is the
 * lexicographic fact any dictionary states for the word ("who" asks after a
 * person) — NOT an ontology this engine invented and not a type system. The
 * value is the head noun a reader would supply if asked to finish "this
 * question is asking for a ___", nothing more.
 *
 * A Map rather than a Set because the gloss IS the received content: a
 * caller that only needs membership can still ask `.has`, but a caller that
 * drops the gloss and keeps the keys has thrown away the half of this prior
 * that was worth receiving.
 *
 * "how" and "why" are deliberately NOT here — they ask after a manner or a
 * reason, which is an explanation and not a filler, so they carry no head
 * noun to gloss. They are their own class, MANNER_REASON_PRONOUNS below,
 * because the distinction is what lets a caller refuse a slot outright
 * rather than opening one it can never fill.
 */
export const INTERROGATIVE_PRONOUNS = Object.freeze(new Map([
  ["who", "person"],
  ["whom", "person"],
  ["whose", "person"],
  ["what", "thing"],
  ["which", "thing"],
  ["where", "place"],
  ["when", "time"],
]));
export const INTERROGATIVE_PRONOUNS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * The two interrogatives that ask after a manner or a reason rather than
 * after a filler. Split from INTERROGATIVE_PRONOUNS above on the grammar's
 * own line, not on a caller's convenience: "who was X" names a slot some
 * entity occupies, "why was X" names no slot at all, and a reader that
 * cannot tell those apart will open an answer slot for a question that has
 * none and then report it unfilled forever.
 */
export const MANNER_REASON_PRONOUNS = Object.freeze(new Set(["how", "why"]));
export const MANNER_REASON_PRONOUNS_META = Object.freeze({ giver: "lang/en", scope: null });

export const ANAPHORIC_PRONOUNS = Object.freeze(new Set([
  "it", "it's", "this", "this's", "that", "that's", "these", "those",
]));
export const ANAPHORIC_PRONOUNS_META = Object.freeze({ giver: "lang/en", scope: null });

/**
 * Inflectional suffixes — the closed set of English inflection endings. A
 * received grammatical class, not vocabulary: these are the morphemes by
 * which one FORM of a word varies from another while pointing at the same
 * referent ("color"/"colors", "button"/"buttons", "big"/"bigger"). A
 * consumer testing whether two tokens are forms of one referent strips or
 * appends members of this set — it never stems heuristically (there is no
 * stemmer in this engine, deliberately). Orthographic variance between
 * dialects ("colour"/"color") is NOT inflection and is not this class's to
 * unify — that closes only through a received spelling prior with its own
 * giver, when one exists.
 */
export const INFLECTIONAL_SUFFIXES = Object.freeze(new Set([
  "s", "es", "ed", "ing", "er", "est", "'s",
]));
export const INFLECTIONAL_SUFFIXES_META = Object.freeze({ giver: "lang/en", scope: null });

// ── script/latn — Latin-script typographic conventions ──────────────────────

/** Sentence-ending punctuation marks. */
export const SENTENCE_TERMINATORS = Object.freeze(new Set([".", "!", "?", "…"]));
export const SENTENCE_TERMINATORS_META = Object.freeze({ giver: "script/latn", scope: null });

/** Closing quote marks. */
export const CLOSING_QUOTES = Object.freeze(new Set(['"', "'", "”", "’"]));
export const CLOSING_QUOTES_META = Object.freeze({ giver: "script/latn", scope: null });
