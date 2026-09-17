# Swarm Media + Corpus Exploration — what the swarm found on video, audio, and the full live_priors

Companion to CODING-LESSONS.md and wilson.mjs's own HEADS-UP. Written 2026-09-17.
Everything below is a measured run of the swarm's reading machinery (wilson.mjs,
reading-shape.mjs, eot-jsonl.mjs) — no golden, no hand-tuning per corpus.

## 0. The pipeline that made this possible

Films were pulled from archive.org (public domain), transcribed locally with
MLX whisper-small on an M3 (`whisper-models/whisper-small-mlx`), and the
transcripts fed to the swarm exactly like a book. Two corpora of recordings
already in the tree (`sept23-audit-committee.wav`, `17-530.mp3`) were
transcribed the same way. A turn-organ prototype (`av-turns.py`) does
per-segment pitch/energy/centroid clustering on raw 16k mono wavs.

## 1. The four structure axes — arbitrary content is no longer arbitrary

Every corpus the swarm read lands on four measured, independent axes:

| Axis | What it measures | Range seen |
|---|---|---|
| Entity survival | real beings admitted (recur ≥2, non-initial) | 0–50 per corpus |
| Void rate | share of sentences with unbound pronouns | 0%–81% |
| Shape (fitness) | purity + low-void + emission | 0.61–1.0 |
| Grounding (witness) | open/release vs no_ground/withhold | binary |

### Void rate is a content-type classifier
| Content type | void % | examples |
|---|---|---|
| Governance speech | **6%** | audit committee meeting |
| Film dialogue | 16% | His Girl Friday, Detour |
| Operational jargon | 18% | schema inventory, nine-jobs |
| Encyclopedia / tech | 1–23% | EB1911, d2l, postgres |
| Literary prose | 36–48% | Pride & Prejudice, Looking Glass |
| Legal argument | 36% | SCOTUS 17-530 |
| Foreign-script misread | 0–81% | Faust 1%, quranyusuf 81% |

Real spoken governance names everything; literary prose lets pronouns roam.

### The witness is the off-page-world detector
- **open/release** (self-contained narrative, swarm has headroom): Alice ch1,
  Fabre cigale ch1 — the only corpora the swarm storm could improve (+0.013).
- **no_ground/withhold** (content projects a world outside its own text):
  every film, the mantis chapter (prey off-page), SCOTUS (statutes off-page),
  the audit meeting (the city beyond the room), every live_priors chapter read
  in the census. Saturated shape (0.87–0.96), zero swarm headroom.

Content that reads `no_ground` is content whose structure lives outside its
surface — precisely where the next organs should go (speakers, turns,
ground-from-video, typed-absence-as-world-map).

## 2. The full live_priors census (33 files, 13 categories)

Batch: `node eot-jsonl.mjs <file> 1 --ledger-name=lp-<slug>`, then
reading-shape + entity extraction. Ledgers: `results/lp-*.eot.jsonl`.

| slug | sents | void% | fit | surviving entities |
|---|---|---|---|---|
| alice | 87 | 46 | 0.80 | White Rabbit, Alice |
| lookingglass | 176 | 48 | 0.86 | Red Queen, Alice, Kitty, King, Dinah |
| pride | 77 | 36 | 0.82 | Mrs, Kitty, Lizzy, Mary |
| tomsawyer | 219 | 36 | 0.89 | Aunt Polly, Tom, Sid |
| leavesofgrass | 145 | 21 | 0.94 | States, America, Paumanok, Democracy |
| lesmis | 20219 | 39 | 0.88 | Monseigneur Bienvenu, Ma'am Bougon |
| faust | 3847 | 1 | 0.99 | Welt, Mann, Teufel (misread) |
| ebmath | 354 | 23 | 0.92 | Bertrand Russell, Infinitesimal Calculus |
| ebphil | 237 | 44 | 0.87 | Kant, Plato, Aristotle, Hegel |
| wikimath | 446 | 12 | 0.94 | Cambridge UP, Princeton UP, Einstein |
| ioannidis | 4 | 0 | 0.63 | (chunk failed) |
| d2lattention | 116 | 3 | 0.99 | CNNs, RNNs, Positional Information |
| uscode | 377 | 1 | 1.00 | National Defense Authorization, US |
| udhr | 2 | 50 | 0.85 | (chunk failed) |
| metmuseum | 494 | 1 | 0.98 | Robert Lehman, Costume Institute |
| wikinews | 51 | 18 | 0.89 | BBC News Online, Wikinews |
| postgres | 2 | 0 | 0.60 | XIDs |
| great78 | 6 | 0 | 0.76 | (catalog front matter) |
| pdfilms | 34 | 3 | 0.99 | Encyclopaedia Britannica, Motion Pictures |
| wpaligned | 136 | 0 | 0.70 | Василий, Анатоль, Болконский (Cyrillic) |
| greekmatt | 583 | 0 | 0.61 | Φαρισαῖοι, Ἰησοῦ, Ἰωάννης, Πέτρος |
| quranyusuf | 107 | **81** | 0.73 | Allah, Joseph, Qaloo, Jacob |
| kinglear | 2399 | 16 | 0.93 | (front-matter window) |
| othello | 2761 | 19 | 0.93 | (front-matter window) |
| cryptics | 1133 | 6 | 0.98 | Salad Days, Potts, Mahowald |

