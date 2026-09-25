// lib/distractors.mjs — THE ROUTINE POOL: hand-written filler session items
// for "the Emberlink Project" that carry NO ground-truth fact any
// questions.json entry depends on. They use the same cast and services as
// lib/plants.mjs (so the corpus reads as one consistent project) but are
// deliberately kept off every planted topic — none states an uptime
// percentage, a customer ranked by size, a programming-language name, a job
// title, or incident IN-4417's root cause. generate-corpus.mjs draws from
// this pool, seeded, to fill out every session that isn't carrying a plant
// (and to round out the sessions that are).
//
// TWO NAMES ARE DELIBERATELY ABSENT FROM THIS ENTIRE FILE: "Declan" (Declan
// Osei-Praveen, gated by T5-3 — he must not appear in any session before his
// own establishing plant) and "trellis" (the service gated by T5-4, added
// mid-project). Neither is ever mentioned here, on purpose — see lib/
// plants.mjs's and lib/people.mjs's headers for why, and verify-ground-
// truth.mjs's new "no T5 subject before its establishing session" check,
// which would fail the build if either leaked in here.
//
// REWORDING (same "dedup exploit" rationale long-project's own distractors.mjs
// documents): most of these entries have a `body` that lib/paraphrase.mjs's
// hand-written substitution table can reword on the fly (generate-corpus.mjs
// calls paraphrase(body, rng, randInt) at each insertion, independently
// choosing among that table's alternatives for every matching word/phrase).
// The handful whose body matches none of that table's rules — verified by
// paraphrase.mjs's own hasAnyRule() — are given an explicit, hand-written
// `variants` array here instead, so every distractor id can still render as
// more than one exact string and none of them sits at frequency 1 for the
// wrong reason (looking like a planted paragraph by accident of having no
// synonym to swap).

