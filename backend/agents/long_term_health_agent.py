"""
Long-Term Health Impact Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class LongTermHealthAgent(HealthAgent):
    """Agent for long-term health impact analysis"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Long-Term Health Impact Analyst",
            "predicting long-term health outcomes from dietary patterns"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        nutrition = product_data.get("nutrition", {})
        nova = product_data.get("nova_class", 0)
        
        return f"""Analyze long-term health implications of regular consumption and return ONLY valid JSON:

**Product:**
- NOVA: {nova}
- Nutrition: {json.dumps(nutrition, indent=2)}

**User:**
- Age: {user_profile.get('age')}
- Current Health: {user_profile.get('health_conditions', [])}
- Family History: {user_profile.get('family_history', [])}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <ul>, <li>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  "summary": "Brief long-term health impact summary (use HTML tags for formatting)",
  "timeline_projections": [
    {{
      "timeframe": "6 months",
      "frequency": "daily consumption",
      "potential_impacts": [],
      "severity": "low/medium/high"
    }},
    {{
      "timeframe": "5 years",
      "frequency": "daily consumption",
      "potential_impacts": [],
      "severity": "low/medium/high"
    }}
  ],
  "disease_risk_changes": [
    {{
      "condition": "Type 2 Diabetes",
      "risk_change": "increased/decreased/unchanged",
      "percentage": "+15%",
      "explanation": "Why this changes",
      "research_support": "Study citation if available"
    }}
  ],
  "cumulative_effects": [],
  "age_specific_concerns": [],
  "preventive_measures": []
}}
"""
