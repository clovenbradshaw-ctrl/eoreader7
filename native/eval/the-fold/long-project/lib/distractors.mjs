// lib/distractors.mjs — THE ROUTINE POOL: hand-written filler session items
// that carry NO ground-truth fact any question.json entry depends on. They
// use the same cast and services as lib/plants.mjs (so the corpus reads as
// one consistent project) but are deliberately kept off every planted
// topic — none states a region count, a QA headcount, a pricing model, an
// SLA percentage, a programming language, a job title, or QF-1042's root
// cause, and none revisits duskwire's ownership. generate-corpus.mjs draws
// from this pool, seeded, to fill out every session that isn't carrying a
// plant (and to round out the sessions that are).
//
// REWORDING (sensitivity audit, 2026-09-22, "the dedup exploit"): most of
// these entries have a `body` that lib/paraphrase.mjs's hand-written
// substitution table can reword on the fly (generate-corpus.mjs calls
// paraphrase(body, rng, randInt) at each insertion, independently choosing
// among that table's alternatives for every matching word/phrase). The
// handful whose body matches none of that table's rules — verified by
// paraphrase.mjs's own hasAnyRule() — are given an explicit, hand-written
// `variants` array here instead, so every distractor id can still render as
// more than one exact string and none of them sits at frequency 1 for the
// wrong reason (looking like a planted paragraph by accident of having no
// synonym to swap).

