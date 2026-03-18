# Render Deployment — Gotchas & Patterns

Hard-won lessons from deploying this monorepo (Python backend + Node.js SSR frontend) on Render.

---

## 1. NODE_ENV=production Skips devDependencies

**Problem**: Render sets `NODE_ENV=production` as an env var. When `npm ci` runs, it skips `devDependencies`. Build tools like `vite`, `tailwindcss`, `@tailwindcss/vite`, `@vitejs/plugin-react`, and `typescript` are needed at build time.

**Solution**: Put all build-time dependencies in `dependencies`, not `devDependencies`. The `--include=dev` flag in the build command is unreliable when `NODE_ENV=production` is set as an environment variable.

```json
{
  "dependencies": {
    "@tailwindcss/vite": "^4.2.1",
    "@vitejs/plugin-react": "^5.2.0",
    "tailwindcss": "^4.2.1",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  },
  "devDependencies": {
    "vitest": "^4.1.0",
    "@testing-library/react": "^16.3.2"
  }
}
```

**Rule of thumb**: If `npm run build` needs it, it goes in `dependencies`. Only test/lint tools go in `devDependencies`.

---

## 2. Render Shell Uses System Python (3.11)

**Problem**: Render's interactive shell (`render shell`) uses the system Python (3.11 on Debian), NOT the Python version configured for the build (3.13). If `pyproject.toml` has `requires-python = ">=3.12"`, `pip install` fails in the shell.

**Solution**: Set `requires-python` to the lowest version that actually works. If no 3.12+ features are used, set `>=3.11`.

```toml
# pyproject.toml
requires-python = ">=3.11"
```

**To run scripts on Render shell**:
```bash
python3 -m venv /tmp/venv && source /tmp/venv/bin/activate && pip install -e . && python scripts/seed.py
```

The shell also has PEP 668 (`externally-managed-environment`), so a venv is required.

---

## 3. PostgreSQL URL Scheme Mismatch

**Problem**: Render provides `DATABASE_URL` with scheme `postgres://`. SQLAlchemy async requires `postgresql+asyncpg://`. Alembic (sync) requires `postgresql://`.

**Solution**: Rewrite the scheme at config load time:

```python
@model_validator(mode="after")
def fix_db_urls(self):
    if self.database_url.startswith("postgres://"):
        self.database_url = self.database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if self.database_url_sync.startswith("postgres://"):
        self.database_url_sync = self.database_url_sync.replace("postgres://", "postgresql://", 1)
    return self
```

Also: `psycopg2-binary` is required for Alembic sync migrations even if the app uses `asyncpg`.

---

## 4. render.yaml vs Dashboard Settings

**Problem**: Changes to `render.yaml` (Blueprint) don't automatically sync to existing services. If a service was created manually or the Blueprint was connected after creation, the dashboard settings take precedence.

**Solution**: After changing `render.yaml`, either:
1. Delete and re-create services via Blueprint sync, or
2. Manually update the build/start commands in the Render Dashboard

Always verify the actual build command in the Dashboard matches what's in `render.yaml`.

---

## 5. CORS Origins Must Match Frontend Port

The frontend runs on port 3000 (Vike SSR), not 5173 (Vite default dev port).

```bash
# .env
CORS_ORIGINS=http://localhost:3000

# render.yaml (production)
CORS_ORIGINS=https://myapp-web.onrender.com
```

---

## 6. SSR Frontend Needs a Node.js Web Service

**Problem**: With SSR enabled, the frontend is NOT a static site. It needs an Express server running.

**Solution**: Use `type: web` with `runtime: node` in render.yaml:

```yaml
- type: web
  name: myapp-web
  runtime: node
  buildCommand: cd web && npm ci && npm run build
  startCommand: cd web && node server.js
  envVars:
    - key: NODE_VERSION
      value: "22"
    - key: NODE_ENV
      value: "production"
```

---

## 7. Pre-deploy Commands

Use `preDeployCommand` for database migrations so they run BEFORE the new code starts serving traffic:

```yaml
- type: web
  name: myapp-api
  preDeployCommand: cd server && alembic upgrade head
```

---

## 8. Checklist Before Deploying

- [ ] All build-time deps are in `dependencies` (not `devDependencies`)
- [ ] `CORS_ORIGINS` matches the frontend URL
- [ ] `DATABASE_URL` scheme is handled (postgres:// -> postgresql+asyncpg://)
- [ ] `requires-python` is compatible with Render shell (>=3.11)
- [ ] render.yaml build commands match what's in the Dashboard
- [ ] Frontend has a `server.js` for SSR and `startCommand: node server.js`