export const DISTRACTORS = [
  { id: "d01", kind: "changed", body: "Bumped the eslint pin in the beacon repo after a security advisory; nothing broke." },
  { id: "d02", kind: "changed", body: "Reece tightened the alert thresholds on the wickham dashboard — too many pages for blips under three seconds." },
  { id: "d03", kind: "discussed", body: "Code review nit: Junko asked for the new dashboard button copy to say \"Continue\" instead of \"Next\"; shipped in the same PR." },
  { id: "d04", kind: "found", body: "Sanjay found a flaky test in the bastion login suite — timing-dependent; added a retry in the test harness rather than the real code." },
  { id: "d05", kind: "changed", body: "Femi cleaned up a stale cron job that hadn't run successfully in months; nobody remembered what it was for, deleted it." },
  { id: "d06", kind: "discussed", body: "Quick sync on the design system: new spacing tokens landed, no visual regressions in the smoke tests." },
  { id: "d07", kind: "changed", body: "Tomasz rotated the on-call phone's battery — the old one was dying mid-shift, replaced under warranty." },
  { id: "d08", kind: "found", body: "Odalys walked through coffer's adjustment module's test coverage; a few edge cases around currency rounding still need tests, ticket filed." },
  { id: "d09", kind: "discussed", body: "Rosalind's first-week logistics: badge access, laptop setup, and a walkthrough of the incident channel.",
    variants: [
      "Got Rosalind set up for her first week — badge, laptop, and a tour of the incident channel.",
      "First-week onboarding items for Rosalind: badge access sorted, laptop configured, walked her through the incident channel.",
    ] },
  { id: "d10", kind: "discussed", body: "Marisol shared the updated onboarding doc for new enterprise trials; small wording tweaks only." },
  { id: "d11", kind: "found", body: "Junko fixed a CSS overflow bug on the billing history page that only showed up on narrow viewports." },
  { id: "d12", kind: "deferred", body: "Reece and Femi debated whether to move the CI runners to bigger instances; tabled for a cost review next quarter." },
  { id: "d13", kind: "discussed", body: "Standup note: nothing blocking, everyone heads-down on their own tickets this week.",
    variants: [
      "Nothing blocking at standup — everyone's heads-down on their own tickets this week.",
      "Quiet standup: no blockers, the pod is just heads-down on individual tickets this week.",
    ] },
  { id: "d14", kind: "found", body: "Sanjay added a new smoke test for the coffer ledger export button; passed on the first try.",
    variants: [
      "A new smoke test for the coffer ledger export button, written by Sanjay, passed first try.",
      "Sanjay wrote a smoke test covering the coffer ledger export button — green on the first run.",
    ] },
  { id: "d15", kind: "changed", body: "Vela cleaned up old log retention settings on beacon — nothing was reading logs past 21 days anyway." },
  { id: "d16", kind: "deferred", body: "Discussed whether to rename the \"checkout\" folder to \"billing\" in the frontend repo; decided the churn wasn't worth it right now." },
  { id: "d17", kind: "found", body: "Rosalind's second pass looked at bastion's password-reset flow; no findings, clean." },
  { id: "d18", kind: "changed", body: "Odalys merged a small refactor in wickham's connection pool code, no behavior change, just readability." },
  { id: "d19", kind: "found", body: "Femi's weekly data-quality report came back clean — no anomalies in the pipeline this week." },
  { id: "d20", kind: "deferred", body: "Junko proposed a new empty-state illustration for the dashboard when a customer has zero events; queued for design review." },
  { id: "d21", kind: "changed", body: "Reece patched a typo in the runbook for restarting kiln workers." },
  { id: "d22", kind: "discussed", body: "Marisol ran through Q3 roadmap priorities with the pod leads; nothing changed from last time.",
    variants: [
      "Q3 roadmap priorities got a run-through with the pod leads, led by Marisol; same priorities as before.",
      "Marisol went over Q3 roadmap priorities with the pod leads again — nothing different from the last pass.",
    ] },
  { id: "d23", kind: "found", body: "Sanjay's team caught a regression in the beacon export before it shipped; fixed the same day." },
  { id: "d24", kind: "changed", body: "Tomasz updated the paging schedule spreadsheet for the next six weeks — no gaps." },
  { id: "d25", kind: "deferred", body: "Discussed whether coffer needs a read replica; deferred until traffic actually justifies it." },
  { id: "d26", kind: "changed", body: "Vela reviewed the new API key rotation script; suggested logging the rotation event, done in a follow-up." },
  { id: "d27", kind: "found", body: "Femi found a duplicate index on one of beacon's reporting tables; dropped it, no measurable perf change." },
  { id: "d28", kind: "discussed", body: "Junko and Marisol reviewed the trial-signup email copy; minor tone edits." },
  { id: "d29", kind: "changed", body: "Odalys's pod picked up a small ticket to add a health-check endpoint to wickham; done by end of week." },
  { id: "d30", kind: "discussed", body: "Reece walked through the new deploy runbook for bastion; a few steps reordered for clarity." },
  { id: "d31", kind: "discussed", body: "Standup: Sanjay out sick, support items picked up by the rest of the pod for the day." },
  { id: "d32", kind: "found", body: "Vela and Femi paired on a script to backfill missing timestamps in an old beacon export; verified against a sample.",
    variants: [
      "Vela and Femi teamed up on a backfill script for missing timestamps in an old beacon export, checked against a sample.",
      "A pairing session between Vela and Femi produced a backfill script for missing timestamps in a beacon export; sample-checked and looked right.",
    ] },
  { id: "d33", kind: "deferred", body: "Marisol floated the idea of a lighter onboarding email sequence for very small accounts; early idea, no decision, revisit next quarter." },
  { id: "d34", kind: "found", body: "Rosalind's audit of the kiln job payloads found nothing sensitive being logged; closed clean." },
  { id: "d35", kind: "changed", body: "Junko fixed a broken link in the docs site footer." },
];
