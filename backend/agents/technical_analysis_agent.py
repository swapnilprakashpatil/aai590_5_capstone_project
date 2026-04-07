"""
Technical Agentic Analysis Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class TechnicalAgenticAnalysisAgent(HealthAgent):
    """Meta-agent that explains the RAG pipeline and agent interactions"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Technical Agentic System Analyst",
            "explaining AI reasoning and multi-agent orchestration"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        # This agent gets the context of all other agents' outputs
        return f"""Explain the agentic RAG framework that generated the health insights and return ONLY valid JSON:

**Product Analysis Summary:**
{json.dumps(product_data, indent=2)}

**User Context:**
{json.dumps(user_profile, indent=2)}

**Other Agents' Context:**
{context if context else "No additional context available"}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <code>, <pre>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  \"summary\": \"Brief overview of the agentic system (use HTML tags for formatting)\",
  \"rag_pipeline\": {{
    \"description\": \"How RAG works in this system\",
    \"steps\": []
  }},
  \"multi_agent_architecture\": {{
    \"agents\": [
      {{
        \"name\": \"Nutritional Analysis Expert\",
        \"role\": \"Description\",
        \"execution\": \"parallel/sequential\"
      }}
    ],
    \"collaboration_model\": \"How agents work together\"
  }},
  \"reasoning_chain\": [],
  \"data_flow\": {{
    \"mermaid_diagram\": \"Optional mermaid diagram code\",
    \"description\": \"Text description of data flow\"
  }},
  \"model_details\": {{
    \"llm_model\": \"model-router\",
    \"total_tokens\": 0,
    \"avg_latency_ms\": 0
  }},
  \"confidence_limitations\": []
}}
"""
