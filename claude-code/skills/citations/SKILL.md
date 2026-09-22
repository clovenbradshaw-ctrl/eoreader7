---
name: citations
description: Publish and open the current citation/grounding report — the live HTML view of what cli/reason.mjs has actually verified (real file citations, GFP claim notation, findings) for this repo. Use this whenever the user asks to see their citations, sources, grounding, or the reasoning report, or invokes /citations directly. The report is kept fresh automatically by a hook every time reason.mjs runs — this skill never regenerates it, only shows what's already there.
---

# Citations

Show the user the citation/grounding report cli/reason-surface.mjs already
generated. `cli/claude-code-ledger.mjs`'s `spawnSurface` regenerates this
file, detached, every time it detects a real `cli/reason.mjs` run in this
repo — so by the time this skill is invoked there is almost always
something fresh to show. This skill's only job is the one step that can't
happen automatically: publishing it as an Artifact so the user actually
sees it (a hook can write a file; only a live Claude turn can call the
Artifact tool).

**Known gap, disclosed rather than hidden**: unlike the sibling `reason`
skill (`claude-code/skills/reason/SKILL.md`), which reaches eoreader7
through the portable `eo-reason` binary and `$ER7_URL` HTTP proxy — so it
works from any project the plugin is installed in — this skill reads the
filesystem directly and only works when Claude Code is actually running
inside a real eoreader7 checkout. Invoked from an unrelated project through
the installed plugin, the path lookup below will simply find nothing. Making
this portable means the proxy server (`claude-code-doorway.mjs`) would need
to serve the latest surface HTML itself; that hasn't been built yet.

## Steps

1. **Find the file.** The report's path is scoped to this repo's own root
   (never the session's incidental cwd — see `claude-code-ledger.mjs`'s own
   header for why that distinction matters), the same slug
   `native/organs/reasoning-record.js`'s `cwdSlug` computes. Reuse that
   exact function rather than recomputing the slug by hand — a second,
   separately-typed copy of the same sanitize logic is exactly the kind of
   drift this repo's own doctrine warns against:

   ```bash
   node -e "import('./native/organs/reasoning-record.js').then(m => console.log(require('path').join(require('os').homedir(), '.claude', 'eo-reason', 'last-surface-' + m.cwdSlug(process.cwd()) + '.html')))"
   ```

   Run this from the repo root (or `cd` there first — the slug is the repo
   root's path, not wherever the shell happens to be sitting). If it prints
   a path with no file there, or the command itself fails to find
   `native/organs/reasoning-record.js`, this session isn't inside a real
   eoreader7 checkout — say so (see the disclosed gap above) rather than
   erroring confusingly.

2. **If the file doesn't exist**, say so plainly: no reasoning has run yet
   this session (`cli/reason.mjs` hasn't been invoked), so there's nothing
   to show. Don't error confusingly or fabricate a report.

3. **If it exists, publish it as-is.** Use the Artifact tool with
   `file_path` pointing at that exact path. If this conversation already
   published a citations report earlier (check `Artifact` action `"list"`
   if unsure, or recall the URL from earlier in the conversation), pass
   that `url` to update the same artifact in place rather than creating a
   new one each time — the user shouldn't accumulate a new link per
   invocation of what is conceptually one running view.

4. **Open it** (`Artifact` action `"open"`) so it's in front of the user
   immediately, not just linked.

5. **Never read the file's own content beyond confirming it exists and
   publishing it.** The report is deliberately excerpt-free by design
   (see `native/organs/reasoning-record.js` and `cli/reason-surface.mjs`'s
   own headers for why: a citation's verbatim bytes belong at the source
   file's own address, never copied into anything a model reads back and
   could retype) — but the discipline that matters here is simpler: this
   skill's job is to hand the file to the Artifact tool, not to read,
   summarize, or narrate what's in it. Report only structural facts you
   already have for free from the publish result (the URL, whether it was
   a fresh publish or an update) — never describe specific citations,
   scores, or findings from having opened the file yourself.
