import sys
from pathlib import Path

# Automatically add repository root to sys.path so 'backend.app' is always resolvable
repo_root = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent

for p in (repo_root, backend_dir):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)
