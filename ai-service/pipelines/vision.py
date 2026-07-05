import base64
import io
import json
import logging
import os

logger = logging.getLogger(__name__)

class ClaudeVisionPipeline:
    def __init__(self):
        self.client = None
        self.api_key = os.getenv("CLAUDE_API_KEY", "")

    def process(self, image_bytes: bytes, filename: str) -> dict:
        if not self.api_key:
            logger.warning("No Claude API key configured")
            return {"confidence": 0.0, "source": "claude_vision"}

        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=self.api_key)

            encoded = base64.b64encode(image_bytes).decode("utf-8")
            media_type = "image/png"
            if filename.lower().endswith(".pdf"):
                media_type = "application/pdf"
            elif filename.lower().endswith((".jpg", ".jpeg")):
                media_type = "image/jpeg"

            response = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract the following information from this medical document in French: "
                                    "patient name, date of birth, CNAM number, doctor name, "
                                    "hearing aid brand and model, price in TND, ear side (LEFT/RIGHT/BILATERAL), "
                                    "audiogram values (250-8000 Hz for left and right ear), "
                                    "and prescription date. Return as JSON."
                        },
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": encoded
                            }
                        }
                    ]
                }]
            )

            text = response.content[0].text
            json_match = text[text.index("{"):text.rindex("}")+1]
            data = json.loads(json_match)
            data["source"] = "claude_vision"
            data["confidence"] = 0.9
            logger.info(f"Claude Vision extraction successful, cost: {response.usage.input_tokens + response.usage.output_tokens} tokens")
            return data

        except Exception as e:
            logger.error(f"Claude Vision failed: {e}")
            return {"confidence": 0.0, "source": "claude_vision_error"}
