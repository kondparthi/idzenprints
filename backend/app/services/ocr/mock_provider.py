"""
No-op OCR provider — used when OCR_PROVIDER=mock, or as an automatic
fallback when Tesseract isn't installed. Returns an empty result so the
operator fills the form in by hand instead of the request failing.
"""
from app.services.ocr.base import OCRExtractionResult, OCRProvider


class MockOCRProvider(OCRProvider):
    def extract(
        self, file_path: str, password: str | None = None, document_type: str | None = None
    ) -> OCRExtractionResult:
        return OCRExtractionResult(raw_text="")
