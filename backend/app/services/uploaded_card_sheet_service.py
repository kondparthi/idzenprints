"""
Builds a print-ready PDF contact sheet from the UploadedCard library —
the "Print pre-designed cards" module. Unlike print_bucket_service (which
lays fronts and backs out as two separate rows/pages for duplex
printing), this one places each card's front and back side by side in a
single block, auto-tiled into a grid sized to the chosen paper so no
duplex alignment is needed — what's on the sheet is exactly what prints.
"""
import io
from pathlib import Path
from typing import Optional

from PIL import Image
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.uploaded_card import UploadedCard
from app.repositories.uploaded_card_repository import UploadedCardRepository
from app.schemas.uploaded_card import PrintSheetItemRequest

settings = get_settings()

_SHEET_DPI = 300
_MM_PER_IN = 25.4
PAPER_SIZES_MM = {
    "a4": (210.0, 297.0),
    "a3": (297.0, 420.0),
    "letter": (215.9, 279.4),
}

# Tight print-shop margins, not document margins — a standard CR80 card
# (85.6 x 53.98mm) placed front-and-back side by side already uses most of
# an A4's width, so generous margins would cost rows. At these values an
# A4 portrait sheet fits 5 rows (5 card pairs) per page, matching what
# print shops normally get out of a CR80-card A4 layout.
_MARGIN_MM = 5
_BLOCK_GUTTER_MM = 5  # between one card's block and the next, across a row
_ROW_GAP_MM = 4  # between rows
_FRONT_BACK_GUTTER_MM = 3  # between a card's front and its own back, within one block

_DEFAULT_CARD_WIDTH_MM = 85.60
_DEFAULT_CARD_HEIGHT_MM = 53.98


def _mm_to_px(mm: float, dpi: int = _SHEET_DPI) -> int:
    return round(mm / _MM_PER_IN * dpi)


class UploadedCardNotFoundForSheetError(Exception):
    pass


class UnsupportedPaperSizeError(Exception):
    pass


class EmptySheetRequestError(Exception):
    pass


class UploadedCardSheetService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = UploadedCardRepository(db)

    def _resolve(self, relative_path: Optional[str]) -> Optional[Path]:
        if not relative_path:
            return None
        path = Path(settings.UPLOAD_DIR) / relative_path
        return path if path.exists() else None

    def build_print_sheet(self, items: list[PrintSheetItemRequest], paper_size: str = "a4") -> bytes:
        pages = self._build_pages(items, paper_size)
        buffer = io.BytesIO()
        pages[0].save(
            buffer,
            format="PDF",
            resolution=float(_SHEET_DPI),
            save_all=True,
            append_images=pages[1:],
        )
        return buffer.getvalue()

    def build_preview_images(self, items: list[PrintSheetItemRequest], paper_size: str = "a4") -> list[bytes]:
        """Same layout as build_print_sheet, but returns each page as a
        standalone PNG — for showing "this is what will print" in the UI
        before committing to a PDF download."""
        pages = self._build_pages(items, paper_size)
        png_pages: list[bytes] = []
        for page in pages:
            buffer = io.BytesIO()
            # A full 300dpi page is overkill for an on-screen preview and
            # slow to ship over the wire — downscale to a reasonable
            # preview width while keeping the page's proportions.
            preview = page
            max_preview_w = 900
            if preview.width > max_preview_w:
                scale = max_preview_w / preview.width
                preview = preview.resize(
                    (max_preview_w, max(1, round(preview.height * scale))), Image.LANCZOS
                )
            preview.save(buffer, format="PNG")
            png_pages.append(buffer.getvalue())
        return png_pages

    def _build_pages(self, items: list[PrintSheetItemRequest], paper_size: str = "a4") -> list[Image.Image]:
        paper_size = (paper_size or "a4").lower()
        if paper_size not in PAPER_SIZES_MM:
            raise UnsupportedPaperSizeError(paper_size)
        if not items:
            raise EmptySheetRequestError("no cards selected")

        requested_ids = [item.uploaded_card_id for item in items]
        found = self.repo.list_by_ids(requested_ids)
        by_id = {card.id: card for card in found}
        missing = [cid for cid in requested_ids if cid not in by_id]
        if missing:
            raise UploadedCardNotFoundForSheetError(", ".join(missing))

        # Expand copies into a flat, ordered list — one entry per physical
        # card to print.
        ordered: list[UploadedCard] = []
        for item in items:
            card = by_id[item.uploaded_card_id]
            ordered.extend([card] * item.copies)

        # A uniform cell size for every block on the sheet, even if the
        # selected cards are different physical sizes — the largest
        # selected card's dimensions, so nothing on the sheet overlaps.
        cell_w_mm = max((c.width_mm or _DEFAULT_CARD_WIDTH_MM) for c in ordered)
        cell_h_mm = max((c.height_mm or _DEFAULT_CARD_HEIGHT_MM) for c in ordered)

        sheet_w_mm, sheet_h_mm = PAPER_SIZES_MM[paper_size]
        sheet_w = _mm_to_px(sheet_w_mm)
        sheet_h = _mm_to_px(sheet_h_mm)
        margin = _mm_to_px(_MARGIN_MM)
        block_gutter = _mm_to_px(_BLOCK_GUTTER_MM)
        row_gap = _mm_to_px(_ROW_GAP_MM)
        fb_gutter = _mm_to_px(_FRONT_BACK_GUTTER_MM)

        cell_w = _mm_to_px(cell_w_mm)
        cell_h = _mm_to_px(cell_h_mm)
        block_w = 2 * cell_w + fb_gutter
        block_h = cell_h

        columns = max(1, (sheet_w - 2 * margin + block_gutter) // (block_w + block_gutter))
        rows = max(1, (sheet_h - 2 * margin + row_gap) // (block_h + row_gap))
        per_page = columns * rows

        pages: list[Image.Image] = []
        for page_start in range(0, len(ordered), per_page):
            chunk = ordered[page_start : page_start + per_page]
            page = Image.new("RGB", (sheet_w, sheet_h), "white")
            for i, card in enumerate(chunk):
                col = i % columns
                row = i // columns
                block_x = margin + col * (block_w + block_gutter)
                block_y = margin + row * (block_h + row_gap)
                self._place_card(page, card, block_x, block_y, cell_w, cell_h, fb_gutter)
            pages.append(page)

        return pages

    def _place_card(
        self,
        page: Image.Image,
        card: UploadedCard,
        block_x: int,
        block_y: int,
        cell_w: int,
        cell_h: int,
        fb_gutter: int,
    ) -> None:
        self._place_image(page, card.front_image_path, block_x, block_y, cell_w, cell_h)
        back_x = block_x + cell_w + fb_gutter
        self._place_image(page, card.back_image_path, back_x, block_y, cell_w, cell_h)

    def _place_image(
        self, page: Image.Image, relative_path: Optional[str], x: int, y: int, cell_w: int, cell_h: int
    ) -> None:
        path = self._resolve(relative_path)
        if path is None:
            return
        with Image.open(path) as img:
            fitted = self._fit(img.convert("RGB"), cell_w, cell_h)
            cell_x = x + (cell_w - fitted.width) // 2
            cell_y = y + (cell_h - fitted.height) // 2
            page.paste(fitted, (cell_x, cell_y))

    @staticmethod
    def _fit(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
        scale = min(max_w / image.width, max_h / image.height)
        new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        return image.resize(new_size, Image.LANCZOS)
