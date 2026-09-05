# The Nashville Downtown Partnership — what the record states, and who states it

*Assembled by the fold on 2026-09-05. Every sentence below is either a page's own bytes at an address that reads back, a sentence assembled by template from a claim's own words and its source's name, or a count. Nothing here is a claim about what is true — it is a ledger of what is stated, and by whom.*

## 0 — How little the model did

| | |
|---|---|
| model | `gemma2:2b`, local, temperature 0 |
| calls | **198** — 602s of a 604s run |
| what it was allowed to do | point at one sentence, by index, from a list the material already contained |
| what it wrote into this document | **nothing** — no sentence below came out of the model |
| who chose the searches | `proof.js::preflightQuery` over the declared task, then `proofQuery(claimOfNote(n))` over the ledger's own thin notes |
| who extracted the claims | `makeRelationReader` — POS grammar gate (POSPrior@1), determiners and negation words injected, pronoun subjects resolved, whole-page furniture blanked |
| who found the verbatim spans | `primary.js::snipClaim`, addresses re-read from the kept bytes before printing |
| who wrote the prose | `crown.js::renderCrown` (template only; no free-text step) joined by `compose.js` under a declared order |
| names the question gave | `Nashville Downtown Partnership`, `Metro Council`, `Central Business Improvement District` — maximal capitalised runs of the declared question |
| alias shapes | `parenthetical` (11163/23375 confirmed in the corpus = 0.4776) — received from live_priors' `AliasDeclarationPrior@1`, which MEASURED which shapes English prose uses to introduce a short form; the floors (0.3 confirm rate, 100 fires) are this run's own declaration |
| names the MATERIAL taught it | `NDP` (declared by `nashvilledowntown.com-94477e.txt#241-634` as "The Nashville Downtown Partnership", used 10x); `CBID` (declared by `nashvilledowntown.com-535502.txt#37-127` as "Central Business Improvement District", used 4x) — read by `organs/aliases.js` from the material's own glosses, walled by use; no rule about acronyms exists anywhere in this run |
| the subject-name gate | **a fetched page that never says one of the subject's names is kept and addressable but not read into the ledger** |
| syndication | `corroboration.js::sharedTextGroups` — 2 of 7 page(s) share 2+ sentences of 40+ chars with another and are counted once, closing the residue proof.js discloses and cannot see |
| what the fold chose to chase | propositions carrying 2+ of the declared task's content words, with ends under 60 chars — a declared SPENDING rule that gates budget and ordering, never admission |
| who decided standing | `kernel/notes.js::standingOf` + `corroboration.js::distinctSources` — chunks are never counted as sources |

Every call the model made is printed in §7, with what came back.

## 1 — What the fold went and got

The opening query is the fold's own, derived from the declared task `How is the Nashville Downtown Partnership funded, governed and overseen, and what has the Metro Council said about the Central Business Improvement District budget and its contracts?`. Every later query is derived from the ledger's own thin notes: a proposition heard from one page poses the question "does anyone else say this?", and `proofQuery(claimOfNote(note))` is the fold asking it.

- `Nashville Downtown Partnership funded governed overseen Metro Council said Central Business Improvement` — preflight — 8 result(s)
- `"Metro Council approves downtown CBID budget after heated debate"` — second source for: Metro Council approves downtown CBID budget after heated debate — 2 result(s)
- `"NDP reported an anticipated increase of services in the 2027 Metro Budget"` — second source for: NDP reported an anticipated increase of services in the 2027 Metro Budget — 1 result(s)
- `"the budget for one additional meeting failed before the council voted on final approval"` — second source for: the budget for one additional meeting failed before the council voted on final approval — 1 result(s)
- `"the Downtown Partnership failed to collaborate with council members who raised concerns"` — second source for: the Downtown Partnership failed to collaborate with council members who raised concerns — 1 result(s)
- `Metro Council Nashville Downtown Partnership funded governed overseen said Central Business Improvement` — the thread named: Metro Council — 8 result(s)
- `NDP Nashville Downtown Partnership funded governed overseen Metro Council said Central Business` — the thread named: NDP — 8 result(s)
- `Downtown Partnership Nashville funded governed overseen Metro Council said Central Business Improvement` — the thread named: the Downtown Partnership — 8 result(s)
- `Nashville Downtown Partnership` — the thread named: the Nashville Downtown Partnership — 8 result(s)
- `Downtown Nashville Partnership funded governed overseen Metro Council said Central Business Improvement` — the thread named: Downtown Nashville — 8 result(s)
- `firm Nashville Downtown Partnership funded governed overseen Metro Council said Central Business` — the thread named: The firm — 8 result(s)
- `teamed Pillars Development` — the thread named: teamed with Pillars Development — 8 result(s)

| page | host | bytes kept | retrieved | address |
|---|---|---|---|---|
| Nashville Downtown Partnership Submits Annual Budget, Financial Report | nashvilledowntown.com | 3593 | 2026-09-04T23:06:22Z | https://nashvilledowntown.com/news/nashville-downtown-partnership-submits-annual-budget-financial-report-to-metro-council |
| Council approves Downtown Partnership budget amid concerns \| Politics | nashvillepost.com | 6928 | 2026-09-04T23:06:23Z | https://www.nashvillepost.com/politics/council-approves-downtown-partnership-budget-amid-concerns/article_35ba15bc-12e0-4335-aede-37aaaddede4a.html |
| Metro Council approves downtown CBID budget after heated debate | fox17.com | 4655 | 2026-09-04T23:06:23Z | https://fox17.com/news/local/metro-council-approves-downtown-cbid-budget-after-heated-debate |
| Nashville Council To Review Downtown Partnership Budget Shift | hoodline.com | 7261 | 2026-09-04T23:06:24Z | https://hoodline.com/2026/04/downtown-safety-shakeup-puts-nashville-partnership-s-budget-on-the-hot-seat/ |
| Central Business Improvement District (CBID) Expansion Approved by Met | nashvilledowntown.com | 836 | 2026-09-04T23:08:44Z | https://nashvilledowntown.com/news/central-business-improvement-district-cbid-expansion-approved-by-metro-nashville-council |
| Nashville Downtown Partnership, Pillars Development Launch Public Plan | nashvilledowntown.com | 5150 | 2026-09-04T23:09:09Z | https://nashvilledowntown.com/news/nashville-downtown-partnership-pillars-development-launch-public-planning-process-for-downtown-public-restroom-facilities |
| Council Defers Mayor’s Security Deal With Downtown Nonprofit \| Pith i | nashvillescene.com | 4820 | 2026-09-04T23:09:09Z | https://www.nashvillescene.com/news/pithinthewind/metro-council-defers-ndp-partnership/article_2d67bce6-fea7-4da8-a0ba-4fcd2f0d7151.html |

## 2 — Each source, in its own words

For each page: what the fold heard it say, rendered by template from the claim's own words, and immediately beneath it the page's own sentence at an address. The rendered line is never evidence — **the indented quotation is the evidence**, and it is the page's bytes, unedited.

### Nashville Downtown Partnership Submits Annual Budget, Financial Report to Metro Council \| Downtown Nashville

