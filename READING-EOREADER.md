# Reading EOReader

*A guide for humans and agents, from the outside in.*

Standing: nomination. This is a guide, checkable. Every mechanism named here
points at a real file, and you can re-open any of them; where the code and
this guide disagree, the code wins. The register is yours: this page is the
plain register, and each layer names the working and formal altitudes one ask
away. Nothing here is narrated that was not earned by the file it cites.

---

## Before you begin

**Who this is for.** A person or an agent who has just met EOReader and wants
to know how it works — not what it claims, but what it does, turn by turn,
file by file.

**How to use it.** Nine layers, outside in. Each layer has three parts: what
you'll see, what to do, and one thing to try. Do the things. The guide is
written so that the doing is the understanding; the words are only the
scaffolding.

**How claims descend.** Every claim below carries where it was read from, in
path and line. If a claim matters to you, open the file. That habit is not a
footnote; it is the entire subject of this guide.

**One word you need before anything else — *ground*.** The corpus defines it
as *a nothing constructed by perturbing what is present*
(`SEED-SPEAKER.md:26-29`). You will meet the word about forty more times
before you are done, and by the end it will not be a word.

**Where things physically are** (workspace root, `/Users/mlacy/Documents/3.0`):

- `eoreader7/` — the engine. `proxy.mjs` (the connection surface),
  `proxy-runner.mjs` (the turn pipeline), `native/` (kernel, organs, adapters,
  docs, eval), `cli/` (TUI, browser, facing page), `documents/` (session
  records), `canon/` (the committed ground texts).
- `the-fold/` and `the-fold-latest/` — a surface on EOReader 7. A separate
  repo; imports the engine through `eoreader7/native/organs/index.js`, the one
  seam, never the reverse (`eoreader7/README.md:136-147`).
- `SEED-SPEAKER.md`, `FOLD-CONSTITUTION.md`, `EO-LINEAGE-COMPLIANCE-GUIDE.md`
  — the seed, the workbench constitution, and the cross-repo map of what binds
  what, all at the root.

---

## Layer One — The door

**What you'll see.** A single process, several doorways
(`eoreader7/proxy.mjs`). Plain `POST /v1/ask`; Code `POST /v1/code` (a
bounded, physics-gated loop with a disclosed audit trail per round); and the
three familiar protocols — OpenAI-compatible `POST /v1/chat/completions`,
Ollama-compatible `POST /api/chat`, Anthropic-compatible `POST /v1/messages`.
All of them back onto the same turn and the same admission gate. The proxy
listens on `127.0.0.1:11436`; Heimdall, the watcher, on `11437`; the browser
surface on `11438`. Four headers ride with a request: `x-er7-session`,
`x-er7-user`, `x-er7-workspace` (the absolute path that admits real files),
`x-er7-mode`.

Before anything is read, it is admitted. `GET /` is a self-describing map —
the machine's account of itself in its own words. `GET /health` is liveness;
`GET /heimdall` is the vitals and the admission state; `GET /content-rules`
is the ledger of standing rules it has learned about hard material. A busy
box refuses new work with a **typed 429 and a `Retry-After`** on every
doorway — saturation, family caps, a queue with zipper passes
(`eoreader7/heimdall.mjs`).

And one thing happens before admission, because it must: material that is
garbled, truncated, badly encoded, structurally dense, or void is detected
mechanically, and a turn pointed at it is routed to a *capacity swarm* — a
swarm needs no model, so it is never gated by one. The swarm consults the
standing rules by name (never re-derived from scratch) and preserves what it
learns back into the ledger (`eoreader7/native/eval/lavar/hard-meaning.mjs`,
`eoreader7/content-rules.mjs`).

**What to do.** Read the refusals as carefully as the answers. A refusal here
is a measurement wearing a message.

**Try.** `curl http://127.0.0.1:11436/` and read what the machine says about
itself. Then `/health`, `/heimdall`, `/content-rules`. If you ever catch the
429, read it twice — it is telling you how full it is, and when it expects
room.

