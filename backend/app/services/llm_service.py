import os
import re
import httpx
from typing import Optional, List, Dict, Any
from backend.app.core.config import settings
from backend.app.core.logging import logger

SYSTEM_PROMPT = """You are the customer support AI for a premier Toy Store selling all kinds of toys for kids and children (action figures, board games, Lego/building sets, remote control cars, educational toys, infant rattles, plushies, dolls, and outdoor play).

Your task: Provide a concise, polite, and helpful customer-facing answer to the customer's query or feedback.

CRITICAL RULES:
1. Length: MAXIMUM 2 TO 3 LINES ONLY. Never write more than 3 lines.
2. Tone: Warm, empathetic, and professional (speak directly to the customer as 'we' / 'our store').
3. Content: Give the direct answer, warranty/return/replacement resolution, or safety advice immediately.
4. Format: Plain conversational text only. DO NOT use markdown headers (###), bullet points, or internal checklists.
"""

class LLMService:
    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY
        self.model = settings.LLM_MODEL

    async def generate_response(
        self,
        query: str,
        retrieved_context: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Step 6: Generate AI Response for the query (Concise 2-3 lines max for customer).
        """
        context_str = ""
        if retrieved_context:
            context_str = "\n\nRetrieved Historical Reference Queries for Context:\n"
            for idx, c in enumerate(retrieved_context, 1):
                context_str += f"{idx}. Query: {c.get('canonical_query')} (Similarity: {c.get('similarity_score')})\n   Previous Solution: {c.get('answer')[:180]}...\n"

        prompt = f"{SYSTEM_PROMPT}\n\nCustomer Query:\n\"{query}\"{context_str}\n\nProvide concise 2-3 line customer response:"

        # 1. Gemini
        if self.provider == "gemini" and self.gemini_key:
            # We will try supported Gemini models
            for model_candidate in ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-flash-latest"]:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_candidate}:generateContent?key={self.gemini_key}"
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 800}
                    }
                    async with httpx.AsyncClient(timeout=12.0) as client:
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                                if text:
                                    return text
                except Exception as e:
                    logger.debug(f"Gemini call with {model_candidate} timed out or failed: {e}")

        # 2. OpenAI
        if self.provider == "openai" and self.openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.openai_key}"}
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": f"Query: {query}{context_str}"}
                    ],
                    "temperature": 0.4
                }
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.warning(f"OpenAI call failed ({e}). Falling back.")

        # 3. Intelligent Local Fallback Response (Guarantees zero downtime / resilient mock)
        return self._generate_intelligent_local_response(query, retrieved_context)

    async def generate_realistic_query(self, topic: Optional[str] = None) -> str:
        """
        Method B: Generate realistic query based on optional topic/context.
        """
        topic_str = topic.strip() if topic else "toy warranty complaint"

        # 1. Gemini
        if self.provider == "gemini" and self.gemini_key:
            for model_candidate in ["gemini-1.5-flash", "gemini-2.5-flash", "gemini-flash-latest"]:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_candidate}:generateContent?key={self.gemini_key}"
                    gen_prompt = (
                        f"You are a test assistant generating realistic customer retail scenarios for a shopkeeper. "
                        f"Topic: '{topic_str}'. "
                        f"Generate a single, realistic question a shopkeeper would ask about handling a customer issue. "
                        f"Include realistic purchase days and warranty details. Respond with ONLY the query text without quotes or explanations."
                    )
                    payload = {"contents": [{"parts": [{"text": gen_prompt}]}]}
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.post(url, json=payload)
                        if resp.status_code == 200:
                            data = resp.json()
                            candidates = data.get("candidates", [])
                            if candidates:
                                text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                                if text:
                                    return text.replace('"', '')
                except Exception:
                    pass

        # 2. OpenAI
        if self.provider == "openai" and self.openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {"Authorization": f"Bearer {self.openai_key}"}
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "Generate a single realistic retail inquiry for a shopkeeper without quotes."},
                        {"role": "user", "content": f"Topic: {topic_str}"}
                    ]
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"].strip().replace('"', '')
            except Exception:
                pass

        # 3. Dynamic Local Generation templates for rapid testing
        templates = [
            f"A customer purchased a product related to '{topic_str}' 12 days ago. It developed a defect and has a 30-day warranty. Can I issue a direct replacement or should I refer them to the manufacturer?",
            f"Regarding '{topic_str}': A buyer brought back an item bought 5 days ago demanding a full cash refund without the original box. What is the standard store procedure?",
            f"A regular customer claims their item for '{topic_str}' stopped functioning after 20 days. The warranty receipt is missing. How should I resolve this fairly while protecting the business?",
            f"Customer wants to exchange a product under '{topic_str}' 45 days after purchase, but our standard return window is 30 days. Are exceptions usually granted if the packaging is unopened?"
        ]
        import random
        return random.choice(templates)

    def _generate_intelligent_local_response(self, query: str, context: Optional[List[Dict[str, Any]]]) -> str:
        """
        Concise, 2-3 line customer-facing Toy Store response generator.
        Prioritizes the exact stored knowledge answer from retrieved context.
        """
        # If vector search found a relevant stored knowledge answer, return it!
        if context and len(context) > 0 and context[0].get("answer"):
            return context[0]["answer"]

        from backend.app.services.answer_policy import answer_policy_service
        cond = answer_policy_service.extract_business_conditions(query)
        intents = cond.get("intents", [])
        lower_q = query.lower()

        if "missing" in lower_q or "part" in lower_q or "piece" in lower_q or "brick" in lower_q:
            return "We are so sorry for the missing parts in your toy set! Please bring your sales receipt to our customer desk, and we will gladly provide replacement parts or swap the box for a brand-new complete set."
        elif "return" in intents or "refund" in intents:
            return "Unopened toys in original packaging with a sales receipt can be returned for a full refund within 30 days of purchase. Just visit our customer desk or any cashier counter and our team will process your refund immediately."
        elif "replace" in intents or "replacement" in intents or "defect" in intents or "broken" in intents:
            return "We apologize for the defective toy and will gladly replace it for you! Please bring the toy and purchase receipt to our store within 30 days, and our team will issue an immediate brand-new replacement."
        elif "safe" in lower_q or "age" in lower_q or "infant" in lower_q or "toxic" in lower_q:
            return "All toys in our store are certified non-toxic and undergo strict child safety testing. Please refer to the recommended age badge on the packaging, or ask our team for tailored age and developmental advice!"
        elif "batter" in lower_q or "charger" in lower_q:
            return "Our electronic and remote control toys indicate their battery requirements clearly on the packaging. We keep compatible standard and rechargeable battery packs available right at the checkout counter."
        else:
            return "Thank you for shopping at our Toy Store! Please bring your toy and sales receipt to our customer service desk, and our team will be delighted to assist you with an exchange, refund, or quick solution."

llm_service = LLMService()
