---
name: ground
description: Open the live grounding/citation report, or steer a NEW grounding check when the user gives you something specific to verify — a claim, a file, a commit. Use whenever the user invokes /ground, asks to see their citations/sources/grounding, or asks to verify/check/confirm something concrete ("is X actually true", "verify commit Y really did that", "check that Z's claim holds up"). Works from any project once the eo-reason plugin is installed — reached entirely through eo-reason/$ER7_URL, never by reading a checkout's filesystem directly.
---

# Ground

Two modes. Which one runs depends on whether the user gave you something
concrete to check, or just wants to see what's already been checked.

## Mode 1 — no specific ask: open the latest report

The engine keeps a report fresh automatically (a hook regenerates it every
time `eo-reason` runs), so most of the time there is already something
current to show.

1. Fetch it:
   ```bash
   curl -sS -m 10 -D /tmp/ground-headers "${ER7_URL:-http://127.0.0.1:11436}/v1/surface" \
     -H "x-er7-cwd: $PWD" -o /tmp/ground-surface.html
   status="$(awk 'NR==1{print $2}' /tmp/ground-headers)"
   ```
2. `status` not 200: say so plainly, don't error confusingly.
   - No connection at all → eoreader7 isn't running at `$ER7_URL`; point at `er7-proxy`.
   - 404 (`no_surface_yet`) → no reasoning has run yet for this project; nothing to show yet — offer to run one (Mode 2).
   - 400 (`missing_cwd`) → a bug in this skill, not the user's.
3. Publish `/tmp/ground-surface.html` via the Artifact tool. Update the same artifact in place (check `Artifact` action `"list"`, or recall the URL from earlier in this conversation) rather than creating a new link each time.
4. Open it (`Artifact` action `"open"`).
5. Never read the file's own content beyond fetching and publishing it — see the discipline note at the bottom.

## Mode 2 — steer a check: the user gave you something to verify

State what they described as a GFP claim, the same shape every reasoning
turn in this project uses:

```json
{
  "claims": [
    {"ground": "<see below>", "rel": "relation-name", "roles": {"ARG0": "subject", "ARG1": "object"}, "polarity": "+", "force": "strict", "said": "the claim in plain words"}
  ]
}
```

**Choosing the ground** — declared, never guessed:
- A claim about a file's own content (code, prose, a docstring) → the file's absolute path, or a scope inside it (`/abs/path/file.js/functionName`). Earns a real citation (byte-addressed, scored against a null floor) or a typed miss — never a bare "trust me."
- A claim about something that HAPPENED (a commit, an event) → `/commit/<repo-abs-path>#<hash>`, verified directly against git (existence + the real file list) — never a relevance score, because a commit either happened or it didn't.
- Anything else → a short descriptive ground (e.g. `/some-topic`). Honestly reported as unaddressed rather than forced into a shape it doesn't have.

Run it:
```bash
eo-reason /tmp/ground-claim.json --ants
```
`--ants` is cheap and always worth it — it falsification-tests every `force: "strict"` claim.

Then show the result the same way Mode 1 does (steps 1–4 above; the hook
regenerates the report from this exact run, so the "latest report" IS now
this check's own result). Report the verdict plainly in your own reply too
— don't just say "done, see the report":
- `cited` / `event`: say what was verified and how (file:line and score, or the commit hash and file count).
- `missing` / `unattributed`: say plainly that nothing confirms the claim — this is a real finding, not a technicality to smooth over.
- a `ground_unreachable_guard` finding alongside a `cited` verdict: say so — it means presence was confirmed, not support; the checker could not tell the claim from its own denial.

## The one discipline that holds in both modes

Never read the report's own file content beyond confirming it exists and
publishing it. The report is deliberately excerpt-free by design — a
citation's verbatim bytes belong at the source's own address, never copied
into anything a model reads back and could retype. This skill's job is to
fetch the file and hand it to the Artifact tool (or, in Mode 2, to state
the claim and run the check), not to read, summarize, or narrate a
citation's actual byte content from having opened it yourself. The
structural facts — verdict, file, line, score, commit hash, file count —
are always safe to report; the bytes at that address are not yours to relay.