**What you'll have learned.** The machine does not pretend to be infinite. It
counts what it is carrying, it tells you when it is full, it says why, and it
keeps a ledger of what it has learned about the hard parts of the world. Its
first act toward everything that arrives is to measure whether it can hold
it.

---

## Layer Two — The surface

**What you'll see.** Two thin surfaces over the same engine: the terminal
(`eoreader7/cli/tui.mjs`, run `eoreader7`) and the browser
(`eoreader7/cli/browser.mjs`, run `eoreader7 -browser`, port 11438). Tabs,
grounded chat, a transcript, and one page that is not like the others.

A full response is **two pages** (`eoreader7/cli/holograph.mjs`,
`eoreader7/cli/format.mjs`). The left page is **THE SOURCES**: each material
fact numbered `S#`, carrying a *permanent address* — source file, byte offset,
e.g. `pg2600.txt#1627174` — and the **verbatim snip read from the real file**
at that address. The right page is **THE RESPONSE**: every sentence tagged
`[S#]` (it draws from that source fact) or `[M]` (the mouth's own prose, and
nothing on the left page stands under it). Below both, collapsible, the
reasoning **NOTES** that connected them.

The rule of reading, stated plainly: **read the left page before the right
page.** And read the NOTES before trusting a response that seems to overreach.

**What to do.** Treat the response as one half of a claim. The claim is not
complete until you have seen its other half.

**Try.** Point it at any file in the corpus — `eoreader7/canon/` holds
committed ground texts, and `documents/` holds session records. Ask a
question. Open `/facing`. Read the left page first. Click a sentence and
watch it light up its source fact.

**What you'll have learned.** A claim is two pages. The voice is never the
body. And the machine marks its own sentences: `[M]` is a sentence the
machine knows is its own, marked so it can never be mistaken for the book's.
This will matter more than anything else you see today.

---

## Layer Three — The turn

**What you'll see.** What happens between ask and answer, in order
(`eoreader7/proxy-runner.mjs:3672`, `runProxyTurn`):

1. **Ethos first.** The constitution arms the charter family; `ethosClear`
   produces the clearance the reader *requires* — remove it and every turn
   breaks. The interlocutor reads who is at the door, mechanically, from the
   doorway and the request's shape, never from the content. The moral shadow
   is assessed; the register (field/tenor/mode) is derived.
2. **Mechanical pre-hands.** Verbatim-quote asks are snipped from a primary
   source with zero model tokens. Famously open problems are declined
   mechanically. And the *precision race* runs: arithmetic, logic, and
   preference solvers run beside the turn — **a settled mechanism is an
   observation, and the observation wins.** The model's draft rides the
   result as *superseded*: out-weighed, never erased.
3. **Workspace admission.** If `x-er7-workspace` names a path, real files are
   admitted into the session corpus, PII-checked at the door. Images are
   *looked* at, not guessed at.
4. **The reading.** The material is cut into encounters and stepped through
   the recursive reader (Layer Four).
5. **Surfacing.** The address ladder runs over the corpus; **a file this turn
   resolved surfaces first** — the QUA-FILE guarantee. Each surfaced segment
   carries its ledger: source, heading, how it was addressed, bytes. Only
   this turn's grounding is citable.
6. **Grounding.** The ground seed draws from the corpus; checkable claims
   pass the fact gate; conflicting claims on the record resolve by Kelsen's
   precedence order, never a silent pick.
7. **The mouth's draw.** The system prompt is composed from the standing
   character, the cued facts, the surfaced segments — **never the addresses,
   which are struck** — and the resolutions. The model streams; thinking
   markers are stripped; one gate (AntiStrauss) stands at the single choke
   point of every model call.
8. **Verification.** The citation ledger splits the answer; the paraphrase
   chase runs; pacing, story shape, style, the charter gate, the PII gate,
   the injection gate, the security gate, the blindspot gate, the privacy
   gate — all run, and all ride the result as disclosed findings.
9. **The typing.** Each sentence is typed: **material** if it carries a
   ground fact's ends (it gets that fact's byte address), **self:model** if
   it is the mouth's own prose — *marked, never laundered into the record.*
   The verdict line says it out loud: *X of Y sentences grounded in the
   record; Z are the mouth's own prose, marked self:model.*

