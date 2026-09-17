"""
Local Tesseract OCR provider — free, runs entirely offline, no API key.

Requires the Tesseract binary installed on the machine (not just the
`pytesseract` Python package, which is just a wrapper around it). On
Windows especially, the official installer does NOT add itself to PATH by
default, so pytesseract's plain "run `tesseract`" call fails with
"tesseract is not installed or it's not in your PATH" even when it's
installed correctly. To avoid every Windows user having to hand-edit PATH:

  1. If settings.TESSERACT_CMD is set, that path is used, no questions asked.
  2. Otherwise, if `tesseract` isn't already resolvable on PATH, the module
     checks the handful of locations the official Windows installer and
     Homebrew actually use, and points pytesseract at the first one found.
  3. If none of that finds a binary, extract() raises — the caller
     (document_service.py) already catches this and marks the document
     FAILED with the error message, and the UI lets the operator fill the
     form in by hand instead of blocking the workflow.
"""
import shutil
from pathlib import Path

import pytesseract
from PIL import Image
from pypdf import PdfReader

from app.config.settings import get_settings
from app.services.ocr.base import OCRExtractionResult, OCRProvider
from app.services.ocr.field_extraction import extract_fields_from_text

_WINDOWS_DEFAULT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]
_MAC_DEFAULT_PATHS = [
    "/opt/homebrew/bin/tesseract",  # Apple Silicon Homebrew
    "/usr/local/bin/tesseract",  # Intel Homebrew
]


def _resolve_tesseract_cmd() -> None:
    settings = get_settings()

    if settings.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        return

    if shutil.which("tesseract"):
        return  # already on PATH — nothing to do

    for candidate in _WINDOWS_DEFAULT_PATHS + _MAC_DEFAULT_PATHS:
        if Path(candidate).exists():
            pytesseract.pytesseract.tesseract_cmd = candidate
            return

    # Not found anywhere we know to look — leave pytesseract's default
    # ("tesseract") in place so its own error message (with install
    # instructions) surfaces normally when extract() is called.


_resolve_tesseract_cmd()


class TesseractOCRProvider(OCRProvider):
    def extract(self, file_path: str) -> OCRExtractionResult:
        path = Path(file_path)
        raw_text = self._extract_text(path)
        return extract_fields_from_text(raw_text)

    def _extract_text(self, path: Path) -> str:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf_text(path)
        return self._extract_image_text(path)

    def _extract_image_text(self, path: Path) -> str:
        settings = get_settings()
        languages = settings.OCR_LANGUAGES or "eng"
        with Image.open(path) as image:
            try:
                return pytesseract.image_to_string(image, lang=languages)
            except pytesseract.TesseractError:
                if languages == "eng":
                    raise
                # A requested language pack (e.g. "tel") isn't installed —
                # Tesseract fails the whole call rather than skipping just
                # that language. Fall back to English-only so the document
                # still gets processed instead of failing outright; the
                # operator can still fill in the regional-script fields by
                # hand, same as any other field OCR misses.
                return pytesseract.image_to_string(image, lang="eng")

    def _extract_pdf_text(self, path: Path) -> str:
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
