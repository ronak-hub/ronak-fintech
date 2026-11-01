"""Small process-local throttles for sensitive public API operations.

Use a shared rate-limit store at the edge for multi-worker or multi-instance
production deployments. This module is a best-effort per-process backstop.
"""

from collections import deque
from hashlib import sha256
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status


class ProcessRateLimiter:
    def __init__(self, max_buckets: int = 5000):
        self._buckets: dict[str, deque[float]] = {}
        self._lock = Lock()
        self._max_buckets = max_buckets

    def check(self, request: Request, scope: str, limit: int, window_seconds: int) -> None:
        host = request.client.host if request.client else "unknown"
        bucket_id = sha256(f"{scope}:{host}".encode("utf-8")).hexdigest()
        now = monotonic()
        cutoff = now - window_seconds

        with self._lock:
            if len(self._buckets) >= self._max_buckets:
                for key in list(self._buckets):
                    bucket = self._buckets[key]
                    while bucket and bucket[0] <= cutoff:
                        bucket.popleft()
                    if not bucket:
                        del self._buckets[key]

            bucket = self._buckets.setdefault(bucket_id, deque())
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, ceil(window_seconds - (now - bucket[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please wait and try again.",
                    headers={"Retry-After": str(retry_after)},
                )

            bucket.append(now)


rate_limiter = ProcessRateLimiter()