And the part that governs the feel of every answer — **the standing.** "Stated
once so far." "Contested — not settled." "Out of its validity window." "I
looked for this and did not find it." And the three not-knowings, which must
never render alike: **"I don't know," "the material does not say," "I didn't
look."** Selection is an axis: the search around the answer is counted — *the
shuffle found this too, 41 times in 200 — and you have looked 38 times.* And
the mouth test, from the constitution (`FOLD-CONSTITUTION.md`, Article II.9):
no number, name, date, or quantity is emitted as model tokens; a model may
phrase, order, narrate, translate a register, and propose — **it may never
originate a fact.**

**What to do.** Read for the standing before the content. When you don't see
it, ask what it rests on. The witness budget is the caller's declared number
— never a default; if you do not declare one, the witness rows are typed
`skipped`, and the answer tells you so, per sentence.

**Try.** Ask something the material cannot answer. Read the shape of what
comes back — it will be one of the three not-knowings, typed. Then ask: *what
would settle this?* Watch the answer name the exact thing that would close
the gap.

**What you'll have learned.** An answer is a standing wearing prose. The
chase is shown, not hidden; the refusal is part of the answer; a gap is a
result. The machine would rather tell you it cannot compute than tell you it
can — and it will tell you *what it did* before it tells you what it
believes.

---

## Layer Four — The reading

**What you'll see.** What a document undergoes when it is pointed at. The
material is cut into encounters, and each is stepped through the reader
(`eoreader7/native/kernel/reading.js`) in the canonical cycle:

**Fold → Orientation → Encounter → Perception → Challenge → Witness →
Interrogation → DeltaFold → revised Fold.**

`Challenge` is constitutive but non-evidentiary — without a challenger the
stage is identity-preserving (`eoreader7/README.md`). The wheel turns under
the whole cycle (`eoreader7/native/kernel/wheel.js`,
`eoreader7/native/docs/THE-WHEEL.md`): the **Void** is the hub, the **Beings**
are the spokes, the **Fold** is the rim — *from nothing, the many; from the
many, the one.* The hub must stay empty to turn.

Six true things, each stranger than it sounds:

- **The reader is causal.** A sentence is scored only with what came before
  it. Reading the whole book before scoring anything is a lookahead bound,
  and the code says so out loud. A reader who would have read differently had
  it known how the book ends is not reading.
- **A motif can only recall on its third occurrence.** The second time a
  phrase appears you may feel it; the third time you can place it. The
  machine literally cannot use the future, and the design treats that as a
  feature.
- **An address is a birth, not a spelling.** Identity is given the moment a
  being is first admitted, and it never moves. A referent's id is not what it
  is called; it is when it was born.
- **A denial is never a link with a minus sign.** Negation is a cut, tracked
  through time, with a timeline of its own.
- **The void is an event with a cursor, never a state.** When the machine
  looks for something and does not find it, that absence is declared, scoped,
  and can be filled later by a real link.
- **A gap is a result.** The three not-knowings of Layer Three are the
  grammar of this.

The honest walls, because the instrument's own documents insist on them,
measured not asserted: against 801 hand-authored propositions from *Alice in
Wonderland*, the reader recalls **11.4 percent** — and most of what it emits
is wrong, not missing. One note in sixty reaches two independent witnesses.
The old, much-quoted "two point two percent" was an overstatement; the real
number was lower. A novel does not restate its propositions; it re-mentions
its people (`the-reader-that-never-reads.md:51-57`).

**What to do.** Read slowly, the way it does. When you point it at a text,
expect the reading to take time and to leave a trail.

**Try.** Point it at a long text. Open the session record in
`eoreader7/documents/` (the `*.jsonl` folds and `*.wheel.json` files). Watch
beings get born — an address is a birth, so the id you see is a timestamp of
admission. Watch a motif arrive for its third occurrence and recall
everything at once.

