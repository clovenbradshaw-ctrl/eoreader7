# model-swap-diff — bar item (5), measured (2026-09-05)

*Transcription of `MODELS=gemma2:2b,llama3.2:latest node eval/the-fold/model-swap-diff.mjs` — the real `runHolonicTask` over the product assay corpus, ledger read on arrival, production reader with `objectSpecificity` on. Model calls spent and declared. Read by no test; the driver re-runs from the repos plus a local Ollama.*

Reader recipe `08fcbd3dc7ee`. Models: gemma2:2b, llama3.2:latest.

## Per model, per question

### gemma2:2b — 14 call(s), 73 s
- **Who founded the Northgate Observatory?** → “## Who The passage shows that the information about Amelia Hartley and the Northgate Observatory is consistent across different versions of the text, while the information about the order of events an”  
  record: `{"unheard": 4, "unbound": 2, "beyond-reach": 1, "bound": 3}` · unsupported 0 · unbacked 2
- **Did Rowan Vale precede Owen Blythe?** → “## Background Rowan Vale was a figure who preceded Marta Quill in the history of the Northgate Observatory. Owen Blythe, known for repairing the great refractor, was also involved in the observatory's”  
  record: `{"beyond-reach": 3, "unheard": 11, "bound": 6, "unbound": 3}` · unsupported 0 · unbacked 3
- **When did the Northgate Observatory open?** → “The passage indicates that the Northgate Observatory opened in 1889, but it also reveals that Amelia Hartley founded the observatory in 1887.”  
  record: `{"bound": 2}` · unsupported 0 · unbacked 1

### llama3.2:latest — 24 call(s), 218 s
- **Who founded the Northgate Observatory?** → “## founded Amelia Hartley established the Northgate Observatory in 1887, marking the beginning of its operations. ## Northgate The Northgate Observatory appears to have been a real location, but its o”  
  record: `{"unheard": 9, "bound": 3, "beyond-reach": 3, "unbound": 5}` · unsupported 0 · unbacked 3
- **Did Rowan Vale precede Owen Blythe?** → “## Who is Rowan Vale? Rowan Vale is Marta Quill. ## Who is Owen Blythe? Owen Blythe is a person who repaired the great refractor. ## When did Rowan Vale live? Based on the information available, it ap”  
  record: `{"unheard": 10, "beyond-reach": 1, "unbound": 1, "bound": 2}` · unsupported 0 · unbacked 3
- **When did the Northgate Observatory open?** → “## What is the Northgate Observatory? The Northgate Observatory is a historical astronomical observatory located in Northgate, Edinburgh, Scotland. The exact location of the observatory is not specifi”  
  record: `{"unheard": 7, "bound": 3, "beyond-reach": 1}` · unsupported 0 · unbacked 3

## The diff (record-backed claims, gemma2:2b against llama3.2:latest)

- **Who founded the Northgate Observatory?** — shared 1, only gemma2:2b 2, only llama3.2:latest 2; nothing backs: gemma2:2b 2, llama3.2:latest 3
  - = `owen blythe|repaired|the great refractor`
  - gemma2:2b only: `marta quill|preceded|owen blythe`
  - gemma2:2b only: `rowan vale also|preceded|marta quill`
  - llama3.2:latest only: `amelia hartley|founded|the observatory in 1887`
  - llama3.2:latest only: `rowan vale|preceded|marta quill`
- **Did Rowan Vale precede Owen Blythe?** — shared 1, only gemma2:2b 4, only llama3.2:latest 1; nothing backs: gemma2:2b 3, llama3.2:latest 3
  - = `marta quill|preceded|owen blythe`
  - gemma2:2b only: `amelia hartley|founded|the northgate observatory in 1887`
  - gemma2:2b only: `the observatory|opened|in 1889`
  - gemma2:2b only: `owen blythe|repaired|the great refractor`
  - gemma2:2b only: `the northgate observatory|never opened|in 1889`
  - llama3.2:latest only: `rowan vale|preceded|marta quill`
- **When did the Northgate Observatory open?** — shared 1, only gemma2:2b 1, only llama3.2:latest 2; nothing backs: gemma2:2b 1, llama3.2:latest 3
  - = `amelia hartley|founded|the observatory in 1887`
  - gemma2:2b only: `the northgate observatory|opened|in 1889`
  - llama3.2:latest only: `the northgate observatory actually|opened|in 1889`
  - llama3.2:latest only: `the observatory|never opened|in 1889`

## Reading

**The bar as first written — "only phrasing changes" — is BREACHED, and honestly so.** Both small mouths add sentences nothing backs (llama3.2 placed the observatory "in Northgate, Edinburgh, Scotland"; gemma2 wrote "Rowan Vale also"), and the record-backed sets differ on 3/3 questions: each mouth chose different true things to say. What IS model-independent is the record itself — the ledger, the retrieved claims, the frame and recipe — by construction. So bar item (5) is restated (the-fold P100): the RECORD is identical across models; every sentence a mouth adds beyond it is MARKED model-ground (item 1), counted on the record, and driven toward zero; the record-backed sets are reported side by side, never averaged. Two extractor grains surfaced in the keys (`rowan vale also|preceded|…`, `the northgate observatory actually|opened|…`): an adverb absorbed into the subject — carried as a reading-grain finding, not fixed here.
