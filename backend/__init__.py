import sys
from pathlib import Path

# Automatically add repository root to sys.path so 'backend' package is always resolvable
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))
