import os
import redis
from typing import Optional
import time
from fastapi import Request


class RateLimiter:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or os.getenv("UPSTASH_REDIS_REST_URL")
        self.redis_client = None

        if self.redis_url:
            try:
                # For Upstash Redis, we need to handle the REST API
                # This is a simplified implementation
                self.redis_client = redis.from_url(self.redis_url)
            except Exception as e:
                print(f"Failed to connect to Redis: {e}")
                self.redis_client = None

        # Simple in-memory rate limiting as fallback
        self.requests = {}

    async def is_allowed(
        self, ip: str, limit: int = 15, window_seconds: int = 60
    ) -> bool:
        """
        Check if the IP is within rate limits
        """
        if not self.redis_client:
            return await self._in_memory_check(ip, limit, window_seconds)

        try:
            # Redis-based rate limiting
            key = f"ratelimit:{ip}"
            current = self.redis_client.incr(key)

            if current == 1:
                self.redis_client.expire(key, window_seconds)

            return current <= limit
        except Exception as e:
            print(f"Redis rate limit error: {e}")
            return await self._in_memory_check(ip, limit, window_seconds)

    async def _in_memory_check(self, ip: str, limit: int, window_seconds: int) -> bool:
        """
        Simple in-memory rate limiting as fallback
        """
        current_time = time.time()

        if ip not in self.requests:
            self.requests[ip] = []

        # Remove old requests outside the window
        self.requests[ip] = [
            req_time
            for req_time in self.requests[ip]
            if current_time - req_time < window_seconds
        ]

        # Check if under limit
        if len(self.requests[ip]) < limit:
            self.requests[ip].append(current_time)
            return True

        return False


# Global rate limiter instance
rate_limiter = RateLimiter()


async def get_client_ip(request: Request) -> str:
    """
    Get client IP address from request
    """
    # Try various headers that might contain the real IP
    ip_headers = [
        "x-forwarded-for",
        "x-real-ip",
        "x-client-ip",
        "cf-connecting-ip",  # Cloudflare
        "x-cluster-client-ip",  # Alibaba Cloud
    ]

    for header in ip_headers:
        ip = request.headers.get(header)
        if ip:
            # x-forwarded-for might contain multiple IPs, take the first one
            return ip.split(",")[0].strip()

    # Fallback to request.client.host
    return request.client.host if request.client else "127.0.0.1"


async def rate_limit(request: Request) -> bool:
    """
    Main rate limiting function
    """
    ip = await get_client_ip(request)
    return await rate_limiter.is_allowed(ip)
