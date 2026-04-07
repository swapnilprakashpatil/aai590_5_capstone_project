"""
Alternative Products Agent
"""

import json
from typing import Dict, Optional
from openai import AsyncOpenAI

from .base_agent import HealthAgent


class AlternativeProductsAgent(HealthAgent):
    """Agent for suggesting healthier alternatives"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str):
        super().__init__(
            client,
            deployment,
            "Product Alternatives Advisor",
            "identifying healthier food alternatives"
        )
    
    def _build_prompt(self, product_data: Dict, user_profile: Dict, context: Optional[str] = None) -> str:
        nutrition = product_data.get("nutrition", {})
        nova = product_data.get("nova_class", 0)
        product_name = product_data.get("product_name", "this product")
        
        return f"""Suggest healthier alternatives to: {product_name} and return ONLY valid JSON:

**Current Product:**
- NOVA Class: {nova}
- Nutrition: {json.dumps(nutrition, indent=2)}

**User Preferences:**
- Dietary Restrictions: {user_profile.get('dietary_restrictions', [])}
- Health Goals: {user_profile.get('goals', [])}

IMPORTANT: All text fields must use HTML tags (e.g., <strong>, <em>, <ul>, <li>) instead of markdown syntax.

Return a JSON object with this exact structure:
{{
  "summary": "Brief overview of alternatives (use HTML tags for formatting)",
  "alternatives": [
    {{
      "product_name": "Unsweetened sparkling water",
      "brand": "La Croix or similar",
      "nova_class": 1,
      "key_benefits": ["Zero sugar", "No calories", "No additives"],
      "nutritional_comparison": {{
        "sugar": "0g vs 10.6g",
        "calories": "0 vs 43 kcal"
      }},
      "availability": "Widely available"
    }}
  ],
  "homemade_options": [
    {{
      "name": "Infused water",
      "recipe": "Water + lemon slices + mint leaves",
      "benefits": [],
      "difficulty": "Easy"
    }}
  ],
  "shopping_tips": []
}}
"""
