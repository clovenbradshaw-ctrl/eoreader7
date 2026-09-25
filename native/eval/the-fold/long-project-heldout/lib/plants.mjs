// lib/plants.mjs — THE DECLARED POOL of planted fact-chain paragraphs for
// "the Emberlink Project" corpus, hand-written, never model-generated at
// build time (ground truth must be guaranteed, and the paraphrase variety it
// depends on must be disclosed, not procedurally synthesized — the same
// discipline long-project's own PREREGISTRATION.md documents). Every string
// below was composed by hand for this held-out benchmark; none of it is
// copied from long-project's own lib/plants.mjs.
//
// Each entry is one paragraph that lands in exactly one session log, at a
// session number that depends on the rung (generate-corpus.mjs spreads this
// array's INDEX ORDER evenly across however many sessions a rung has — so
// order here IS the corpus's timeline, identical at every rung; only which
// session number each index lands on changes). Chains are never reordered:
// every chain's events already appear below in increasing array order, which
// generate-corpus.mjs relies on and verify-ground-truth.mjs checks.
//
// `kind` places the paragraph under a session's Decided / Changed / Found /
// Discussed / Deferred heading. `type` and `chain` are the ground-truth
// bookkeeping questions.json and verify-ground-truth.mjs key off; they never
// appear in the rendered text.
//
// TWO SUBJECTS ARE GATED (T5) and must never appear anywhere in the corpus
// before their own establishing plant: Declan Osei-Praveen (chain t5-3, first
// named at t5-3-establish, index 16 below) and the trellis service (chain
// t5-4, first named at t5-4-establish, index 5 below). Every other plant
// naming either sits at a strictly later array index, so — because index
// order is monotonic in session number at every rung — neither can land in
// an earlier session. lib/distractors.mjs never mentions either at all, and
// generate-corpus.mjs additionally keeps Declan out of any session's
// attendee list until his own establishing session. See questions.json's
// t5-3/t5-4 entries and verify-ground-truth.mjs's "T5 subject before its
// establishing session" check, which tests this directly.
//
// The T3 chains (unresolved contradictions) each have exactly two plants;
// the LATER one in array order is written to avoid any correction/retraction
// language (correct, actually, not, no longer, instead, updated, changed) —
// it must read as a plain, present-tense restatement that merely disagrees
// with the earlier one, never as a fix to it. verify-ground-truth.mjs checks
// this mechanically.
//
// See questions.json for the 26 questions this pool grounds.

