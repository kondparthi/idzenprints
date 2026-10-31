"""
OCR provider factory. Selects an implementation based on settings.OCR_PROVIDER
so a paid/cloud OCR API can be dropped in later without touching callers.
"""
from app.config.settings import get_settings
from app.services.ocr.base import OCRProvider


def get_ocr_provider() -> OCRProvider:
    settings = get_settings()
    provider_name = (settings.OCR_PROVIDER or "tesseract").strip().lower()

    if provider_name == "claude":
        from app.services.ocr.claude_provider import ClaudeVisionOCRProvider

        return ClaudeVisionOCRProvider()

    if provider_name == "mock":
        from app.services.ocr.mock_provider import MockOCRProvider

        return MockOCRProvider()

    # Default: local Tesseract OCR. Falls back to the mock provider if the
    # tesseract binary/pytesseract isn't installed, so the rest of the app
    # still works — the operator just gets an empty form to fill in by hand.
    try:
        from app.services.ocr.tesseract_provider import TesseractOCRProvider

        return TesseractOCRProvider()
    except ImportError:
        from app.services.ocr.mock_provider import MockOCRProvider

        return MockOCRProvider()


def ocr_error_message(exc: Exception) -> str:
    """A readable reason for the UI instead of a bare server error."""
    name = type(exc).__name__
    text = str(exc)
    if name == "TesseractNotFoundError" or "tesseract is not installed" in text.lower():
        return (
            "Reading images isn't set up on the server yet (Tesseract is not installed). "
            "Ask the admin to install it or switch the OCR provider to Claude."
        )
    if "ANTHROPIC_API_KEY" in text:
        return "Image reading needs the Claude API key to be added on the server."
    if name in ("HTTPStatusError", "ConnectError", "ReadTimeout", "ConnectTimeout"):
        return "The image-reading service didn't respond. Please try again in a moment."
    return "Couldn't read that file. Please use a clearer image or PDF."
