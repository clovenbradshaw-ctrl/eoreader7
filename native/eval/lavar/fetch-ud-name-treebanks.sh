#!/bin/bash
# fetch-ud-name-treebanks.sh — the ten Universal Dependencies treebanks sullivan-names.mjs reads, train/dev/test each, plus their READMEs and
# licences, into the directory given (default ./ud-names; gitignored — the files are 1-25 MB each and are not committed). Prints each file's
# sha256 so a run can be checked against the hashes recorded in results/sullivan-names.json.
#   ./fetch-ud-name-treebanks.sh /path/to/ud && node sullivan-names.mjs --ud /path/to/ud
set -u
OUT="${1:-./ud-names}"
mkdir -p "$OUT"
BASE="https://raw.githubusercontent.com/UniversalDependencies"
get() { repo="$1"; file="$2"; out="$3"; [ -s "$OUT/$out" ] && { echo "have $out"; return; }; curl -sS -L --fail -m 300 -o "$OUT/$out" "$BASE/$repo/master/$file" && echo "ok   $out" || { echo "FAIL $repo/$file"; rm -f "$OUT/$out"; }; }
for pair in UD_English-EWT:en_ewt UD_German-GSD:de_gsd UD_Dutch-Alpino:nl_alpino UD_Swedish-Talbanken:sv_talbanken UD_Danish-DDT:da_ddt \
            UD_French-GSD:fr_gsd UD_Spanish-GSD:es_gsd UD_Italian-ISDT:it_isdt UD_Finnish-TDT:fi_tdt UD_Hungarian-Szeged:hu_szeged; do
  repo="${pair%%:*}"; code="${pair##*:}"
  for split in train dev test; do get "$repo" "${code}-ud-${split}.conllu" "${code}-${split}.conllu"; done
  get "$repo" README.md "README-${repo}.md"
  get "$repo" LICENSE.txt "LICENSE-${repo}.txt"
done
( cd "$OUT" && sha256sum *.conllu )
