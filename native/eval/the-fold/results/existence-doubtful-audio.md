EXISTENCE DOUBTFUL

An audio essay on a notebook that could only agree, a two-letter notation from the age of sail, and a rule about hanging people that got used as a rule about thinking.

Running time about twenty minutes.


PART ONE. THE HOLE.

I want to start with an absence, because absences are the hardest things to notice and this one sat in plain sight for about a year.

The thing I've been building is a reading engine. You give it documents, it reads them, and everything it comes to believe lives in one permanent notebook. Not a summary, not a vector store. A notebook. Every entry dated, every entry carrying the exact position in the original file where it came from, and nothing is ever deleted. The language model is allowed to be the mouth of that notebook. It is never allowed to be its memory, and it is never allowed to be its judge.

That notebook had two kinds of entry.

The first is: another source says this too. You've read something in one document, you find it again in a second, and the second source gets added as a witness. That's how confidence accumulates.

The second is: take this back. You've decided you were wrong. The entry gets retracted, the reason gets recorded, nothing is erased, and — this is the important part — everything you'd built on top of that claim comes down with it. Transitively. Each collapse written down with what caused it.

Two entries. Agreement, and retraction.

And between them there was a hole, which I didn't see for a year, because the hole is shaped like nothing. There was no way to write down: these two sources disagree.

So here's what actually happened, run after run. The engine would find a disagreement. It would notice it, count it, print it to the screen, and then drop it on the floor. Agreement accumulated across months. Disagreement evaporated at the end of every single run.

And that leads to something stranger, which is the part I find genuinely embarrassing in hindsight. That demolition system I described — concede a claim, watch everything resting on it come down, all of it recorded — that was built. It was tested. It worked. And it had never once been used. Not a single time. Because nothing in the entire system was wired to its lever.

I had built a controlled demolition rig, and then I had built no trigger.


PART TWO. TWO LETTERS.

Hydrographers solved this problem in the age of sail, and their solution is two letters.

Here's the situation they're in. A ship comes into port and the master reports a shoal — a rock, a shallow patch — at some position out in open water. Nobody can confirm it. Maybe he saw something. Maybe he saw a whale. Maybe his longitude was off by forty miles, which in eighteen seventy-six it very well might have been.

What does the chart do?

It does not delete the report, because a rock that might be there is worth knowing about, and if you erase it you've destroyed information you can't get back. And it does not draw a rock, because there might not be one and drawing it would be a lie.

What it does is print the position and mark it E D. Existence Doubtful.

It has siblings. P A, position approximate. P D, position doubtful. S D, sounding doubtful. There is a whole formal vocabulary for degrees of not-knowing, and it's centuries old.

And here's the detail I love, because it's the kind of thing that only exists in a craft that has thought very hard for a very long time. On a nautical chart, the typeface tells you what kind of thing you're looking at. Upright type means solid ground — something that's there at high water, that you could stand on. Italic type means something that floats or lies submerged. A buoy is italic. A wreck is italic. A shoal is italic.

The slant of the letters carries how much weight to put on the thing.

Now. What I want you to notice is that E D is not indecision. It's not the chart shrugging. It is a durable, recorded, deliberately non-committal fact: someone saw something here and we cannot confirm it. And that fact is true regardless of what the truth turns out to be. If there's a rock, it was still true that it was unconfirmed in eighteen seventy-six. If there's no rock, it was still true that someone reported one.

It is also, precisely, the fact that a later voyage can settle.

Let me give you the example, because it's real and it's better than anything I could invent.

There was an island in the Coral Sea called Sandy Island. It was charted in eighteen seventy-six, from a whaling ship called the Velocity. And it sat there. On marine charts. And then, much later, on satellite maps — on Google Earth, a black polygon in the middle of open ocean, because the digital maps had inherited it from the paper ones.

It was there for a hundred and thirty-six years.

In November of twenty-twelve an Australian research vessel called the Southern Surveyor was working in the area, and somebody looked at the chart, and looked at the water, and decided to just sail through where the island was supposed to be. They ran the echo sounder the whole way.

