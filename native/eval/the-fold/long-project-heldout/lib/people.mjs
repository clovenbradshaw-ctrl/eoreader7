// lib/people.mjs — THE INVENTED CAST (disclosed, fictitious, checkable against
// no training data): the company, the product, the services, the config keys
// and the people of "the Emberlink Project" — the held-out benchmark's own
// invented software project, built independently of "the Long Project"
// (long-project/). Nothing here names a real person, company or product, and
// nothing here repeats a name, service or value from long-project's own
// lib/people.mjs. Shared by lib/plants.mjs and lib/distractors.mjs so the
// world stays consistent across every hand-written paragraph.

export const COMPANY = "Thornquist Labs";              // the employer; not a "customer"
export const PROJECT_CODENAME = "Emberlink";            // the internal project name
export const PRODUCT_NAME = "Emberlink Pulse";          // the shipped product name
export const OLD_WORKING_TITLE = "payments-v3";         // retired working title (T5-1)
export const VENDOR = "Brindlemere Cloud";               // invented hosting vendor
export const LEGACY_DATASTORE = "Thornquist-DB0";        // legacy datastore (T2-2)

// Brindlemere Cloud region codes -> cities. Used by T2-1 (dub-1 -> Dublin).
// Four codes exist; T3-1's conflict is over whether the product runs in all
// four or only three of them.
export const REGIONS = { "ord-4": "Chicago", "dub-1": "Dublin", "nrt-2": "Tokyo", "gru-5": "São Paulo" };

// Invented services (six — one more than long-project's five). "trellis" is
// deliberately NOT ambient background: it is added to the project mid-stream
// (T5-4) and is never mentioned anywhere in lib/distractors.mjs, so its own
// two plants (establish + casual later reference) are the only place it
// appears — see lib/plants.mjs's header for why that matters.
export const SERVICES = ["wickham", "bastion", "coffer", "kiln", "beacon", "trellis"];
export const SERVICE_DESC = {
  wickham: "the message broker/relay at the center of Emberlink Pulse",
  bastion: "the auth/session service",
  coffer: "the billing ledger service",
  kiln: "the background worker queue",
  beacon: "the reporting/analytics pipeline",
  trellis: "the notification service, split out of wickham partway through the project (T5-4)",
};

// Invented config keys (never real). Referenced by T1's revised-value chains.
export const CONFIG_KEYS = {
  wickhamRetryWindow: "wickham's retry window",
  bastionSessionTtl: "bastion's session TTL",
  cofferPrecision: "coffer's ledger currency precision",
  kilnConcurrency: "kiln's worker pool concurrency",
  beaconFlushInterval: "beacon's batch flush interval",
};

// The cast (eleven — one more than long-project's eight). No job titles are
// ever attached to a name in generated prose — that omission is deliberate
// (T4-4's planted silence: Marisol Thackeray is never given a formal title
// anywhere in the corpus, only actions and, once, which pod she manages).
//
// "declan" is GATED (T5-3): he joins the project partway through, as the
// incoming security reviewer. He must never appear — in a plant, a
// distractor, or an attendee list — in any session before his own
// establishing plant (t5-3-establish). generate-corpus.mjs enforces the
// attendee-list half of that; lib/distractors.mjs enforces the other half by
// simply never mentioning him; lib/plants.mjs's own array-index order (which
// IS the corpus timeline — see its header) enforces the rest, since every
// other plant that names him sits at a later index than t5-3-establish.
export const PEOPLE = [
  { id: "odalys", name: "Odalys Ferrante" },
  { id: "reece", name: "Reece Nakashima" },
  { id: "ingrid", name: "Ingrid Solberg" },
  { id: "tomasz", name: "Tomasz Widawski" },
  { id: "vela", name: "Vela Kirchner" },
  { id: "sanjay", name: "Sanjay Ruiz-Bekele" },
  { id: "marisol", name: "Marisol Thackeray" },
  { id: "femi", name: "Femi Castellanos" },
  { id: "junko", name: "Junko Albrecht" },
  { id: "declan", name: "Declan Osei-Praveen", gatedBy: "t5-3-establish" },
  { id: "rosalind", name: "Rosalind Machen" },
];

export const PEOPLE_NAMES = PEOPLE.map((p) => p.name);
// Names of every person NOT subject to a T5 introduction gate — eligible as
// an attendee in any session from session 1 onward. generate-corpus.mjs
// additionally admits a gated person once that rung's manifest places their
// gatedBy plant at or before the session being generated.
export const UNGATED_PEOPLE_NAMES = PEOPLE.filter((p) => !p.gatedBy).map((p) => p.name);
