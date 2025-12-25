import faiss
import numpy as np

class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx != ry:
            self.parent[ry] = rx


def deduplicate_questions(questions, embeddings, similarity_threshold=0.85):
    """
    Transitive semantic deduplication using FAISS + Union-Find.
    Returns clusters of (index, similarity_score).
    """
    if not questions or embeddings.shape[0] == 0:
        return []

    N = len(questions)
    embeddings = embeddings.astype("float32")

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    uf = UnionFind(N)
    similarity_map = {}

    # Pairwise similarity search
    scores, neighbors = index.search(embeddings, N)

    for i in range(N):
        for score, j in zip(scores[i], neighbors[i]):
            if i != j and score >= similarity_threshold:
                uf.union(i, j)
                similarity_map[(i, j)] = float(score)

    # Group by root
    clusters = {}
    for i in range(N):
        root = uf.find(i)
        clusters.setdefault(root, []).append(i)

    # Build final clusters with similarity scores
    final_clusters = []
    for cluster_indices in clusters.values():
        cluster_items = []
        for idx in cluster_indices:
            if idx == cluster_indices[0]:
                sim = 1.0
            else:
                sim = similarity_map.get(
                    (cluster_indices[0], idx),
                    similarity_map.get((idx, cluster_indices[0]), 0.9),
                )
            cluster_items.append((idx, round(sim, 3)))
        final_clusters.append(cluster_items)

    return final_clusters
