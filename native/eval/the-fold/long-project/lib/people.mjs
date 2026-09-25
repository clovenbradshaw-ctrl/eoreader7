// lib/people.mjs — THE INVENTED CAST (disclosed, fictitious, checkable against
// no training data): the company, the product, the services, the config keys
// and the people of "the Long Project." Nothing here names a real person,
// company or product. Shared by lib/plants.mjs and lib/distractors.mjs so the
// world stays consistent across every hand-written paragraph.

export const COMPANY = "Rendalyn";                 // the employer; not a "customer"
export const PROJECT_CODENAME = "Quillfen";         // the internal project name
export const PRODUCT_NAME = "Quillfen Relay";       // the shipped product name
export const OLD_WORKING_TITLE = "billing-v2";      // retired working title (T5-1)
export const VENDOR = "Solenne Cloud";              // invented hosting vendor
export const LEGACY_DATASTORE = "Rendalyn-DB1";     // legacy datastore (T2-2)

// Solenne Cloud region codes -> cities. Used by T2-1 (fra-2 -> Frankfurt).
export const REGIONS = { "iad-3": "Ashburn", "fra-2": "Frankfurt", "syd-1": "Sydney" };

// Invented services. Nowhere in this corpus is any of these given an
// implementation language — that silence is T4-3's planted gap.
export const SERVICES = ["duskwire", "harrow", "pallet", "cinder", "loom"];
export const SERVICE_DESC = {
  duskwire: "the message broker/relay at the center of Quillfen Relay",
  harrow: "the auth/session service",
  pallet: "the billing ledger service",
  cinder: "the background worker queue",
  loom: "the reporting/analytics pipeline",
};

// Invented config keys (never real). Referenced by T1's revised-value chains.
export const CONFIG_KEYS = {
  duskwireRetryWindow: "duskwire's retry window",
  harrowSessionTtl: "harrow's session TTL",
  palletPrecision: "pallet's ledger currency precision",
  cinderConcurrency: "cinder's worker pool concurrency",
  loomFlushInterval: "loom's batch flush interval",
};

// The cast. No job titles are ever attached to a name in generated prose —
// that omission is deliberate (T4-4's planted silence: Marguerite Sohl is
// never given a formal title anywhere in the corpus, only actions and, once,
// which pod she manages).
export const PEOPLE = [
  { id: "priya", name: "Priya Oyelaran" },
  { id: "tobias", name: "Tobias Wrenfield" },
  { id: "marguerite", name: "Marguerite Sohl" },
  { id: "deng", name: "Deng Achterberg" },
  { id: "esti", name: "Esti Vandermolen" },
  { id: "baz", name: "Baz Okonkwo-Reyes" },
  { id: "colm", name: "Colm Fassbinder" },
  { id: "nkiru", name: "Nkiru Delacroix-Hume" },
];

export const PEOPLE_NAMES = PEOPLE.map((p) => p.name);
