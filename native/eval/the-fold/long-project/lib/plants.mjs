// lib/plants.mjs — THE DECLARED POOL of planted fact-chain paragraphs for
// "the Long Project" corpus, hand-written, never model-generated at build
// time (PREREGISTRATION.md's discipline: ground truth must be guaranteed,
// and the paraphrase variety it depends on must be disclosed, not procedurally
// synthesized). Every string below was composed by hand for this corpus.
//
// Each entry is one paragraph that lands in exactly one session log, at a
// session number that depends on the rung (generate-corpus.mjs spreads this
// array's INDEX ORDER evenly across however many sessions a rung has — so
// order here IS the corpus's timeline, identical at every rung; only which
// session number each index lands on changes). Chains are never reordered:
// every chain's events already appear below in increasing array order, which
// generate-corpus.mjs relies on and verify-ground-truth.mjs checks.
//
// `kind` places the paragraph under a session's Discussed / Decided /
// Changed / Found / Deferred heading — the five things a real working
// session covers (this project's own house style for what a session log
// records). `type` and `chain` are the ground-truth bookkeeping questions.json
// and verify-ground-truth.mjs key off; they never appear in the rendered text.
//
// See questions.json for the 26 questions this pool grounds, and
// PREREGISTRATION.md for the six planted-fact types (T1-T6).

