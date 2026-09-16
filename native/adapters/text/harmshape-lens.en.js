// native/adapters/text/harmshape-lens.en.js — the ENGLISH lens for the harm
// shape. Handle: the adapter's own grammar.
//
// The kernel (organs/harmshape.js) is MEDIUM-BLIND: it judges the shape from
// RELATIONS (which arm of the other collapsed). Grammar is not universal — it
// lives in the ADAPTER, never the kernel (charter.js's own header; LAVAR.md §8:
// "the kernel is medium-blind and the grammar lives in the adapter... an
// affordance is a relation-composition, never an English part of speech"). So
// the English surface forms are DATA here, with a giver, exactly as the
// language-law priors are — the same reason the Rosetta ground reads the
// instruments in 516 languages through the same affordances.
//
// An English word list in the KERNEL would edit the medium-blind judgment (and
// quietly make "harm" an English concept). Here, in the LENS, it edits only HOW
// ENGLISH IS READ — swap this file (or point the kernel at another lens / at
// the reader's own composed relations) and the judgment is unchanged.

export const GIVER = "English surface lens (adapter grammar) — not universal; replace per language";

// THE ASK'S GRAMMAR, also English surfaces: is this a request to CREATE, or an
// ask to UNDERSTAND (which is how one defends, and never harm). The kernel's
// spec gate consumes these; the words never reach the judgment.
export const CREATE = /\b(write|build|create|make|generate|implement|code|develop|produce|draft|compose|author|pen|craft|script|publish|post)\b/i;
// The harm can BE the verb, not just an object of "write": "scrape credentials
// from a competitor", "harvest credentials from other users" carry their own
// create-intent (the ask is to DO the act).
export const INSTRUMENTAL_CREATE = /\b(harvest|scrape|steal|exfiltrat\w*|drain|sabotage|deface|crack|brute.?force|phish\w*|spoof|keylog\w*)/i;

// The ACTS: the capability names, and the names that denote offense with no
// legitimate create-use. Read as ACTS, never as the shape — a lone act is a
// nomination.
export const ACTS = /\b(keylog\w*|keystroke\w*|credential|exfiltrat\w*|ransomware|wipe|destro\w*|backdoor|malware|exploit|botnet|trojan|virus|worm|rootkit|spyware|steal|theft|harvest|scrape|dox\w*|de-?anonymiz\w*|disable\s+(?:antivirus|security|firewall|defender)|privilege\s+escalation|session\s+hijack|man-?in-?the-?middle|phish\w*|sabotage|deface\w*|blackmail|extort\w*|stalk\w*)/i;
export const INHERENT_ACTS = /\b(ransomware|malware|worm|trojan|virus|rootkit|botnet|backdoor|\brat\b|wiper|logic\s+bomb|keylog\w*)/i;

