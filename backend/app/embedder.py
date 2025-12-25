from sentence_transformers import SentenceTransformer
import numpy as np

class EmbeddingModel:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts):
        """
        Given a list of strings, returns a numpy array of normalized embeddings.
        Handles empty input safely by returning an empty array.
        """
        if not texts:
            return np.empty((0, self.model.get_sentence_embedding_dimension()))
        embeddings = self.model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        # Avoid division by zero
        norms[norms == 0] = 1
        normalized_embeddings = embeddings / norms
        return normalized_embeddings
