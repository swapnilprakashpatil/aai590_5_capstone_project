"""
Health Risks Assessment Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class HealthRisksAgent(HealthAgent):
    """Agent focused on identifying health risks"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Health Risk Assessment Expert",
            "identifying potential health risks from food consumption"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        nutrition = product_data.get("nutrition", {})
        nova = product_data.get("nova_class", 0)
        anomalies = product_data.get("anomalies", {})
        
        return f"""Assess health risks for this food product and return ONLY valid JSON:

**Product Information:**
- NOVA Classification: {nova}
- Nutritional Data per 100g: {json.dumps(nutrition, indent=2)}
- Anomalies Detected: {json.dumps(anomalies, indent=2)}

**User Health Profile:**
{json.dumps(user_profile, indent=2)}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <ul>, <li>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  "summary": "Brief 2-3 sentence risk assessment (use HTML tags for formatting)",
  "immediate_concerns": [
    {{
      "risk": "High Sugar",
      "severity": "high",
      "details": "10.6g per 100g exceeds WHO recommendations",
      "impact": "Blood sugar spikes"
    }}
  ],
  "user_specific_risks": [
    {{
      "condition": "Type 2 Diabetes",
      "risk_level": "high/medium/low",
      "explanation": "Why this is risky for this condition",
      "recommendation": "What to do"
    }}
  ],
  "processing_risks": {{
    "nova_classification": {nova},
    "concerns": [],
    "research_citations": []
  }},
  "anomaly_alerts": [],
  "long_term_risks": []
}}
"""
