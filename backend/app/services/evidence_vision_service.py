"""Optional OpenAI vision analysis when OPENAI_API_KEY is configured."""

from __future__ import annotations

import json
import re

import httpx

from app.core.config import settings


def _extract_json(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


class EvidenceVisionService:
    @staticmethod
    def is_available() -> bool:
        return bool(settings.OPENAI_API_KEY.strip())

    @staticmethod
    def analyze_image(
        *,
        image_base64: str,
        mime_type: str,
        action_title: str,
        action_description: str,
        farmer_notes: str,
    ) -> dict | None:
        api_key = settings.OPENAI_API_KEY.strip()
        if not api_key or not image_base64:
            return None

        prompt = f"""You are Aarohi, a farm biosecurity evidence reviewer for pig and poultry farms.

Required corrective action title: {action_title}
Action description: {action_description}
Farmer compliance note: {farmer_notes or "(none)"}

Inspect the uploaded photo carefully. Determine whether it actually shows evidence of this corrective action on a farm (disinfection, isolation, visitor control, sanitation, vehicles, quarantine, etc.).

If the image is unrelated (memes, people selfies, food, logos, random objects, screenshots, documents unrelated to the task), set relevanceToAction to "none" and farmRelated to false.

Respond ONLY with valid JSON:
{{
  "imageDescription": "brief description of what you see in the image",
  "farmRelated": true,
  "relevanceToAction": "high",
  "relevanceScore": 85,
  "observations": ["..."],
  "recommendedActions": [
    {{"title": "...", "description": "...", "priority": "urgent|high|medium|low"}}
  ]
}}

relevanceToAction must be one of: high, medium, low, none.
If none/low, recommend rejecting the evidence and asking for a specific farm photo."""

        data_url = f"data:{mime_type or 'image/jpeg'};base64,{image_base64}"

        try:
            with httpx.Client(timeout=45.0) as client:
                response = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.OPENAI_VISION_MODEL,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {"type": "image_url", "image_url": {"url": data_url, "detail": "low"}},
                                ],
                            }
                        ],
                        "max_tokens": 700,
                        "temperature": 0.2,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                content = payload["choices"][0]["message"]["content"]
                parsed = _extract_json(content)
                if parsed:
                    parsed["_method"] = "vision-ai"
                return parsed
        except Exception:
            return None
