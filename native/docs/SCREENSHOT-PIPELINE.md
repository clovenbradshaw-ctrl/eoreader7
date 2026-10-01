# The screenshot pipeline

Standing: how a screenshot enters reading and generation. `native/tools/screenshot-to-html.html` (PR #144) is the
measuring instrument; this is the rest of the path. Everything named here is in the repo.

## What it is

A UI screenshot's structure is flat colour regions and text. Those can be **measured**, not described, so the screen
sense needs no vision model: it needs `ffmpeg` and `tesseract`, both local. The measuring code
(`adapters/image/screen-core.cjs`) is the tool's own, moved out of the page so the browser and node run one
implementation — byte-identical on the same pixels (tested).

```
image ──gate──▶ read ──▶ sidecar ──┬─▶ reading text, ledger lines, judge facts   (look.js: lookAtImage)
        │        │         │       ├─▶ the page, regenerated with no image        (htmlOf)
   not a screen  │    kept by sha256├─▶ design tokens ─▶ reference-fit ─▶ CSS      (screen-style.js: a page build)
   (photo): says │    + instrument  └─▶ gaps: what it did not see
   which number
```

| piece | file |
|---|---|
| the core, shared with the browser tool | `adapters/image/screen-core.cjs` |
| decode (ffmpeg), OCR passes (tesseract), settings with givers | `adapters/image/screen-read.js` |
| the sidecar `EOScreenLook@1`: tree, elements, tokens, gaps, store | `adapters/image/screen-sidecar.js` |
| the gate, `lookAtScreen`, judge facts | `organs/look-screen.js` |
| a screenshot as a style reference | `organs/screen-style.js` |
| the CLI | `cli/screen.mjs` |
| the round-trip eval (real Chrome) | `eval/screen-roundtrip.mjs` → `eval/results/screen-roundtrip.md` |

## Where it is used

**Reading.** `lookAtImage` (organs/look.js) runs the screen sense beside the OpenCV detector and the vision ladder. Its
measured text joins the reading; its facts join what a vision read is **judged against** (a vision model cannot outvote
a measurement); its `visual-box` lines join the fold. With no vision model and no OpenCV venv the reading still comes
back, and both absences are disclosed on the result. Reached from a workspace's images (`lookWorkspaceImages`) and from
an attachment carrying `base64` (`lookAttachedScreen`, in `runProxyTurn`'s attachment loop).

**Generation.** A page build (`proxy-runner.mjs`, the talk page) takes any screenshot the session has looked at as its
style reference: each is one reference signed into `reference-fit`; agreement derives a value, disagreement **refuses**
it; lengths are written in ems of the measured body text. The result is layered over the snipped stylesheet (or the
engine's own base sheet) and adds no words to the page — the provenance map is unchanged (tested).

**Shell.** `node cli/screen.mjs shot.png [--tokens|--style|--html out.html|--json out.json]`.

## Switches

`ER7_SCREEN=0` turns the screen sense off · `ER7_SCREEN_STYLE=0` stops sessions' screenshots styling builds ·
`ER7_SCREEN_DIR` moves the sidecar store (default `state/screen-looks/`, git-ignored) · `FFMPEG_BIN`, `FFPROBE_BIN`,
`TESSERACT_BIN` name the binaries.

## What it will not do

- **It is an observation, not a prior.** One screenshot is one witness. A token that rests on one observation is reported
  and not applied (`MIN_WITNESSES`, the floor binding.js already holds). Disagreeing references are contested, not averaged.
- **The settings were set by hand** in the tool (tolerance, minimum box, heading ratios, button bounds …) and no run
  derived them. `SCREEN_SETTINGS` names every one with its giver; they ride on every sidecar. Changing the core is a new
  instrument: sidecars are keyed by its hash and are not read back across it.
- **Photographs are refused, with the number.** The gate is the share of pixels in flat regions:
  0.861–0.976 over 12 UI screenshots, 0.404–0.676 over 17 aerial tiles; the floor is 0.77. One photographic family —
  pass `force` when you know better.
- **Image regions are a colour, not a picture.** What they depict was not read; the reading says so ("content not read").
  Text the OCR passes missed stays a gap. On the tool's own sample, the white-on-blue pill button "Get started" is
  one such miss: the core did not find it as a box and no OCR pass read its text (cause not established); it is reported as
  an unread image region at its pixel address, not guessed.
- **Fonts are not identified.** Sizes come from glyph extents; the page is generated in a system stack.
- **Density is a guess** (the width decides 1x vs 2x). That is why style lengths are ems of the body, not pixels.
- **Privacy.** A sidecar carries the OCR text of the screenshot. Workspace sidecars are stored under `state/` (git-ignored).
  Attachments are read from a temp file that is removed, and **no sidecar is kept** (`persist: false`) — the repo's posture
  that attachment bytes are never a file on this machine. The reading text passes the PII door on admission like any source.

## Measured

`eval/results/screen-roundtrip.md` (real Chrome): regenerating from the sidecar alone and re-reading the render recovers
98–100% of the words on the tool's generated sample, 45–48% on the Pocket Casts phone screenshot (a dark UI with small
text; its true density is unknown, read as 1x), 62–71% on the Grafana dashboard; pixel difference from the original is far under a blank
page's on all three. A recall bound, not proof of fidelity: a lost word may be the page's loss or the second read's.

## Not built

- Base64 attachments are dropped by `parseProxyRequest` (it keeps `{name, text}` with non-empty text), so a screenshot
  pasted over `/v1/chat/completions` does not reach `lookAttachedScreen`; callers of `runProxyTurn` (the holodeck notebook)
  and workspaces do. Widening the HTTP body is a decision about the API, not made here.
- Text-width fitting needs a font measurer; node has none, so regenerated text widths are the browser's natural widths
  (the browser tool fits them to the screenshot with canvas metrics).
- The notebook door still ingests images through flat OCR (`organs/ingest.js`).