Fourteen hundred metres of open water. No island. There had never been an island.

They struck it from the charts.

That is the correction machinery working. On a hundred-and-thirty-six-year fuse, admittedly, but working. And I want to be precise about why it could work: it could work because the doubtful sighting had been written down. If the eighteen seventy-six report had been dropped on the floor for being unconfirmed, there would have been nothing to correct. The Southern Surveyor would have sailed through empty ocean and found empty ocean and it would have meant nothing at all.

You cannot disprove what nobody recorded.

My engine had the upright type. It had the eraser. It had no italics.


PART THREE. A RULE ABOUT HANGING PEOPLE.

Now I have to talk about how the hole got there, because it wasn't carelessness. It was a good rule, applied to the wrong question, and I think the mistake is extremely common.

The rule the engine was built on is about three thousand years old. Deuteronomy: not on the word of one witness. Roman law inherits it and compresses it into a maxim lawyers still quote — unus testis, nullus testis. One witness, no witness. It runs through canon law, through medieval procedure, and it is sitting right now in the United States Constitution, in the treason clause, which requires the testimony of two witnesses to the same overt act.

Everybody converges on two witnesses. It keeps getting reinvented because it keeps being nearly right.

But stop and ask what all of those are rules about.

Every single one of them is a standard for conviction. For punishment. For the moment the state does something irreversible to a person.

Not one of them — not one — ever said you may not investigate on a single witness. None of them said you may not form a theory on one witness, or open a file, or send somebody out to go and look. They said you may not hang a man on one.

That distinction is the whole thing, and my engine had lost it.

I had taken a rule about when you may punish and used it as the rule for when you may think.

And the effect is exactly what you'd predict if a police force adopted "beyond reasonable doubt" as its threshold for opening a case. Not for convicting. For opening. No case would ever be opened. Every detective would sit at their desk forever, because you can't reach reasonable doubt before you've investigated, and you can't investigate until you've reached it.

Here's the measurement. On the real material — four hundred and fifty-eight things the engine had read and recorded — the two-source rule admitted, as something it was permitted to build on, zero of them.

Not a thin layer. Not a sparse one. Empty.


PART FOUR. NOT STRICT. INERT.

And now the part that took a measurement to see, and which is the same shape as the finding that started this whole project.

A test is only worth something to the degree it behaves differently when the thing is true than when it's false. That's not a philosophical claim, it's the definition. A smoke alarm that goes off during fires and stays quiet otherwise is excellent. A smoke alarm that goes off at the same rate whether or not there's a fire is not a bad smoke alarm. It's not a smoke alarm. It's a noise.

So we ran the obvious control, and it cost nothing, because it involved no model calls at all — it's pure arithmetic.

We took the material and shuffled it into nonsense. Every word kept. Every relationship destroyed. And we ran the gate on the wreckage.

It produced zero.

Then we ran it on the real material.

It produced zero.

Forty different shuffles. Two different corpus sizes. The same answer every time, in every world.

So the gate had a perfect record. It had never once let through a false claim. It had also never let through anything whatsoever, and from outside those two facts are completely indistinguishable — which is precisely how a system that is merely careful can impersonate a system that is right, for a year, in front of somebody who is actively looking.

I keep finding this shape. A guard that can't be reached isn't a strict guard. It's a decoration. And it passes, and passes, and passes.


PART FIVE. THE THIRD ENTRY.

So here's what I built. The notebook now has three kinds of entry, and only the last one takes anything away.

The first is attest. Another source says this too. It adds a witness, and it carries the sentence that witness was read in, and the exact address of that sentence in that source's own bytes, so anyone can go back and check.

The second is dispute. This source says otherwise. And this is the new one.

The third is concede. Take this back. It's the only act that removes anything, and it takes everything resting on the claim down with it.

I want to spend a minute on the middle one, because its restraint is the entire design.

