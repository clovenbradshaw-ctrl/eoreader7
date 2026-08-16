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
## Wake 9.5 (user-directed, mid run 5b)
- ONE affordance: the material table merged into the turn's single fold disclosure (user directive); .evidence details removed from addMessage; renderEvidence appends a "material · N retrieved, M cited" section into the same box.
- Marks made instruments (user: "make it more meaningful"): dotted/wavy sentences are clickable — groundHunt retrieves on the sentence's own words and opens the best passage in context, or says nothing matches; tooltips now speak to trust ("you are trusting the model here"); per-answer ground tally line partitions sentences into material / model's voice / unbacked facts.
- Intro legend rewritten around who stands behind each sentence. All land at next reload (run 6). 123/123.
## Wake 10 (run 6 at 9/50 — one-affordance + instrument-marks build)
- New UI verified in flight: single fold disclosure (meter + S1 + S2 + run log + material table), clickable marks, per-answer ground tally, expected-duration ticker ("~30s expected (measured over 2 calls)" seen live).
- Tally exposes the transliteration class per-turn now: consecutive turns tallying "1 unbacked fact" that is Andrei-vs-Andrew (and "Napoleonic Wars", a phrase the corpus never writes — honest). No mechanical fix exists; the received prior (user as giver) is the closure.
- No breakage, no forced change. Meter 2,948/7,696 early-curve as expected.
## Wake 11 (user-directed verification burst) + Run 6 COMPLETE
- User asks answered with evidence: (1) LOCAL MODEL CONFIRMED — ollama ps shows only gemma2:2b (2.6B, Q4_0, 2.08GB VRAM, ctx 8192); page network log is 100% localhost:11434/api/chat. (2) FACT-CHECK — t47 verified literally against its cited bytes (Pierre among the wounded, Mozháysk); sweep found 8/50 ECHO answers (question restated as answer, sometimes chipped by attribution because question words match the passage). (3) Reopen modal: backdrop-click-to-close added (hot-patched live + source); refContext pinned across prose/CSV/container-stripped/bad refs in new explore-bridge.test.mjs.
- NEW CHECK from the fact-find: echo detection in runPart — an answer contributing zero content words beyond the question (addresses stripped) is typed "restates the question; nothing established" and grounds NO refs (circular support is not support). Set containment, threshold-free. 128/128.
- Run 6 captured (echo class present, measured; the guard lands in run 7).
## Wake 11.5 (user: chips obstructing text)
- Chip-per-RUN rendering: consecutive sentences standing on the same address now carry ONE chip on the run's first sentence (14 identical chips through one quotation → 1); the underline carries the ground for the rest; a new chip appears only when the address changes; model-cited sentences reset the run. 128/128. Run 7 restarted with it live.
## Wake 12 (run 7 at 23/50)
- Echo guard measured live: 4 turns typed "restates the question; nothing established" with refs cleared — the class run 6 passed silently as grounded (8/50) is now on the record as what it is. Stable ~17% echo rate for the 2B; every instance visible.
- Chip-per-run verified at scale: max 3 attached chips in any turn (was 14 through one quotation).
- 2/22 unsupported, 0 errors, meter 4,481/34,861 (7.8x at 23 exchanges). No new defect; no forced change.
## Run 7 COMPLETE — fully typed records
- 50/50 recorded; 7 echoes TYPED ("restates the question; nothing established", refs cleared) where run 6 had 8 passing silently as grounded. Echo rate stable ~15%; now every one is record-visible.
- 2/50 unsupported, both honest-class. 267 material-ground / 227 voice / 5 striped sentences. Max chips per turn: 3.
- METER: 3,918 / 51,916 = 13.3x. Zero errors. The instrument now types every failure mode the runs have surfaced: heading noise, echoes, list-leads, contractions, transliteration variants, address fabrication, question restatement.
## Wake 13 — second pane loss; driver made durable
- Pane closed again between wakes; run 8's page state lost (its turns uncheckpointed — second occurrence of this loss class).
- STRUCTURAL FIX in driver v5 (run 8b): every completed exchange now posts its per-turn record to the :8812 content-addressed deposit store as it lands (run8b-turn-NNN.json). A closed tab now loses at most the exchange in flight. Restarted with the fresh whole-novel seed set.
## Wake 13.5 (user: turns top-right + masthead)
- Turn counter moved to header, right, beside the model chip — matching pill styling (mono, hairline border). Updates from renderThreads (every turn + convo switch).
- New masthead: three-pleat SVG mark (opacity fading — the fold's own mechanism as a glyph) + "the|fold" wordmark (300-weight muted / 750-weight accent). Favicon matches. Hot-patched live; permanent in source. 128/128.
## User: "why's it just reproducing stuff?" — third failure class found, checks corrected
- Root cause: a part answer's decode budget was the app-wide 4096-token default (no cap), so nothing bounded a "who is X" part from transcribing a whole chapter. checkGrounding/attribute pass a verbatim reproduction as perfectly clean — every word IS in the bytes — so it sailed through as "grounded" while answering nothing.
- User's correction to my first fix: grounding it isn't the bar — it must fail for not answering. Rewired: judge() now runs BOTH the echo test (restates the question) and a reproduction test (the whole draft, folded, is a verbatim substring of an offered passage) BEFORE the correction loop, not after — either failure now triggers the SAME bounded correction pass as an unsupported claim, with a mode-specific rewrite instruction ("copying is not answering... answer in your own words"). Both tests threshold-free containment, same discipline as echo detection.
- EXECUTE_MAX_TOKENS=512 added as a named part-answer budget (was unbounded) — the actual permit that let reproduction run to a whole chapter.
- Tests: reproduction-corrected, reproduction-stubborn-fails-with-typed-open-and-no-refs, matching the echo pair. 130/130.
