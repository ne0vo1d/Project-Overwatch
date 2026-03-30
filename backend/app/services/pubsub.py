"""
In-process pub/sub broker for SSE streams.
Each topic has a set of asyncio queues (one per connected subscriber).
Redis pub/sub is used for cross-process fan-out when running multiple workers.
"""
import asyncio
import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import AsyncGenerator
import redis.asyncio as aioredis
from app.config import settings

# topic -> set of subscriber queues
_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def publish(topic: str, event: dict) -> None:
    """Publish an event to local subscribers and Redis for cross-process delivery."""
    event.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
    message = json.dumps(event)

    # Local delivery
    for queue in list(_subscribers.get(topic, set())):
        await queue.put(message)

    # Wildcard subscribers (topic="*")
    for queue in list(_subscribers.get("*", set())):
        await queue.put(message)

    # Redis fan-out
    try:
        r = await get_redis()
        await r.publish(f"overwatch:{topic}", message)
    except Exception:
        pass  # Redis is optional; local delivery still works


async def subscribe(topic: str) -> AsyncGenerator[str, None]:
    """
    Async generator that yields SSE-formatted strings for a given topic.
    Also subscribes to Redis so events from other workers are received.
    """
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    _subscribers[topic].add(queue)

    # Start Redis listener for this topic in the background
    redis_task = asyncio.create_task(_redis_listener(topic, queue))

    try:
        # Send a keep-alive comment immediately
        yield ": keep-alive\n\n"

        while True:
            try:
                message = await asyncio.wait_for(queue.get(), timeout=30)
                yield f"data: {message}\n\n"
            except asyncio.TimeoutError:
                # Send a heartbeat to keep the connection alive
                yield ": heartbeat\n\n"
    finally:
        _subscribers[topic].discard(queue)
        redis_task.cancel()
        try:
            await redis_task
        except asyncio.CancelledError:
            pass


async def _redis_listener(topic: str, queue: asyncio.Queue) -> None:
    """Listen to Redis pub/sub and forward messages to the local queue."""
    try:
        r = await get_redis()
        pubsub = r.pubsub()
        channel = f"overwatch:{topic}"
        wildcard = "overwatch:*"
        await pubsub.subscribe(channel, wildcard)
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    await queue.put(message["data"])
                except asyncio.QueueFull:
                    pass  # Drop message if subscriber is too slow
    except Exception:
        pass
