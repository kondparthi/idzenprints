"""
Best-effort heuristics for pulling structured fields out of raw OCR text
from Indian identity documents — tuned against real Aadhaar card layouts,
which differ from a generic "Label: value" form in ways worth calling out:

  - There is no literal "Name:" label — the card just prints the name
    directly (often once in the local regional script, once in English)
    on the two lines immediately above the DOB line. Regex hunting for a
    "Name" keyword — the previous approach — never matches a real card.
  - The address block on the back spans several lines; a pattern using
    `.` after "Address:" only captures the first line, since `.` doesn't
    match newlines by default. Real Aadhaar addresses need this fixed.
  - The Aadhaar number and the 16-digit VID both look like grouped
    digits, and VID can be mistaken for (or overlap with) the Aadhaar
    number if not handled carefully.
  - Both the regional-language and English versions of the name/address
    are useful to capture — this module returns both where present.

Every field this finds still lands in an editable form (see
"OCR results must always be editable"), so a wrong guess here is a minor
annoyance, not a data-integrity problem — but getting the common case
right matters a lot given how many cards actually get scanned.
"""
import re

from app.services.ocr.base import OCRExtractionResult

_DOB_PATTERN = re.compile(r"(?:DOB|Date of Birth)\s*[:\-]?\s*([0-3]?\d[/\-][01]?\d[/\-]\d{2,4})", re.IGNORECASE)
_GENDER_PATTERN = re.compile(r"\b(MALE|FEMALE|TRANSGENDER|OTHER)\b", re.IGNORECASE)
_VID_PATTERN = re.compile(r"VID\s*[:\-]?\s*(\d{4}\s?\d{4}\s?\d{4}\s?\d{4})", re.IGNORECASE)
_TWELVE_DIGIT_PATTERN = re.compile(r"\b(\d{4}\s\d{4}\s\d{4})\b")
_TWELVE_DIGIT_PATTERN_NO_SPACE = re.compile(r"\b(\d{12})\b")

# Any of the major Indic scripts — Devanagari, Bengali, Gurmukhi, Gujarati,
# Odia, Tamil, Telugu, Kannada, Malayalam — covers every state's Aadhaar
# card, not just Telugu-region ones.
_INDIC_SCRIPT_PATTERN = re.compile(
    r"[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF"
    r"\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]"
)

_NAME_CANDIDATE_PATTERN = re.compile(r"^[A-Za-z][A-Za-z.' \-]{2,59}$")
_NAME_BOILERPLATE_TERMS = ("GOVERNMENT", "AUTHORITY", "UNIQUE IDENTIFICATION", "INDIA")

_ADDRESS_LABEL_PATTERN = re.compile(r"^\s*Address\s*[:\-]?\s*(.*)$", re.IGNORECASE)
_ADDRESS_STOP_PATTERN = re.compile(
    r"VID|help@|www\.|^\s*1947\s*$|\b\d{4}\s?\d{4}\s?\d{4}\b", re.IGNORECASE
)


def _extract_document_and_vid_numbers(text: str) -> tuple[str | None, str | None]:
    vid_match = _VID_PATTERN.search(text)
    vid = vid_match.group(1).replace(" ", "") if vid_match else None

    document_number = None
    for pattern in (_TWELVE_DIGIT_PATTERN, _TWELVE_DIGIT_PATTERN_NO_SPACE):
        for candidate_match in pattern.finditer(text):
            if vid_match and candidate_match.start() >= vid_match.start() and candidate_match.end() <= vid_match.end():
                continue  # this candidate is just a substring of the VID digits — skip it
            document_number = candidate_match.group(1).replace(" ", "")
            break
        if document_number:
            break
    return document_number, vid


def _extract_names(lines: list[str]) -> tuple[str | None, str | None]:
    """English name is the nearest non-blank line above the DOB line; the
    local-script name (if present) is the nearest non-blank line above
    that. Scanning past blank lines (rather than assuming a fixed offset)
    matters because OCR often inserts stray blank lines between visually
    separated text blocks on a real card."""
    dob_line_index = None
    for i, line in enumerate(lines):
        if _DOB_PATTERN.search(line):
            dob_line_index = i
            break
    if dob_line_index is None or dob_line_index == 0:
        return None, None

    english_name = None
    english_name_index = None
    for i in range(dob_line_index - 1, max(dob_line_index - 5, -1), -1):
        candidate = lines[i].strip()
        if not candidate:
            continue
        if _NAME_CANDIDATE_PATTERN.match(candidate) and not any(
            term in candidate.upper() for term in _NAME_BOILERPLATE_TERMS
        ):
            english_name = candidate
            english_name_index = i
        break  # only the nearest non-blank line counts as a candidate

    local_name = None
    if english_name_index is not None:
        for i in range(english_name_index - 1, max(english_name_index - 5, -1), -1):
            candidate = lines[i].strip()
            if not candidate:
                continue
            if _INDIC_SCRIPT_PATTERN.search(candidate):
                local_name = candidate
            break  # only the nearest non-blank line counts as a candidate

    return english_name, local_name


def _extract_english_address(lines: list[str]) -> tuple[str | None, int | None]:
    for i, line in enumerate(lines):
        match = _ADDRESS_LABEL_PATTERN.match(line)
        if not match:
            continue
        collected = [match.group(1).strip()]
        for next_line in lines[i + 1 : i + 7]:
            stripped = next_line.strip()
            if not stripped or _ADDRESS_STOP_PATTERN.search(stripped):
                break
            collected.append(stripped)
        address = " ".join(part for part in collected if part).strip()
        return (address or None), i
    return None, None


def _extract_local_address(lines: list[str], english_address_label_index: int | None) -> str | None:
    """Collects the regional-script address block that appears before the
    English "Address:" label. Blank lines within that block are skipped
    rather than treated as a hard stop — real cards (and OCR noise) often
    put a blank line between the local-script block and the English one —
    but a non-blank, non-Indic line (e.g. the header) still ends the scan."""
    if english_address_label_index is None:
        return None
    collected: list[str] = []
    blanks_skipped_since_content = 0
    for line in reversed(lines[:english_address_label_index]):
        stripped = line.strip()
        if not stripped:
            if collected:
                blanks_skipped_since_content += 1
                if blanks_skipped_since_content > 1:
                    break  # two blank lines in a row really is the end of the block
                continue
            continue  # haven't hit any content yet — keep skipping leading blanks
        if not _INDIC_SCRIPT_PATTERN.search(stripped):
            break
        collected.append(stripped)
        blanks_skipped_since_content = 0
        if len(collected) >= 6:
            break
    if not collected:
        return None
    return " ".join(reversed(collected)).strip() or None


def extract_fields_from_text(raw_text: str) -> OCRExtractionResult:
    text = raw_text or ""
    lines = text.split("\n")

    dob_match = _DOB_PATTERN.search(text)
    gender_match = _GENDER_PATTERN.search(text)
    document_number, vid_number = _extract_document_and_vid_numbers(text)
    english_name, local_name = _extract_names(lines)
    english_address, address_label_index = _extract_english_address(lines)
    local_address = _extract_local_address(lines, address_label_index)

    return OCRExtractionResult(
        name=english_name,
        name_local=local_name,
        dob=dob_match.group(1).strip() if dob_match else None,
        gender=gender_match.group(1).title() if gender_match else None,
        address=english_address,
        address_local=local_address,
        document_number=document_number,
        vid_number=vid_number,
        raw_text=text,
    )