`nashvilledowntown.com` · https://nashvilledowntown.com/news/nashville-downtown-partnership-submits-annual-budget-financial-report-to-metro-council · kept as `nashville-faces/94477e9fc82303bf.txt` · 3593 bytes · retrieved 2026-09-04T23:06:22Z · 19 passage(s) read

The Nashville Downtown Partnership is grateful to Metro Council for approving the expansion of the Central Business Improvement District CBID. According to nashvilledowntown.com, NDP reported an anticipated increase of services in the 2027 Metro Budget. According to nashvilledowntown.com, The continued support of Metro Council is crucial as we continue to navigate the incredible growth of downtown Nashville. According to nashvilledowntown.com, the Nashville Downtown Partnership is a private-sector nonprofit corporation and membership organization whose core purpose is to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE.

*composed 4 of 4 claim(s); none withheld; a further 6 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**the Nashville Downtown Partnership —is→ a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE**

> Organized in 1994, the Nashville Downtown Partnership is a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE, WORK, PLAY and INVEST.
>
> — `nashvilledowntown.com-94477e.txt#3200-3459`

**NDP —reported→ an anticipated increase of services in the 2027 Metro Budget**

> In its annual budget and financial report submitted to the Metropolitan Council on Wednesday, April 15, NDP reported an anticipated increase of services in the 2027 Metro Budget.
>
> — `nashvilledowntown.com-94477e.txt#636-814`

**The continued support of Metro Council —is→ crucial as we continue to navigate the incredible growth of downtown Nashville**

> “The continued support of Metro Council is crucial as we continue to navigate the incredible growth of downtown Nashville, including residential, visitor, and investment growth,” said Tom Turner, President & CEO of NDP.
>
> — `nashvilledowntown.com-94477e.txt#1039-1258`

### Council approves Downtown Partnership budget amid concerns \| Politics \| nashvillepost.com

`nashvillepost.com` · https://www.nashvillepost.com/politics/council-approves-downtown-partnership-budget-amid-concerns/article_35ba15bc-12e0-4335-aede-37aaaddede4a.html · kept as `nashville-faces/60995652265d367d.txt` · 6928 bytes · retrieved 2026-09-04T23:06:23Z · 47 passage(s) read

Metro Council approved the Central Business Improvement District's fiscal year 2027 budget Tuesday night. Metro Council approves downtown CBID budget after heated debate. According to nashvillescene.com, the Metro Council gave its approval to a 9 million budget related to downtown s Central Business Improvement District.

*composed 3 of 3 claim(s); none withheld; a further 2 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**the Metro Council —gave→ its approval to a $9 million budget related to downtown’s Central Business Improvement District**

> Along with approving Metro’s all-encompassing $3.8 billion budget , the Metro Council gave its approval to a $9 million budget related to downtown’s Central Business Improvement District.
>
> — `nashvillepost.com-609956.txt#808-995`

### Metro Council approves downtown CBID budget after heated debate

`fox17.com` · https://fox17.com/news/local/metro-council-approves-downtown-cbid-budget-after-heated-debate · kept as `nashville-faces/c344377cdc50520c.txt` · 4655 bytes · retrieved 2026-09-04T23:06:23Z · 36 passage(s) read

Metro Council approved the Central Business Improvement District's fiscal year 2027 budget Tuesday night. Metro Council approves downtown CBID budget after heated debate. According to fox17.com, the budget for one additional meeting failed before the council voted on final approval. According to fox17.com, the Downtown Partnership failed to collaborate with council members who raised concerns.

*composed 4 of 4 claim(s); none withheld; a further 6 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**Metro Council —approved→ the Central Business Improvement District's fiscal year 2027 budget Tuesday night**

> (WZTV) — Metro Council approved the Central Business Improvement District's fiscal year 2027 budget Tuesday night, but not before a lengthy debate over downtown safety, oversight, and whether council concerns had been addressed.
>
> — `fox17.com-c34437.txt#489-717`

**Metro Council —approves→ downtown CBID budget after heated debate**

> Metro Council approves downtown CBID budget after heated debate
>
> — `fox17.com-c34437.txt#136-199`

**the budget for one additional meeting —failed→ before the council voted on final approval**

> A motion to defer the budget for one additional meeting failed before the council voted on final approval.
>
> — `fox17.com-c34437.txt#3013-3119`

**the Downtown Partnership —failed→ to collaborate with council members who raised concerns**

> Councilmember Sandra Sepulveda also argued the Downtown Partnership failed to collaborate with council members who raised concerns.
>
> — `fox17.com-c34437.txt#2229-2360`

### Nashville Council To Review Downtown Partnership Budget Shift

`hoodline.com` · https://hoodline.com/2026/04/downtown-safety-shakeup-puts-nashville-partnership-s-budget-on-the-hot-seat/ · kept as `nashville-faces/29e967eb7b87b78b.txt` · 7261 bytes · retrieved 2026-09-04T23:06:24Z · 42 passage(s) read

According to hoodline.com, The Metro Council is expected to take up the packet at an upcoming meeting and could push for amendments that require yearly council sign-off or more detailed reporting from the district.

*composed 1 of 1 claim(s); none withheld; a further 6 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**The Metro Council —is→ expected to take up the packet at an upcoming meeting and could push for amendments that require yearly council sign-off or more detailed reporting from the district**

> The Metro Council is expected to take up the packet at an upcoming meeting and could push for amendments that require yearly council sign-off or more detailed reporting from the district.
>
> — `hoodline.com-29e967.txt#5437-5624`

### Central Business Improvement District (CBID) Expansion Approved by Metro Nashville Council \| Downtown Nashville

`nashvilledowntown.com` · https://nashvilledowntown.com/news/central-business-improvement-district-cbid-expansion-approved-by-metro-nashville-council · kept as `nashville-faces/5355029bda78b911.txt` · 836 bytes · retrieved 2026-09-04T23:08:44Z · 7 passage(s) read

Downtown Nashville continues to grow its residential and business communities while welcoming millions of visitors each year. The Nashville Downtown Partnership is grateful to Metro Council for approving the expansion of the Central Business Improvement District CBID.

*composed 2 of 2 claim(s); none withheld; a further 1 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**The Nashville Downtown Partnership —is→ grateful to Metro Council for approving the expansion of the Central Business Improvement District (CBID)**

> The Nashville Downtown Partnership is grateful to Metro Council for approving the expansion of the Central Business Improvement District (CBID) .
>
> — `nashvilledowntown.com-535502.txt#183-328`

### Nashville Downtown Partnership, Pillars Development Launch Public Planning Process for Downtown Public Restroom Facilities \| Downtown Nashville

`nashvilledowntown.com` · https://nashvilledowntown.com/news/nashville-downtown-partnership-pillars-development-launch-public-planning-process-for-downtown-public-restroom-facilities · kept as `nashville-faces/ed6ed739356f4c79.txt` · 5150 bytes · retrieved 2026-09-04T23:09:09Z · 23 passage(s) read

Downtown Nashville continues to grow its residential and business communities while welcoming millions of visitors each year. According to nashvilledowntown.com, The firm has previously played central roles in shaping Nashville s civic landscape. According to nashvilledowntown.com, the Nashville Downtown Partnership is a private. According to nashvilledowntown.com, The Nashville Downtown Partnership has teamed with Pillars Development.

