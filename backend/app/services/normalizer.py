import re
import hashlib
from typing import Tuple

def normalize_query_text(raw_text: str) -> str:
    """
    Step 1: Normalize input text.
    - Trim leading and trailing whitespace.
    - Normalize repeated internal whitespace into single spaces.
    - Preserve meaningful punctuation, casing and words.
    """
    if not raw_text:
        return ""
    # Normalize unicode whitespace, replace multiple whitespace characters with single space
    cleaned = re.sub(r"\s+", " ", raw_text).strip()
    return cleaned

def compute_cache_key(normalized_text: str, model_name: str, model_version: str = "v1") -> Tuple[str, str]:
    """
    Computes a deterministic canonical cache key and SHA-256 hash.
    Canonical string is lowercased to ensure case-insensitive exact match cache lookup.
    Cache key includes model name and version so embeddings are never cross-contaminated.
    """
    canonical_repr = normalized_text.lower()
    content_hash = hashlib.sha256(canonical_repr.encode("utf-8")).hexdigest()
    # Cache key format: {model_name}:{model_version}:{content_hash}
    cache_key = f"{model_name}:{model_version}:{content_hash}"
    return cache_key, content_hash