export const DISTRACTORS = [
  { id: "d01", kind: "changed", body: "Bumped the lodash pin in the loom repo after the dependabot alert; nothing broke." },
  { id: "d02", kind: "changed", body: "Tobias tightened the alert thresholds on the duskwire dashboard — too many pages for blips under five seconds.",
    variants: [
      "Too many pages for sub-five-second blips, so Tobias tightened the alert thresholds on the duskwire dashboard.",
      "The duskwire dashboard's alert thresholds got tightened by Tobias — blips under five seconds were paging way too often.",
    ] },
  { id: "d03", kind: "discussed", body: "Code review nit: Nkiru asked for the new checkout button copy to say \"Continue\" instead of \"Next\"; shipped in the same PR." },
  { id: "d04", kind: "found", body: "Esti found a flaky test in the harrow login suite — timing-dependent; added a retry in the test harness rather than the real code." },
  { id: "d05", kind: "changed", body: "Baz cleaned up a stale cron job that hadn't run successfully in months; nobody remembered what it was for, deleted it." },
  { id: "d06", kind: "discussed", body: "Quick sync on the design system: new spacing tokens landed, no visual regressions in the smoke tests.",
    variants: [
      "Short design-system sync: the new spacing tokens are in, smoke tests show nothing visually broke.",
      "New spacing tokens landed for the design system — checked the smoke tests, no visual regressions turned up.",
    ] },
  { id: "d07", kind: "changed", body: "Deng rotated the on-call phone's battery — the old one was dying mid-shift, replaced under warranty." },
  { id: "d08", kind: "found", body: "Priya walked through the pallet adjustment module's test coverage; a few edge cases around currency rounding still need tests, ticket filed." },
  { id: "d09", kind: "discussed", body: "Colm's first-week logistics: badge access, laptop setup, and a walkthrough of the incident channel.",
    variants: [
      "Got Colm set up for his first week — badge, laptop, and a tour of the incident channel.",
      "First-week onboarding items for Colm: badge access sorted, laptop configured, walked him through the incident channel.",
    ] },
  { id: "d10", kind: "discussed", body: "Marguerite shared the updated onboarding doc for new enterprise trials; small wording tweaks only." },
  { id: "d11", kind: "found", body: "Nkiru fixed a CSS overflow bug on the billing history page that only showed up on narrow viewports." },
  { id: "d12", kind: "deferred", body: "Tobias and Baz debated whether to move the CI runners to bigger instances; tabled for a cost review next quarter." },
  { id: "d13", kind: "discussed", body: "Standup note: nothing blocking, everyone heads-down on their own tickets this week.",
    variants: [
      "Nothing blocking at standup — everyone's heads-down on their own tickets this week.",
      "Quiet standup: no blockers, the pod is just heads-down on individual tickets this week.",
    ] },
  { id: "d14", kind: "found", body: "Esti added a new smoke test for the pallet ledger export button; passed on the first try.",
    variants: [
      "A new smoke test for the pallet ledger export button, written by Esti, passed first try.",
      "Esti wrote a smoke test covering the pallet ledger export button — green on the first run.",
    ] },
  { id: "d15", kind: "changed", body: "Deng cleaned up old log retention settings on loom — nothing was reading logs past 14 days anyway." },
  { id: "d16", kind: "deferred", body: "Discussed whether to rename the \"checkout\" folder to \"billing\" in the frontend repo; decided the churn wasn't worth it right now." },
  { id: "d17", kind: "found", body: "Colm's second pass looked at harrow's password-reset flow; no findings, clean." },
  { id: "d18", kind: "changed", body: "Priya merged a small refactor in duskwire's connection pool code, no behavior change, just readability." },
  { id: "d19", kind: "found", body: "Baz's weekly data-quality report came back clean — no anomalies in the pipeline this week." },
  { id: "d20", kind: "deferred", body: "Nkiru proposed a new empty-state illustration for the dashboard when a customer has zero events; queued for design review." },
  { id: "d21", kind: "changed", body: "Tobias patched a typo in the runbook for restarting cinder workers." },
  { id: "d22", kind: "discussed", body: "Marguerite ran through Q3 roadmap priorities with the pod leads; nothing changed from last time.",
    variants: [
      "Q3 roadmap priorities got a run-through with the pod leads, led by Marguerite; same priorities as before.",
      "Marguerite went over Q3 roadmap priorities with the pod leads again — nothing different from the last pass.",
    ] },
  { id: "d23", kind: "found", body: "Esti's team caught a regression in the loom export before it shipped; fixed the same day." },
  { id: "d24", kind: "changed", body: "Deng updated the paging schedule spreadsheet for the next six weeks — no gaps." },
  { id: "d25", kind: "deferred", body: "Discussed whether pallet needs a read replica; deferred until traffic actually justifies it." },
  { id: "d26", kind: "changed", body: "Colm reviewed the new API key rotation script; suggested logging the rotation event, done in a follow-up." },
  { id: "d27", kind: "found", body: "Baz found a duplicate index on one of loom's reporting tables; dropped it, no measurable perf change." },
  { id: "d28", kind: "discussed", body: "Nkiru and Marguerite reviewed the trial-signup email copy; minor tone edits." },
  { id: "d29", kind: "changed", body: "Priya's pod picked up a small ticket to add a health-check endpoint to duskwire; done by end of week." },
  { id: "d30", kind: "discussed", body: "Tobias walked through the new deploy runbook for harrow; a few steps reordered for clarity." },
  { id: "d31", kind: "discussed", body: "Standup: Esti out sick, QA items picked up by the rest of the pod for the day." },
  { id: "d32", kind: "found", body: "Deng and Baz paired on a script to backfill missing timestamps in an old loom export; verified against a sample.",
    variants: [
      "Deng and Baz teamed up on a backfill script for missing timestamps in an old loom export, checked against a sample.",
      "A pairing session between Deng and Baz produced a backfill script for missing timestamps in a loom export; sample-checked and looked right.",
    ] },
  { id: "d33", kind: "deferred", body: "Marguerite floated the idea of a lighter onboarding email sequence for very small accounts; early idea, no decision, revisit next quarter." },
  { id: "d34", kind: "found", body: "Colm's audit of the cinder job payloads found nothing sensitive being logged; closed clean." },
  { id: "d35", kind: "changed", body: "Nkiru fixed a broken link in the docs site footer." },
];
