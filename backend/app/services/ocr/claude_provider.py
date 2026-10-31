"""OCR for Aadhaar *images* (photos, WhatsApp screenshots, scans) using the
Claude vision API — far more reliable than Tesseract on phone photos.

PDFs never leave the server: they go through the same text-layer reader as
before. Only an uploaded image is sent to the API, and only when
OCR_PROVIDER=claude is set in the server's .env."""
import base64
import io
import json
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageOps

from app.config.settings import get_settings
from app.services.ocr.base import OCRExtractionResult, OCRProvider

_SYSTEM = """You read Indian Aadhaar cards/letters from an image and return the printed data as JSON.
The image may be a whole A4 e-Aadhaar letter, a card front/back, or a photo of one.
Return ONLY a JSON object with exactly these keys (use null when not visible):
  name            - the holder's full name in ENGLISH exactly as printed (the English line above the DOB)
  dob             - date of birth as dd/mm/yyyy
  gender          - Male, Female or Transgender
  address         - the full ENGLISH address from the "Address:" block (card back), on one line with parts separated by ", ",
                    keeping labels like "PO:" and "DIST:" and ending with state and PIN code. If there is no such block,
                    use the English address from the "To" block.
  document_number - the 12-digit Aadhaar number written as "dddd dddd dddd"
  vid_number      - the 16-digit VID written as "dddd dddd dddd dddd"
  issue_date      - the date after "Aadhaar no. issued" as dd/mm/yyyy
  details_as_on   - the date after "Details as on" as dd/mm/yyyy
Copy digits exactly; never guess. Do not translate or add anything."""


def _prepare_jpeg(path: Path) -> str:
    with Image.open(path) as img:
        img = ImageOps.exif_transpose(img).convert("RGB")
        img.thumbnail((2000, 2000))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


class ClaudeVisionOCRProvider(OCRProvider):
    def extract(
        self, file_path: str, password: Optional[str] = None, document_type: Optional[str] = None
    ) -> OCRExtractionResult:
        path = Path(file_path)
        if path.suffix.lower() == ".pdf" or document_type == "fsc":
            from app.services.ocr.tesseract_provider import TesseractOCRProvider

            return TesseractOCRProvider().extract(file_path, password=password, document_type=document_type)

        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError("OCR_PROVIDER=claude needs ANTHROPIC_API_KEY in the server .env")

        response = httpx.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.OCR_MODEL,
                "max_tokens": 1200,
                "system": _SYSTEM,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": _prepare_jpeg(path)}},
                            {"type": "text", "text": "Read this Aadhaar and return the JSON."},
                        ],
                    }
                ],
            },
            timeout=60,
        )
        response.raise_for_status()
        text = "".join(b.get("text", "") for b in response.json().get("content", []))
        data = json.loads(text[text.find("{") : text.rfind("}") + 1])

        def get(key: str) -> Optional[str]:
            value = data.get(key)
            return str(value).strip() or None if value is not None else None

        return OCRExtractionResult(
            name=get("name"),
            dob=get("dob"),
            gender=get("gender"),
            address=get("address"),
            document_number=get("document_number"),
            vid_number=get("vid_number"),
            issue_date=get("issue_date"),
            details_as_on=get("details_as_on"),
            raw_text=json.dumps(data, ensure_ascii=False),
        )
