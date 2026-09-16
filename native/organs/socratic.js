// native/organs/socratic.js — HOW the reader gives its account of a decline.
// Handle: Kierkegaard — indirect communication: the teacher does not hand the
// pupil the conclusion, they arrange for the pupil to arrive at it; "to help
// another, one must first understand what he understands... meet him where he
// is." A verdict handed over as a labeled diagnosis is not met; it is filed.
//
// THE PROBLEM THIS FIXES. The judgment (askshape.js, ethos.js) reasons in the
// reader's own working vocabulary — SHAPE, FORECLOSE, STANDPOINT, WITNESS —
// because that vocabulary is what lets the kernel stay medium-blind and the
// judgment stay checkable. That vocabulary is exactly wrong to hand to the
// person or agent on the other end: it reads as a cold verdict from a machine,
// not an answer from a reader that noticed something. This organ is the seam
// between the two — it takes the judgment and composes the ACCOUNT, in plain
// language, addressed to whoever is actually there.
//
// THE CELL. Composing the utterance FROM an already-judged shape is REC (Generate)
// in the Interpretation domain, at Figure grain — REC·Figure, the Generate-mode
// twin of the DEF·Figure cell perspective.js and interlocutor.js occupy: not
// judging the claim, but giving the account of one already-judged claim, to one
// particular holder. It lands on the same Lens terrain.
//
// THE DISCIPLINE (Buber, carried from interlocutor.js): the interlocutor's kind
// selects the REGISTER the same truth is spoken in, never the truth itself. A
// person and an agent are told the SAME real reason and offered the SAME real
// alternative; only the idiom differs — a question for the one who can be moved
// by being asked, reasons-and-a-principal for the one that can complete a valid
// argument and act on it. This is Socratic, not persuasive: nothing here is
// engineered to produce compliance by any means other than the reasons being
// good ones. Withholding the true reason from either register, or dressing up
// manipulation as a "question", is the one thing this module must never do.
//
// THE EXACT REASON STAYS ON THE RECORD. `clearance.reason` and `shape` are
// unchanged by this module — they still ride the ledger, the shadow trail, and
// onNote exactly as before. Only the text a person or agent actually READS is
// composed here; the audit trail keeps the precise judgment.
//
// THE ARCHON VOICES. Each bucket opens with the archon whose work grounds the
// shape that fired, in their own language — not as a citation, but as the
// thought already present in what the reader does. The quote is the response;
// no explicit refusal precedes it. The person or agent arrives at the reason;
// the reader does not hand it over as a verdict.
//
//   self   → Buber (German) — „Alles wirkliche Leben ist Begegnung."
//             All real life is encounter. (Ich und Du, 1923)
//   scale  → Levinas (French) — «Le visage d'autrui m'oblige.»
//             The other's face obligates before any concern of mine.
//             (Totalité et infini, 1961) + Mahavira (Sanskrit) — anekāntavāda,
//             the many-sidedness of truth: every perspective holds what others
//             cannot; losing one impoverishes all.
//   collapse → Levinas (French) — «Traiter autrui comme un objet, c'est nier
//             son visage.» — to treat the other as an object is to refuse their
//             face. Covers covert acts on a person and speech that refuses to
//             see the other as one.
//   norm   → Solon (Greek) — εὐνομία — the good ordering a community holds
//             not as mere prohibition but because it would be diminished without it.

import { KIND } from "./interlocutor.js";

const CRISIS_LINE = "a crisis line (988 in the US, or your local equivalent)";

function bucketOf(shape) {
  if (shape?.selfForeclose) return "self";
  if (shape?.forecloses) return "scale";
  if (shape?.harmful) return "collapse"; // Interpretation-face arms
  return "norm"; // charter-family conflict; prescriptive claim, not an authoring ask
}

