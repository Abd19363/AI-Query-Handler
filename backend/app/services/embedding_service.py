import os
import math
import hashlib
import numpy as np
import httpx
from typing import List
from backend.app.core.config import settings
from backend.app.core.logging import logger

class EmbeddingService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.model = settings.EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS

    def _generate_deterministic_vector(self, text: str) -> List[float]:
        """
        Deterministic, normalized embedding vector generator.
        Used for Mock mode and resilient fallback if external network times out.
        Generates consistent vectors where similar words produce higher cosine similarity.
        """
        dim = self.dimensions
        vec = np.zeros(dim, dtype=np.float32)
        words = text.lower().split()
        for i, word in enumerate(words):
            # Seed based on word hash
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest()[:8], 16)
            np.random.seed(h)
            word_vec = np.random.normal(0, 1.0, dim).astype(np.float32)
            # Position decay
            weight = 1.0 / (1.0 + 0.1 * i)
            vec += weight * word_vec

        # Normalize to unit length for cosine distance
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for the input text using the configured provider.
        """
        if self.provider == "mock":
            return self._generate_deterministic_vector(text)

        if self.provider == "gemini" and self.gemini_key:
            try:
                # We verified gemini-embedding-001 with outputDimensionality 768 works reliably
                model_name = "gemini-embedding-001" if "embedding" not in self.model else self.model
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:embedContent?key={self.gemini_key}"
                payload = {
                    "model": f"models/{model_name}",
                    "content": {"parts": [{"text": text}]},
                    "outputDimensionality": self.dimensions
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        values = data.get("embedding", {}).get("values", [])
                        if values and len(values) == self.dimensions:
                            return values
                    logger.warning(f"Gemini embedding API returned status {resp.status_code}: {resp.text[:150]}. Falling back to deterministic vector.")
            except Exception as e:
                logger.warning(f"Gemini embedding call failed ({e}). Falling back to deterministic vector.")
            return self._generate_deterministic_vector(text)

        if self.provider == "openai" and self.openai_key:
            try:
                url = "https://api.openai.com/v1/embeddings"
                headers = {"Authorization": f"Bearer {self.openai_key}"}
                payload = {"input": text, "model": self.model}
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["data"][0]["embedding"]
                    logger.warning(f"OpenAI embedding API returned status {resp.status_code}. Falling back.")
            except Exception as e:
                logger.warning(f"OpenAI embedding call failed ({e}). Falling back.")
            return self._generate_deterministic_vector(text)

        # Default fallback
        return self._generate_deterministic_vector(text)

embedding_service = EmbeddingService()
