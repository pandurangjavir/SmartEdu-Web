import os
import asyncio
from typing import Any, Dict
import requests


class RasaService:
    def __init__(self):
        # Default to local Rasa server; allow override
        self.base_url = os.getenv('RASA_SERVER_URL', 'http://localhost:5005')
        # Rasa NLU parse endpoint
        self.parse_url = f"{self.base_url}/model/parse"

    def detect_intent_texts(self, text, language_code='en'):
        """
        Call Rasa NLU parse API and map response to our expected shape.
        """
        try:
            payload = {"text": text}
            resp = requests.post(self.parse_url, json=payload, timeout=5)
            resp.raise_for_status()
            data = resp.json() or {}

            intent_name = (data.get('intent') or {}).get('name', 'help_request')
            confidence = float((data.get('intent') or {}).get('confidence', 0.0))
            entities = data.get('entities') or []

            # Convert entities list into a simple parameters dict
            parameters = {}
            for ent in entities:
                ent_name = ent.get('entity')
                ent_value = ent.get('value')
                if ent_name:
                    parameters[ent_name] = ent_value

            # Map intent to a basic fulfillment text
            fulfillment_text = self._default_fulfillment_for_intent(intent_name)

            return {
                'intent': intent_name,
                'confidence': confidence,
                'parameters': parameters,
                'fulfillment_text': fulfillment_text,
                'query_text': text,
                'action': '',
                'all_required_params_present': True
            }
        except Exception as e:
            # Fallback safe response
            return {
                'intent': 'help_request',
                'confidence': 0.0,
                'parameters': {},
                'fulfillment_text': 'I can help with fees, attendance, or events.',
                'query_text': text,
                'action': '',
                'all_required_params_present': True,
                'error': str(e)
            }

    def _default_fulfillment_for_intent(self, intent_name: str) -> str:
        intent_text = {
            'greet': 'Hello! How can I help you today?',
            'fee_query': 'Here are your fee details:',
            'attendance_query': 'Here is your attendance information:',
            'event_query': 'Here are the upcoming events:',
        }
        # Common synonyms mapping
        if intent_name in intent_text:
            return intent_text[intent_name]
        if intent_name in ('goodbye', 'bye'):
            return 'Goodbye!'
        return 'I can help with fees, attendance, or events.'

    async def parse_intent_async(self, text: str) -> Dict[str, Any]:
        """Async wrapper suitable for awaiting inside async contexts."""
        return await asyncio.to_thread(self.detect_intent_texts, text)

    async def respond_with_data_async(self, text: str, student_id: int, data_fetcher) -> Dict[str, Any]:
        """
        Generic helper: parse intent and, if applicable, fetch data via provided callable.
        data_fetcher is a callable like lambda intent: {...}
        """
        nlu = await self.parse_intent_async(text)
        intent = nlu.get('intent') or 'help_request'
        data = data_fetcher(intent)
        return {
            'intent': intent,
            'response': nlu.get('fulfillment_text') or '',
            'data': data or {}
        }


rasa_service = RasaService()


