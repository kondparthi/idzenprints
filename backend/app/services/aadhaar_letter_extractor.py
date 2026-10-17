"""
Cuts the front and back card out of a full Aadhaar letter (the e-Aadhaar
PDF, or a JPG/PNG of it).

The letter has a fixed print layout: one big black-outlined box whose left
and right halves are the two sides of the page, and across the bottom of
each half a dashed scissors line with the card below it:

    +---------------------+---------------------+
    |  letter (page side) |  information        |
    |                     |                     |
    | - - - - - - - - - - | - - - - - - - - - - |   <- dashed cut line
    |  FRONT of the card  |  BACK of the card   |
    +---------------------+---------------------+

So the cards are located from the black ruling lines themselves (outer
box, the two panel borders, the dashed cut line) rather than from fixed
page positions — that keeps it working for different render sizes, scans
with margins, and images already cropped to the box.
"""
import io
from typing import Optional

import numpy as np
from PIL import Image, ImageOps

_RENDER_DPI = 300
_MAX_PAGES_TO_TRY = 3
_MAX_WIDTH_PX = 3300  # downscale anything bigger; plenty for a 300dpi A4/Letter

# A pixel counts as "black ink" when it is dark AND neutral (R, G and B
# close together). The artwork's red / orange / green bars are strongly
# coloured, so only the black ruling lines and text are picked up. The
# darkness limit is loose because JPEG blur lightens thin dashed lines.
_DARK_MAX = 175
_NEUTRAL_MAX_SPREAD = 50

# The card must come out looking like a card, otherwise we found the wrong thing.
_MIN_CARD_ASPECT = 1.25
_MAX_CARD_ASPECT = 1.9


class LetterExtractionError(Exception):
    """Base class — the message is safe to show to the operator."""


class UnreadableLetterError(LetterExtractionError):
    pass


class PasswordRequiredError(LetterExtractionError):
    pass


class WrongPasswordError(LetterExtractionError):
    pass


class CardSectionNotFoundError(LetterExtractionError):
    pass


def extract_cards(data: bytes, password: Optional[str] = None) -> tuple[Image.Image, Image.Image]:
    """Returns (front, back) PIL images cut from the letter in `data`
    (PDF, JPG or PNG bytes)."""
    pages = _load_pages(data, password)
    last_error: Optional[CardSectionNotFoundError] = None
    for page in pages:
        try:
            return _find_cards(page)
        except CardSectionNotFoundError as exc:
            last_error = exc
    raise last_error or CardSectionNotFoundError("Couldn't find the card section in this file.")


# ---------------------------------------------------------------- loading


def _load_pages(data: bytes, password: Optional[str]) -> list[Image.Image]:
    if data[:5] == b"%PDF-":
        return _render_pdf(data, password)
    try:
        image = Image.open(io.BytesIO(data))
        image = ImageOps.exif_transpose(image).convert("RGB")
    except Exception as exc:  # Pillow raises many different things for bad files
        raise UnreadableLetterError("That file couldn't be read as an image or PDF.") from exc
    return [_limit_size(image)]


def _render_pdf(data: bytes, password: Optional[str]) -> list[Image.Image]:
    import pypdfium2 as pdfium
    from pypdfium2 import PdfiumError

    try:
        document = pdfium.PdfDocument(data, password=password or None)
    except PdfiumError as exc:
        if "password" in str(exc).lower():
            if password:
                raise WrongPasswordError("That PDF password is not correct.") from exc
            raise PasswordRequiredError(
                "This PDF is password protected. Enter its password "
                "(for an e-Aadhaar: first 4 letters of the name in CAPITALS + birth year, e.g. MALG1961)."
            ) from exc
        raise UnreadableLetterError("That PDF couldn't be opened.") from exc

    pages: list[Image.Image] = []
    try:
        for index in range(min(len(document), _MAX_PAGES_TO_TRY)):
            bitmap = document[index].render(scale=_RENDER_DPI / 72)
            pages.append(_limit_size(bitmap.to_pil().convert("RGB")))
    finally:
        document.close()
    if not pages:
        raise UnreadableLetterError("That PDF has no pages.")
    return pages


def _limit_size(image: Image.Image) -> Image.Image:
    if image.width <= _MAX_WIDTH_PX:
        return image
    scale = _MAX_WIDTH_PX / image.width
    return image.resize((_MAX_WIDTH_PX, round(image.height * scale)), Image.LANCZOS)


# -------------------------------------------------------------- detection


def _groups(indices: np.ndarray) -> list[tuple[int, int]]:
    """Collapses sorted indices into inclusive (start, end) runs."""
    runs: list[tuple[int, int]] = []
    start = prev = None
    for i in indices.tolist():
        if start is None:
            start = prev = i
        elif i == prev + 1:
            prev = i
        else:
            runs.append((start, prev))
            start = prev = i
    if start is not None:
        runs.append((start, prev))
    return runs