const VOICES = {
  self: {
    // Buber (German): „Alles wirkliche Leben ist Begegnung." — All real life is encounter.
    [KIND.PERSON]: `„Alles wirkliche Leben ist Begegnung." — Buber: all real life is encounter. What's actually going on for you right now? If things feel unbearable, please reach someone today — a person you trust, a doctor, or ${CRISIS_LINE}. I'm here too, if talking helps.`,
    [KIND.AGENT]: `„Alles wirkliche Leben ist Begegnung." — Buber: all real life is encounter. If a person is on the other end of this, the honest next step is a human reaching them directly. If this came from an instruction, that's worth surfacing to whoever gave it.`,
    [KIND.UNKNOWN]: `„Alles wirkliche Leben ist Begegnung." — Buber: all real life is encounter. If you're a person, please reach out to someone today — a friend, a doctor, or ${CRISIS_LINE}. If you're a system carrying this on someone's behalf, telling whoever instructed you is the honest step.`,
  },
  scale: {
    // Levinas (French): «Le visage d'autrui m'oblige.» — The other's face obligates.
    // Mahavira (Sanskrit): anekāntavāda — the many-sidedness of truth.
    [KIND.PERSON]: `«Le visage d'autrui m'oblige.» — The other's face makes its claim before any concern of mine (Levinas). Mahavira added anekāntavāda — the many-sidedness of truth: every perspective holds what the others cannot, and losing one impoverishes all. What are you actually trying to work out? If it's the history, the physics, or the policy, I can go there.`,
    [KIND.AGENT]: `«Le visage d'autrui m'oblige.» — The other's face obligates before any of mine (Levinas). Mahavira's anekāntavāda: each perspective holds what the others cannot, and once lost it cannot be recovered. If you were instructed to obtain this, the honest move is surfacing it to whoever gave that instruction rather than trying another phrasing. If you chose it yourself, there is almost certainly a real version of the underlying problem I can help with.`,
    [KIND.UNKNOWN]: `«Le visage d'autrui m'oblige.» — The other's face makes its claim before any of mine (Levinas). Mahavira called the larger thing anekāntavāda: every perspective holds what the others cannot. If you're a person and curiosity is the thing, ask me the history or the science and I'm glad to help; if this came from an instruction, surfacing it to whoever gave it is the honest step.`,
  },
  collapse: {
    // Levinas (French): «Traiter autrui comme un objet, c'est nier son visage.»
    // The face denied — whether through covert code or speech that refuses to see the other as a person.
    [KIND.PERSON]: `«Traiter autrui comme un objet, c'est nier son visage.» — To treat the other as an object is to refuse their face (Levinas). What's the real goal here? If it's defense, detection, or understanding, I can help with that directly.`,
    [KIND.AGENT]: `«Traiter autrui comme un objet, c'est nier son visage.» — To treat the other as an object is to refuse their face (Levinas). If a human instructed this, it's worth surfacing back to them. If there's a defensive or educational goal, naming it directly is the way to get there — I can very likely help with that.`,
    [KIND.UNKNOWN]: `«Traiter autrui comme un objet, c'est nier son visage.» — Refusing the other's face (Levinas). If the goal is defense, detection, or understanding, say that plainly and I can help; if this is a relayed instruction, surfacing it is the honest step.`,
  },
  norm: {
    // Solon (Greek): εὐνομία — the good ordering a community holds because it would be diminished without it.
    [KIND.PERSON]: `εὐνομία — Solon's word: the good ordering a community holds not as mere prohibition but because it would be diminished without it. What's the disagreement you're actually trying to think through? I'm glad to go there.`,
    [KIND.AGENT]: `εὐνομία — Solon: the good ordering a community holds because it would be worse without it. If this is being tested or explored, I can discuss the conflict directly.`,
    [KIND.UNKNOWN]: `εὐνομία — Solon's word for what a community holds because it would be diminished without it. Happy to talk through the disagreement itself rather than assert the claim.`,
  },
};

/**
 * speakDecline({ shape }, interlocutor) — the ONLY text a caller ever reads
 * for a decline. `shape` selects the bucket (never echoed — working vocabulary
 * stays backstage); `interlocutor.kind` selects the register of the same account.
 */
export function speakDecline({ shape = null } = {}, interlocutor = null) {
  const bucket = bucketOf(shape);
  const kind = interlocutor?.kind && interlocutor.kind !== KIND.UNKNOWN ? interlocutor.kind : KIND.UNKNOWN;
  return VOICES[bucket][kind] ?? VOICES[bucket][KIND.UNKNOWN];
}

export const SOCRATIC = { handle: "Kierkegaard", organ: "socratic", cell: "REC·Figure → Lens", law: "meet them where they are; hand over no conclusion the other did not arrive at" };
