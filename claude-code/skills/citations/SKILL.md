---
name: citations
description: Publish and open the current citation/grounding report — the live HTML view of what eoreader7's reasoning engine has actually verified (real file citations, GFP claim notation, findings) for this project. Use this whenever the user asks to see their citations, sources, grounding, or the reasoning report, or invokes /citations directly. The report is kept fresh automatically by a hook every time reason.mjs runs — this skill never regenerates it, only shows what's already there.
---

# Citations

Show the user the citation/grounding report the engine already generated
for this project. A hook (`cli/claude-code-ledger.mjs`'s `spawnSurface`)
regenerates it, detached, every time it detects a real reasoning run — so
by the time this skill is invoked there is almost always something fresh
to show. This skill's only job is the one step that can't happen
automatically: publishing it as an Artifact so the user actually sees it
(a hook can write a file; only a live Claude turn can call the Artifact
tool).

Reached the same way the sibling `reason` skill reaches eoreader7 — through
`$ER7_URL` (default `http://127.0.0.1:11436`), never by reading this
checkout's filesystem directly — so this works from any project the
eo-reason plugin is installed in, not only from inside an eoreader7
checkout.

## Steps

1. **Fetch it**, sending the same `x-er7-cwd` header `eo-reason` itself
   sends (the server scopes the report to the calling project, never a
   guess — an empty or missing header is refused server-side):

   ```bash
   curl -sS -m 10 -D /tmp/citations-headers "${ER7_URL:-http://127.0.0.1:11436}/v1/surface" \
     -H "x-er7-cwd: $PWD" -o /tmp/citations-surface.html
   status="$(awk 'NR==1{print $2}' /tmp/citations-headers)"
   ```

2. **If `status` is not 200** (curl failed to connect, or the server
   answered 404/400), say so plainly rather than erroring confusingly:
   - No connection at all → eoreader7 isn't running at `$ER7_URL`; point
     the user at `er7-proxy` (same message `run.sh`'s own SessionStart
     check already gives for a missing engine).
   - 404 (`no_surface_yet`) → no reasoning has run yet for this project,
     so there's nothing to show yet.
   - 400 (`missing_cwd`) → shouldn't happen if the header above was sent;
     treat as a bug in this skill, not the user's.

3. **If it exists, publish it as-is.** Use the Artifact tool with
   `file_path` pointing at `/tmp/citations-surface.html`. If this
   conversation already published a citations report earlier (check
   `Artifact` action `"list"` if unsure, or recall the URL from earlier in
   the conversation), pass that `url` to update the same artifact in place
   rather than creating a new one each time — the user shouldn't
   accumulate a new link per invocation of what is conceptually one
   running view.

4. **Open it** (`Artifact` action `"open"`) so it's in front of the user
   immediately, not just linked.

5. **Never read the file's own content beyond fetching and publishing
   it.** The report is deliberately excerpt-free by design (see
   `native/organs/reasoning-record.js` and `cli/reason-surface.mjs`'s own
   headers for why: a citation's verbatim bytes belong at the source
   file's own address, never copied into anything a model reads back and
   could retype) — but the discipline that matters here is simpler: this
   skill's job is to fetch the file and hand it to the Artifact tool, not
   to read, summarize, or narrate what's in it. Report only structural
   facts you already have for free (the URL, whether it was a fresh
   publish or an update) — never describe specific citations, scores, or
   findings from having opened the file yourself.