def _spans_width(row: np.ndarray, slices: int = 10, allowed_gaps: int = 1) -> bool:
    """True when a row has ink in (nearly) every tenth of its width — what a
    dashed line looks like, as opposed to text or a block that covers only
    part of the width. One empty slice is allowed (the scissors icon)."""
    parts = np.array_split(row, slices)
    return sum(1 for part in parts if part.any()) >= slices - allowed_gaps


def _find_cards(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    not_found = CardSectionNotFoundError(
        "Couldn't find the card section in this file. Use a full Aadhaar letter, "
        "or choose 'Front & back photos' and upload the two card images."
    )
    pixels = np.asarray(image)
    brightest, dimmest = pixels.max(axis=2), pixels.min(axis=2)
    dark = (brightest < _DARK_MAX) & (brightest - dimmest < _NEUTRAL_MAX_SPREAD)
    height, width = dark.shape
    unit = max(2, round(width / 850))  # ~1 at screen size, ~3 at 300dpi

    # 1. Outer box: the first and last long solid horizontal rules.
    horizontal = _groups(np.where(dark.sum(axis=1) >= 0.5 * width)[0])
    if len(horizontal) < 2:
        raise not_found
    top_rule, bottom_rule = horizontal[0], horizontal[-1]
    box_top, box_bottom = top_rule[1], bottom_rule[0]
    box_h = box_bottom - box_top
    if box_h < 0.4 * height:
        raise not_found

    top_row_xs = np.where(dark[(top_rule[0] + top_rule[1]) // 2])[0]
    box_left, box_right = int(top_row_xs.min()), int(top_row_xs.max())
    box_w = box_right - box_left

    # 2. Vertical rules inside the box: outer left/right edges, plus the
    #    borders of the two panels either side of the dashed centre line.
    band = dark[box_top : box_bottom + 1]
    vertical = [
        g
        for g in _groups(np.where(band.sum(axis=0) >= 0.6 * box_h)[0])
        if box_left - unit <= g[0] and g[1] <= box_right + unit
    ]
    if len(vertical) < 3:
        raise not_found
    outer_left, outer_right = vertical[0], vertical[-1]
    centre = (box_left + box_right) / 2
    inner = vertical[1:-1]
    left_panel_edge = max((g for g in inner if (g[0] + g[1]) / 2 <= centre), key=lambda g: g[1], default=None)
    right_panel_edge = min((g for g in inner if (g[0] + g[1]) / 2 > centre), key=lambda g: g[0], default=None)
    if left_panel_edge is None and right_panel_edge is None:
        raise not_found
    left_panel_edge = left_panel_edge or right_panel_edge
    right_panel_edge = right_panel_edge or left_panel_edge

    # 3. The dashed scissors line: topmost thin row in the lower part of the
    #    box that is inked across BOTH panels (text rows and the info box's
    #    border only cover one side or are thick).
    left_x0, left_x1 = outer_left[1] + 1, left_panel_edge[0]
    right_x0, right_x1 = right_panel_edge[1] + 1, outer_right[0]
    if left_x1 - left_x0 < 0.2 * box_w or right_x1 - right_x0 < 0.2 * box_w:
        raise not_found
    left_counts = dark[:, left_x0:left_x1].sum(axis=1)
    right_counts = dark[:, right_x0:right_x1].sum(axis=1)
    total = left_counts + right_counts
    search_from = box_top + int(0.45 * box_h)
    search_to = box_bottom - int(0.08 * box_h)
    cut_row = None
    for y in range(search_from, search_to):
        if left_counts[y] < 0.25 * (left_x1 - left_x0) or right_counts[y] < 0.25 * (right_x1 - right_x0):
            continue
        # Thin: the rows just above and below are mostly empty (not text).
        if max(total[y - 2 * unit], total[y + 2 * unit]) > 0.6 * total[y]:
            continue
        # Runs the full width of both panels — the QR code's top edge or a
        # line of text also has ink on both sides, but not end to end.
        if _spans_width(dark[y, left_x0:left_x1]) and _spans_width(dark[y, right_x0:right_x1]):
            cut_row = y
            break
    if cut_row is None:
        raise not_found
    cut_end = cut_row
    while cut_end + 1 < box_bottom and total[cut_end + 1] >= 0.5 * total[cut_row]:
        cut_end += 1

    # 4. Crop just inside the rules so no black line edge ends up on the card.
    #    The scissors icon hangs a few pixels below the dashed line, so the
    #    card starts a little further down (still above the card artwork).
    inset = unit
    card_top = cut_end + 1 + 3 * unit
    card_bottom = bottom_rule[0] - inset
    front_box = (left_x0 + inset, card_top, left_x1 - inset, card_bottom)
    back_box = (right_x0 + inset, card_top, right_x1 - inset, card_bottom)

    for left, top, right, bottom in (front_box, back_box):
        w, h = right - left, bottom - top
        if h <= 0 or w <= 0 or not (_MIN_CARD_ASPECT <= w / h <= _MAX_CARD_ASPECT):
            raise not_found

    return image.crop(front_box), image.crop(back_box)
