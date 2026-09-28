# The ladder as a reasoner, v7 — registered run, 2026-09-28

Driver at ce9dbb5 + the V7 header (copula reader in the mechanical rung).
152 model calls, 521 s model time.

| | prediction | result |
|---|---|---|
| P11 | the mechanical rung binds ≥ 8 true claims, refuses no true one, lands `holds` on no false one | **held** — **14** true bound (4 relations + 10 copula), 0 / 0 |
| P12 | ON pass 1 correct ≥ 10 at ≤ 34 calls | **held** — **14 right, 0 wrong, 21 calls: 0.67 correct per model call** (v6: 0.21; judge alone: 0.08) |
| P1–P4, P8, P10 | | held (ON 21 calls vs OFF 39; real 14 vs shuffled 7 mechanical) |
| P5, P7, P9 | habits, concessions, a judge landing | **vacuous** — every claim the judge had ever landed is now answered mechanically; the 20 left to the judge all pointed past the claim's words (`none`), so no habit was learned this run |
| P13 | the shuffled control's mechanical binds rise (a sentence-local organ) | recorded: 7 vs 14 — half, not equal; **and one of the seven was a FABRICATION.** |

## The finding: the control caught an adjacency gap

On the shuffled Dracula, the copula reader landed `holds` on the false
claim *"Van Helsing was the first"* from the sentence *"I accept your
limitation," said Van Helsing, "and all I ask of you IS that if you feel it
necessary… you will FIRST consider it well…"* — the subject appears
somewhere before a copula, the one-word complement appears somewhere
after it. Containment on both sides, but neither side ADJACENT to the
copula: the claim's shape is subject · copula · complement, and the organ
had read it as a bag on each side. It did not fire on the real book (0
fabrications on every real arm), which is exactly why a control built to
fail is run: the real book happened not to offer that sentence.

v8's rule, structural: the claim subject's last content word must be the
last content word before the copula, and the complement's first content
word the first after it — the sentence's own arrangement, not two bags.
Registered before the run.