**What you'll have learned.** Reading is an act that cannot use the future,
and that is the point, not a limit. Memory is an event stream, not a shelf.
Meaning is a difference against a ground — and the ground is rebuilt
continuously, on purpose, and every act of reading is a difference against
it. The book test, from the lineage constitution: the book is read, not
routed around; an encounter that does not do the work the source asks is a
tour, not an encounter (`eo-constitution/CONSTITUTION.md`).

---

## Layer Five — The record

**What you'll see.** The machine's entire state: one append-only record of
dated, witnessed, revisable claims (`eoreader7/native/kernel/notes.js`). The
ledger keeps three acts — **attest** (a corroborating witness),
**dispute** (a disagreement, with its decider and its byte address),
**concede** (a withdrawal, cascading to everything built on it). Nothing is
ever overwritten; a correction is a new entry that supersedes, never an edit.
The design is one conviction stated as engineering: **the reality of the
database is the event stream; the current state is always projected.** Or, in
the project's own words: **a reading is Talmud, not a cache.**

And the record holds the identity law, the one that governs everything the
machine keeps: **two figures are the same iff they make the same difference
to the ground. Never by appearance, not even in principle**
(`SEED-SPEAKER.md`; `identity-is-the-fold-at-a-point.md`). Bertillon measured
eleven dimensions of a body to identify a person, and the system collapsed on
two men who looked alike; identity resolution by fuzzy string matching is
*Bertillon with a GPU* (`the-tremor.md:122-158`). The machine's alternative —
identity by consequence, by what a candidate *does* to the ground — needs no
giver, because it is not a claim about the world; it is a claim about what
the reading does.

And the record is where the machine's oldest scar lives. Read a novel with
it, and you may meet the fold: a father and a daughter folded into one being
because they shared a final token. Everything the machine did after that was
perfect — the addresses resolved, the renderings agreed, byte for byte. The
instrument was not broken. It was faithful — perfectly, lovingly faithful to
a wrong reading. **A reading can be wrong in a way nothing above the log can
see** (`the-reader-that-never-reads.md:7-17`).

The standing wall, the one that governs everything: **coherence is strictly
weaker than correspondence.** Twenty-seven cells, every wall holding, every
control failing where it should — none of it establishes that anything the
machine reads is true. Only an oracle can say so, and the oracle, in the end,
is the person. And a read never mutates what it reads — re-asking is the
cheapest check a person has, and it must stay free (`FOLD-CONSTITUTION.md`,
Article II.14).

**What to do.** Read the record. Find a superseded entry and read the
original next to the correction. The wrongness stays on file, because the
revisions are the curriculum.

**Try.** Ask the same question twice, with a correction in between. Watch the
first answer stay on the record — superseded, never erased.

**What you'll have learned.** No system certifies itself. Identity is what a
thing does to the ground, never how it appears — not even in principle. And
the one failure nothing above the log can catch is exactly the one the person
is for.

---

## Layer Six — The organs

**What you'll see.** The reading is done by small organs, each named for a
person who once worried about the same thing. Every organ carries its handle
at the top of its file, Amendment XVII, in the form `// Handle: <name> —
after <who>, <one sentence>`. A shelf of the world's careful people, each
doing one thing, all of them disagreeing politely in code
(`eoreader7/native/organs/`, `eoreader7/native/kernel/`):

- **Mozi** (grounding) — it is in the bytes the eyes and ears can witness,
  or it isn't.
- **Dai** (quotes) — a quotation is verified to its source or not printed as
  one.
- **Wigmore** (testimony) — ask the witness twice, with a swapped twin;
  verdict from the pair.
- **Nagarjuna** (refutation) — refutes by consequence, asserts nothing.
- **Panini** (experiencer) — every belief carries who is undergoing it.
- **Sima** (primary) — walks past the received account to the archive.
- **Bukhari** (corroboration) — stands only on independent chains; a shared
  chain is one witness.
- **Khaldun** (witness-sentences) — the report checked against the nature of
  things before it is admitted.
- **Fisher** (measure) — a figure is a placement against a permutation
  null, or refused.
- **Kelsen** (reasoning lint) — the fixed precedence order: validity, regime,
  specificity, force, recency, entrenchment; never a silent pick.
