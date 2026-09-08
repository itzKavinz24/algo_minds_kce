"""Prompt templates and builders."""

from prompts.intent import (
    INTENT_SYSTEM_PROMPT,
    INTENT_FEW_SHOT_EXAMPLES,
    build_intent_prompt,
)
from prompts.sql import (
    SQL_SYSTEM_PROMPT,
    SQL_FEW_SHOT_EXAMPLES,
    build_sql_prompt,
)
from prompts.analytics import (
    ANALYTICS_SYSTEM_PROMPT,
    ANALYTICS_FEW_SHOT_EXAMPLES,
    build_analytics_prompt,
)
from prompts.root_cause import (
    HYPOTHESIS_SYSTEM_PROMPT,
    HYPOTHESIS_FEW_SHOT_EXAMPLES,
    RCA_SYNTHESIS_SYSTEM_PROMPT,
    build_hypothesis_prompt,
    build_synthesis_prompt,
)

__all__ = [
    "INTENT_SYSTEM_PROMPT",
    "INTENT_FEW_SHOT_EXAMPLES",
    "build_intent_prompt",
    "SQL_SYSTEM_PROMPT",
    "SQL_FEW_SHOT_EXAMPLES",
    "build_sql_prompt",
    "ANALYTICS_SYSTEM_PROMPT",
    "ANALYTICS_FEW_SHOT_EXAMPLES",
    "build_analytics_prompt",
    "HYPOTHESIS_SYSTEM_PROMPT",
    "HYPOTHESIS_FEW_SHOT_EXAMPLES",
    "RCA_SYNTHESIS_SYSTEM_PROMPT",
    "build_hypothesis_prompt",
    "build_synthesis_prompt",
]
