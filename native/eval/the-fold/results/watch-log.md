## Wake 1 (run 2, new architecture)
- 10 exchanges in ~9 min (vs ~4 in 12 min on baseline) — flat-task small prompts ≈2x throughput; decode measured 13 tok/s, shown in status.
- Asker quality transformed by person/event prompt + loop breaker: Karatáev, Stepán, Rostóv affairs — zero essay questions, zero theme loops (basis: 1 seed, 9 asker).
- Records: 8/10 recorded, 5 with unsupported (baseline: 10/11) — heading fix working.
- FIXED this wake (land on next reload): (1) provenance spans mostly unmatched — render.js line-splitting broke strict sentence inclusion; now whitespace-flexible findSentence in all four call sites. (2) question-echoed names (Karataev's) polluting records — unsupportedClaims now drops echoesQuestion findings (stripe keeps them). 122/122.
## Wake 2 (run 2, exchanges 25/50 target)
- THE CROSSOVER: carried 3,622 chars standing in for 8,180-char transcript at turn 25 (was 8.5k>7.7k at turn 4). The fold's central claim, measured live on the new architecture.
- Health: 23/25 recorded, 12 unsupported (48% vs baseline 91%), loop breaker firing (basisTail shows seed-loopbreak x2), 0 errors, ~1 exchange/min.
- Residual unsupported classified: 4/5 sampled are question-echoes (pending filter clears on reload); 1/5 real pretraining drift correctly flagged (Natasha volunteered on a junk-retrieval question).
- NEW typed limit found: corpus writes "Prince Andrew" (Maude), model writes "Prince Andrei" — transliteration variant; engine-tier coreference correctly refuses; closable only by a received prior with a giver (candidate: small W&P translation-variants prior). Not a mechanical fix; documented.
- No code change this wake — pending fixes cover the dominant class; forcing one would be change for its own sake.
## Run 2 COMPLETE — 100 messages, 50 exchanges, 0 driver errors
- METER, final: 3,223 chars carried standing in for 21,818-char transcript (6.8x, and carried FELL from 8.5k at turn 4 to 3.2k at turn 50 — records capped, framing amortized). The fold's claim, held at length, on the 100%-task architecture.
- Records: 43/50 turns recorded; cited or attributed on ~35. Throughput ~1.1 exchange/min sustained (2x baseline).
- Turn 32: an asker question auto-gated into a MULTI-PART task mid-dialogue — 4,729-char answer, 49 chips, 46 material-ground sentences. The gate composing on its own.
- Loop breaker: 10 seed-loopbreaks across 50 — fired when Natasha/Anatole and comet threads circled; asker otherwise self-directed (39/50 asker-basis).
- Provenance underlines partially live even pre-fix (single-line sentences matched); full coverage lands with findSentence on reload.
- Residual noise found and fixed this wake: (a) line-initial bold pseudo-headings with trailing text ("**Anatole's Effect:** ...") — bold-span blanking extended; (b) capitalized contractions ("Isn't") read as name atoms — filtered, narrow.
- Dominant remaining unsupported class is question-echoes (Prince Andrei xN) — filter already landed, applies on reload.
## Wake 6 (run 3 at 26/50)
- Unsupported: 2/25 recorded turns (8%) vs run-2 midpoint 55%. Records are now nearly pure signal.
- Meter: 3,080 carried / 16,070 transcript (5.2x) — echo-free records shrank carried below run-2's same-point value.
- Asker writing the corpus's own diacritics back ("Dólokhov") — spelling learned from grounded answers.
- Nothing broken, no new defect class; no forced change (P10 discipline). Completion expected ~20 min.
## Run 3 COMPLETE — the night's cleanest numbers
- METER: 3,205 chars carried / 42,018-char transcript = 13.1x (run 2: 6.8x at 21.8k). Carried stayed FLAT (~3.2k) while the transcript doubled — the fold's claim at its clearest.
- Records: 49/50 recorded; 5/49 with unsupported (10%) vs run-2 ~50% and run-1 91%. Remaining five: 1 transliteration variant (Natalia), 1 list-lead class (Shock/Anxiety — fix lands with this reload), 3 plausible honest drift (Moscow/Conversation, Michael Ivánovich, Berg's — model names absent from that turn's passages).
- PROVENANCE at scale: 314 material-ground sentences, 190 model-ground, 12 striped, 389 clickable address chips across 50 turns.
- Basis: 36 asker / 13 loopbreak / 1 seed. Zero driver errors, zero engine errors, ~1.3 exch/min.
## Wake 7 (run 4 at 18/50)
- ZERO unsupported turns in 17 completed (run 3: 10%, run 2: ~50%, run 1: 91%). Noise classes drained; records are signal.
- Provenance majority-material: 292 material-ground vs 221 model-ground sentences at midcourse.
- Clean-run improvement landed for next reload: expected-duration in the holonic ticker — predictCall from measured pace (prefill on the part's actual promptChars via new execute-event field, decode on the conversation's own mean output), typed "pace unmeasured" before first call. foldPace gains meanOutTokens. 123/123.
## Run 4 COMPLETE — measurement-grade records
- METER: 3,638 / 51,403 = 14.1x (new largest transcript; carried flat 4 runs straight).
- 50/50 recorded; 4/50 unsupported (8%) and ALL FOUR honest: 3x model naming characters absent from that turn's passages; 1x model citing an address it was never offered (checkCitations catch, rendered as dead ref).
- Provenance: 404 material-ground vs 359 model-ground sentences, 10 striped.
- Two consecutive runs with zero false-positive record noise: the checks are at signal. Run 5 adds a multi-anchor seed to exercise the model-plan path in dialogue.
## Wake 8 (run 5 at 10/50)
- Multi-anchor seed fired at turn 7 → auto-planned multi-part turn mid-dialogue (model-plan path exercised). Ticker live during rewrite phases.
- 2/9 unsupported: 1 honest (Kurágina absent from that turn's passages), 1 new noise variant fixed this wake: list-marker lead ("1. Social…") slipping the sentence-initial test — lead pattern now includes markers. Also: correction calls now emit promptChars so the expected-duration shows during rewrites too.
- Pace honest under load: 6 tok/s measured (asker+answerer share the GPU), shown as such.
## Wake 9 — tab loss and recovery
- The browser pane was closed between wakes; run 5's page state (and its uncaptured turns) died with the tab. serve.mjs stayed up. Honest loss: run 5's data beyond wake-8's probe is gone — the eval driver (eval/dialogue.mjs) writes JSONL to disk per turn and doesn't have this failure mode; the in-page run trades that durability for visibility.
- Restarted immediately as run 5b on a fresh tab — newest code active (list-lead atom fix + rewrite-phase prediction now live in-page for the first time).