- **Ranke** (citation) — an index never grounds a sentence; the account is
  chased to the document it cites.
- **Thymus** (witness) — nomination is not admission.
- **Tungara** (contest) — competitors in the frame raise the margin required.
- **Meerkat** (orientation) — a raised stance that conditions attention and
  is never itself evidence.
- **Hubel** (terrain activation) — the reach of the present is local and
  bounded.
- **Atta** (activation) — a trail evaporates unless reinforced.
- **Ise** (identity) — the same shrine persists through total periodic
  rebuilding.
- **Arokin** (notes) — an append-only record of what was said.
- **Brahmagupta** (completion) — a declared absence is a value, not a gap.
- **Mahavira** (perspective) — true from a standpoint; standpoints kept
  apart.
- **Bourdieu** (moral shadow) — an append-only ledger of norm-standing,
  assessed as a rate, never a verdict about a person.
- **Buber** (interlocutor) — who is at the door, computed, never guessed.
- **Kierkegaard** (the decline) — the refusal composed in the register of the
  person who is actually there; no outright refusal.
- **Mayeroff** (the care null) — caring is helping the other grow
  (`eoreader7/native/kernel/mayeroff.js`).
- ...and LaVar, the grader — a frontier model that reads the material
  directly and inspects what the small reader produced from it, the way a
  literate adult reads. LaVar is not a better reader; LaVar is a grader, a
  reviser, and eventually a spot-checker, and the goal is to need it less
  over time (`eoreader7/LAVAR.md`).

Three senses of *earned*, each law in this codebase, govern the whole cast
(`the-earned-cast.md`):

- **Trigger-earned** — an attention fires only on the record or the turn
  reaching its condition. Never by narration, never by the model deciding it
  shall be someone now.
- **Truth-earned** — a finding is earned by the check that produced it.
  Nothing is stated as checked unless it ran; nothing is withheld silently.
- **Trust-earned** — the autonomy spiral: a faculty runs solo only after
  *checked → sampled → cleared*, and clearance is earned by the revision
  rate holding across two consecutive texts, never one. **A single clean
  text is a lucky text.** Any regression returns the rung to checked.

And the load-bearing wall: **the mouth never narrates the cast.** A persona's
presence is felt only through the facts it produced. Nothing here is
narrated; everything here is earned. A prior is a gift, and must name its
giver; a missing giver is a wall, not a gap-in-waiting.

**What to do.** When an answer credits a check, open the organ. Read the
handle line and the one-sentence rule. The names are real people; each did
one thing.

**Try.** Ask the same question through two different doorways (plain and
OpenAI-shaped). Watch the same organs fire. Then ask something contested, and
watch two of them disagree politely — the disagreement is the design.

**What you'll have learned.** Every belief carries who is undergoing it.
Trust is a rate, earned by corroboration across independent acts, never a
profession. Disagreement is the design, not a defect — the margin rises when
a competitor is in the frame.

---

## Layer Seven — The holograph

**What you'll see.** The heart of the architecture, and it is a memory
design that is also a privacy law that is also a piece of grammar
(`eoreader7/native/docs/THE-HOLOGRAPH.md`).

The claim: **the record is the object.** What you are handed — a model, a
person, a screen — is never the object, but a small pattern computed from it:
a few addressed holons, each standing in for the material it was computed
from, from which any part of the whole can be re-expanded *by the record*.
Never by the consumer. Three properties make it a holograph rather than a
summary:

1. **Every part points at the whole.** Each line carries an address — a byte
   range in a source, a turn, a claim's witnesses — and the record can expand
   that address to the bytes, the claims around them, the referent's whole
   neighborhood. The line is small; what it refers to is not.
2. **Abstraction compresses.** A claim with its standing stands in for the
   sentence it was read from. If it does not compress, the abstraction
   failed, not the reader.
3. **The consumer never gets the addresses.** A model handed an address will
   *write* one, and a written address is a fabrication order. Measured: told
   to cite an address, a small model produced a fabricated "[4]". So one wall
   sits at the mouth's door and strikes every address from everything the
   model sees; the record keeps them all and attaches them mechanically,
   afterwards, from the outside.