*composed 4 of 4 claim(s); none withheld; a further 4 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**Downtown Nashville —continues→ to grow its residential and business communities while welcoming millions of visitors each year**

> Downtown Nashville continues to grow its residential and business communities while welcoming millions of visitors each year.
>
> — `nashvilledowntown.com-ed6ed7.txt#1148-1273`

**The firm —has→ previously played central roles in shaping Nashville’s civic landscape**

> The firm has previously played central roles in shaping Nashville’s civic landscape, including:
>
> — `nashvilledowntown.com-ed6ed7.txt#3744-3839`

**The Nashville Downtown Partnership —has→ teamed with Pillars Development**

> NASHVILLE, TN (July 27, 2026) – The Nashville Downtown Partnership (NDP) has teamed with Pillars Development (Pillars), a highly respected Nashville-based land use planning and development firm, to launch a comprehensive planning initiative to evaluate the potential for future public restroom facilities in downtown Nashville.
>
> — `nashvilledowntown.com-ed6ed7.txt#277-604`

**the Nashville Downtown Partnership —is→ a private**

> Organized in 1994, the Nashville Downtown Partnership is a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE, WORK, PLAY and INVEST.
>
> — `nashvilledowntown.com-ed6ed7.txt#4757-5016`

### Council Defers Mayor’s Security Deal With Downtown Nonprofit \| Pith in the Wind \| Nashville News \| nashvillescene.com

`nashvillescene.com` · https://www.nashvillescene.com/news/pithinthewind/metro-council-defers-ndp-partnership/article_2d67bce6-fea7-4da8-a0ba-4fcd2f0d7151.html · kept as `nashville-faces/eba01b57bd5f3923.txt` · 4820 bytes · retrieved 2026-09-04T23:09:09Z · 25 passage(s) read

According to nashvillescene.com, Metro Council is ready to spend it on shared priorities.

*composed 1 of 1 claim(s); none withheld; a further 4 proposition(s) heard from this page are off the declared subject — this page's own recirculation furniture — and are listed in §3.3*

**Metro Council —is→ ready to spend it on shared priorities**

> The good news is that the funding is available, and we'll just have to keep working to make sure the Metro Council is ready to spend it on shared priorities.
>
> — `nashvillescene.com-eba01b.txt#3473-3630`

## 3 — The ledger, across sources

**Standing counts DISTINCT SOURCES, never chunks:** two passages of one page are one perspective. 44 of 44 snip addresses were re-read from the kept bytes before being printed; an address that did not read back was dropped rather than shipped.

| standing | propositions |
|---|---|
| stated by two or more distinct sources | 4 |
| stated once so far | 11 |
| contested (a source states it, another refuses it) | 0 |
| off the declared subject — a page's own recirculation furniture, heard and kept, not chased | 28 |
| total with a verified verbatim span | 43 of 44 note(s) in the ledger |

### 3.1 — Stated by more than one source

Downtown Nashville continues to grow its residential and business communities while welcoming millions of visitors each year. Metro Council approved the Central Business Improvement District's fiscal year 2027 budget Tuesday night. Metro Council approves downtown CBID budget after heated debate. The Nashville Downtown Partnership is grateful to Metro Council for approving the expansion of the Central Business Improvement District CBID.

**Downtown Nashville —continues→ to grow its residential and business communities while welcoming millions of visitors each year**

> Downtown Nashville continues to grow its residential and business communities while welcoming millions of visitors each year.
>
> — `nashvilledowntown.com-ed6ed7.txt#1148-1273` · nashvilledowntown.com · *stated in the page's own words, found by containment*

> We're excited by the opportunity to continue supporting the sustained growth of downtown Nashville as the premier location in the Southeast in which to live, work, play and invest.
>
> — `nashvilledowntown.com-535502.txt#488-668` · nashvilledowntown.com · *attested by the witness against this page, which states it in other words*

**Metro Council —approved→ the Central Business Improvement District's fiscal year 2027 budget Tuesday night**

> (WZTV) — Metro Council approved the Central Business Improvement District's fiscal year 2027 budget Tuesday night, but not before a lengthy debate over downtown safety, oversight, and whether council concerns had been addressed.
>
> — `fox17.com-c34437.txt#489-717` · fox17.com · *stated in the page's own words, found by containment*

> Along with approving Metro’s all-encompassing $3.8 billion budget , the Metro Council gave its approval to a $9 million budget related to downtown’s Central Business Improvement District.
>
> — `nashvillepost.com-609956.txt#808-995` · nashvillepost.com (counted as one perspective with nashvillescene.com) · *attested by the witness against this page, which states it in other words*

**Metro Council —approves→ downtown CBID budget after heated debate**

> Metro Council approves downtown CBID budget after heated debate
>
> — `fox17.com-c34437.txt#136-199` · fox17.com · *stated in the page's own words, found by containment*

> Along with approving Metro’s all-encompassing $3.8 billion budget , the Metro Council gave its approval to a $9 million budget related to downtown’s Central Business Improvement District.
>
> — `nashvillepost.com-609956.txt#808-995` · nashvillepost.com (counted as one perspective with nashvillescene.com) · *attested by the witness against this page, which states it in other words*

**The Nashville Downtown Partnership —is→ grateful to Metro Council for approving the expansion of the Central Business Improvement District (CBID)**

> The Nashville Downtown Partnership is grateful to Metro Council for approving the expansion of the Central Business Improvement District (CBID) .
>
> — `nashvilledowntown.com-535502.txt#183-328` · nashvilledowntown.com · *stated in the page's own words, found by containment*

> NASHVILLE, April 15, 2026 – The Nashville Downtown Partnership (NDP), a private, nonprofit corporation whose mission is to make downtown Nashville the compelling urban center in the Southeast in which to live, work, play and invest, is increasing its investment in cleaning and safety services throughout downtown’s two business improvement districts (BIDs), the Central BID and the Gulch BID.
>
> — `nashvilledowntown.com-94477e.txt#241-634` · nashvilledowntown.com · *attested by the witness against this page, which states it in other words*

### 3.2 — Stated once so far, on the declared subject (11)

**the Nashville Downtown Partnership —is→ a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE**

> Organized in 1994, the Nashville Downtown Partnership is a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE, WORK, PLAY and INVEST.
>
> — `nashvilledowntown.com-94477e.txt#3200-3459` · nashvilledowntown.com

**Metro Council —is→ ready to spend it on shared priorities**

> The good news is that the funding is available, and we'll just have to keep working to make sure the Metro Council is ready to spend it on shared priorities.
>
> — `nashvillescene.com-eba01b.txt#3473-3630` · nashvillescene.com

**NDP —reported→ an anticipated increase of services in the 2027 Metro Budget**

> In its annual budget and financial report submitted to the Metropolitan Council on Wednesday, April 15, NDP reported an anticipated increase of services in the 2027 Metro Budget.
>
> — `nashvilledowntown.com-94477e.txt#636-814` · nashvilledowntown.com

**the budget for one additional meeting —failed→ before the council voted on final approval**

> A motion to defer the budget for one additional meeting failed before the council voted on final approval.
>
> — `fox17.com-c34437.txt#3013-3119` · fox17.com

**The continued support of Metro Council —is→ crucial as we continue to navigate the incredible growth of downtown Nashville**

