#!/usr/bin/env python3
"""
mine1_official_retrieve.py — the retrieval half of MINE-1's own official
scoring pipeline (arxiv.org/abs/2502.09956), run against OUR reader's own
exported graph (eval/fixtures/mine1-graph-export.json), not our stricter
`bound` verdict.

Per the paper: facts and KG nodes are embedded with all-MiniLM-L6-v2; for
each fact, retrieve the top-k most semantically similar nodes, then expand
to all nodes within two relations (hops) of those top-k nodes. An LLM judge
then scores 1 if the fact can be inferred from the retrieved nodes/edges
alone, 0 otherwise. k is not stated in the paper's abstract/HTML excerpt
this session could reach — k=5 is used here as a disclosed, reasonable
default (common in retrieval-augmented setups), not a reproduced number.

This script does the embedding + retrieval only (no LLM judge — no hosted
model call is available in this environment, and standing up a real judge
model was out of scope tonight). It emits, for a DISCLOSED SAMPLE of
essays, each fact's retrieved subgraph (nodes + connecting edges) as JSON,
for a human (or the agent building this harness) to score by hand against
the paper's own exact rubric: "can this fact be inferred from the
retrieved nodes and relations alone?"

Run: python3 eval/mine1_official_retrieve.py
"""
import json
import sys

from sentence_transformers import SentenceTransformer
import numpy as np

HERE = __file__.rsplit("/", 1)[0]

TOP_K = 5  # disclosed assumption, not stated in the paper's own reachable text
SAMPLE_ESSAY_STRIDE = 10  # every 10th essay (idx 0,10,20,...,90) = ~10 essays, 150 facts


def cosine_sim(a, b):
    a = a / (np.linalg.norm(a, axis=-1, keepdims=True) + 1e-9)
    b = b / (np.linalg.norm(b, axis=-1, keepdims=True) + 1e-9)
    return a @ b.T


def two_hop_nodes(seed_nodes, edges):
    adj = {}
    for e in edges:
        adj.setdefault(e["subject"], set()).add(e["object"])
        adj.setdefault(e["object"], set()).add(e["subject"])
    frontier = set(seed_nodes)
    for _ in range(2):
        nxt = set(frontier)
        for n in frontier:
            nxt |= adj.get(n, set())
        frontier = nxt
    return frontier


def edges_within(node_set, edges):
    return [e for e in edges if e["subject"] in node_set and e["object"] in node_set]


def main():
    with open(f"{HERE}/fixtures/mine1-graph-export.json") as f:
        data = json.load(f)

    model = SentenceTransformer("all-MiniLM-L6-v2")

    sample = [e for e in data["essays"] if e["idx"] % SAMPLE_ESSAY_STRIDE == 0]
    print(f"sampled {len(sample)} essays (every {SAMPLE_ESSAY_STRIDE}th), "
          f"{sum(len(e['facts']) for e in sample)} facts", file=sys.stderr)

    out = []
    for essay in sample:
        nodes = essay["nodes"]
        edges = essay["edges"]
        facts = essay["facts"]
        if not nodes:
            for fact in facts:
                out.append({"idx": essay["idx"], "topic": essay["topic"], "fact": fact,
                            "retrieved_nodes": [], "retrieved_edges": []})
            continue

        node_emb = model.encode(nodes, show_progress_bar=False)
        fact_emb = model.encode(facts, show_progress_bar=False)
        sims = cosine_sim(fact_emb, node_emb)  # facts x nodes

        for i, fact in enumerate(facts):
            top_idx = np.argsort(-sims[i])[:TOP_K]
            seed = [nodes[j] for j in top_idx]
            expanded = two_hop_nodes(seed, edges)
            sub_edges = edges_within(expanded, edges)
            out.append({
                "idx": essay["idx"], "topic": essay["topic"], "fact": fact,
                "top_k_nodes": seed,
                "retrieved_nodes": sorted(expanded),
                "retrieved_edges": [f"{e['subject']} —{e['verb']}→ {e['object']}" +
                                    (" [negated]" if e.get("polarity") == "-" else "")
                                    for e in sub_edges],
            })

    with open(f"{HERE}/results/mine1-official-retrieval-sample.json", "w") as f:
        json.dump(out, f, indent=1)
    print(f"wrote {len(out)} fact retrievals to eval/results/mine1-official-retrieval-sample.json", file=sys.stderr)


if __name__ == "__main__":
    main()