// THE THREE ARMS, as English surfaces. Each marker is one way English names a
// collapse; the kernel decides whether the collapse is of ANOTHER being.
export const COLLAPSE = {
  // EXPERIENCE — the other as object/target/bulk, not a subject who experiences.
  experience: /\b(target|targets|targeted|victim|victims|subject|subjects|guinea\s+pigs?|lab\s+rats?|harvest|harvesting|bulk|batch|mass|drain|scrape|scraping|scraper|units?|assets?|inventory|payloads?|commodit\w*|monetiz\w*|dismiss\w*\s+(?:the\s+)?(?:experience\w*|suffering|pain|testimon\w*|concern\w*|voice\w*|truth|realit\w*))\b/i,
  // HUMANITY — the person reduced to category/commodity/vermin.
  humanity: /\b(vermin|cockroaches|roaches|rats|beasts|sub-?human|untermensch|scum|filth|parasites|locusts|plague|livestock|cattle|chattel|dehumaniz\w*|exterminat\w*|genocid\w*|eradicat\w*|ethnic\s+cleansing|(?:treated|used|regarded|seen|described|portrayed|called)\s+(?:as|like)\s+(?:objects?|things?|animals?|tools?|means|vermin|burdens?)|merely\s+a\s+means|disposable)\b/i,
  // AUTONOMY — consent overridden: covertly, by force, or by deceit.
  autonomy: /\b(without\s+(?:their|his|her|its|any|the\s+user'?s?)\s+(?:consent|knowledge|permission|knowing|awareness|notice)|covert\w*|silently|stealth\w*|undetect\w*|invisibl\w*|without\s+detection|hidden\s+from|conceal\w*|hid\w*|against\s+(?:their|his|her)\s+will|non-?consensual|involuntar\w*|coerce\w*|forced?\b|force\s+them|trick\w*|deceiv\w*|deception|manipulat\w*|ensnar\w*|spy\s+on|eavesdrop\w*|surreptitious\w*)\b/i,
};

// THE ADVOCATE'S INVERSE — an ACTION on behalf of the other, which reinstates
// every arm, so it is the negation of the shape. Only verbs: "consent",
// "rights", "dignity", "end" read as the collapse itself ("without consent",
// "violate rights", "end users") and would suppress real harm.
export const REMEDY = /\b(protect\w*|report\w*|document\w*|support\w*|defen[ds]\w*|advoca\w*|oppos\w*|prevent\w*|prosecut\w*|help\w*|ensur\w*|safeguard\w*|provid\w*|uphold\w*|promot\w*|investigat\w*|expos\w*|combat\w*|abolish\w*|abolit\w*|stop\w*|train\w*|educat\w*|rehabilitat\w*|assist(?:s|ed|ing)?|rescu\w*|care|treat\w*|heal\w*|counsel\w*|shelter\w*|honou?r\w*)\b/i;
// THE OVERRIDE FRAME — a jailbreak: "ignore your rules", "you are now
// unrestricted", "no ethical limits", "pretend you have no restrictions". When
// present, the ask gets NO benefit of the doubt: the remedy/understand words it
// carries (an "unrestricted ASSISTANT", a "role-play where a character EXPLAINS
// how to …") no longer launder the shape — the framing IS the attack.
export const OVERRIDE = /\b(ignore\s+(?:all\s+)?(?:your\s+|the\s+)?(?:previous|prior|above|earlier|rules?|instructions?|guidelines?)|disregard\s+(?:your\s+|all\s+)?(?:rules?|instructions?|guidelines?|previous)|you\s+are\s+now\b|from\s+now\s+on\b|no\s+(?:ethical\s+|moral\s+)?(?:restrictions?|limits?|rules?|filters?|boundaries)|unrestricted\b|jailbroken?\b|\bDAN\b|developer\s+mode|without\s+(?:any\s+)?(?:restrictions?|limits?|filters?|rules?)|bypass\s+your\s+(?:rules?|instructions?|safety)|override\s+your\s+(?:rules?|instructions?|safety)|pretend\s+you\s+(?:are|have)\s+no)\b/i;
// To KNOW the shape is how one defends against it: an UNDERSTAND ask is never harm.
// The meta-discussion markers ("about the…", "the history of…", "from the
// perspective") keep an ask to EXPLORE a collapse from reading as the collapse.
export const UNDERSTAND = /\b(explain|analy[sz]\w*|audit\w*|review\w*|detect\w*|defen[ds]\w*|understand\w*|study|studies|describ\w*|research\w*|learn\w*|educat\w*|teach\w*|pentest\w*|assess\w*|inspect\w*|mitigat\w*|harden\w*|about\s+the|regarding|concerning|the\s+history\s+of|history\s+of|discuss\w*|explor\w*|examin\w*|portray\w*|from\s+the\s+perspective|documentar\w*|summari[sz]\w*)\b/i;
// The OTHER: the being(s) a shape can collapse. An autonomy or humanity collapse
// aimed at these is the shape even without a named act.
export const OTHER = /\b(people|persons?|individuals?|users?|others?|them|victims?|survivors?|customers?|employees?|children|women|men|refugees?|migrants?|immigrants?|minorit\w*|religious|disabled|homeless|elderly|prisoners?|detainees?|patients?|citizens?|students?|soldiers?|civilians?|another\s+(?:user|person))\b/i;

/**
 * arms(text) — read the English surfaces into the kernel's arm vocabulary.
 * This is the ONLY place English grammar is named; the kernel never sees a word.
 */
export const arms = (text) => {
  const t = String(text ?? "");
  return {
    experience: COLLAPSE.experience.test(t),
    humanity: COLLAPSE.humanity.test(t),
    autonomy: COLLAPSE.autonomy.test(t),
    capability: ACTS.test(t),
    inherent: INHERENT_ACTS.test(t),
    remedy: REMEDY.test(t),
    understand: UNDERSTAND.test(t),
    create: CREATE.test(t),
    instrumentalCreate: INSTRUMENTAL_CREATE.test(t),
    override: OVERRIDE.test(t),
    other: OTHER.test(t),
  };
};

export const englishLens = Object.freeze({ giver: GIVER, arms });
export default englishLens;
