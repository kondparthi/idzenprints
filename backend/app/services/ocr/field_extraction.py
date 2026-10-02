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

_DOB_PATTERN = re.compile(r"(?:D[O0]B|Date of Birth)\s*[:\-]?\s*([0-3]?\d[/\-][01]?\d[/\-]\d{2,4})", re.IGNORECASE)
_GENDER_PATTERN = re.compile(r"\b(MALE|FEMALE|TRANSGENDER|OTHER)\b", re.IGNORECASE)
# Front: "Aadhaar no. issued: 19/05/2013". Back (e-Aadhaar/mAadhaar print):
# "Details as on: 03/08/2026". Both are printed near the left edge, often
# rotated — OCR usually still reads them left-to-right as plain text, just
# not necessarily near any other field, so they get their own patterns
# rather than piggybacking on the DOB-anchored name scan.
_ISSUE_DATE_PATTERN = re.compile(r"issued\s*[:\-]?\s*([0-3]?\d[/\-][01]?\d[/\-]\d{2,4})", re.IGNORECASE)
_DETAILS_AS_ON_PATTERN = re.compile(r"Details\s+as\s+on\s*[:\-]?\s*([0-3]?\d[/\-][01]?\d[/\-]\d{2,4})", re.IGNORECASE)
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


# --- FSC / Ration card ---------------------------------------------------
# Unlike Aadhaar, a Telangana ration card is a conventional "label : value"
# layout — each field prints on its own line (often with the Telugu label
# first, like "గ్రామం/Village : vivek nagar"), so matching on the English
# label and taking the rest of that line is enough; no name/address
# position heuristics needed.
# Digit fields deliberately don't allow embedded whitespace in the match —
# allowing it (to tolerate a card printing a number in grouped digits, e.g.
# "3653 7084 2352") also means a stray OCR character a few spaces further
# along — misread card-border noise, or the start of the next field — gets
# silently absorbed into the number instead of stopping there.
#   [^\d\n]{0,6}? tolerates a short run of OCR noise between the label and
# its digits (a smudge, a stray glyph from a nearby caption) without it
# swallowing something further down the card.
_RATION_NO_PATTERN = re.compile(r"Ration\s*Card\s*No\.?\s*[^\d\n]{0,6}?(\d{4,})", re.IGNORECASE)
_HEAD_OF_FAMILY_PATTERN = re.compile(r"Head\s*of\s*the\s*Family\s*[:\-]?\s*(.+)", re.IGNORECASE)
_FP_SHOP_PATTERN = re.compile(r"FP\s*Shop\s*No\.?\s*[^\d\n]{0,6}?(\d{3,})", re.IGNORECASE)
_VILLAGE_PATTERN = re.compile(r"Village\s*[:\-]?\s*(.+)", re.IGNORECASE)
_MANDAL_PATTERN = re.compile(r"Mandal\s*[:\-]?\s*(.+)", re.IGNORECASE)
_DISTRICT_PATTERN = re.compile(r"District\s*[:\-]?\s*(.+)", re.IGNORECASE)
_RESIDENTIAL_ADDRESS_PATTERN = re.compile(r"Residential\s*Address\s*[:\-]?\s*(.*)", re.IGNORECASE)
_RATION_ADDRESS_STOP_PATTERN = re.compile(r"^\s*$|QR|Signature|Issuing\s*Authority", re.IGNORECASE)

# A misread cell border, bullet, or stray punctuation mark sometimes lands
# right before an otherwise-correct value (e.g. "| K.v. Rangareddy") —
# strip any such run of non-alphanumeric characters off the front.
_LEADING_NOISE_PATTERN = re.compile(r"^[^A-Za-z0-9ఀ-౿]+")


def _first_line_match(lines: list[str], pattern: re.Pattern) -> tuple[str | None, int | None]:
    for i, line in enumerate(lines):
        match = pattern.search(line)
        if match:
            value = match.group(1).strip().strip(":-").strip()
            value = _LEADING_NOISE_PATTERN.sub("", value).strip()
            return (value or None), i
    return None, None


def _collect_address_block(lines: list[str], label_index: int, first_value: str | None) -> str | None:
    collected = [first_value] if first_value else []
    for next_line in lines[label_index + 1 : label_index + 4]:
        stripped = next_line.strip()
        if not stripped or _RATION_ADDRESS_STOP_PATTERN.search(stripped):
            break
        collected.append(stripped)
    joined = " ".join(part for part in collected if part).strip()
    return joined or None


def extract_ration_card_fields(raw_text: str) -> OCRExtractionResult:
    text = raw_text or ""
    lines = text.split("\n")

    ration_no, _ = _first_line_match(lines, _RATION_NO_PATTERN)
    head_of_family, _ = _first_line_match(lines, _HEAD_OF_FAMILY_PATTERN)
    fp_shop_no, _ = _first_line_match(lines, _FP_SHOP_PATTERN)
    village, _ = _first_line_match(lines, _VILLAGE_PATTERN)
    mandal, _ = _first_line_match(lines, _MANDAL_PATTERN)
    district, _ = _first_line_match(lines, _DISTRICT_PATTERN)
    address_value, address_index = _first_line_match(lines, _RESIDENTIAL_ADDRESS_PATTERN)

    address = _collect_address_block(lines, address_index, address_value) if address_index is not None else None

    return OCRExtractionResult(
        name=head_of_family,
        document_number=ration_no,
        address=address,
        fp_shop_no=fp_shop_no,
        village=village,
        mandal=mandal,
        district=district,
        raw_text=text,
    )


def extract_fields_from_text(raw_text: str) -> OCRExtractionResult:
    text = raw_text or ""
    lines = text.split("\n")

    dob_match = _DOB_PATTERN.search(text)
    gender_match = _GENDER_PATTERN.search(text)
    issue_date_match = _ISSUE_DATE_PATTERN.search(text)
    details_as_on_match = _DETAILS_AS_ON_PATTERN.search(text)
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
        issue_date=issue_date_match.group(1).strip() if issue_date_match else None,
        details_as_on=details_as_on_match.group(1).strip() if details_as_on_match else None,
        raw_text=text,
    )
