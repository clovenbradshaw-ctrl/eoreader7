# archons

The named watchers/organs of the reading instrument, and the historical-figure
"carriers" that give each its handle.

- `native/organs/<archon>.js` — the organs themselves (aletheia, ashby, clippy,
  elenchus, gary, kairos, kondo, muninn, nagarjuna, panini, parmenides, logos,
  huginn, solon, passage-comparison, activation-retrieval), none importing a
  surface. What a surface owns and an organ needs is handed in: huginn mirrors
  the room's `ROOM_FALLBACK_KINDS` (pinned by the fold's test);
  passage-comparison and activation-retrieval are factories
  (`makePassageComparison`, `bindActivationRetrieval`) the surface binds; solon
  is a library that keeps whatever `root` it is handed (its authoritative
  archon REGISTER is in its header; `solon.html` here is its status page). Exposed through the single seam
  `native/organs/index.js` (a name that collides with another organ's is
  prefixed by the organ, e.g. `GARY_SEVERITY`, `NAGARJUNA_RULES`).
- `native/archons/carriers/<name>.js` — the historical figures whose handles the
  register uses (Boethius, Cervantes, Dante, …). Carriers hold the header that
  says who the figure is and what the organ borrowed from them; they carry no
  behaviour.
- The archons' **content** — their sayings, native-language voices, the works that
  would supply their own words — is data, and lives in
  `live_priors/derived-priors/archon-voices/`.

History: these lived in `the-fold` (a surface). On 2026-09-28 they moved down —
the surface holds no archon code or data; it imports the organs through the seam
and reads the content as a prior. Nothing here imports the surface.
