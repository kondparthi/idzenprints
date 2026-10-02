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
import re
import shutil
from pathlib import Path
from typing import Optional

import pytesseract
from PIL import Image
from pypdf import PdfReader
from pypdf.errors import FileNotDecryptedError, WrongPasswordError

from app.config.settings import get_settings
from app.services.ocr.base import OCRExtractionResult, OCRProvider
from app.services.ocr.field_extraction import extract_fields_from_text, extract_ration_card_fields


class PdfPasswordRequiredError(Exception):
    """Raised when a PDF is encrypted and either no password was given, or
    the one given was wrong. Distinct from a generic extraction failure —
    the UI should prompt for a password, not just say "couldn't read this
    file"."""


# Some PDF generators (this one included, based on real testing) emit text
# with a stray space before punctuation and doubled spaces between words —
# an artifact of how the PDF's text runs are laid out, not anything OCR
# guessed wrong. Cheap to clean up before it ever reaches field extraction.
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([,.:;])")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")


def _clean_pdf_text(text: str) -> str:
    # NUL bytes show up when a PDF's embedded font can't map a glyph back
    # to a real Unicode character — pypdf emits '\x00' for those instead of
    # silently dropping them. There's no way to recover the original
    # character from here (the information is genuinely gone from the
    # file), so the best available fix is removing the NULs cleanly rather
    # than letting them render as invisible garbage in form fields.
    text = text.replace("\x00", "")
    text = _SPACE_BEFORE_PUNCT.sub(r"\1", text)
    text = _MULTI_SPACE.sub(" ", text)
    return text


# Tesseract's default page-segmentation mode (fully automatic layout
# analysis, tuned for scanned pages — headers, paragraphs, columns) can
# actively *drop* whole text blocks on a small ID-card image, rather than
# just reading them in a worse order. Tested directly against a real
# ration card: the default mode silently lost every field from "District"
# onward (the area next to the card's QR code), while --psm 6 ("assume a
# single uniform block of text") kept all of it, just with some OCR noise
# to clean up downstream in field_extraction.py. This affects every
# document type, not just ration cards — an ID card is never a multi-
# column page, so "single text block" is the right assumption everywhere
# this provider is used.
_OCR_CONFIG = "--psm 6"

# A small card photo or a cropped screenshot OCRs far worse than a proper
# scan — fine print (a card's small printed labels) blurs away below a
# certain pixel size. Upscaling before OCR (not just for on-screen display)
# measurably recovers text a direct read would otherwise drop or garble,
# confirmed against the same real ration card referenced above.
_OCR_MIN_DIMENSION_PX = 1500


def _upscale_for_ocr(image: "Image.Image") -> "Image.Image":
    longest_side = max(image.width, image.height)
    if longest_side >= _OCR_MIN_DIMENSION_PX:
        return image
    scale = _OCR_MIN_DIMENSION_PX / longest_side
    new_size = (round(image.width * scale), round(image.height * scale))
    return image.resize(new_size, Image.LANCZOS)


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
    def extract(
        self, file_path: str, password: Optional[str] = None, document_type: Optional[str] = None
    ) -> OCRExtractionResult:
        path = Path(file_path)
        raw_text = self._extract_text(path, password)
        if document_type == "fsc":
            return extract_ration_card_fields(raw_text)
        return extract_fields_from_text(raw_text)

    def _extract_text(self, path: Path, password: Optional[str] = None) -> str:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            return self._extract_pdf_text(path, password)
        return self._extract_image_text(path)

    def _extract_image_text(self, path: Path) -> str:
        settings = get_settings()
        languages = settings.OCR_LANGUAGES or "eng"
        with Image.open(path) as image:
            image = _upscale_for_ocr(image)
            try:
                return pytesseract.image_to_string(image, lang=languages, config=_OCR_CONFIG)
            except pytesseract.TesseractError:
                if languages == "eng":
                    raise
                # A requested language pack (e.g. "tel") isn't installed —
                # Tesseract fails the whole call rather than skipping just
                # that language. Fall back to English-only so the document
                # still gets processed instead of failing outright; the
                # operator can still fill in the regional-script fields by
                # hand, same as any other field OCR misses.
                return pytesseract.image_to_string(image, lang="eng", config=_OCR_CONFIG)

    def _extract_pdf_text(self, path: Path, password: Optional[str] = None) -> str:
        try:
            reader = PdfReader(str(path), password=password) if password else PdfReader(str(path))
            # A wrong password raises immediately above; a *missing*
            # password on an encrypted file doesn't raise until you
            # actually try to read a page — and reader.is_encrypted stays
            # True even after a *correct* password, so it can't be used
            # to detect failure either way. Reading the first page is the
            # only reliable signal.
            raw = "\n".join(page.extract_text() or "" for page in reader.pages)
        except (FileNotDecryptedError, WrongPasswordError) as exc:
            raise PdfPasswordRequiredError() from exc
        return _clean_pdf_text(raw)
