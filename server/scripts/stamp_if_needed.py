"""One-time fix: stamp alembic_version if the DB was created without migrations."""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import psycopg2

LATEST_REVISION = "b2c3d4e5f6a7"

conn = psycopg2.connect(os.environ["DATABASE_URL_SYNC"])
conn.autocommit = True
cur = conn.cursor()
cur.execute("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL)")
cur.execute("SELECT version_num FROM alembic_version")
row = cur.fetchone()
if not row:
    cur.execute("INSERT INTO alembic_version (version_num) VALUES (%s)", (LATEST_REVISION,))
    print(f"stamped {LATEST_REVISION}")
else:
    print(f"already at {row[0]}")
conn.close()
