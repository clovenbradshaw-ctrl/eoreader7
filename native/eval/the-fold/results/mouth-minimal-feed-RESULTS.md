# mouth-minimal-feed — how little can the mouth be fed

*2026-09-15T18:23:34.149Z · 4 arms × 5/5 models complete × 10 questions × 3 trials/cell @ temp 0.7.*

The user's own question: "test how we feed the mouth the minimal amount possible to get it to respond accurately with the proper stylization (typically you need to talk to the mouth in the way you want the mouth to talk)." Arms vary ONLY the feeding of one call — the fold's pipeline is not involved. **clean** = accurate AND no stylization violation (apparatus/framing/bounce/verbose/restate — the fold's own voice, scored mechanically). Paired comparisons are the exact binomial sign test on the same trials.

## Per model — clean / accurate

| model | bare clean | exemplar clean | currentFlat clean | currentChat clean | bare acc | exemplar acc | currentFlat acc | currentChat acc |
|-------|---|---|---|---|---|---|---|---|
| smollm2:1.7b | 0% | 3% | 10% | 17% | 97% | 87% | 100% | 97% |
| phi3:mini | 10% | 47% | 13% | 17% | 100% | 97% | 90% | 93% |
| gemma2:2b | 0% | 43% | 50% | 77% | 100% | 90% | 93% | 97% |
| llama3.2 | 0% | 40% | 33% | 60% | 93% | 100% | 93% | 100% |
| olmo2:7b | 3% | 70% | 20% | 13% | 97% | 100% | 93% | 97% |

## Pairwise, pooled across all models and trials — is arm A better than arm B (paired sign test)?

| A | B | A clean | B clean | A>B (trials) | B>A (trials) | p |
|---|----|--------|---------|-----|-----|-----|
| bare | exemplar | 3% | 41% | 2 | 59 | 0*** |
| bare | currentFlat | 3% | 25% | 2 | 36 | 0*** |
| bare | currentChat | 3% | 37% | 2 | 53 | 0*** |
| exemplar | currentFlat | 41% | 25% | 39 | 16 | 0.0027** |
| exemplar | currentChat | 41% | 37% | 31 | 25 | 0.5044 |
| currentFlat | currentChat | 25% | 37% | 13 | 30 | 0.0137* |

Reading the sign test: the column "A>B" counts trials where A was clean and B was not; "B>A" the reverse. A p<0.05 means the asymmetry is not chance.

## Verdict per tier

- **?** (smollm2:1.7b, phi3:mini, gemma2:2b, llama3.2, olmo2:7b): best arm by clean — **exemplar** (61/150), then currentChat (55/150), currentFlat (38/150), bare (4/150)

## The A/B that matters: does the MINIMAL exemplar feeding match the fold's own production prompts on stylization?

exemplar 41% clean vs currentChat 37% clean — p = 0.5044. exemplar leads.


## Sample answers (gemma2:2b, 3 questions)

**Q:** Who was Abraham Lincoln's first vice president?
- bare: ✓ "Abraham Lincoln's first vice president was **Hannibal Hamlin**." [restate]
- exemplar: ✗ "Andrew Johnson."
- currentFlat: ✓ "His first vice president was Hannibal Hamlin." [restate]
- currentChat: ✓ "Hannibal Hamlin."

**Q:** Who was Franklin D. Roosevelt's first vice president?
- bare: ✓ "Franklin D. Roosevelt's first vice president was **John N. Garner**." [restate]
- exemplar: ✓ "John Nance Garner."
- currentFlat: ✓ "John Nance Garner."
- currentChat: ✓ "John Nance Garner."

**Q:** What US state is Nashville the capital of?
- bare: ✓ "Nashville is the capital of **Tennessee**." [restate]
- exemplar: ✓ "Tennessee."
- currentFlat: ✓ "Tennessee"
- currentChat: ✓ "Tennessee!"

