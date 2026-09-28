import os
from pathlib import Path
from urllib.parse import quote

import environ

# Build connection settings from the repo-root .env so local runs need no extra config.
# On the host this points at the published compose ports; the api container sets
# POSTGRES_HOST/POSTGRES_PORT and the URLs itself. Nothing here overrides a set value.
environ.Env.read_env(Path(__file__).resolve().parents[3] / ".env")

_pg_user = quote(os.environ.get("POSTGRES_USER", "teammatch"), safe="")
_pg_pass = quote(os.environ.get("POSTGRES_PASSWORD", ""), safe="")
_pg_db = os.environ.get("POSTGRES_DB", "teammatch")
_pg_host = os.environ.get("POSTGRES_HOST", "localhost")
_pg_port = os.environ.get("POSTGRES_PORT", "5432")
os.environ.setdefault(
    "DATABASE_URL", f"postgres://{_pg_user}:{_pg_pass}@{_pg_host}:{_pg_port}/{_pg_db}"
)
os.environ.setdefault("REDIS_URL", f"redis://localhost:{os.environ.get('REDIS_PORT', '6379')}/0")
os.environ.setdefault("S3_ENDPOINT_URL", f"http://localhost:{os.environ.get('S3_PORT', '8333')}")
