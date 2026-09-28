# What has not been fully ingested — measured mechanically on War and Peace (2026-09-28)

`eval/identity/ingestion-demo.mjs`, no model call anywhere. Raw:
`ingestion-demo.json`. Two readers over the whole Maude translation
(34,255 sentences in 12,107 paragraphs, holons `/p{k}/s{at}`): the
occupancy reader, whose reach is the whole; and the native perceiver AS THE
EVAL RUNS IT (`NATIVE_MAX_CHARS=150000`), whose reach is the 1,026
paragraphs inside the cap. Gaps are the occupancy reader's own typed
refusals (11,474) and its undecided slots that did not collapse `chosen` (0
on this arm). Standing is `kernel/ingestion.js`'s, read off that record;
the indexed tally is asserted against the kernel's exact answer on every
250th paragraph.

| reader | read | partial | unread |
|---|---|---|---|
| occupancy, by sentence | 23,916 | 10,339 | 0 |
| occupancy, by paragraph | 6,471 | 5,636 | 0 |
| **native perceiver (capped), by paragraph** | 751 | 275 | **11,081** |

**91.5% of the novel is unread by the reader the eval calls "native".** That
is the number this whole line of work had been reporting around without
stating: every native-arm figure since v2 was read off 8.5% of the book.
Nothing is wrong with the cap — it was declared — but a claim citing
`/p4000` rested on nothing that reader had reached, and until today nothing
said so.

## A claim that rests on the unread, turned into an ask — and not asked

`c-beyond` cites a Bezúkhov sentence past the cap: standing `partial` (the
occupancy reader reached it; two typed gaps inside — `occupant_not_a_referent`
twice, the ablation arm's own refusal). `judgmentRequest` built the ask for
two declared for-whoms (*"who held the title Count Bezúkhov, and when"* /
*"who is Pierre"*): the ENCLOSING PARAGRAPH's full text, the frame, the two
gaps by name, and three answers to point at. No judge was called. The
mechanical share is everything above; the judge's share is exactly the
text of that request.

## The ladder, from an empty environment

`shouldEscalate` on `c-beyond`: shape `sentence:occupant_not_a_referent`,
order `[mechanical, judge]`, first `mechanical`. The mechanical trip IS the
readers above, and it did not settle the claim: recorded as a failure — which
deposits nothing (failures evaporate), so after it the order is unchanged
and `learned` reports only that the shape has been seen. The judge rung has
no trail because no judge ran. A colony learns from trips actually made.

## What this does not measure

The occupancy reader's "read" means *no transition clause in this sentence
was refused* — a sentence with no transition at all reads as `read`, which is
right for that reader's question and says nothing about any other. The
native perceiver's own gaps (`pronoun_no_candidate`, `ambiguous_surface`) are
not folded in here; they would raise its `partial`. And nothing here says
whether what WAS read was read correctly — ingestion standing is about
reach, never truth.