Limitations logged, not papered over:
- Chapter detection grabbed Gutenberg/Folger front matter for some works
  (kinglear, othello, middlemarch, warandpeace, wikimongol) — the window is
  the title page, so sentences ≈ 0. Re-read those with an explicit chapter.
- Non-English corpora are read by the English/Latin-script reader (a declared
  stress test): German/lesmis read "clean" (low void) by accident, Arabic
  transliteration hits 81% void, Greek 0% void — the void axis is only
  meaningful for the reader's own language.

## 3. The insect census (Fabre, "Social Life in the Insect World", 1911)

Real species the swarm's reading kept alive (entities, occurrences) across 21
chapters — all surviving as real beings, ranked:

| Species | peak occurrences | Fabre's chapter |
|---|---|---|
| Cigale (cicada) | ×60 | I–IV, XX |
| Philanthus (bee-wolf wasp) | ×54 | XIII |
| Praying Mantis | ×49 | V–VII |
| Oak Eggar moth | ×24 | XV |
| Cricket / Italian cricket | ×24 / ×14 | X–XI |
| Bruchus (pea weevil) | ×20 | XVIII |
| Sisyphus (dung beetle) | ×17 | XII |
| Balaninus (acorn weevil) | ×16 | XVII |

The swarm's survival laws map to real biology: the cigale is dormancy + the
return-curve (the only insect that grounds — witness open), Sisyphus is
decay-unless-reinforced (the ceaselessly-worked pellet), Philanthus is
stigmergic provisioning (its chapter is the most void-heavy, 34% — prey
consumed off-page). The mantis chapter reads like the films: shape 0.960,
no_ground, zero headroom — the mantis closes the field on itself.

## 4. The audio/tempo channel

Word-rate (whisper word timestamps, else segment text):

| Corpus | mean wpm | peak | note |
|---|---|---|---|
| His Girl Friday | 190 | 307 | screwball; peaks at the famous city-room opening (min 7–9) and climax (min 67–69) |
| SCOTUS 17-530 | 181 | 257 | oral argument nearly as fast as screwball |
| Audit committee | 145 | 214 | deliberative governance pace |
| Detour | 123 | 256 | noir; single frantic peak (min 38–40), longest silence 103s |

Turn-organ (`av-turns.py`): 2-cluster F0/energy per segment. Discriminating
axis is **voice balance, not turn alternation**: Detour is narrator-dominated
(67/33, F0 131 vs 207 Hz), His Girl Friday a balanced duet (57/43). Whisper's
segments don't map to turns and collapse true overlap — measuring overlap needs
raw-audio energy gaps, not whisper boundaries. That is the missing organ.

## 5. Swarm-side lessons (measured this session)

1. **CLI argument shape is a real trap.** `--book <path>` with a space is
   silently ignored (parser reads `--book=<path>`), so the swarm quietly
   re-read the default Alice. Exactly CODING-LESSONS #8. The Detour "swarm
   run" was Alice until caught — check the ledger basenames, not the log.
2. **The swarm only has headroom on grounded, self-contained content.**
   Every saturated+no_ground corpus (films, mantis, SCOTUS, audit) refused
   every variant; the two grounded corpora were the only ones improved.
   Breeding against a saturated metric is the monotone-landscape failure
   again — the fix is new axes, not harder reads.
3. **Whisper-small quality is the floor for the A/V thesis.** 1945 mono audio
   mangles lines ("a motor I call a sleeper" → "a talker I call a sleeper"),
   case citations degrade, speakers are not diarized. The word channel is
   saturated and lossy; the structure lives in tempo, turns, overlap, and
   typed absences — none of which whisper gives you for free.

## 6. Next variants (in the repo's own vocabulary)

- A `turn` organ: MFCC features + energy-gap turn-cutting + a true overlap
  detector on raw audio, feeding a per-corpus turn-shape axis.
- A `ground` organ fed by video (visual referents) so film stops reading
  no_ground — the typed-absence count *is* the off-screen world map.
- Census re-reads of the front-matter-misread works with explicit chapters;
  a `--lang` pass over the multi-language corpora as a declared stress test.

## Artifacts
- `movies/av-turns.py` — turn-organ prototype (needs the raw wavs, not committed).
- `movies/fabre-chapters/` — Fabre corpus split into 21 chapter files.
- `movies/arbitrary/` — SCOTUS + audit-committee transcripts (txt).
- `results/lp-*.eot.jsonl` — the 33-file live_priors census ledgers.
- The large media (mp4/wav) are regenerable and NOT committed.