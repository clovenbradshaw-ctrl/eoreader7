#!/usr/bin/env bash
# audit-results.sh — re-run the eval drivers whose committed results the
# 2026-09-05 audit (the-fold P94/P95, READING-SPEC S64/S65) covered, and say
# for each what a re-run can and cannot measure.
#
# THE MAP (P94's own first finding): a driver either WRITES a tracked
# artifact — then `git diff -- results/<file>` is the measure — or only
# PRINTS, and its results doc is a hand transcription of stdout — then a
# diff of results/ is vacuous and the doc is enforced by the named test, or
# by nothing. This script never reports "diff lines: 0" for a print-only
# driver; it names it.
#
# Usage:  native/eval/the-fold/audit-results.sh [driver ...]
# Exit:   0 when every run driver reproduced its tracked artifact or was
#         print-only/refused-typed; 1 when a tracked artifact drifted.
# No time cap: a 20-draw null needs ~12 min when its fixtures are present.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
cd "$ROOT"

# driver | artifact (tracked file under native/eval/the-fold/results, or "print-only") | enforcing test (or "none")
MAP=$(cat <<'MAP'
admission-gate|print-only|none
asserted-eval|asserted-eval.md|none
cited-source-null|print-only (results/cited-source-null.json is gitignored)|tests/walk-fixtures.test.js (the refusal)
ordered-read-reach|print-only (results/ordered-read-reach.json is gitignored)|tests/walk-fixtures.test.js (the refusal)
full-circuit|print-only|tests/full-circuit.test.js
hyperlexicon-door-probe|print-only|tests/hyperlexicon-door-probe.test.js
void-rezero-stream|print-only|tests/void-rezero-stream.test.js
settlement-by-arrival|print-only|tests/settlement-by-arrival.test.js
mechanical-reasoning|mechanical-reasoning.json|none
object-boundary|print-only|tests/object-boundary.test.js (the refusal; the doc's numbers are not re-measurable)
pruning-timeline|pruning-timeline.json|none
rashomon-contrast|print-only (results/rashomon-contrast.json is gitignored; the doc's slot table is not in the driver)|none
reasoning-e2e-no-llm|print-only|tests/reasoning-e2e.test.js
subject-wall|subject-wall.json|none
vendored-prior-eval|vendored-prior-eval.md + vendored-prior-eval.json|none
MAP
)

want=("$@")
status=0
printf '%-26s %-14s %s\n' driver outcome "artifact / enforcement"
while IFS='|' read -r driver artifact enforced; do
  [ -z "$driver" ] && continue
  if [ ${#want[@]} -gt 0 ]; then hit=0; for w in "${want[@]}"; do [ "$w" = "$driver" ] && hit=1; done; [ $hit -eq 0 ] && continue; fi
  log="/tmp/audit-$driver.log"
  start=$(date +%s)
  node "native/eval/the-fold/$driver.mjs" >"$log" 2>&1
  code=$?
  secs=$(( $(date +%s) - start ))
  if [ $code -eq 2 ]; then
    reason=$(grep -o 'REFUSED ([a-z_]*' "$log" | head -1 | sed 's/REFUSED (//')
    printf '%-26s %-14s refused, typed: %s (%ss) — %s\n' "$driver" "refused" "${reason:-?}" "$secs" "$artifact"
  elif [ $code -ne 0 ]; then
    printf '%-26s %-14s exit %s (%ss) — see %s\n' "$driver" "crashed" "$code" "$secs" "$log"
    status=1
  elif [[ "$artifact" == print-only* ]]; then
    printf '%-26s %-14s %s; enforced by: %s (%ss)\n' "$driver" "print-only" "$artifact" "$enforced" "$secs"
  else
    changed=0
    for f in ${artifact//+/ }; do
      # Against HEAD, not the index: a staged regeneration must still read as drift.
      if ! git diff --quiet HEAD -- "native/eval/the-fold/results/$f"; then changed=1; fi
    done
    if [ $changed -eq 0 ]; then
      printf '%-26s %-14s %s unchanged (%ss)\n' "$driver" "reproduces" "$artifact" "$secs"
    else
      printf '%-26s %-14s %s changed — read `git diff -- native/eval/the-fold/results/` (%ss)\n' "$driver" "DRIFTED" "$artifact" "$secs"
      status=1
    fi
  fi
done <<< "$MAP"
exit $status
