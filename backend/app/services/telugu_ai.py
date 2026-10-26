"""English -> Telugu for Aadhaar names/addresses using the Claude API.

Returns None on any problem (no key, network error, bad reply) so callers
fall back to the offline rule-based converter."""
import json
import logging

import httpx

from app.config.settings import get_settings

log = logging.getLogger(__name__)

_SYSTEM = """You convert English Indian names and postal addresses into Telugu exactly the way UIDAI prints them on a Telugu-language Aadhaar letter.

Rules:
- Transliterate/translate into correct, natural Telugu spelling, as a Telugu speaker would write it. Use the standard Telugu spelling for well-known places, districts and states (e.g. Nalgonda -> నల్గొండ, Andhra Pradesh -> ఆంధ్ర ప్రదేశ్, Telangana -> తెలంగాణ, Peddapuram -> పెద్దాపురం).
- Names: transliterate every word. Initials stay as Telugu letter names (M -> ఎమ్).
- Addresses: drop the English labels "PO:", "DIST:", "VTC:", "SO:" etc. but keep the place that follows. Add జిల్లా after a district name. Keep relation prefixes S/O, W/O, D/O, C/O, H/O as they are. Keep digits, house numbers and the PIN code in Western digits, and keep punctuation (commas, hyphens) as in the input.
- Do not add or remove places. Do not explain.
- If a glossary is given, those English words MUST use exactly the Telugu given.
Reply with ONLY a JSON object with the same keys as the input, values being the Telugu text."""


def translate(items: dict[str, str], glossary: dict[str, str] | None = None) -> dict[str, str] | None:
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY or not any(v.strip() for v in items.values()):
        return None
    user = json.dumps(items, ensure_ascii=False)
    if glossary:
        user = "Glossary (English -> required Telugu): " + json.dumps(glossary, ensure_ascii=False) + "\nInput: " + user
    try:
        r = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.TELUGU_MODEL,
                "max_tokens": 1000,
                "system": _SYSTEM,
                "messages": [{"role": "user", "content": user}],
            },
            timeout=30,
        )
        r.raise_for_status()
        text = "".join(b.get("text", "") for b in r.json().get("content", []))
        start, end = text.find("{"), text.rfind("}")
        data = json.loads(text[start : end + 1])
        return {k: str(data.get(k, "")).strip() for k in items}
    except Exception:  # noqa: BLE001 - any failure -> offline fallback
        log.exception("Claude Telugu translation failed; using offline converter")
        return None
