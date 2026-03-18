"""Redis-backed rate limiting middleware."""

import time

import structlog
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = structlog.get_logger()

DEFAULT_LIMIT = 100
DEFAULT_WINDOW = 60

# Stricter limits for sensitive auth endpoints (requests per minute)
STRICT_LIMITS: dict[str, int] = {
    "/api/auth/register": 5,
    "/api/auth/forgot-password": 3,
    "/api/auth/reset-password": 5,
    "/api/auth/verify-email": 10,
}


def _get_client_ip(request: Request) -> str:
    """Extract real client IP, respecting X-Forwarded-For behind a proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP rate limiting using Redis sliding window counters."""

    def __init__(
        self,
        app: FastAPI,
        limit: int = DEFAULT_LIMIT,
        window: int = DEFAULT_WINDOW,
    ):
        super().__init__(app)
        self.limit = limit
        self.window = window

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = _get_client_ip(request)

        # Use stricter limit for sensitive auth endpoints
        path_limit = STRICT_LIMITS.get(request.url.path, self.limit)
        is_strict = request.url.path in STRICT_LIMITS
        suffix = f":{request.url.path}" if is_strict else ""
        key = f"rate_limit:{client_ip}{suffix}"

        try:
            from app.database import get_redis

            redis_client = await get_redis()
            now = time.time()
            window_start = now - self.window

            pipe = redis_client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, self.window)
            _removed, _added, request_count, _expiry = await pipe.execute()
        except Exception as exc:
            logger.warning("rate_limit_redis_error", exc=str(exc))
            return await call_next(request)

        remaining = max(0, path_limit - request_count)
        response = (
            await call_next(request)
            if request_count <= path_limit
            else Response(
                content='{"error":{"code":"RateLimitExceeded","message":"Too many requests"}}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(self.window)},
            )
        )

        response.headers["X-RateLimit-Limit"] = str(path_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.window)

        return response


def register_rate_limiting(
    app: FastAPI, *, limit: int = DEFAULT_LIMIT, window: int = DEFAULT_WINDOW
) -> None:
    """Add rate limiting middleware to the app."""
    app.add_middleware(RateLimitMiddleware, limit=limit, window=window)  # type: ignore[arg-type]
