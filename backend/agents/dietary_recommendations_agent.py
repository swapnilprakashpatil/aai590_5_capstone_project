"""
Dietary Recommendations Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class DietaryRecommendationsAgent(HealthAgent):
    """Agent for personalized dietary advice"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Dietary Recommendations Specialist",
            "personalized nutrition advice and dietary planning"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        nutrition = product_data.get("nutrition", {})
        nova = product_data.get("nova_class", 0)
        
        return f"""Provide personalized dietary recommendations and return ONLY valid JSON:

**Product Information:**
- NOVA Class: {nova}
- Nutrition per 100g: {json.dumps(nutrition, indent=2)}

**User Profile:**
- Age: {user_profile.get('age')}
- Weight: {user_profile.get('weight')} kg, Height: {user_profile.get('height')} cm
- Activity Level: {user_profile.get('activity_level')}
- Health Conditions: {user_profile.get('health_conditions', [])}
- Dietary Restrictions: {user_profile.get('dietary_restrictions', [])}
- Goals: {user_profile.get('goals', [])}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <ul>, <li>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  "summary": "Brief 2-3 sentence recommendation overview (use HTML tags for formatting)",
  "portion_recommendations": {{
    "safe_serving_size": "e.g., 100ml",
    "reasoning": "Why this portion size"
  }},
  "frequency_guidance": {{
    "recommended_frequency": "e.g., Occasionally (1-2 times per week)",
    "max_per_week": "e.g., 2 servings",
    "reasoning": "Explanation"
  }},
  "meal_timing": {{
    "best_times": ["breakfast", "snack"],
    "avoid_times": ["before bed"],
    "reasoning": "Why these times"
  }},
  "pairing_suggestions": [
    {{
      "food": "High-fiber cereal",
      "benefit": "Slows sugar absorption",
      "example": "Oatmeal with berries"
    }}
  ],
  "user_specific_advice": []
}}
"""