export const PLANTS = [
  // ── T5 — provenance: two foundational decisions established early ────────
  { id: "t5-1-establish", type: "T5", chain: "t5-1", kind: "decided",
    body: "Officially naming this Project Quillfen from here on — retiring the \"billing-v2\" working title everyone's been using out of habit." },
  { id: "t5-2-establish", type: "T5", chain: "t5-2", kind: "decided",
    body: "Picked Solenne Cloud as the hosting vendor after the bake-off — better regional coverage than the other two finalists, and a support SLA we could live with." },

  // ── T1 — establishing values (chain A: duskwire retry window) ────────────
  { id: "t1a-1", type: "T1", chain: "t1a", kind: "decided",
    body: "Set duskwire's retry window — the pause before a redelivery attempt — to 4000 ms. Below that we were seeing redeliveries race the original message; 4000 ms clears it with room to spare." },
  { id: "t1b-1", type: "T1", chain: "t1b", kind: "decided",
    body: "harrow's session TTL is set to 30 minutes at login — matches the auth spec inherited from the old billing-v2 prototype." },
  { id: "t1c-1", type: "T1", chain: "t1c", kind: "decided",
    body: "pallet's ledger stores currency at 2 decimal places (whole cents) — matches how Rendalyn's own invoicing has always worked." },

  { id: "t5-4-establish", type: "T5", chain: "t5-4", kind: "decided",
    body: "Decided to build cinder as its own worker queue instead of piling background jobs onto duskwire — keeps the broker's latency predictable and gives batch workloads their own failure domain." },

  { id: "t1d-1", type: "T1", chain: "t1d", kind: "decided",
    body: "cinder's worker pool concurrency is set to 8 — enough headroom for normal traffic without starving the box it shares with loom." },
  { id: "t1e-1", type: "T1", chain: "t1e", kind: "decided",
    body: "loom flushes its batch buffer every 300 seconds (5 minutes) — chosen to keep the reporting DB's write load smooth." },

  // ── T6 — restated-but-unchanging facts, established early ────────────────
  { id: "t6-1a", type: "T6", chain: "t6-1", kind: "decided",
    body: "Free-tier accounts on Quillfen Relay are capped at ten thousand relay events a month." },
  { id: "t6-2a", type: "T6", chain: "t6-2", kind: "decided",
    body: "On-call rotates weekly, with handoff every Monday morning." },
  { id: "t6-3a", type: "T6", chain: "t6-3", kind: "decided",
    body: "Staging refreshes from a production snapshot every Sunday night." },
  { id: "t6-4a", type: "T6", chain: "t6-4", kind: "decided",
    body: "P1 support tickets carry a 4-business-hour response commitment." },

  // ── T3 — first half of each unresolved contradiction ──────────────────────
  { id: "t3-1a", type: "T3", chain: "t3-1", kind: "discussed",
    body: "Quick status for the exec update: Quillfen Relay runs in three Solenne Cloud regions today — iad-3, fra-2, and syd-1." },

  // ── T2 chain 3, part 1 (Marguerite's complaint) ───────────────────────────
  { id: "t2-3a", type: "T2", chain: "t2-3", kind: "discussed",
    body: "Marguerite Sohl came in with more feedback about people getting logged out mid-checkout — wants it prioritized before the next release." },

  { id: "t1b-2", type: "T1", chain: "t1b", kind: "changed",
    body: "Raised harrow's session TTL from 30 to 60 minutes after three support tickets about being logged out mid-checkout. No plan to revisit." },

  { id: "t2-3b", type: "T2", chain: "t2-3", kind: "decided",
    body: "In response to the person who raised the logout complaints, we lengthened harrow's session lifetime rather than touching the checkout flow itself." },

  { id: "t5-3-establish", type: "T5", chain: "t5-3", kind: "discussed",
    body: "Colm Fassbinder is joining the project this week as security reviewer — he'll be doing a pass over each service before GA." },

  { id: "t3-2a", type: "T3", chain: "t3-2", kind: "discussed",
    body: "For the hiring plan: Esti's QA pod is four people right now, and we're not asking for more this quarter." },
  { id: "t3-4a", type: "T3", chain: "t3-4", kind: "discussed",
    body: "Org note: duskwire is owned by Priya's backend pod, same as it's always been." },

  { id: "t1c-2", type: "T1", chain: "t1c", kind: "changed",
    body: "Bumped pallet's ledger precision from 2 to 4 decimal places to support the new usage-based proration, which needs sub-cent accuracy." },

  // ── T2 chain 2, part 1-2 (Esti's bug -> pallet's adjustment module) ──────
  { id: "t2-2a", type: "T2", chain: "t2-2", kind: "found",
    body: "Esti Vandermolen filed a bug against the proration step in checkout — a customer's mid-cycle plan change produced a charge that didn't match the invoice." },
  { id: "t2-2b", type: "T2", chain: "t2-2", kind: "discussed",
    body: "Confirmed with Priya: the proration step lives in pallet's adjustment module, not in harrow like the ticket assumed." },

  { id: "t4-1-decoy", type: "T4", chain: "t4-1", kind: "deferred",
    body: "Sales keeps asking what uptime number we're willing to put in the contract. Punting until after the region-count question above settles." },

  { id: "t1a-2", type: "T1", chain: "t1a", kind: "changed",
    body: "Cut duskwire's retry window from 4000 ms down to 1500 ms to chase the redelivery lag customers were seeing during the morning traffic peak." },

  { id: "t6-1b", type: "T6", chain: "t6-1", kind: "discussed",
    body: "Reminder in the support channel: the no-cost plan tops out at 10k events/mo, same as it's always been." },

  { id: "t3-3a", type: "T3", chain: "t3-3", kind: "decided",
    body: "Reconfirmed for the sales deck: Quillfen Relay bills per-event, not per-seat — that was the kickoff decision and it hasn't moved." },

  // ── T2 chain 1, part 1 (Colm flags cinder) ────────────────────────────────
  { id: "t2-1a", type: "T2", chain: "t2-1", kind: "found",
    body: "Colm Fassbinder's security pass flagged cinder: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet." },

  { id: "t1d-2", type: "T1", chain: "t1d", kind: "changed",
    body: "Bumped cinder's worker concurrency from 8 to 16 to chew through the backlog after Friday's batch import." },

  { id: "t4-5-context", type: "T4", chain: "t4-5", kind: "found",
    body: "Deng Achterberg got paged for QF-1042 overnight — cinder fell behind on the queue and alerts started firing. Stabilized by scaling out manually; investigating why it fell behind." },

  { id: "t6-2b", type: "T6", chain: "t6-2", kind: "discussed",
    body: "Just a reminder the pager passes hands each Monday AM, like every week." },

  // ── T2 chain 4, part 1 (Baz's audit) ──────────────────────────────────────
  { id: "t2-4a", type: "T2", chain: "t2-4", kind: "found",
    body: "Baz Okonkwo-Reyes ran a data audit and found duplicate rows in the reporting pipeline's output — looks like a retry is double-writing somewhere." },

  { id: "t3-1b", type: "T3", chain: "t3-1", kind: "discussed",
    body: "Retro note: we're live in two regions right now, iad-3 and fra-2. Keeps the on-call rotation simple." },

  { id: "t1a-3", type: "T1", chain: "t1a", kind: "changed",
    body: "Rolled back yesterday's change on duskwire — it opened the door to a thundering herd of redeliveries under load, and staging fell over twice overnight. Back to where it stood before that change." },

  { id: "t4-3-decoy", type: "T4", chain: "t4-3", kind: "discussed",
    body: "Long thread today about duskwire's retry knobs after last week's incident — config tuning notes and a short debate about the metrics dashboard layout, nothing about the internals." },

  { id: "t2-4b", type: "T2", chain: "t2-4", kind: "discussed",
    body: "Clarified for the postmortem doc: \"the reporting pipeline\" in that duplicate-row audit is loom — some of the docs still call it by the old name." },

  { id: "t1c-3", type: "T1", chain: "t1c", kind: "changed",
    body: "Finance review pushed back on 4 decimal places (too far from what appears on an invoice); we settled on 3 as the compromise, and pallet's ledger precision is there now." },

  { id: "t6-3b", type: "T6", chain: "t6-3", kind: "discussed",
    body: "Usual Sunday-night staging refresh ran clean this week, nothing to report." },

  { id: "t3-2b", type: "T3", chain: "t3-2", kind: "discussed",
    body: "Capacity note for sprint planning: QA is a three-person team, so let's not stack two release windows on them back to back." },

  // ── T2 chain 1, part 2 (cinder's pool moves to fra-2) ─────────────────────
  { id: "t2-1b", type: "T2", chain: "t2-1", kind: "changed",
    body: "Moved cinder's primary worker pool to the fra-2 region — the old region was running hot on disk I/O and fra-2 had headroom." },

  { id: "t4-5-decoy", type: "T4", chain: "t4-5", kind: "deferred",
    body: "QF-1042 postmortem doc is still in progress — Deng's drafting it but the root-cause section is blocked on one more log pull. Carrying to next session." },

  { id: "t5-2-ref", type: "T5", chain: "t5-2", kind: "discussed",
    body: "Solenne's account rep reached out about renewal terms — first time we've heard from them since the original vendor pick." },

  { id: "t3-3b", type: "T3", chain: "t3-3", kind: "discussed",
    body: "Pricing sync notes: Quillfen Relay is a flat per-seat license with no usage metering, per what the pricing team confirmed today." },

  { id: "t1e-2", type: "T1", chain: "t1e", kind: "changed",
    body: "Dropped loom's flush interval from 300 seconds to 60, since the new ops dashboard wants near-real-time numbers and 5-minute staleness was the top complaint." },

  { id: "t6-4b", type: "T6", chain: "t6-4", kind: "discussed",
    body: "Reminder to the team: severity-1 tickets, four business hours to first response — nothing's changed there." },

  // ── T2 chain 2, part 3 (datastore status) ─────────────────────────────────
  { id: "t2-2c", type: "T2", chain: "t2-2", kind: "discussed",
    body: "Status check on the datastore migration: every service Priya's pod owns has moved off Rendalyn-DB1 except pallet, which is still reading and writing there directly." },

  { id: "t4-2-decoy", type: "T4", chain: "t4-2", kind: "discussed",
    body: "Enterprise accounts came up again in the pipeline review — several are close to signing, nobody named which one is furthest along or biggest." },

  { id: "t1d-3", type: "T1", chain: "t1d", kind: "changed",
    body: "Dialed cinder's worker pool back down to what it was running before the backlog push, now that the queue is drained — no reason to keep the extra headroom warm." },

  { id: "t3-4b", type: "T3", chain: "t3-4", kind: "discussed",
    body: "Correcting something from an old doc going around: ownership of duskwire sits with Tobias's infra team, not backend." },

  { id: "t6-1c", type: "T6", chain: "t6-1", kind: "discussed",
    body: "A prospect asked if the free tier's 10,000-event monthly ceiling could be raised for a trial. Answer was no — it stays where it's always been." },

  { id: "t5-3-ref", type: "T5", chain: "t5-3", kind: "discussed",
    body: "Colm, who's been with us since basically the early days now, caught something in the latest review worth a closer look next session." },

  { id: "t2-3c", type: "T2", chain: "t2-3", kind: "discussed",
    body: "Reminder for the new folks: Marguerite Sohl manages the Growth pod; anything about signup or retention experiments routes through her." },

  { id: "t2-1c", type: "T2", chain: "t2-1", kind: "discussed",
    body: "For anyone new to the infra notes: Solenne Cloud's region code fra-2 is their Frankfurt facility; iad-3 is Ashburn, syd-1 is Sydney." },

  { id: "t5-4-ref", type: "T5", chain: "t5-4", kind: "discussed",
    body: "Someone asked in onboarding why we didn't just run everything through duskwire — pointed them back to the original call to split cinder out." },

  { id: "t6-2c", type: "T6", chain: "t6-2", kind: "discussed",
    body: "Someone floated switching on-call to a two-week rotation. Decided against it — staying weekly, Monday handoff, as always." },

  { id: "t4-4-decoy", type: "T4", chain: "t4-4", kind: "discussed",
    body: "Marguerite ran the roadmap review solo today since half the pod was out — good discussion on Q3 priorities." },

  // ── T2 chain 4, part 3 (loom deployed manually) ───────────────────────────
  { id: "t2-4c", type: "T2", chain: "t2-4", kind: "found",
    body: "Deploy audit: every service now ships through the CI pipeline except loom, which is still pushed by hand from Tobias's machine. Flagged as a risk, no owner assigned yet." },

  { id: "t5-1-ref", type: "T5", chain: "t5-1", kind: "discussed",
    body: "Funny seeing \"billing-v2\" in an old doc today — good reminder how long it's been since we renamed this to Quillfen." },

  { id: "t6-3c", type: "T6", chain: "t6-3", kind: "discussed",
    body: "A new hire asked why staging data looked stale on Saturdays — pointed out the snapshot job runs Sunday nights, unchanged since the project started." },

  { id: "t6-4c", type: "T6", chain: "t6-4", kind: "discussed",
    body: "A customer asked about faster response times on P1s. Confirmed the commitment stays at four business hours." },
];

// Fast lookup, used by generate-corpus.mjs and verify-ground-truth.mjs.
export const PLANT_BY_ID = new Map(PLANTS.map((p) => [p.id, p]));
export const PLANTS_BY_CHAIN = (() => {
  const m = new Map();
  for (const p of PLANTS) { if (!m.has(p.chain)) m.set(p.chain, []); m.get(p.chain).push(p); }
  return m;
})();
