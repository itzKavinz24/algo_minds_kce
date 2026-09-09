"""Small, business-logic-independent execution trace collector."""

from time import perf_counter
from typing import Dict, List, Optional


ALLOWED_STATUSES = {"started", "success", "failed", "blocked"}


class TraceCollector:
    """Record one timed event per pipeline stage without wrapping stage calls."""

    def __init__(self) -> None:
        self._events: List[Dict[str, object]] = []
        self._started_at: Dict[str, float] = {}
        self._active_events: Dict[str, int] = {}

    def start(self, stage: str, message: str = "Stage started") -> None:
        self._started_at[stage] = perf_counter()
        self._events.append({
            "stage": stage,
            "status": "started",
            "message": message,
            "duration_ms": 0,
        })
        self._active_events[stage] = len(self._events) - 1

    def success(self, stage: str, message: str) -> None:
        self._finish(stage, "success", message)

    def fail(self, stage: str, message: str) -> None:
        self._finish(stage, "failed", message)

    def blocked(self, stage: str, message: str) -> None:
        self._finish(stage, "blocked", message)

    def add(self, stage: str, status: str, message: str, duration_ms: int = 0) -> None:
        if status not in ALLOWED_STATUSES:
            raise ValueError(f"Unsupported trace status: {status}")
        self._events.append({
            "stage": stage,
            "status": status,
            "message": message,
            "duration_ms": max(0, int(duration_ms)),
        })

    def to_list(self) -> List[Dict[str, object]]:
        return [dict(event) for event in self._events]

    def _finish(self, stage: str, status: str, message: str) -> None:
        started_at: Optional[float] = self._started_at.pop(stage, None)
        duration_ms = round((perf_counter() - started_at) * 1000) if started_at is not None else 0
        event = {
            "stage": stage,
            "status": status,
            "message": message,
            "duration_ms": max(0, duration_ms),
        }
        index = self._active_events.pop(stage, None)
        if index is None:
            self._events.append(event)
        else:
            self._events[index] = event
