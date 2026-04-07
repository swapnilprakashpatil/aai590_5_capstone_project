"""
Pydantic models for agent metadata and tracking
"""

from pydantic import BaseModel


class InsightMetadata(BaseModel):
    """Metadata for tracking agent execution"""
    agent_name: str
    start_time: str
    end_time: str
    duration_seconds: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    model: str = ""


class AgentStep(BaseModel):
    """Represents a single step in agent reasoning"""
    step_number: int
    action: str
    thought: str
    result: str