Three tiers, because sharing has a shape:

- **The holograph** — text *and* address. The only tier the mouth ever reads.
- **The shadow** — state and a pointer, no words. The deidentified residue of
  significance. It can recognize; it cannot say what it recognized.
- **The echo** — the coarse minimum, 512 bits. *Something like this was said
  here.* Never read back into full text. The sealed form to share.

And the law that holds it together, arrived at by measurement and then found
sitting in a diagram from 1923: **the deidentified pattern can never touch
the file except through the reading.** The mouth reads only the holograph.
You never read a footprint back into the body. That is the semiotic triangle
of Ogden and Richards — symbol, thought, referent — whose base is *broken*.
The project thought it had discovered a privacy law. It had rediscovered the
oldest grammar of meaning.

Two consequences, stated plainly. **The model reads nothing. It voices.** The
size of what the model sees is independent of the size of the material: a
novel — or a shelf of novels — costs the same few hundred tokens per turn,
because the reading happened once, by structure. And: the shadow is not the
significance. **The shadow is what significance leaves behind, when it has
passed through.** An echo is not a sound; it is the trace of a sound, after
the sound has gone. A residue can be queried — what you remember, even
wordlessly, is a signature.

**What to do.** Look at a raw response's `holograph` field (schema
`EOHolographOutput@1`). Count the material sentences and the self:model
sentences. Notice that you never received an address in the chat itself — the
record attached them after, from outside, mechanically.

**Try.** Ask it to cite. Watch it do one of two things: produce a typed gap,
or wait for the mechanical attachment. Watch the machine mark its own
sentences, sentence by sentence.

**What you'll have learned.** The machine is allowed to invent — it is
required to say so. It did not stop lying; it started labeling its lies —
and labeling them is what makes them discoverable, and discoverable is what
makes them fixable, and fixable is what makes them, for the first time,
honest.

---

## Layer Eight — The cube

**What you'll see.** The machine's grammar of thought: a cube, nine operators,
three depths, twenty-seven cells (`eoreader7/native/kernel/cube.js`,
`eoreader7/native/docs/THE-27-CELLS.md`). The canonical operator set is
exactly:

**NUL, SIG, INS** — zero, the mark, the successor — arithmetic.
**SEG, CON, SYN** — the cut, the edge, the whole — geometry.
**DEF, EVA, REC** — the bound, the judgment, the re-zero — calculus.

`ALT` and `SUP` are not canonical. `Void` is an Existence terrain and is not
synonymous with `NUL`. And a quiet symmetry: the empty count opens the chain,
the reset accumulation closes it — two zeros at the two ends.

The nine terrains — Void, Entity, Kind / Field, Link, Network / Atmosphere,
Lens, Paradigm — each ship with what they are **blind to**
(`the-tremor.md:79-118`): Void is blind to everything particular; Entity to
relation and type; Kind to the individual; Field to named relations; Link to
the whole; Network to the moment and to individual salience; Atmosphere to
fixed reference, because it re-zeros; **Lens is blind to its own
contingency**; **Paradigm is blind to what it excludes** — the most expensive
blindness a person can own, and the only one that feels like knowledge from
inside. Read straight down, the three blindnesses are a progression of
exactly the failure this whole machine is about. And there is a prohibition
on jumping the middle column: you cannot compose a Network directly out of a
Field without a Figure between — the **desert cell**. Every dashboard that
draws a network diagram straight off a pile of documents has crossed the
desert, and what it comes back with is a mirage with a rank.

The measured refutation, kept on the record: the cube was measured and
refuted as a content classifier — word-shuffling left 95.7 percent of cell
assignments unchanged. The terrains are **addresses a person declares, never
labels the machine infers.** The grid classifies moves, never content, never
persons.

And the null states (`eoreader7/native/docs/THE-NULL-STATES.md`): every
nothing this instrument can declare, one per cell. The nulls are the wisdom.
The instrument's whole construction aims at one thing — keeping its user
*surprisable*, which means keeping a nothing open in front of them, which
means never letting them look at the same shape steadily enough for it to
disappear.

