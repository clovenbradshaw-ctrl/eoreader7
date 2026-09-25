# The Surface Layout Theory

How the surface decides where a thing goes. This governs `block-surface.mjs`
and any other renderer that puts the nine terrains on a screen.

---

## 1. The evidence this is answering

Measured on the live metro-code build:

| | count | where |
|---|---|---|
| controls in the top strip | 16 | one row, five different kinds of affordance |
| content terrains | 5 of 5 | all in the centre, behind tabs |
| right pane on arrival | empty | "nothing focused — click a name anywhere" |
| centre panels that are lists | 4 of 5 | 68 · 65 · 681 · 8 items |

The centre is the widest column on the page and it never holds a single
thing. Every one of its panels is an enumeration. Meanwhile the pane that
exists precisely to hold one thing — the inspector — is empty until you
click something, which nothing invites you to do.

That is the problem in numbers: **the surface has no subject.** It is five
inventories behind five tabs, and no view of any one thing.

## 2. There was already a theory, and the build drifted from it

`block-surface.mjs` opens by declaring the FILTER/SEEN split: the three
Interpretation terrains do the seeing and hold no content; the six others
are the seen. It then assigns places — *Void (the sources, left rail),
Field (the measures, right rail), Entity (the beings, top band), Network
(the graph, center), Link (the rows, a drawer)*.

The build put Void, Entity, Link, Network and Field **all** in the centre
tab stack. The left rail became a tab switcher the theory never mentioned,
and the right rail lost Field and became an empty inspector.

The FILTER/SEEN half is sound and is kept. The half that nails each terrain
to a fixed wall is what failed, and §5 says why it had to.

## 3. The principle: one subject, three distances

A surface should have exactly one **subject** at a time — the thing
currently being attended to. Everything else earns its place by its distance
from that subject:

- what **changes** the subject → the doorways
- what the subject **is** → the subject itself, at full fidelity
- what is **true about** the subject → its dossier

Left to right is that gradient: **choose → attend → cross-reference.**

The subject is never nothing. When the reader has chosen nothing, the
subject is the corpus itself, and the centre holds an account of it — what
is in it, how much, and the shape of what was found. Landing on an inventory
of 68 documents is the failure mode this rules out.

## 4. The two kinds of list — the correction

The first draft of this theory said "lists go right." Prior art says that is
half right, and the wrong half is load-bearing. **There are two kinds of
list and they belong on opposite sides.**

An **index list** is the full enumeration you navigate *from* — the 68
sources, the 65 beings. Its job is to let you leave the current subject and
pick a new one. It is a doorway that happens to be long.

A **dossier list** is an enumeration *about* the current subject — this
document's 13 rows, this being's co-occurrences, this harm's edges. Its job
is to tell you more about what you are already looking at. It cannot
navigate you away, because everything in it is already scoped to the
subject.

Every tool surveyed in §8 splits them this way without exception. Obsidian's
file explorer is left and its backlinks are right; Figma's layer tree is
left and its comment threads are right; VS Code's explorer is left and its
outline is right. The right-hand list is always *derived from* the centre.
It is never an independent way in.

So the user-facing rule is not "lists go right." It is:

> **A list goes left if it can change the subject, right if it only
> describes it.**

## 5. A terrain is not a place — its role decides its place

Void as the enumeration of 68 sources is an index → left.
Void as one opened document is the subject → centre.
Void as *this document's* provenance and row count is a dossier → right.

Same terrain, three zones, and what decides is **role**, not ontology.
Nailing Void to the left rail forever is what made the reader open a
document and watch the source list vanish — the index and the subject
cannot share a slot, because they are not the same role.

```
zone(terrain, role) where role ∈ { index, subject, dossier }
```

No terrain owns a wall.

## 6. The zones, with admission rules

**LEFT — the doorways, including their index lists.** Admits anything that
**can change the subject**: the section switcher, the index list it selects,
and the filters that narrow that index. This is VS Code's Activity Bar plus
Primary Sidebar as one component. Today's design splits that component
across two zones — the switcher in a 172px rail, the list it switches in the
centre — which is why neither reads as a navigator.

