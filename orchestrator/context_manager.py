"""Small thread-safe in-memory conversation store for follow-up questions."""

from collections import defaultdict, deque
from threading import RLock
from typing import Any, Deque, Dict, List


class ContextManager:
    def __init__(self, max_turns: int = 6) -> None:
        self._sessions: Dict[str, Deque[Dict[str, Any]]] = defaultdict(lambda: deque(maxlen=max_turns))
        self._lock = RLock()

    def get(self, session_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._sessions[session_id])

    def as_prompt(self, session_id: str) -> str:
        turns = self.get(session_id)
        return "\n".join(
            f"Previous query: {turn['query']}\nPrevious intent: {turn['intent']}"
            for turn in turns
        )

    def update(self, session_id: str, query: str, intent: Dict[str, Any]) -> None:
        with self._lock:
            self._sessions[session_id].append({"query": query, "intent": intent})