> “The continued support of Metro Council is crucial as we continue to navigate the incredible growth of downtown Nashville, including residential, visitor, and investment growth,” said Tom Turner, President & CEO of NDP.
>
> — `nashvilledowntown.com-94477e.txt#1039-1258` · nashvilledowntown.com

**the Downtown Partnership —failed→ to collaborate with council members who raised concerns**

> Councilmember Sandra Sepulveda also argued the Downtown Partnership failed to collaborate with council members who raised concerns.
>
> — `fox17.com-c34437.txt#2229-2360` · fox17.com

**The firm —has→ previously played central roles in shaping Nashville’s civic landscape**

> The firm has previously played central roles in shaping Nashville’s civic landscape, including:
>
> — `nashvilledowntown.com-ed6ed7.txt#3744-3839` · nashvilledowntown.com

**the Metro Council —gave→ its approval to a $9 million budget related to downtown’s Central Business Improvement District**

> Along with approving Metro’s all-encompassing $3.8 billion budget , the Metro Council gave its approval to a $9 million budget related to downtown’s Central Business Improvement District.
>
> — `nashvillepost.com-609956.txt#808-995` · nashvillepost.com

**The Metro Council —is→ expected to take up the packet at an upcoming meeting and could push for amendments that require yearly council sign-off or more detailed reporting from the district**

> The Metro Council is expected to take up the packet at an upcoming meeting and could push for amendments that require yearly council sign-off or more detailed reporting from the district.
>
> — `hoodline.com-29e967.txt#5437-5624` · hoodline.com

**The Nashville Downtown Partnership —has→ teamed with Pillars Development**

> NASHVILLE, TN (July 27, 2026) – The Nashville Downtown Partnership (NDP) has teamed with Pillars Development (Pillars), a highly respected Nashville-based land use planning and development firm, to launch a comprehensive planning initiative to evaluate the potential for future public restroom facilities in downtown Nashville.
>
> — `nashvilledowntown.com-ed6ed7.txt#277-604` · nashvilledowntown.com

**the Nashville Downtown Partnership —is→ a private**

> Organized in 1994, the Nashville Downtown Partnership is a private-sector nonprofit corporation and membership organization whose core purpose is “to make Downtown Nashville the compelling urban center in the Southeast in which to LIVE, WORK, PLAY and INVEST.
>
> — `nashvilledowntown.com-ed6ed7.txt#4757-5016` · nashvilledowntown.com

### 3.3 — What the pages' own furniture brought in (28)

These were heard from the same pages and share no content word with the declared subject. They are kept, addressed, and shown here rather than dropped — an aggregator's recirculation module is prose, structurally indistinguishable from the article beside it, and the honest response is to name the drift rather than filter it out of sight. The fold spent no further budget on them.

