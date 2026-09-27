import json, sys, itertools
from nltk.corpus import wordnet as wn
edges = json.load(open(sys.argv[1]))["edges"]
top = int(sys.argv[3]); minc = int(sys.argv[4])
from collections import Counter
import unicodedata
fold = lambda s: ''.join(c for c in unicodedata.normalize('NFD', str(s)) if unicodedata.category(c) != 'Mn').lower()
c = Counter(fold(e["label"]) for e in edges if e.get("label"))
labels = [l for l, n in c.most_common() if n >= minc and l.isalpha()][:top]
def syn(l):
    lem = wn.morphy(l, wn.VERB)
    return lem, set(wn.synsets(lem, wn.VERB)) if lem else set()
S = {l: syn(l) for l in labels}
out = {}
for a, b in itertools.combinations(labels, 2):
    la, sa = S[a]; lb, sb = S[b]
    if not la or not lb: out[f"{a}|{b}"] = "unknown"; continue
    if la == lb: out[f"{a}|{b}"] = "same-lemma"; continue
    if sa & sb: out[f"{a}|{b}"] = "synonym"; continue
    hyp = lambda s: set(h for x in s for h in x.hypernyms())
    out[f"{a}|{b}"] = "hypernym" if (hyp(sa) & sb or hyp(sb) & sa) else "different"
json.dump({"giver": "Princeton WordNet 3.0 (nltk_data corpora/wordnet.zip), verb synsets after wn.morphy", "labels": labels, "pairs": out}, open(sys.argv[2], "w"), indent=0)
print(len(labels), Counter(out.values()))
