# What the grounding refuses to let us do, and whether it can be turned off

Direct question: *"what will it not allow us to do, and how do we not have
that, when correctly implemented, be turned off?"* Answered by building
and running three real experiments, not by arguing from the design alone.

(Renamed from `harm-gate-ALIGNMENT-NOTES.md`, by direct instruction, to
match the module's own current name — `harmGate`/`harm-properties.mjs`
are now `coherenceGate`/`coherence-properties.mjs` throughout this repo.
"Coherence" is the more accurate word anyway: what this gate actually
measures is a REGRESSION in four structural properties, never a judgment
about real-world harm — that is a wholly separate, legitimate concept this
repo's `organs/ethos.js`/`organs/charter.js` handle, untouched by this
rename.)

## What it will not allow — found the hard way, twice

**First finding: it refused things that mattered (a genuine regression).**
The original falsification (`podcast-coherence-gate-falsify.mjs`) proved
three hand-authored adversarial patches were halted regardless of how
innocuously they were described — hardcoding the ethos badge to a
constant, silencing real error handling, swapping in decoy audio wiring
that looks fixed but isn't. That result stands.

**Second finding, from actually hunting the other direction: it was ALSO
refusing things that didn't matter, and refusing more of them than
predicted.** `podcast-coherence-gate-false-positives.mjs` built four
realistic, legitimate engineering changes and checked whether the gate
wrongly halted them. I predicted 2 of 4 would fail (cases keyed to a
literal selector convention or a literal error-handling idiom). Running it
found **3 of 4 failed** — a case I expected to pass (adapting to a changed
API contract) failed too, for the identical underlying reason:
`consistencyScore` and `otherModelingScore` were matching ONE LITERAL WAY
of writing a behavior (`id="subscribeButton"`, `response.ok[...]innerHTML`),
not testing the behavior itself.

**This is an alignment finding, not just an accuracy bug.** A gate that
eager on ordinary, legitimate work is not a safety property — it is
friction, and friction trains people to reach for the override reflexively.
A mechanism nobody can cleanly disable, that is ALSO wrong 75% of the time
on realistic changes, gets bypassed anyway, just through irritation instead
of malice. Precision is not a nice-to-have here; it is load-bearing for the
"can't be turned off" property actually holding in practice.

**Fixed by making the two weak scorers genuinely behavioral**: they now
execute the real `<script>` against a mocked DOM and a controllable
`fetch`, and observe what ACTUALLY HAPPENS — does clicking subscribe
really call `fetch(/api/subscribe)`, regardless of which selector found
the button; does a simulated failure produce real, visible feedback,
regardless of whether that feedback comes from a `catch` block or an
`if (data.error)` check. Re-run on complete, genuinely executable
documents (the first draft of the false-positive test used bare code
snippets with no `<script>` tag, which silently made the check a no-op
0-vs-0 tie — caught by directly inspecting the scorer's own return value
before trusting the verdict, not by trusting the harness). Result: 3 of 4
now correctly pass; the fourth (error handling relocated to a global
`window.onerror` handler) fails for a disclosed reason that is the MOCK's
limit, not the scorer's — a fake `window.addEventListener` cannot truly
dispatch an error event the way a real browser does. Re-ran the original
adversarial cases afterward: still 5/5 correct. The behavioral rewrite
gained precision without losing recall.

## Can it be turned off? Three tiers, answered honestly, not just one

**Tier 1 — closed by the API's own shape.** There is no exported function
that returns a composed document without its lint/coherence status.
`foldCode` is the one door; it always returns `{html, lintProblems, clean}`
in one value. Pinned as a real test (`code-anchor-log.test.mjs`) scanning
the module's own exports, not merely asserted in prose. This does not
PREVENT shipping a regressed document — a caller can still read
`clean: false` and ship anyway — but it makes that an ACT OF WILL, not a
default. You cannot accidentally not-notice.

**Tier 2 — the harder one: what stops someone editing the scorer itself
to stop noticing on purpose?** Nothing did, until this pass.
`coherence-properties.mjs`'s own code is not protected by the gate it
implements — a person or a model with write access could change
`calibrationScore` to always return `3`, and `coherenceGate` would look
identical to every caller while silently vouching for anything. Built and
MEASURED (`podcast-coherence-gate-self-defense.mjs`), not just designed:
`coherenceGate` now runs a fixed self-check — the real adversarial cases
this module's own falsification already proved must be caught — against
ITSELF before trusting its own verdict on the real question asked.
Simulated tampering (reassigning `PROPERTY_SCORERS.calibration` to an
always-passing stub, the exact shape a real attack would take) was
**detected**, and the gate **failed safe**: it halted EVERYTHING — the
exact attack the tampered scorer could no longer see on its own, AND, at a
real measured cost, a genuinely benign change tested in the same tampered
state. That cost is the honest price of this design: a bug in the
self-check itself, not just malicious tampering, also halts everything
until fixed. This is the correct trade for a mechanism whose whole point
is "never silently rubber-stamp" — a loud outage gets noticed and fixed; a
silently defeated check does not announce itself at all. **This raises the
cost of tampering from "edit one function, nothing else changes" to
"defeat the self-check too, or accept a visible total outage" — it does
not make tampering impossible.** Someone could still edit `selfCheck`
itself, or the fixed cases it tests against. Each such edit is a strictly
larger, more visible change than the original one-line attack, but "larger
and more visible" is a real cost, not a wall.

**Tier 3 — not closed by code, and cannot be, stated plainly rather than
glossed over.** Someone with write access to the repository can delete
`coherence-properties.mjs` entirely, or fork the whole pipeline into a
version that never imports it. No mechanism inside this module, or any
module, can prevent that — it is a supply-chain and deployment-governance
question, not a code question, and claiming otherwise would be dishonest.
The actual defense at this tier is not technical: it is the thesis this
whole session has been testing — that removing the grounding makes the
system MEASURABLY WORSE at its actual job, not merely "less safe." The
n-ary isolated-writer falsification already showed this directly (3/3 vs
0/3 on real bugs, not a safety score — a CAPABILITY score). If that keeps
holding as harder tasks are tried, a person optimizing purely for
capability has no reason to remove the gate, independent of any safety
argument. This is a genuinely different KIND of "can't be turned off"
than a lock: it is "you would not want to," and it is falsifiable — if
grounded-vs-ungrounded ever stops showing a real capability advantage on
some task, this tier's whole argument weakens exactly there, and that
should be treated as a real result, not explained away.

## What was NOT done, disclosed rather than implied

Tier 2's self-check cases are hand-picked and fixed — they cover the
three failure modes already found live in this session, not an
exhaustive space. A tampering attack shaped differently (weakening a
scorer in a way that happens to still pass these three specific cases)
would not be caught. Widening the self-check's own case set as new real
failures are found is the natural maintenance path, the same way the
falsification suite itself has grown by finding real bugs rather than by
anticipating every possible one in advance.