A dispute changes nothing about how well-supported the claim is. Nothing. The list of witnesses is byte-for-byte identical before and after — there's a test that checks exactly that, because if a supposedly neutral act quietly moved a claim's standing, it would have become a verdict without anyone deciding to make it one.

Why so careful? Because with two sources disagreeing, you can see that there is a fight. You cannot see who is wrong. Recording "this claim is false" would be a conviction on evidence that can't support one — and refusing to record it was, for a year, the honest thing to do.

But — and this is the hinge the whole thing turns on —

that reason licenses not convicting.

It never licensed forgetting.

That two sources disagree is true whichever one turns out to be right. It's a durable fact about the record. And it is exactly the fact a third source could settle.

Other traditions figured this out. Property law has an instrument called lis pendens — literally, suit pending. It's a notice filed against a title saying only that the property is under dispute. It doesn't say who owns the land. It says: this is contested, and whoever comes next needs to know. It travels with the deed.

Law reports do it with dissents. Justice Harlan wrote alone in eighteen ninety-six, and his dissent had no legal force whatsoever. It changed nothing on the day. And fifty-eight years later it was the thing the court reached for. If the reports had only ever printed majorities, that reasoning would have had to be invented from nothing.

The Mishnah does it too, and gives its reason out loud: it preserves minority opinions that were rejected, so that a later court might rely on them. Recorded dissent as infrastructure for revision. Two thousand years ago.

There was one more thing needed, and I got it wrong on the first attempt.

Most apparent contradictions are not fights at all. Take one person who held one office across two separate terms, decades apart. In a naive reading, that looks like a contradiction — the same office, two different holders, both claimed. But nothing is in dispute. No third source in the world could settle it, because there's nothing to settle. It's one fact wearing a costume.

So a disagreement now has to carry its kind. And only a genuine contest — same subject, same grain of description, actually opposed — is worth spending a search on. My first version routed every disagreement to the third-source hunter, and I only caught it because I'd written down, weeks earlier, a measurement showing that would be wasted. I'd measured it and then built the thing the measurement forbade. That happens more than I'd like.


PART SIX. THE NUMBERS.

With the gate replaced by a label — build on one source, but carry, on every conclusion, an honest record of exactly how thin its thinnest support is — the layer above stopped being empty.

Four hundred and fifty-eight recorded claims. Under the old two-source gate: zero facts derived. Under the new arrangement: two hundred and eighty-nine.

And a hundred and forty-two of those were confirmed by an outside judge — one that reads entirely different columns of the same database than the engine does, so it cannot agree with the engine by construction. It isn't checking the engine's work. It's answering the same question by a different route.

Now, both of those numbers are only worth something if the shuffle can't reach them.

The shuffle reaches twenty-four. And two.

Two hundred and eighty-nine against a shuffle that tops out at twenty-four. A hundred and forty-two against a shuffle that tops out at two. Outside the entire range, all forty draws, both of them.

That's the result. And it's the first time this part of the engine has ever been run on real material at all.

There's a second finding hiding inside it that I didn't expect.

Conclusions built on conclusions reached two storeys on the small corpus. On the large corpus, four. And here's the thing — adding budget changes nothing. Two allowed steps, four, six, twelve, twenty-five: byte-identical answers every time. The reaction settles. It stops.

Which means the tower stops because it has run out of ground, not because it ran out of crane. How high this thing can build is a property of how much it has read. Not of how hard it's trying.


PART SEVEN. WHAT THE CONTROL TOOK BACK.

The same shuffle that licensed those two numbers killed several others, and one of the deaths is more useful than either of the survivals.

First, the easy one. The engine scored a hundred percent precision. Every derived fact the judge could rule on came back true. A hundred out of a hundred.

Worthless. Because the shuffled nonsense also scores a hundred percent. The judge is generous by construction and essentially never returns a "false." A test that everybody passes ranks nobody.

Now the interesting one.

