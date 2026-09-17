"""
OCR provider factory. Selects an implementation based on settings.OCR_PROVIDER
so a paid/cloud OCR API can be dropped in later without touching callers.
"""
from app.config.settings import get_settings
from app.services.ocr.base import OCRProvider


def get_ocr_provider() -> OCRProvider:
    settings = get_settings()
    provider_name = (settings.OCR_PROVIDER or "tesseract").strip().lower()

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