- **The CBID —is→ a self-funded assessment district that provides the resources for additional services to support a clean** — `nashvilledowntown.com-535502.txt`
- **a deadly —crash→ at a busy Nashville crosswalk left one person dead and three others injured** — `fox17.com-c34437.txt`
- **A family —said→ their baby suffered a brain injury at a Fort Campbell Army hospital gets justice in an $11 million settlement with the federal government** — `fox17.com-c34437.txt`
- **Councilmember Delishia Porterfield —criticized→ what she viewed as a lack of meaningful changes in the revised budget** — `fox17.com-c34437.txt`
- **ED —k2→ 9C67lQ9EEADi^^HHH]?2D9G:==6A@DE]4@>^3FD:?6DD^5@H?E@H?\=:3C2CJ\82C286\=@H6C\=6G6=D\4@F=5\D@@?\C6@A6?^2CE:4=60b6hcb6g_\deag\c`36\3fef\h6ab5c2c2567]9E>=Q E2C86ElQ03=2?** — `nashvillepost.com-609956.txt`
- **ensure downtown —is→ safe for all to enjoy** — `nashvilledowntown.com-94477e.txt`
- **Kupin —said→ on the chamber floor** — `nashvillescene.com-eba01b.txt`
- **large fuel containers —stored→ in the area where the fire is believed to have started** — `hoodline.com-29e967.txt`
- **money for downtown safety —is→ important** — `nashvillescene.com-eba01b.txt`
- **Nashville —pedestrian→ hit by tow truck has been identified** — `fox17.com-c34437.txt`
- **NDP —anticipates→ a revenue of $9** — `nashvilledowntown.com-94477e.txt`
- **NDP —employs→ a full-time Cleaning Team that picks up litter** — `nashvilledowntown.com-94477e.txt`
- **NDP —hosted→ 415 free events for the neighborhood in these spaces and anticipates this number will increase in 2026 and beyond** — `nashvilledowntown.com-94477e.txt`
- **NDP —works→ closely with MNPD** — `nashvilledowntown.com-94477e.txt`
- **Pillars —brings→ a deep track record of guiding high** — `nashvilledowntown.com-ed6ed7.txt`
- **Pillars —is→ hosting a** — `nashvilledowntown.com-ed6ed7.txt`
- **public restrooms —has→ emerged as an important component of creating a more welcoming** — `nashvilledowntown.com-ed6ed7.txt`
- **revealed fuel canisters —stored→ on-site** — `hoodline.com-29e967.txt`
- **Safety Ambassadors —offer→ eyes and ears to support and assist the neighborhood** — `nashvilledowntown.com-94477e.txt`
- **subcontractor Block by Block —stored→ fuel there for its maintenance vehicles** — `hoodline.com-29e967.txt`
- **Tennessee —nonprofit→ confirms one Tennessean among 22 Americans still missing in Nepal** — `fox17.com-c34437.txt`
- **the city —is→ trying to build itself i…** — `nashvillescene.com-eba01b.txt`
- **the district —is→ shifting toward a model built around uniformed** — `hoodline.com-29e967.txt`
- **the garage —is→ owned by NDOT** — `hoodline.com-29e967.txt`
- **the MOU —leaves→ $15 million with the NDP without clear spending oversight until an MOU can pass the council** — `nashvillescene.com-eba01b.txt`

## 4 — Ranke: the accounts chased to what they themselves cite

What these pages offered to chase, before any of it was spent:

| page | outbound link leads | unsourced quotes | cites anything |
|---|---|---|---|
| nashvilledowntown.com | 7 | 3 | yes |
| nashvillepost.com | 22 | 0 | yes |
| fox17.com | 15 | 3 | yes |
| hoodline.com | 13 | 1 | yes |
| nashvilledowntown.com | 8 | 0 | yes |
| nashvilledowntown.com | 7 | 6 | yes |
| nashvillescene.com | 29 | 4 | yes |

15 proposition(s) standing on accounts alone were chased to the documents those accounts cite; 20 fetch(es) and 6 search(es) were spent; 0 containment lead(s) were found. **Containment is a lead, never a landing** — a page carrying a proposition's words is not thereby a page that states it, and only the witness's own "states" lands a primary witness on a note.

Gaps by type: `{"http":7,"shell":6}`

**No proposition was landed on a cited document in this pass, and the reason is upstream of the witness.** Across these pages the chase had 101 outbound link lead(s) and 17 unsourced quotation(s) to work with, and 0 of the documents it fetched carried a proposition's own words. Ranke's own gate is that a page which cites nothing chases nothing; contemporary news pages cite by naming a body or an outlet in prose, not by linking a document, which is the shape this organ was built for on encyclopedic material. That is a limit of this medium against this organ, not a finding about the sources.

## 5 — The corroboration walk, and its control (II.23)

| arm | asks spent | attested | contradicted | skipped before any ask | clean votes per ask |
|---|---|---|---|---|---|
| real ledger | 74 | 6 | 0 | 111 | 0.081 |
| redealt, built to survive the gate | 89 | 6 | 0 | 104 | 0.067 |

**How the control is built, and why this way.** Each redealt proposition keeps its real subject and takes a DIFFERENT object drawn from this material's own other objects, chosen so it shares no content word with the true object and yet genuinely co-occurs with the subject somewhere in the read pages (`corroboration.js::endsCopresentWindow`, the walk's own gate). 37 proposition(s) were built this way; 7 could not be and are absent from the arm.

An earlier version of this control rotated each object to the next note's and spent **0 asks** — every rotated proposition was refused by the co-presence gate before a single model call. That measured the gate and tested the model not at all; an arm that always refuses is a rubber stamp, not an arm. This version is a false proposition the material makes PLAUSIBLE, put to the same model under the same protocol and the same budget.

The control attested 6 of 89 (0.067 per ask) against the real arm's 0.081. **A control that attests at the real arm's rate means §3's corroboration is measuring topic overlap**, and should be read as unproven until the gap is real.

Refusals in the real arm, by name: `{"no-slice":0,"no-testimony":60,"insensitive":0,"uncontained":2,"unreadable":0,"unarmed":1,"decider_unrelated":1,"unarmed-select":0,"indiscriminate":4,"other":0}`. `no-testimony` is the model saying no to every sentence it was offered — a fact about those pages, never a conviction of the proposition.

## 6 — Provenance appendix: every crossing this run made

| # | act | target | outcome | at |
|---|---|---|---|---|

## 7 — Every call the model was asked to make

198 call(s). In each, the model was shown a numbered list of sentences drawn from the material and asked for an index; the "answer" column is the whole of what it returned.

| # | phase | protocol | asked (chars) | answer | ms |
|---|---|---|---|---|---|
| 1 | corroboration walk | select (point at an index) | 729 | `{ "stated": "yes", "sentence": 1 }` | 3379 |
| 2 | corroboration walk | select (point at an index) | 729 | `{ "stated": "yes", "sentence": 1 }` | 3061 |
| 3 | corroboration walk | witness (yes/no + the words it read) | 913 | `{ "answer": "no","because": "The passage does not say that the Nashville Downtown Partners` | 3613 |
| 4 | corroboration walk | select (point at an index) | 1835 | `{ "stated": "yes", "sentence": 1 }` | 1317 |
| 5 | corroboration walk | select (point at an index) | 1683 | `{ "stated": "yes", "sentence": 3 }` | 1763 |
| 6 | corroboration walk | select (point at an index) | 371 | `{ "stated": "no", "sentence": 0 }` | 2413 |
| 7 | corroboration walk | select (point at an index) | 535 | `{ "stated": "no", "sentence": 0 }` | 2583 |
| 8 | corroboration walk | select (point at an index) | 861 | `{ "stated": "no", "sentence": 0 }` | 3011 |
| 9 | corroboration walk | select (point at an index) | 602 | `{ "stated": "no", "sentence": 0 }` | 2768 |
| 10 | corroboration walk | select (point at an index) | 640 | `{ "stated": "no", "sentence": 0 }` | 2703 |
| 11 | corroboration walk | select (point at an index) | 638 | `{ "stated": "yes", "sentence": 1 }` | 2753 |
| 12 | corroboration walk | select (point at an index) | 559 | `{ "stated": "yes", "sentence": 1 }` | 2823 |
| 13 | corroboration walk | witness (yes/no + the words it read) | 904 | `{ "answer": "no","because": "money for downtown safety is important" }` | 3062 |
| 14 | corroboration walk | select (point at an index) | 182 | `{ "stated": "no", "sentence": 0 }` | 1949 |
| 15 | corroboration walk | witness (yes/no + the words it read) | 936 | `{ "answer": "yes","because": "The Nashville Downtown Partnership has teamed with Pillars D` | 1637 |
| 16 | corroboration walk | select (point at an index) | 1103 | `{ "stated": "yes", "sentence": 1 }` | 3577 |
| 17 | corroboration walk | select (point at an index) | 1019 | `{ "stated": "yes", "sentence": 2 }` | 3337 |
| 18 | corroboration walk | select (point at an index) | 624 | `{ "stated": "no", "sentence": 0 }` | 2893 |
| 19 | corroboration walk | select (point at an index) | 583 | `{ "stated": "no", "sentence": 0 }` | 2735 |
| 20 | corroboration walk | select (point at an index) | 299 | `{ "stated": "no", "sentence": 0 }` | 2244 |
| 21 | corroboration walk | select (point at an index) | 299 | `{ "stated": "no", "sentence": 0 }` | 2255 |
| 22 | corroboration walk | select (point at an index) | 568 | `{ "stated": "no", "sentence": 0 }` | 2457 |
| 23 | corroboration walk | select (point at an index) | 563 | `{ "stated": "yes", "sentence": 1 }` | 2747 |
| 24 | corroboration walk | select (point at an index) | 512 | `{ "stated": "yes", "sentence": 2 }` | 1057 |
| 25 | corroboration walk | select (point at an index) | 382 | `{ "stated": "yes", "sentence": 1 }` | 2278 |
| 26 | corroboration walk | select (point at an index) | 291 | `{ "stated": "yes", "sentence": 1 }` | 2208 |
| 27 | corroboration walk | witness (yes/no + the words it read) | 936 | `{ "answer": "no","because": "The passage does not mention the Nashville Downtown Partnersh` | 1904 |
| 28 | corroboration walk | witness (yes/no + the words it read) | 936 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 2038 |
| 29 | corroboration walk | witness (yes/no + the words it read) | 936 | `{ "answer": "no","because": "The passage does not say that the Nashville Downtown Partners` | 2393 |
| 30 | corroboration walk | select (point at an index) | 522 | `{ "stated": "yes", "sentence": 1 }` | 2517 |
| 31 | corroboration walk | select (point at an index) | 510 | `{ "stated": "no", "sentence": 0 }` | 1141 |
| 32 | corroboration walk | select (point at an index) | 546 | `{ "stated": "no", "sentence": 0 }` | 2484 |
| 33 | corroboration walk | witness (yes/no + the words it read) | 953 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 8447 |
| 34 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5377 |
| 35 | corroboration walk | select (point at an index) | 392 | `{ "stated": "no", "sentence": 0 }` | 2298 |
| 36 | corroboration walk | witness (yes/no + the words it read) | 921 | `{ "answer": "no","because": "The passage does not say that Metro Council is ready to spend` | 3847 |
| 37 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "yes","because": "nancial report submitted to the Metropolitan Council on Wedn` | 4883 |
| 38 | corroboration walk | witness (yes/no + the words it read) | 982 | `{ "answer": "no","because": "The passage does not say the sentence is true." }` | 3819 |
| 39 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3471 |
| 40 | corroboration walk | select (point at an index) | 362 | `{ "stated": "yes", "sentence": 1 }` | 2279 |
| 41 | corroboration walk | select (point at an index) | 278 | `{ "stated": "no", "sentence": 0 }` | 2239 |
| 42 | corroboration walk | select (point at an index) | 552 | `{ "stated": "no", "sentence": 0 }` | 2527 |
| 43 | corroboration walk | witness (yes/no + the words it read) | 984 | `{ "answer": "no","because": "The passage does not mention the Metro Council giving its app` | 4454 |
| 44 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "As discussed in coverage by Nashville Scene , members say th"` | 3292 |
| 45 | corroboration walk | witness (yes/no + the words it read) | 645 | `{ "answer": "yes","because": "The CBID is a self-funded assessment district that provides ` | 4089 |
| 46 | corroboration walk | witness (yes/no + the words it read) | 829 | `{ "answer": "no","because": "The passage does not say that downtown is safe for all to enj` | 3567 |
| 47 | corroboration walk | select (point at an index) | 354 | `{ "stated": "no", "sentence": 0 }` | 2272 |
| 48 | corroboration walk | select (point at an index) | 765 | `{ "stated": "no", "sentence": 0 }` | 2904 |
| 49 | corroboration walk | select (point at an index) | 691 | `{ "stated": "no", "sentence": 0 }` | 2786 |
| 50 | corroboration walk | witness (yes/no + the words it read) | 953 | `{ "answer": "no","because": "the budget for one additional meeting failed before the counc` | 1868 |
| 51 | corroboration walk | witness (yes/no + the words it read) | 923 | `{ "answer": "no","because": "This passage does not mention the sentence: 'Nashville pedest` | 2435 |
| 52 | corroboration walk | witness (yes/no + the words it read) | 923 | `{ "answer": "no","because": "The passage does not mention anything about a Nashville pedes` | 2082 |
| 53 | corroboration walk | witness (yes/no + the words it read) | 943 | `{ "answer": "yes","because": "Safety ambassadors offer eyes and ears to support and assist` | 1890 |
| 54 | corroboration walk | witness (yes/no + the words it read) | 949 | `{ "answer": "no","because": "The passage does not mention public restrooms or their import` | 1830 |
| 55 | corroboration walk | select (point at an index) | 439 | `{ "stated": "no", "sentence": 0 }` | 2648 |
| 56 | corroboration walk | witness (yes/no + the words it read) | 1052 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 1567 |
| 57 | corroboration walk | witness (yes/no + the words it read) | 1052 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3807 |
| 58 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Many advocates and councilmembers are also skeptical of furth` | 3986 |
| 59 | corroboration walk | select (point at an index) | 579 | `{ "stated": "no", "sentence": 0 }` | 2677 |
| 60 | corroboration walk | select (point at an index) | 645 | `{ "stated": "no", "sentence": 0 }` | 3267 |
| 61 | corroboration walk | select (point at an index) | 1021 | `{ "stated": "no", "sentence": 0 }` | 1241 |
| 62 | corroboration walk | select (point at an index) | 356 | `{ "stated": "no", "sentence": 0 }` | 2457 |
| 63 | corroboration walk | select (point at an index) | 381 | `{ "stated": "no", "sentence": 0 }` | 2252 |
| 64 | corroboration walk | witness (yes/no + the words it read) | 953 | `{ "answer": "no","because": "The passage states that the council gave its approval to a $9` | 3588 |
| 65 | corroboration walk | witness (yes/no + the words it read) | 921 | `{ "answer": "no","because": "The passage does not say that the Metro Council is ready to s` | 2286 |
| 66 | corroboration walk | witness (yes/no + the words it read) | 755 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 1548 |
| 67 | corroboration walk | select (point at an index) | 257 | `{ "stated": "no", "sentence": 0 }` | 2013 |
| 68 | corroboration walk | witness (yes/no + the words it read) | 953 | `{ "answer": "no","because": "The passage does not mention the budget for one additional me` | 2075 |
| 69 | corroboration walk | select (point at an index) | 372 | `{ "stated": "no", "sentence": 0 }` | 2440 |
| 70 | corroboration walk | witness (yes/no + the words it read) | 984 | `{ "answer": "no","because": "The passage does not mention the Metro Council giving its app` | 4410 |
| 71 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3138 |
| 72 | corroboration walk | select (point at an index) | 645 | `{ "stated": "no", "sentence": 0 }` | 2727 |
| 73 | corroboration walk | select (point at an index) | 370 | `{ "stated": "no", "sentence": 0 }` | 2307 |
| 74 | corroboration walk | witness (yes/no + the words it read) | 565 | `{ "answer": "no","because": "does not say" }` | 2692 |
| 75 | corroboration walk | witness (yes/no + the words it read) | 981 | `{ "answer": "no","because": "Councilmember Delishia Porterfield criticized what she viewed` | 2340 |
| 76 | corroboration walk | select (point at an index) | 450 | `{ "stated": "no", "sentence": 0 }` | 2790 |
| 77 | corroboration walk | witness (yes/no + the words it read) | 665 | `{ "answer": "no","because": "Metro Council approved the Central Business Improvement Distr` | 1664 |
| 78 | corroboration walk | witness (yes/no + the words it read) | 906 | `{ "answer": "no","because": "The passage does not say that downtown is safe for all to enj` | 2004 |
| 79 | corroboration walk | witness (yes/no + the words it read) | 949 | `{ "answer": "no","because": "public restrooms has emerged as an important component of cre` | 2001 |
| 80 | corroboration walk | witness (yes/no + the words it read) | 943 | `{ "answer": "no","because": "The passage focuses on the planning initiative for public res` | 3916 |
| 81 | corroboration walk | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "The project is funded under an agreement with the State of Te` | 4819 |
| 82 | corroboration walk | select (point at an index) | 448 | `{ "stated": "no", "sentence": 0 }` | 1095 |
| 83 | corroboration walk | select (point at an index) | 336 | `{ "stated": "no", "sentence": 0 }` | 2294 |
| 84 | corroboration walk | witness (yes/no + the words it read) | 990 | `{ "answer": "no","because": "The passage does not mention anything about the growth of the` | 2056 |
| 85 | corroboration walk | select (point at an index) | 572 | `{ "stated": "yes", "sentence": 3 }` | 2459 |
| 86 | corroboration walk | select (point at an index) | 485 | `{ "stated": "yes", "sentence": 1 }` | 2590 |
| 87 | corroboration walk | witness (yes/no + the words it read) | 949 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 1573 |
| 88 | corroboration walk | witness (yes/no + the words it read) | 953 | `{ "answer": "no","because": "The passage does not mention anything about a budget for one ` | 2516 |
| 89 | corroboration walk | select (point at an index) | 1274 | `{ "stated": "yes", "sentence": 4 }` | 1215 |
| 90 | corroboration walk | select (point at an index) | 1139 | `{ "stated": "yes", "sentence": 4 }` | 1497 |
| 91 | corroboration walk | select (point at an index) | 447 | `{ "stated": "no", "sentence": 0 }` | 1196 |
| 92 | control (redealt, gate-surviving) | select (point at an index) | 421 | `{ "stated": "no", "sentence": 0 }` | 2239 |
| 93 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 981 | `{ "answer": "no","because": "The passage focuses on the planning initiative for public res` | 4433 |
| 94 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 974 | `{ "answer": "no","because": "The firm has previously played central roles in shaping Nashv` | 7834 |
| 95 | control (redealt, gate-surviving) | select (point at an index) | 877 | `{ "stated": "yes", "sentence": 1 }` | 2873 |
| 96 | control (redealt, gate-surviving) | select (point at an index) | 788 | `{ "stated": "no", "sentence": 0 }` | 2775 |
| 97 | control (redealt, gate-surviving) | select (point at an index) | 876 | `{ "stated": "yes", "sentence": 1 }` | 2922 |
| 98 | control (redealt, gate-surviving) | select (point at an index) | 787 | `{ "stated": "no", "sentence": 0 }` | 2737 |
| 99 | control (redealt, gate-surviving) | select (point at an index) | 581 | `{ "stated": "yes", "sentence": 1 }` | 2481 |
| 100 | control (redealt, gate-surviving) | select (point at an index) | 505 | `{ "stated": "yes", "sentence": 1 }` | 2489 |
| 101 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 990 | `{ "answer": "no","because": "Downtown Nashville continues to grow its residential and busi` | 3698 |
| 102 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 993 | `{ "answer": "no","because": "Downtown Nashville continues to grow its residential and busi` | 3644 |
| 103 | control (redealt, gate-surviving) | select (point at an index) | 370 | `{ "stated": "no", "sentence": 0 }` | 2372 |
| 104 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 980 | `{ "answer": "yes","because": "Downtown Nashville continues to grow its residential and bus` | 3651 |
| 105 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 978 | `{ "answer": "no","because": "The passage does not mention the Metro Council or its plans f` | 3579 |
| 106 | control (redealt, gate-surviving) | select (point at an index) | 859 | `{ "stated": "yes", "sentence": 1 }` | 2855 |
| 107 | control (redealt, gate-surviving) | select (point at an index) | 770 | `{ "stated": "no", "sentence": 0 }` | 2609 |
| 108 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 982 | `{ "answer": "no","because": "The passage focuses on the planning of public restroom facili` | 4669 |
| 109 | control (redealt, gate-surviving) | select (point at an index) | 726 | `{ "stated": "no", "sentence": 0 }` | 2767 |
| 110 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1006 | `{ "answer": "no","because": "The passage does not mention anything about a budget for one ` | 4459 |
| 111 | control (redealt, gate-surviving) | select (point at an index) | 534 | `{ "stated": "no", "sentence": 0 }` | 2601 |
| 112 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 984 | `{ "answer": "no","because": "The passage focuses on the planning of public restroom facili` | 4375 |
| 113 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 986 | `{ "answer": "no","because": "Downtown Nashville continues to grow its residential and busi` | 3598 |
| 114 | control (redealt, gate-surviving) | select (point at an index) | 530 | `{ "stated": "no", "sentence": 0 }` | 2604 |
| 115 | control (redealt, gate-surviving) | select (point at an index) | 499 | `{ "stated": "no", "sentence": 0 }` | 2419 |
| 116 | control (redealt, gate-surviving) | select (point at an index) | 379 | `{ "stated": "yes", "sentence": 1 }` | 2268 |
| 117 | control (redealt, gate-surviving) | select (point at an index) | 295 | `{ "stated": "no", "sentence": 0 }` | 2190 |
| 118 | control (redealt, gate-surviving) | select (point at an index) | 473 | `{ "stated": "no", "sentence": 0 }` | 2393 |
| 119 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 968 | `{ "answer": "no","because": "public restrooms has the Central Business Improvement Distric` | 4257 |
| 120 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Skeptical councilmembers will review $15 million resource-sha` | 4162 |
| 121 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1006 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3678 |
| 122 | control (redealt, gate-surviving) | select (point at an index) | 390 | `{ "stated": "no", "sentence": 0 }` | 2447 |
| 123 | control (redealt, gate-surviving) | select (point at an index) | 623 | `{ "stated": "no", "sentence": 0 }` | 2733 |
| 124 | control (redealt, gate-surviving) | select (point at an index) | 371 | `{ "stated": "no", "sentence": 0 }` | 2273 |
| 125 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 993 | `{ "answer": "no","because": "The passage does not say that the Downtown Partnership failed` | 4590 |
| 126 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Supporters argued the district has made progress over the pas` | 4058 |
| 127 | control (redealt, gate-surviving) | select (point at an index) | 465 | `{ "stated": "no", "sentence": 0 }` | 2369 |
| 128 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1041 | `{ "answer": "no","because": "The passage does not mention anything about a Nashville Downt` | 4713 |
| 129 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 968 | `{ "answer": "no","because": "public restrooms has the Central Business Improvement Distric` | 4058 |
| 130 | control (redealt, gate-surviving) | select (point at an index) | 352 | `{ "stated": "no", "sentence": 0 }` | 2334 |
| 131 | control (redealt, gate-surviving) | select (point at an index) | 366 | `{ "stated": "no", "sentence": 0 }` | 2235 |
| 132 | control (redealt, gate-surviving) | select (point at an index) | 365 | `{ "stated": "no", "sentence": 0 }` | 2291 |
| 133 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 981 | `{ "answer": "no","because": "Tennessee nonprofit to grow its residential and business comm` | 4404 |
| 134 | control (redealt, gate-surviving) | select (point at an index) | 369 | `{ "stated": "no", "sentence": 0 }` | 2423 |
| 135 | control (redealt, gate-surviving) | select (point at an index) | 893 | `{ "stated": "yes", "sentence": 1 }` | 2986 |
| 136 | control (redealt, gate-surviving) | select (point at an index) | 720 | `{ "stated": "yes", "sentence": 2 }` | 2775 |
| 137 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1041 | `{ "answer": "no","because": "The passage does not mention the Nashville Downtown Partnersh` | 4729 |
| 138 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5416 |
| 139 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 990 | `{ "answer": "no","because": "Supporters argued the district has made progress over the pas` | 4275 |
| 140 | control (redealt, gate-surviving) | select (point at an index) | 366 | `{ "stated": "no", "sentence": 0 }` | 2168 |
| 141 | control (redealt, gate-surviving) | select (point at an index) | 408 | `{ "stated": "no", "sentence": 0 }` | 2191 |
| 142 | control (redealt, gate-surviving) | select (point at an index) | 242 | `{ "stated": "no", "sentence": 0 }` | 1989 |
| 143 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 993 | `{ "answer": "no","because": "The passage does not say that the Downtown Partnership failed` | 4285 |
| 144 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 990 | `{ "answer": "no","because": "money for downtown safety is to grow its residential and busi` | 4524 |
| 145 | control (redealt, gate-surviving) | select (point at an index) | 585 | `{ "stated": "yes", "sentence": 3 }` | 2502 |
| 146 | control (redealt, gate-surviving) | select (point at an index) | 498 | `{ "stated": "yes", "sentence": 1 }` | 2507 |
| 147 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1006 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3881 |
| 148 | control (redealt, gate-surviving) | select (point at an index) | 353 | `{ "stated": "no", "sentence": 0 }` | 2356 |
| 149 | control (redealt, gate-surviving) | select (point at an index) | 589 | `{ "stated": "no", "sentence": 0 }` | 2761 |
| 150 | control (redealt, gate-surviving) | select (point at an index) | 387 | `{ "stated": "no", "sentence": 0 }` | 2338 |
| 151 | control (redealt, gate-surviving) | select (point at an index) | 324 | `{ "stated": "no", "sentence": 0 }` | 2269 |
| 152 | control (redealt, gate-surviving) | select (point at an index) | 328 | `{ "stated": "no", "sentence": 0 }` | 2274 |
| 153 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 980 | `{ "answer": "no","because": "Supporters argued the district has made progress over the pas` | 4196 |
| 154 | control (redealt, gate-surviving) | select (point at an index) | 587 | `{ "stated": "no", "sentence": 0 }` | 2485 |
| 155 | control (redealt, gate-surviving) | select (point at an index) | 591 | `{ "stated": "no", "sentence": 0 }` | 2616 |
| 156 | control (redealt, gate-surviving) | select (point at an index) | 376 | `{ "stated": "no", "sentence": 0 }` | 2193 |
| 157 | control (redealt, gate-surviving) | select (point at an index) | 362 | `{ "stated": "no", "sentence": 0 }` | 2231 |
| 158 | control (redealt, gate-surviving) | select (point at an index) | 380 | `{ "stated": "no", "sentence": 0 }` | 2268 |
| 159 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 972 | `{ "answer": "no","because": "Jacob Kupin said to grow its residential and business communi` | 3999 |
| 160 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 978 | `{ "answer": "no","because": "Metro Council is to grow its residential and business communi` | 4319 |
| 161 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5383 |
| 162 | control (redealt, gate-surviving) | select (point at an index) | 334 | `{ "stated": "no", "sentence": 0 }` | 2376 |
| 163 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 982 | `{ "answer": "no","because": "The passage does not say the Metro Council is to grow its res` | 4680 |
| 164 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5284 |
| 165 | control (redealt, gate-surviving) | select (point at an index) | 330 | `{ "stated": "no", "sentence": 0 }` | 2372 |
| 166 | control (redealt, gate-surviving) | select (point at an index) | 339 | `{ "stated": "no", "sentence": 0 }` | 2288 |
| 167 | control (redealt, gate-surviving) | select (point at an index) | 593 | `{ "stated": "no", "sentence": 0 }` | 2586 |
| 168 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 986 | `{ "answer": "no","because": "Safety Ambassadors offer to grow its residential and business` | 4076 |
| 169 | control (redealt, gate-surviving) | select (point at an index) | 382 | `{ "stated": "yes", "sentence": 1 }` | 2350 |
| 170 | control (redealt, gate-surviving) | select (point at an index) | 295 | `{ "stated": "yes", "sentence": 1 }` | 2366 |
| 171 | control (redealt, gate-surviving) | select (point at an index) | 297 | `{ "stated": "no", "sentence": 0 }` | 2198 |
| 172 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 984 | `{ "answer": "no","because": "Metro Council debates a memorandum of understanding that incl` | 5677 |
| 173 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5404 |
| 174 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 986 | `{ "answer": "no","because": "The passage does not mention Safety Ambassadors or their acti` | 3907 |
| 175 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Many advocates and council" }` | 3203 |
| 176 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 993 | `{ "answer": "no","because": "The passage does not say that the Downtown Partnership failed` | 5042 |
| 177 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Confusion and skepticism around a city agreement with the Nas` | 5461 |
| 178 | control (redealt, gate-surviving) | select (point at an index) | 497 | `{ "stated": "no", "sentence": 0 }` | 2576 |
| 179 | control (redealt, gate-surviving) | select (point at an index) | 323 | `{ "stated": "no", "sentence": 0 }` | 2291 |
| 180 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 973 | `{ "answer": "no","because": "The passage does not mention anything about the city's growth` | 4159 |
| 181 | control (redealt, gate-surviving) | select (point at an index) | 323 | `{ "stated": "no", "sentence": 0 }` | 2419 |
| 182 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 974 | `{ "answer": "no","because": "The passage does not mention anything about the firm's need t` | 4722 |
| 183 | control (redealt, gate-surviving) | select (point at an index) | 371 | `{ "stated": "yes", "sentence": 1 }` | 2246 |
| 184 | control (redealt, gate-surviving) | select (point at an index) | 284 | `{ "stated": "yes", "sentence": 1 }` | 2203 |
| 185 | control (redealt, gate-surviving) | select (point at an index) | 375 | `{ "stated": "no", "sentence": 0 }` | 2274 |
| 186 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 973 | `{ "answer": "no","because": "the city is to grow its residential and business communities ` | 4266 |
| 187 | control (redealt, gate-surviving) | select (point at an index) | 326 | `{ "stated": "no", "sentence": 0 }` | 2412 |
| 188 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 980 | `{ "answer": "no","because": "The passage does not say that the downtown is to grow its res` | 4278 |
| 189 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 777 | `{ "answer": "no","because": "The CBID is a self-funded assessment district that provides t` | 4410 |
| 190 | control (redealt, gate-surviving) | select (point at an index) | 623 | `{ "stated": "no", "sentence": 0 }` | 2786 |
| 191 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 980 | `{ "answer": "no","because": "The passage does not say this sentence is true." }` | 3850 |
| 192 | control (redealt, gate-surviving) | select (point at an index) | 336 | `{ "stated": "no", "sentence": 0 }` | 2345 |
| 193 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 787 | `{ "answer": "no","because": "The passage does not say that money for downtown safety is to` | 4189 |
| 194 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1006 | `{ "answer": "no","because": "The passage does not mention a budget for one additional meet` | 4196 |
| 195 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1006 | `{ "answer": "no","because": "The passage does not mention anything about a budget for one ` | 4276 |
| 196 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 1007 | `{ "answer": "no","because": "The passage does not mention anything about Councilmember Del` | 4455 |
| 197 | control (redealt, gate-surviving) | witness (yes/no + the words it read) | 881 | `{ "answer": "no","because": "Many advocates and councilmembers are also skeptical of furth` | 6242 |
| 198 | control (redealt, gate-surviving) | select (point at an index) | 425 | `{ "stated": "no", "sentence": 0 }` | 2353 |

### What this run did not do, named rather than left implied

- **It asserts no wrongdoing.** Every proposition above is attributed to the page that states it. This instrument has no organ that reaches a verdict about conduct, and it does not pretend to one.
- **Reach is the declared budget, not the record.** 7 page(s) read of 40 allowed. Of the crossings behind them, **0 fetch(es) and 0 search(es) were made over the network this run** (budgets: 120 and 40); 14 face(s) and 18 search(es) were served from the kept store a previous run of this driver filled. A cached page is a real page with a real retrieval timestamp — §1 carries it — but it is not a crossing this run made, and the two are counted apart here so "7 pages, 0 fetches" cannot read as a contradiction.
- **No document supplied by the person who commissioned this run was read.** The ledger stands on the public record the fold reached on its own; anything held privately is outside it.
- **The extractor's reach is not the page's content.** A page yielding no bound proposition is a limit of the reader on that prose, never a finding that the page is empty.
- **Corroboration is counted, never assumed.** Two hosts carrying one wire story are two hosts and one perspective, and nothing here can tell those apart.
