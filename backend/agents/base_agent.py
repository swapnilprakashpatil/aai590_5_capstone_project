"""
Base class for health insight agents
"""

import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from openai import AsyncOpenAI

from .models import InsightMetadata, AgentStep

logger = logging.getLogger(__name__)


class HealthAgent:
    """Base class for individual health insight agents"""
    
    def __init__(self, client: AsyncOpenAI, deployment: str, name: str, expertise: str):
        self.client = client
        self.deployment = deployment
        self.name = name
        self.expertise = expertise
        self.steps: List[AgentStep] = []
    
    async def generate_insight(
        self, 
        product_data: Dict[str, Any],
        user_profile: Dict[str, Any],
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate insight for this agent's expertise area"""
        start_time = datetime.now()
        
        try:
            prompt = self._build_prompt(product_data, user_profile, context)
            system_message = self._get_system_message()
            
            response = await self.client.chat.completions.create(
                model=self.deployment,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                max_completion_tokens=3500,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            
            # Log if content is empty
            if not content or content.strip() == "":
                logger.warning(f"{self.name} returned empty content. Response: {response}")
                content = '{"error": "No insights generated - model returned empty response."}'
            
            # Parse JSON content into structured data
            try:
                data = json.loads(content)
                
                # Unwrap nested structures if LLM wrapped response in extra keys
                # Common patterns: {"final": {...}}, {"response": {...}}, {"result": {...}}
                if isinstance(data, dict) and len(data) == 1:
                    key = list(data.keys())[0]
                    if key in ['final', 'response', 'result', 'output']:
                        # Handle both string (needs parsing) and dict (already parsed) values
                        if isinstance(data[key], str):
                            try:
                                # Try to parse the nested JSON string
                                data = json.loads(data[key])
                                content = json.dumps(data)
                                logger.info(f"{self.name} unwrapped nested JSON string from '{key}' key")
                            except json.JSONDecodeError:
                                pass  # Keep original data if nested value isn't valid JSON
                        elif isinstance(data[key], dict):
                            # Already a dict, just unwrap it
                            data = data[key]
                            content = json.dumps(data)
                            logger.info(f"{self.name} unwrapped nested dict from '{key}' key")
                            
            except json.JSONDecodeError as e:
                logger.error(f"{self.name} returned invalid JSON: {e}. Content: {content[:200]}")
                data = {"error": "Invalid JSON response", "raw_content": content}
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            return {
                "data": data,  # Parsed JSON object
                "content": content,  # Keep as string for backward compatibility
                "metadata": InsightMetadata(
                    agent_name=self.name,
                    start_time=start_time.isoformat(),
                    end_time=end_time.isoformat(),
                    duration_seconds=duration,
                    prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
                    completion_tokens=response.usage.completion_tokens if response.usage else 0,
                    model=self.deployment
                ).dict()
            }
        except Exception as e:
            logger.error(f"Error in {self.name}: {e}")
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            error_msg = f"Error generating insight: {str(e)}"
            error_data = {"error": error_msg}
            
            return {
                "data": error_data,  # Structured error data
                "content": json.dumps(error_data),  # JSON string for backward compatibility
                "metadata": InsightMetadata(
                    agent_name=self.name,
                    start_time=start_time.isoformat(),
                    end_time=end_time.isoformat(),
                    duration_seconds=duration,
                    model=self.deployment
                ).dict(),
                "error": str(e)
            }
    
    def _get_system_message(self) -> str:
        """Return the system message for this agent"""
        return f"""You are a {self.name}, specializing in {self.expertise}.
Your role is to provide accurate, evidence-based health insights based on food product data and user health profiles.
Always cite scientific research when possible and provide actionable recommendations.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no additional text.
The JSON structure is specified in the user prompt. Follow it exactly.
Ensure all JSON strings are properly escaped and the entire response is valid JSON that can be parsed.
"""
    
    def _build_prompt(
        self, 
        product_data: Dict[str, Any],
        user_profile: Dict[str, Any],
        context: Optional[str] = None
    ) -> str:
        """Build the prompt for this agent - to be overridden by subclasses"""
        raise NotImplementedError