There's a number this project has been quoting for weeks. The costliest single retraction takes seventeen percent of what's been built. I've used it to make a real argument — that genuine structure spreads its weight across many supports, where randomized structure balances on a few points, so a low number means the relationships are real.

Three separate runs have now produced seventeen percent, thirty-three percent, and nineteen percent. And they refused to reconcile. I kept trying to work out which one was right.

None of them. They were never comparable.

Each one is a share of the layer. And the layers are wildly different sizes. Nineteen percent of two hundred and eighty-nine facts, set against twenty-one percent of twelve facts. That is a batting average from four hundred at-bats sitting next to a batting average from three at-bats, and being read as though they were the same kind of thing.

Both numbers are real. And the comparison is not merely unfavourable — the comparison was never made. It cannot be made. It was never a question that had an answer in that form.

I want to sit on that, because I think it's the most portable thing here.

A number can be perfectly real, produced by correct arithmetic on genuine data, and still answer no question you actually asked. And from the inside, that feels identical to a result.

So that measurement now reports itself as "not comparable" rather than as a finding, in those words, in the file. And no claim about this structure's fragility — including the seventeen percent I've been saying out loud — is standing until there's a control whose layer is the same size.

That correction cost the project one of its better-sounding results, which is generally how you know it was worth making.


PART EIGHT. FOUR WALLS.

Where this goes next. Four walls, in roughly the order they have to fall.

The first: a judge that can say no.

Across every run — real material, shuffled material, both corpus sizes — the outside judge has returned zero convictions. Not one "false." It confirms, and it abstains. Until it can actually refute something, "confirmed" only ever means "not contradicted," and no precision figure derived from it means anything at all. I need a judge with a real negative in it.

The second: a control the same size as the thing it's controlling.

Nothing about how this structure falls can be claimed until the shuffled version produces a comparably sized structure to measure against. That's maybe a day's work, and it unlocks a whole family of statements I've been making without a licence.

The third, and the tallest: the bridge from prose to premise.

Everything I've described ran on structured material. A database with labelled columns. On ordinary prose — a book, an article — the engine still depends on a small model reading a passage and judging whether that passage states a given claim. And that judgment has been measured. Twenty-five true claims, twenty-five fabricated ones. It said yes to two of each.

Two and two. It carries no information at all. That's the wall between reading a database and reading a book, and it is the one I have no plan for yet.

And the fourth, which is the funniest thing that happened all week.

Having built the machinery for recording disputes, I went and looked for disputes in the material.

There aren't any.

Every single apparent contradiction turned out to be one source recording two separate terms of office — one document, disagreeing with itself, which is not a disagreement. The number of genuine cross-source contradictions in the corpus is zero.

I built a docket, and the court has no cases.

Which is not a failure of the machinery. It's a sourcing problem. It needs a corpus of genuinely independent documents that genuinely contradict each other — and finding that is a different kind of work than any I've been doing.


PART NINE. THE END OF IT.

I don't want to leave this sounding grim, so let me say what I actually think.

Every number in this essay came out of machinery deliberately built to kill the claim it was testing. And it killed several. The precision figure is gone. The fragility figure is gone. A finding I'd been repeating for weeks turned out to be a comparison that couldn't be made.

A system that couldn't do that would still be reporting perfect precision and seventeen percent fragility, and I would still believe both of them, because they were my numbers and they sounded right.

And what actually changed this week is smaller than it sounds and more important than it looks.

The record now has somewhere to put the thing that would knock it down.

That's it. That's the whole change. Not more evidence, not better judgment, not a bigger model. Just: when a disagreement arrives, there is now a place on the page for it to land, and it stays there, and it's still there next week, and it can be settled later by something that hasn't happened yet.

Popper's point was never that scientific claims are well-supported. Everyone gets that backwards. His point was that they stick their necks out. That the thing which makes a claim scientific is not the strength of what holds it up, but the existence of an observation that would take it down.

A structure that cannot fall is not knowledge held provisionally. It's just a structure.

Now there are italics on the chart.
