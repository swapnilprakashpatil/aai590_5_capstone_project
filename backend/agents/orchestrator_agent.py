"""
Health Insights Orchestrator
Coordinates multiple agents to generate comprehensive health insights
"""

import os
import asyncio
import logging
from typing import Dict, Any
from datetime import datetime
from openai import AsyncOpenAI

from .nutritional_analysis_agent import NutritionalAnalysisAgent
from .health_risks_agent import HealthRisksAgent
from .dietary_recommendations_agent import DietaryRecommendationsAgent
from .alternative_products_agent import AlternativeProductsAgent
from .long_term_health_agent import LongTermHealthAgent
from .technical_analysis_agent import TechnicalAgenticAnalysisAgent
from .base_agent import HealthAgent

logger = logging.getLogger(__name__)


class HealthInsightsOrchestrator:
    """Orchestrates multiple health agents running in parallel"""
    
    def __init__(self):
        self.client, self.deployment = self._initialize_client()
        self.agents = self._initialize_agents()
        logger.info(f"HealthInsightsOrchestrator initialized with {len(self.agents)} agents")
    
    def _initialize_client(self):
        """Initialize OpenAI client for Azure Model Router"""
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
        api_key = os.getenv("AZURE_OPENAI_ROUTER_API_KEY", "")
        deployment = os.getenv("AZURE_OPENAI_ROUTER_DEPLOYMENT_NAME", "model-router")
        
        logger.info(f"Initializing OpenAI client for Azure Model Router:")
        logger.info(f"  Base URL: {endpoint}")
        logger.info(f"  Deployment: {deployment}")
        logger.info(f"  API Key: {api_key[:20]}..." if api_key else "  API Key: NOT SET")
        
        # Model Router uses standard OpenAI client with base_url
        client = AsyncOpenAI(
            base_url=endpoint,
            api_key=api_key
        )
        
        return client, deployment
    
    def _initialize_agents(self) -> Dict[str, HealthAgent]:
        """Initialize all health insight agents"""
        return {
            "nutritional_information": NutritionalAnalysisAgent(self.client, self.deployment),
            "health_risks": HealthRisksAgent(self.client, self.deployment),
            "dietary_recommendations": DietaryRecommendationsAgent(self.client, self.deployment),
            "alternative_products": AlternativeProductsAgent(self.client, self.deployment),
            "long_term_health": LongTermHealthAgent(self.client, self.deployment),
        }
    
    async def generate_insights(
        self, 
        product_data: Dict[str, Any],
        user_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate all health insights in parallel
        
        Args:
            product_data: Product nutritional data, NOVA class, anomalies
            user_profile: User's health profile and preferences
            
        Returns:
            Dictionary with insights from all agents plus technical analysis
        """
        start_time = datetime.now()
        
        # Run all agents in parallel
        logger.info("Starting parallel agent execution...")
        tasks = {
            name: agent.generate_insight(product_data, user_profile)
            for name, agent in self.agents.items()
        }
        
        results = await asyncio.gather(*[task for task in tasks.values()], return_exceptions=True)
        
        # Combine results
        insights = {}
        agent_metadata = []
        
        for (name, _), result in zip(tasks.items(), results):
            if isinstance(result, Exception):
                insights[name] = {
                    "content": f"Error: {str(result)}",
                    "error": True
                }
                logger.error(f"Agent {name} failed: {result}")
            else:
                insights[name] = result
                if "metadata" in result:
                    agent_metadata.append(result["metadata"])
        
        # Generate technical analysis with context from other agents
        context_summary = self._build_context_summary(insights)
        technical_agent = TechnicalAgenticAnalysisAgent(self.client, self.deployment)
        technical_insight = await technical_agent.generate_insight(
            product_data, 
            user_profile,
            context=context_summary
        )
        
        insights["technical_agentic_analysis"] = technical_insight
        agent_metadata.append(technical_insight.get("metadata", {}))
        
        end_time = datetime.now()
        total_duration = (end_time - start_time).total_seconds()
        
        return {
            "insights": insights,
            "metadata": {
                "total_duration_seconds": total_duration,
                "agent_count": len(self.agents) + 1,  # +1 for technical agent
                "agents": agent_metadata,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat()
            }
        }
    
    def _build_context_summary(self, insights: Dict[str, Any]) -> str:
        """Build a summary of other agents' insights for the technical agent"""
        summary_parts = []
        for name, insight in insights.items():
            if name != "technical_agentic_analysis" and "content" in insight:
                content = insight["content"]
                # Truncate to first 200 chars for context
                preview = content[:200] + "..." if len(content) > 200 else content
                summary_parts.append(f"**{name}**: {preview}")
        
        return "\n\n".join(summary_parts)