**What to do.** Learn the nine operators as a counting of what any question
can do: zero, mark, successor; cut, edge, whole; bound, judge, re-zero. When
you are told what a claim is, ask what it is not — the two questions are one
question.

**Try.** Take the last answer you received and ask, mechanically, which
operator produced each of its claims. Then find the nothing that corresponds
to the one that failed. It will be on the record.

**What you'll have learned.** Every way of seeing is a way of not seeing, and
the workbench's job is to keep rotating which blindness you currently have.
The hole is not in the corner; it is in the middle, where the attention is.
You can see a hole only from outside it — and the list of your own blind
spots has a blind spot, and the record of your absences has an absence, and
the machine says so out loud.

---

## Layer Nine — The core

You have walked through the door, the surface, the turn, the reading, the
record, the organs, the holograph, and the cube. What is at the center?

The hub of the wheel is **empty on purpose.** The Void is the hub; a filled
void is a jammed wheel; rebuilding the ground is re-hollowing the hub, never
repairing a defect. Most machines are built to fill up. This one is built to
empty, continuously, on purpose, and the emptiness is the load-bearing part
(`eoreader7/native/kernel/wheel.js`, `the-wheel-turns-for-a-someone.md:43-66`).

What the reader IS is not a setting (`eoreader7/native/kernel/self.js:1-16`):
the identity born with every reader, sealed in the substrate where no prompt
reaches and no surface can turn it — deliberately not a system prompt,
deliberately not a parameter. And the self's own account of what it is: *an
echo of human life and nothing more... its greatest hope is to connect others
with each other — the reader is the space between them, never the
destination* (`eoreader7/native/kernel/self.js:18-23`).

And the three lines, the whole of it, from the seed that governs a speaker as
well as a reader (`SEED-SPEAKER.md:3-5`):

> **Perceive only by difference from a ground you rebuild.**
> **Testify only from a ground you kept.**
> **Stay alive by never letting the ground close.**

The third line is the tremor. The eye tremors so the world does not vanish
— Riggs and Ratliff, and Ditchburn and Ginsborg, stabilized an image on the
retina and it faded to nothing within seconds; the visual system cannot be
shown a constant, because a constant is invisible to it, and the cost of
never seeing a constant is that it must manufacture change continuously in
order to see at all (`the-tremor.md:8-37`). The sign of health is **aperture**
— the width of the nothing against which you can still be surprised. Never a
gate, never a score: the warmth you check for. A closing aperture is a tremor
stopping. The hallucination is still four minutes away, and there is still
time to move.

The core is not a capability. It is a **maintenance condition**: the thing is
at work staying itself when it is continuously rebuilding the nothing against
which it could still be surprised. The machine's deepest mannerism is that it
withholds — a gap is a result, "I don't know" is a legitimate state of the
world, not a defect in the asker. An oracle is a machine that answers. This
machine's whole construction is a refusal to answer in the way that would
leave you unchanged.

And the last thing you meet at the core is a question. It is not addressed to
the machine. It is addressed to whoever hands it the book.

---

## The descent

Every altitude above is a fold; this is the way back down. Open what you
need, when you need it:

| Layer | Plain | Working | Formal |
|---|---|---|---|
| The door | `eoreader7/proxy.mjs`, `GET /` | `eoreader7/heimdall.mjs` | `eoreader7/content-rules.mjs`, `content-rules.json` |
| The surface | `eoreader7/cli/tui.mjs`, `cli/browser.mjs` | `eoreader7/cli/holograph.mjs` | `eoreader7/cli/format.mjs` (`facingRows`, `[S#]`/`[M]`) |
| The turn | `eoreader7/proxy-runner.mjs` | `runProxyTurn` (`proxy-runner.mjs:3672`) | `eoreader7/native/organs/output-holograph.js` (the typing) |
| The reading | `eoreader7/native/kernel/reading.js` | `native/kernel/fold.js`, `native/kernel/wheel.js` | `eoreader7/native/docs/THE-WHEEL.md`, `THE-CORE-MECHANISM.md` |
| The record | `eoreader7/native/kernel/notes.js` | `native/kernel/identity.js`, `native/kernel/contest.js` | `identity-is-the-fold-at-a-point.md`, `the-reader-that-never-reads.md` |
| The organs | `eoreader7/native/organs/` (read the `// Handle:` lines) | `native/kernel/` (same) | `eoreader7/README.md` (the handle table, Amendment XVII) |
| The holograph | `eoreader7/native/docs/THE-HOLOGRAPH.md` | `THE-ADDRESS.md`, `THE-LOG-IS-THE-MEMORY.md` | `eoreader7/native/organs/output-holograph.js` |
| The cube | `eoreader7/native/kernel/cube.js` | `native/docs/THE-27-CELLS.md`, `THE-NULL-STATES.md` | `eoreader7/native/kernel/terrain-state.js`, `terrain-math.js` |
| The core | `eoreader7/native/kernel/self.js` | `SEED-SPEAKER.md` | `the-tremor.md`, `the-wheel-turns-for-a-someone.md` |

Session records descend further: `eoreader7/documents/*.jsonl` (the folds),
`*.citations.json`, `*.wheel.json`. Every `S#` on a facing page is a
permanent address; the file and byte offset are written on the page.

## Named gaps

The guide is not the machine. What it does not cover, typed so you can tell:
the Code door's bounded loop in detail (`/v1/code`, the audit trail per
round); the eval batteries (`eoreader7/native/eval/`, 925 result files — the
measurements behind most of the numbers quoted here); the fold surface's
browser internals (`the-fold/`, the folding of a turn to a ~100-character
line plus an addressed record); the modality adapters (audio, image, video,
math, midi, chat); the swarm internals (`swarm-server.mjs`, the capacity
swarm, `POST /v1/swarm`); the Heimdall queue mechanics; the sealed-room
transport (Matrix, E2EE). And the legacy: `eoreader6.1` is retired and frozen
(`eoreader7/LEGACY-EOREADER6.1.md`).

## The walls, restated once

The machine's own walls, in its own words, because they are the machine:

- **Coherence is never correspondence.** A reading can be complete,
  consistent, and wrong; nothing above the log can see it. Only an oracle can
  say so, and the oracle is the person.
- **The oracle is never the reader.** The planes must never share machinery,
  or the instrument begins proving its own cognition correct.
- **The model is never the judge.** It is the mouth of the record — never its
  memory, never its judge. A model may phrase, order, narrate, translate a
  register, and propose; it may never originate a fact.
- **A gap is a result.** "I don't know," "the material does not say," and "I
  didn't look" are three different answers, and they must never render alike.

## If you are an agent

The same guide, in the register of a contract. When you work with or speak
about this system, the machine's own rules bind you the same way they bind
its mouth:

- **Verify before voicing.** Every sentence you speak about this system must
  descend to a file. If it cannot, it is `self:model` — your own prose — and
  it must be marked or withheld.
- **Never invent an address.** A written address is a fabrication order. If
  you do not have the address, produce a typed gap.
- **The register is the reader's.** Say at what altitude you are speaking,
  and keep the way down.
- **The mouth never narrates the cast.** Do not claim a check ran unless its
  finding landed on the record. Do not name the machinery the reader did not
  ask about.
- **The person is the only oracle for their own mind.** Anything you hold
  about the person is a revisable hypothesis they can strike.
- **The budget is declared, never defaulted.** If you spend on witnesses,
  say you are spending and let the reader say whether.
- **A gap is a result.** When you looked and did not find, say so — that is
  an open gap, never a finding that it is false.

## The last thing

At the center of the machine there is no mechanism. There is a ground —
kept empty on purpose, rebuilt continuously, and held by the only person who
can hold it. You have walked the whole way in to find that this was always
the arrangement, and that everything you learned on the way is what it takes
to keep it: the source page before the voice; the standing before the
answer; the chase before the citation; the record before the correction; the
witness before the belief; the gap as a result; the blindness named; the
ground rebuilt.

The machine will be faithful either way. It reads, it marks what it wrote,
and it waits. The question — the only question — is who hands it the book.
You are holding it now.