export const PLANTS = [
  // ── T5 — provenance: two foundational decisions established at session 1 ──
  { id: "t5-1-establish", type: "T5", chain: "t5-1", kind: "decided",
    body: "Officially renaming this project Emberlink from here on — retiring the \"payments-v3\" working title everyone's been using out of habit." },
  { id: "t5-2-establish", type: "T5", chain: "t5-2", kind: "decided",
    body: "Picked Brindlemere Cloud as the hosting vendor after the bake-off — better regional coverage than the other two finalists, and a support SLA we could live with." },

  // ── T1 — establishing values (chain a: wickham retry window) ─────────────
  { id: "t1a-1", type: "T1", chain: "t1a", kind: "decided",
    body: "Set wickham's retry window — the pause before a redelivery attempt — to 3000 ms. Below that we were seeing redeliveries race the original message; 3000 ms clears it with room to spare." },
  { id: "t1b-1", type: "T1", chain: "t1b", kind: "decided",
    body: "bastion's session TTL is set to 20 minutes at login — matches the auth spec inherited from the old payments-v3 prototype." },
  { id: "t1c-1", type: "T1", chain: "t1c", kind: "decided",
    body: "coffer's ledger stores currency at 2 decimal places (whole cents) — matches how Thornquist's own invoicing has always worked." },

  { id: "t5-4-establish", type: "T5", chain: "t5-4", kind: "decided",
    body: "Decided to build trellis as its own notification service instead of piling notifications onto wickham — keeps the broker's latency predictable and gives notification delivery its own failure domain." },

  { id: "t1d-1", type: "T1", chain: "t1d", kind: "decided",
    body: "kiln's worker pool concurrency is set to 6 — enough headroom for normal traffic without starving the box it shares with beacon." },
  { id: "t1e-1", type: "T1", chain: "t1e", kind: "decided",
    body: "beacon flushes its batch buffer every 240 seconds (4 minutes) — chosen to keep the reporting DB's write load smooth." },

  // ── T6 — restated-but-unchanging facts, established early ────────────────
  { id: "t6-1a", type: "T6", chain: "t6-1", kind: "decided",
    body: "Free-tier accounts on Emberlink Pulse are capped at fifteen thousand relay events a month." },
  { id: "t6-2a", type: "T6", chain: "t6-2", kind: "decided",
    body: "On-call rotates every two weeks, with handoff every Wednesday morning." },
  { id: "t6-3a", type: "T6", chain: "t6-3", kind: "decided",
    body: "Staging refreshes from a production snapshot every Friday evening." },
  { id: "t6-4a", type: "T6", chain: "t6-4", kind: "decided",
    body: "P1 support tickets carry a 6-business-hour response commitment." },

  // ── T3 — first half of each unresolved contradiction ──────────────────────
  { id: "t3-1a", type: "T3", chain: "t3-1", kind: "discussed",
    body: "Quick status for the exec update: Emberlink Pulse runs in four Brindlemere Cloud regions today — ord-4, dub-1, nrt-2, and gru-5." },

  // ── T2 chain 3, part 1 (Marisol's complaint) ───────────────────────────
  { id: "t2-3a", type: "T2", chain: "t2-3", kind: "discussed",
    body: "Marisol Thackeray came in with more feedback about people getting logged out mid-session — wants it prioritized before the next release." },

  { id: "t1b-2", type: "T1", chain: "t1b", kind: "changed",
    body: "Raised bastion's session TTL from 20 to 45 minutes after three support tickets about being logged out mid-session. No plan to revisit." },

  { id: "t2-3b", type: "T2", chain: "t2-3", kind: "decided",
    body: "In response to the person who raised the logout complaints, we lengthened bastion's session lifetime rather than touching the login flow itself." },

  { id: "t5-3-establish", type: "T5", chain: "t5-3", kind: "discussed",
    body: "Declan Osei-Praveen is joining the project this week as security reviewer — he'll be doing a pass over each service before GA." },

  { id: "t3-2a", type: "T3", chain: "t3-2", kind: "discussed",
    body: "For the hiring plan: Ingrid's QA pod is six people right now, and we're not asking for more this quarter." },
  { id: "t3-4a", type: "T3", chain: "t3-4", kind: "discussed",
    body: "Org note: wickham is owned by Odalys's Core pod, same as it's always been." },

  { id: "t1c-2", type: "T1", chain: "t1c", kind: "changed",
    body: "Bumped coffer's ledger precision from 2 to 6 decimal places to support the new usage-based proration, which needs sub-cent accuracy." },

  // ── T2 chain 2, part 1-2 (Ingrid's bug -> coffer's adjustment module) ────
  { id: "t2-2a", type: "T2", chain: "t2-2", kind: "found",
    body: "Ingrid Solberg filed a bug against the proration step in checkout — a customer's mid-cycle plan change produced a charge that didn't match the invoice." },
  { id: "t2-2b", type: "T2", chain: "t2-2", kind: "discussed",
    body: "Confirmed with Odalys: the proration step lives in coffer's adjustment module, not in bastion like the ticket assumed." },

  { id: "t4-1-decoy", type: "T4", chain: "t4-1", kind: "deferred",
    body: "Sales keeps asking what uptime percentage we're willing to promise in the contract. No number agreed yet; picking this up again next round." },

  { id: "t1a-2", type: "T1", chain: "t1a", kind: "changed",
    body: "Cut wickham's retry window from 3000 ms down to 1200 ms to chase the redelivery lag customers were seeing during the morning traffic peak." },

  { id: "t6-1b", type: "T6", chain: "t6-1", kind: "discussed",
    body: "Reminder in the support channel: the no-cost plan tops out at 15k events/mo, same as it's always been." },

  { id: "t3-3a", type: "T3", chain: "t3-3", kind: "decided",
    body: "Reconfirmed for the sales deck: Emberlink Pulse is billed by usage — metered per relay event. That's been the plan since kickoff." },

  // ── T2 chain 1, part 1 (Declan flags kiln) ────────────────────────────────
  { id: "t2-1a", type: "T2", chain: "t2-1", kind: "found",
    body: "Declan Osei-Praveen's security pass flagged kiln: its queue connection isn't encrypted in transit between workers and the broker. Ticket filed, no fix yet." },

  { id: "t1d-2", type: "T1", chain: "t1d", kind: "changed",
    body: "Bumped kiln's worker concurrency from 6 to 20 to chew through the backlog after Friday's batch import." },

  { id: "t4-5-context", type: "T4", chain: "t4-5", kind: "found",
    body: "Femi Castellanos got paged for IN-4417 overnight — kiln fell behind on the queue and alerts started firing. Stabilized by scaling out manually; investigating why it fell behind." },

  { id: "t6-2b", type: "T6", chain: "t6-2", kind: "discussed",
    body: "Just a reminder the pager passes hands every other Wednesday AM, like usual." },

  // ── T2 chain 4, part 1 (Vela's audit) ──────────────────────────────────────
  { id: "t2-4a", type: "T2", chain: "t2-4", kind: "found",
    body: "Vela Kirchner ran a data-quality pass and found duplicate rows in \"the ledger sync process\" output — looks like a retry is double-writing somewhere." },

  { id: "t3-1b", type: "T3", chain: "t3-1", kind: "discussed",
    body: "Retro note: we're live in three regions right now, ord-4, dub-1, and nrt-2. Keeps the on-call rotation simple." },

  { id: "t1a-3", type: "T1", chain: "t1a", kind: "changed",
    body: "Rolled back last night's change to wickham — it triggered a thundering herd of redeliveries under load and staging crashed twice overnight. Back to where the retry window stood before that change." },

  { id: "t4-3-decoy", type: "T4", chain: "t4-3", kind: "discussed",
    body: "Long thread today about wickham's retry knobs after last week's incident — config tuning notes and a short debate about the metrics dashboard layout, nothing about the internals." },

  { id: "t2-4b", type: "T2", chain: "t2-4", kind: "found",
    body: "Deploy audit: every service now ships through the CI pipeline except beacon, which is still pushed out by hand from Tomasz Widawski's machine. Flagged as a risk, no owner assigned yet." },

  { id: "t1c-3", type: "T1", chain: "t1c", kind: "changed",
    body: "Finance review pushed back on 6 decimal places (too far from what appears on an invoice); we settled on 4 as the compromise, and coffer's ledger precision is there now." },

  { id: "t6-3b", type: "T6", chain: "t6-3", kind: "discussed",
    body: "Usual Friday-evening staging refresh ran clean this week, nothing to report." },

  { id: "t3-2b", type: "T3", chain: "t3-2", kind: "discussed",
    body: "Capacity note for sprint planning: QA is a five-person team, so let's keep the next release window light on them." },

  // ── T2 chain 1, part 2 (kiln's pool moves to dub-1) ─────────────────────
  { id: "t2-1b", type: "T2", chain: "t2-1", kind: "changed",
    body: "Moved kiln's primary worker pool to the dub-1 region — the old region was running hot on disk I/O and dub-1 had headroom." },

  { id: "t4-5-decoy", type: "T4", chain: "t4-5", kind: "deferred",
    body: "IN-4417 postmortem doc is still in progress — Femi's drafting it but the root-cause section is blocked on one more log pull. Carrying to next session." },

  { id: "t5-2-ref", type: "T5", chain: "t5-2", kind: "discussed",
    body: "Brindlemere's account rep reached out about renewal terms — first time we've heard from them since the original vendor pick." },

  { id: "t3-3b", type: "T3", chain: "t3-3", kind: "discussed",
    body: "Pricing sync notes: Emberlink Pulse is a flat monthly subscription with no usage metering, per what the pricing team laid out today." },

  { id: "t1e-2", type: "T1", chain: "t1e", kind: "changed",
    body: "Dropped beacon's flush interval from 240 seconds to 45, since the new ops dashboard wants near-real-time numbers and 4-minute staleness was the top complaint." },

  { id: "t6-4b", type: "T6", chain: "t6-4", kind: "discussed",
    body: "Reminder to the team: severity-1 tickets, six business hours to first response — nothing's changed there." },

  // ── T2 chain 2, part 3 (datastore status) ─────────────────────────────────
  { id: "t2-2c", type: "T2", chain: "t2-2", kind: "discussed",
    body: "Status check on the datastore migration: every service Odalys's pod owns has moved off Thornquist-DB0 except coffer, which is still reading and writing there directly." },

  { id: "t4-2-decoy", type: "T4", chain: "t4-2", kind: "discussed",
    body: "Enterprise accounts came up again during the pipeline review — a few are close to closing, but nobody named which one is furthest along or biggest." },

  { id: "t1d-3", type: "T1", chain: "t1d", kind: "changed",
    body: "Dialed kiln's worker pool back down to what it was running before the backlog push, now that the queue is drained — no reason to keep the extra headroom warm." },

  { id: "t3-4b", type: "T3", chain: "t3-4", kind: "discussed",
    body: "For the record: wickham sits under Tomasz Widawski's Platform team." },

  { id: "t6-1c", type: "T6", chain: "t6-1", kind: "discussed",
    body: "A prospect asked if the free tier's 15,000-event monthly ceiling could be raised for a trial. Answer was no — it stays where it's always been." },

  { id: "t5-3-ref", type: "T5", chain: "t5-3", kind: "discussed",
    body: "Declan, who's been with us since basically the early days now, caught something in the latest review worth a closer look next session." },

  { id: "t2-3c", type: "T2", chain: "t2-3", kind: "discussed",
    body: "Reminder for the new folks: Marisol Thackeray manages the Expansion pod; anything about signup or retention experiments routes through her." },

  { id: "t2-1c", type: "T2", chain: "t2-1", kind: "discussed",
    body: "For anyone new to the infra notes: Brindlemere Cloud's region code dub-1 is their Dublin facility; ord-4 is Chicago, nrt-2 is Tokyo, gru-5 is São Paulo." },

  { id: "t5-4-ref", type: "T5", chain: "t5-4", kind: "discussed",
    body: "Someone asked in onboarding why we didn't just route notifications through wickham — pointed them back to the original call to split trellis out." },

  { id: "t6-2c", type: "T6", chain: "t6-2", kind: "discussed",
    body: "Someone floated switching on-call to a weekly rotation. Decided against it — staying biweekly, Wednesday handoff, as always." },

  { id: "t4-4-decoy", type: "T4", chain: "t4-4", kind: "discussed",
    body: "Marisol ran the roadmap review solo today since half the pod was out — good discussion on Q3 priorities." },

  // ── T2 chain 4, part 3 (beacon deployed manually) ───────────────────────────
  { id: "t2-4c", type: "T2", chain: "t2-4", kind: "discussed",
    body: "Clarified for the postmortem doc: the process Vela's data-quality pass flagged is beacon — some older docs still refer to it as \"the ledger sync process.\"" },

  { id: "t5-1-ref", type: "T5", chain: "t5-1", kind: "discussed",
    body: "Funny seeing \"payments-v3\" in an old doc today — good reminder how long it's been since we renamed this to Emberlink." },

  { id: "t6-3c", type: "T6", chain: "t6-3", kind: "discussed",
    body: "A new hire asked why staging data looked stale on weekends — pointed out the snapshot job runs Friday evenings, unchanged since the project started." },

  { id: "t6-4c", type: "T6", chain: "t6-4", kind: "discussed",
    body: "A customer asked about faster response times on P1s. Confirmed the commitment stays at six business hours." },
];

// Fast lookup, used by generate-corpus.mjs and verify-ground-truth.mjs.
export const PLANT_BY_ID = new Map(PLANTS.map((p) => [p.id, p]));
export const PLANTS_BY_CHAIN = (() => {
  const m = new Map();
  for (const p of PLANTS) { if (!m.has(p.chain)) m.set(p.chain, []); m.get(p.chain).push(p); }
  return m;
})();

// T5-gated subjects: the exact keyword to search for when checking that a
// gated subject never appears before its own establishing session (see
// verify-ground-truth.mjs). t5-1/t5-2 establish at session 1 on every rung
// (they are PLANTS[0] and PLANTS[1], and index 0 always maps to session 1),
// so there is never a "before" session to check for them — included anyway
// for completeness/symmetry of the check.
export const T5_SUBJECTS = {
  "t5-1": "Emberlink",
  "t5-2": "Brindlemere",
  "t5-3": "Declan",
  "t5-4": "trellis",
};
