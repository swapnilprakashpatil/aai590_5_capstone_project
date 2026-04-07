"""
Nutritional Analysis Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class NutritionalAnalysisAgent(HealthAgent):
    """Agent focused on detailed nutritional breakdown"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Nutritional Analysis Expert",
            "macro and micronutrient analysis, additives, and preservatives"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        nutrition = product_data.get("nutrition", {})
        nova = product_data.get("nova_class", 0)
        
        return f"""Analyze the following food product's nutritional profile and return ONLY valid JSON:

**Product Information:**
- NOVA Classification: {nova} (1=Unprocessed, 4=Ultra-processed)
- Nutritional Data per 100g:
{json.dumps(nutrition, indent=2)}

**User Profile:**
{json.dumps(user_profile, indent=2)}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <ul>, <li>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  "summary": "Brief 2-3 sentence overview (use HTML tags for formatting)",
  "macronutrients": [
    {{
      "nutrient": "Energy",
      "amount": "43 kcal",
      "percentage": "100%",
      "comment": "Low calorie content"
    }}
  ],
  "micronutrients": {{
    "available": true/false,
    "summary": "Brief description",
    "details": []
  }},
  "additives": {{
    "detected": true/false,
    "concerns": [],
    "recommendation": "text"
  }},
  "processing_level": {{
    "nova_class": {nova},
    "significance": "Explanation of NOVA classification",
    "health_implications": []
  }},
  "key_highlights": [
    {{
      "aspect": "Low Calories",
      "value": "43 kcal/100g",
      "implication": "May help with weight management",
      "positive": true/false
    }}
  ],
  "recommendations": []
}}
"""
