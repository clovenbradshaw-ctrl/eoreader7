// surprise-decay-wholebook.mjs — the falsifiable check S97 first ran and
// found BLOCKED: "the first book we read will be the most surprising book
// we've ever read" (user's corollary) predicts novel-rate should FALL as
// priors accumulate, or the reading isn't learning.
//
// S97 measured this within single chapters (ch1 with no prior, ch2 with
// ch1 as prior) and found novel-rate stuck at 1.00 on both — blocked on
// referent coverage (26-of-187 / 11-of-135 arrangements carried ANY
// referent). Each chapter's own "known" registry (labels/partners/count
// seen per referent) also reset to zero at the start of every eot-jsonl.mjs
// process, independent of the vocabulary/cast prior — so even a chapter
// loaded with priors never carried forward what its OWN surprise tracker
// had already seen. This script fixes that: it walks all 12 chapters'
// ledgers IN BOOK ORDER as one continuous stream, keeping ONE "known"
// registry across chapter boundaries, to see whether the much larger n
// (12 chapters' worth of referent-bearing arrangements, not 1-2) resolves
// what was previously blocked on sparsity — or whether the block is
// structural rather than a sample-size artifact.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const known = new Map(); // referentId -> { labels: Set, partners: Set, count }
const rows = [];

for (let ch = 1; ch <= 12; ch += 1) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = lines
    .filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && Array.isArray(l.at))
    .sort((a, b) => a.at[0] - b.at[0]);

  let chWithRef = 0, chNovel = 0, chFamiliar = 0;
  for (const p of props) {
    for (const [ref, partnerRef] of [[p.end1Ref, p.end2Ref], [p.end2Ref, p.end1Ref]]) {
      if (!ref) continue;
      chWithRef += 1;
      const k = known.get(ref) ?? { labels: new Set(), partners: new Set(), count: 0 };
      const novelLabel = !k.labels.has(p.label);
      const novelPartner = partnerRef ? !k.partners.has(partnerRef) : null;
      const isNovel = novelLabel || novelPartner === true;
      if (isNovel) chNovel += 1; else chFamiliar += 1;
      k.labels.add(p.label);
      if (partnerRef) k.partners.add(partnerRef);
      k.count += 1;
      known.set(ref, k);
    }
  }
  const total = chNovel + chFamiliar;
  rows.push({ ch, totalArrangements: props.length, referentBearingEnds: total, novel: chNovel, familiar: chFamiliar, novelRate: total ? chNovel / total : null });
}

console.log("chapter | arrangements | referent-bearing ends | novel | familiar | novel-rate");
for (const r of rows) {
  console.log(`ch${r.ch}`.padEnd(5), "|", String(r.totalArrangements).padEnd(12), "|", String(r.referentBearingEnds).padEnd(22), "|", String(r.novel).padEnd(5), "|", String(r.familiar).padEnd(8), "|", r.novelRate === null ? "n/a (0 referent-bearing ends)" : r.novelRate.toFixed(3));
}
const withData = rows.filter((r) => r.novelRate !== null);
const first = withData[0]?.novelRate, last = withData[withData.length - 1]?.novelRate;
console.log(`\nnovel-rate ch${withData[0]?.ch}: ${first?.toFixed(3)} -> novel-rate ch${withData[withData.length - 1]?.ch}: ${last?.toFixed(3)}`);
console.log(first != null && last != null ? (last < first ? "DECAYED — the corollary holds at whole-book scale" : "DID NOT DECAY — still blocked, or the material itself keeps introducing new labels/partners faster than repetition") : "insufficient data");
fs.writeFileSync(path.join(HERE, "results", "surprise-decay-wholebook.json"), JSON.stringify(rows, null, 1));