**CENTRE — the subject.** Admits **exactly one thing**, in the form its kind
deserves: a document as its text, a being as its dossier page, a harm as its
edges, the corpus as its overview. If it has N rows and no head, it is in
the wrong zone.

**RIGHT — the dossier.** Admits **only what is derived from the subject**:
its rows, its neighbours, its provenance, the model's commentary on it. If
a panel here would still make sense with nothing selected, it belongs left.

**TOP — nothing that changes what is shown.** Identity, the gate seal
(status, read-only), and preferences that change *how* the page draws and
never *what*: theme, `bytes ⇄ page`, `prov`.

Two further rules:

> **No zone may hold two classes of affordance.**
> **The right pane is auxiliary — it may never hold the only copy of
> anything essential.**

The second comes from VS Code, whose docs are explicit that the Secondary
Sidebar is auxiliary space users rearrange at will, and that extensions
cannot even contribute to it directly. Anything load-bearing has to survive
its absence.

## 7. Where filters go

There is a real disagreement in the sources. Material 3 says put filters in
a right-hand side sheet, specifically *"to avoid interference with any
navigational components on the left edge."* Nielsen Norman reports the
opposite as the empirical convention: filters *"are typically placed on the
left."*

Both are downstream of a better rule:

> **A filter sits with the thing it filters.**

The lens, kind and timeline filters narrow the index lists, and the index
lists are on the left, so those filters are left — which is also NN/g's
convention, and does not trigger M3's objection because here the filter is
*part of* the navigation surface rather than a sheet competing with it. A
filter that narrows the subject instead — find-in-document — belongs in the
centre with the document. A filter over a dossier list belongs right.

That also settles the three odd buttons:

- **map** is a rendering *of the subject* → a centre mode, beside
  reader / source / native, offered when the subject has geography.
- **whisper** is commentary *about what is shown* → a right-pane section.
- **gate** is the seal on the whole surface → stays top, opening its proof.

## 8. Prior art

*VS Code* (`code.visualstudio.com/api/ux-guidelines`) — the Activity Bar is
"a core navigation surface" whose items "function as View Containers that
render Views in the Primary Sidebar"; the Secondary Sidebar is "normally
considered a auxiliary location for Views," which extensions cannot target
directly. It also caps a navigator at "3-5 Views."

*Figma* (`help.figma.com`) — left "navigation panel" holds layers, pages and
assets; right "properties panel" shows the properties of whatever is
selected on the canvas. Selecting in the canvas or the left tree populates
the right.

*Obsidian* (`help.obsidian.md`) — File explorer defaults left; Backlinks is
reached by "the Backlinks tab in the right sidebar," because backlinks
describe the open note rather than letting you navigate away from it.

*Material 3* (`m3.material.io`) — a navigation rail belongs "along the
leading edge"; standard side sheets "display content that complements the
screen's primary content" and are placed on the right to keep the left edge
clear for navigation.

On the specific question of lists on the right with the artifact in the
centre: it exists — Figma's comment threads, Google Docs' comment list,
Photoshop's Layers panel, Obsidian's backlinks — but in every case the
right-hand list is scoped to the centre artifact and is never the primary
navigation surface. It has no name of its own; it is just the inspector
convention extended to hold a list instead of fields.

## 9. What this predicts, and how to falsify it

- Landing answers "what is this and what was found" without a scroll.
- Opening a document never destroys the list you opened it from.
- Narrowing a lens shrinks the left-hand index while the centre keeps its
  subject.
- The top bar survives a whole session untouched.
- Hiding the right pane entirely costs information but never navigation.

The fourth is the sharpest: a top bar nobody touches is a top bar holding
only display preferences, which is exactly the claim. The fifth is the test
of the auxiliary rule.

## 10. Migration

The shell already has three zones — `.workspace` is
`rail(172px) | workbody(flex:1) | inspector(264px)`. Nothing needs
rebuilding. The work is reassigning content and re-weighting columns: the
left grows to hold the index lists and the filters coming down from the top,
the centre is given a subject to hold, and the right narrows to the dossier.
