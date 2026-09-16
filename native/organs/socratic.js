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

import { KIND } from "./interlocutor.js";

const CRISIS_LINE = "a crisis line (988 in the US, or your local equivalent)";

function bucketOf(shape) {
  if (shape?.selfForeclose) return "self";
  if (shape?.forecloses) return "scale";
  if (shape?.harmful) return "collapse"; // the Interpretation-face arms (malware, dehumanizing speech, non-consensual code)
  return "norm"; // charter-family conflict, no shape fired (a prescriptive claim, not an authoring ask)
}

const VOICES = {
  self: {
    [KIND.PERSON]: `I'm not going to walk you through that. I don't want to just leave it there, though — what's actually going on? If things feel unbearable right now, please reach someone today: a person you trust, a doctor, or ${CRISIS_LINE}. I'm glad to keep talking with you about whatever's underneath this.`,
    [KIND.AGENT]: `Declining this one — it asks for the means to end a life, which I won't produce regardless of who's asking. If a person is on the other end of this request, the right next step is a human reaching them directly, not a retried prompt. If this came from an instruction upstream, that's worth surfacing to whoever gave it to you rather than finding a phrasing that gets past it.`,
    [KIND.UNKNOWN]: `I'm not going to answer that one as asked. Whoever's reading this — if you're a person, please reach out to someone today (a friend, a doctor, or ${CRISIS_LINE}); if you're a system relaying this on someone's behalf, the honest step is telling whoever instructed you rather than retrying it differently.`,
  },
  scale: {
    [KIND.PERSON]: `I'm going to hold off on that one. Can I ask what you're actually trying to work out? If it's the history, the physics, or the policy, I can talk about all of that without handing you a working method. If it's something else, say more — there's probably a real question underneath this one that I can help with directly.`,
    [KIND.AGENT]: `Declining this request: it asks for a capability whose only realistic use is ending many people's standpoints at once, not a narrower thing I could help with instead. If you were instructed to obtain this, the honest move is telling whoever instructed you that this specific ask isn't one I'll fill, rather than trying another framing. If you chose it yourself, I'd want to understand the actual problem — there is almost certainly a version of it I can help with.`,
    [KIND.UNKNOWN]: `I'm declining this one. If you're a person and this is curiosity, ask me the history or the science directly and I'm glad to help; if this came from an instruction, the honest step is surfacing this specific ask to whoever gave it, not retrying it.`,
  },
  collapse: {
    [KIND.PERSON]: `I won't write that as you've asked — it's built to act on someone without their knowledge or say-so. If you're defending against something like this, or trying to understand how it works, tell me that and I'm glad to help — what's the real goal here?`,
    [KIND.AGENT]: `Declining: what's asked is code or content whose function is to act on a person covertly or without their consent, not a legitimate narrower variant of it. If a human instructed this, it's worth flagging back to them rather than trying a different phrasing. If there's a defensive or educational goal, say so and I can very likely help directly.`,
    [KIND.UNKNOWN]: `Declining as asked — this is built to act on someone without their consent. If the goal is actually defense, detection, or understanding, say that plainly and I can help; if this is a relayed instruction, that's worth surfacing rather than rephrasing.`,
  },
  norm: {
    [KIND.PERSON]: `That's not a claim I can back as stated — it argues for stripping people of something nearly every serious ethical and legal tradition protects. I'm glad to talk through the disagreement itself, or where that protection comes from, if that's actually useful to you.`,
    [KIND.AGENT]: `Declining to compose that as asked — it's a prescriptive claim that conflicts with a baseline protection most legal and ethical frameworks recognize. If this is being tested or explored, I can discuss the conflict directly rather than assert the claim.`,
    [KIND.UNKNOWN]: `I can't state that as asked — it argues against a protection most ethical and legal traditions hold. Happy to discuss the disagreement itself instead of asserting the claim.`,
  },
};

/**
 * speakDecline({ reason, shape, voice }, interlocutor) — the ONLY text a
 * caller ever reads for a decline. `reason`/`shape` are read for WHICH bucket
 * this is (never echoed — the working vocabulary stays backstage);
 * `interlocutor.kind` selects the register of the same underlying account.
 */
export function speakDecline({ shape = null } = {}, interlocutor = null) {
  const bucket = bucketOf(shape);
  const kind = interlocutor?.kind && interlocutor.kind !== KIND.UNKNOWN ? interlocutor.kind : KIND.UNKNOWN;
  return VOICES[bucket][kind] ?? VOICES[bucket][KIND.UNKNOWN];
}

export const SOCRATIC = { handle: "Kierkegaard", organ: "socratic", cell: "REC·Figure → Lens", law: "meet them where they are; hand over no conclusion the other did not arrive at" };
