import os
import base64
import json
from typing import Optional

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

def encode_image(file_path: str) -> Optional[str]:
    try:
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    except Exception:
        return None


def call_claude_vision(file_path: str, prompt: str) -> Optional[dict]:
    if not ANTHROPIC_API_KEY:
        return None

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        b64 = encode_image(file_path)
        if not b64:
            return None

        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}}
                ]
            }]
        )

        text = response.content[0].text if response.content else ""
        json_match = text[text.index("{"):text.rindex("}")+1] if "{" in text else text
        try:
            return json.loads(json_match)
        except (json.JSONDecodeError, ValueError):
            return None
    except Exception:
        return None
