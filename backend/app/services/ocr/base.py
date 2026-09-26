"""
OCR provider interface. Every provider takes a file path and returns best-
effort fields — the operator always reviews and corrects these before a
card is generated, so "best effort" is an acceptable contract here.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class OCRExtractionResult:
    name: Optional[str] = None
    name_local: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    address_local: Optional[str] = None
    document_number: Optional[str] = None
    vid_number: Optional[str] = None
    raw_text: Optional[str] = None


class OCRProvider(ABC):
    @abstractmethod
    def extract(self, file_path: str, password: Optional[str] = None) -> OCRExtractionResult:
        """Run OCR on the file at file_path and return whatever fields it can
        find. `password` is only meaningful for a password-protected PDF —
        every other provider/file type ignores it."""
        raise NotImplementedError
