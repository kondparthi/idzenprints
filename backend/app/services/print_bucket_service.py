"""
The print bucket: a server-side "cart" of already-generated cards staff
queue up, then print together as a contact-sheet PDF — 4 cards per A4
page, fronts laid out in a row across the top and their matching backs in
a row directly beneath.
"""
import io
from pathlib import Path
from typing import Optional

from PIL import Image
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.generated_card import GeneratedCard
from app.models.print_bucket_item import PrintBucketItem
from app.repositories.print_bucket_repository import PrintBucketRepository

settings = get_settings()

# A4 at 300dpi, portrait.
_SHEET_DPI = 300
_MM_PER_IN = 25.4
PAPER_SIZES_MM = {
    "a4": (210.0, 297.0),
}


def _mm_to_px(mm: float, dpi: int = _SHEET_DPI) -> int:
    return round(mm / _MM_PER_IN * dpi)


class GeneratedCardNotFoundError(Exception):
    pass


class BucketItemNotFoundError(Exception):
    pass


class UnsupportedPaperSizeError(Exception):
    pass


class PrintBucketService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PrintBucketRepository(db)

    def add(self, generated_card_id: str, added_by: Optional[str]) -> PrintBucketItem:
        card = self.db.query(GeneratedCard).filter(GeneratedCard.id == generated_card_id).first()
        if not card:
            raise GeneratedCardNotFoundError(generated_card_id)
        existing = self.repo.get_by_generated_card_id(generated_card_id)
        if existing:
            return existing
        item = PrintBucketItem(generated_card_id=generated_card_id, added_by=added_by)
        return self.repo.create(item)

    def list_all(self) -> list[PrintBucketItem]:
        return self.repo.list_all()

    def remove(self, item_id: str) -> None:
        item = self.repo.get_by_id(item_id)
        if not item:
            raise BucketItemNotFoundError(item_id)
        self.repo.delete(item)

    def count(self) -> int:
        return self.repo.count()

    def _resolve(self, relative_path: Optional[str]) -> Optional[Path]:
        if not relative_path:
            return None
        path = Path(settings.GENERATED_DIR) / relative_path
        return path if path.exists() else None

    def build_print_sheet(self, item_ids: list[str], paper_size: str = "a4") -> bytes:
        paper_size = (paper_size or "a4").lower()
        if paper_size not in PAPER_SIZES_MM:
            raise UnsupportedPaperSizeError(paper_size)

        items = self.repo.list_by_ids(item_ids)
        # Keep the order the caller asked for (list_by_ids doesn't guarantee it).
        by_id = {item.id: item for item in items}
        ordered = [by_id[i] for i in item_ids if i in by_id]
        if not ordered:
            raise BucketItemNotFoundError("no matching bucket items")

        width_mm, height_mm = PAPER_SIZES_MM[paper_size]
        sheet_w = _mm_to_px(width_mm)
        sheet_h = _mm_to_px(height_mm)
        margin = _mm_to_px(10)
        gutter = _mm_to_px(6)
        row_gap = _mm_to_px(10)

        columns = 4
        col_w = (sheet_w - 2 * margin - (columns - 1) * gutter) // columns
        # Half the sheet height (minus margins/gap) is available for each row.
        row_h = (sheet_h - 2 * margin - row_gap) // 2

        pages: list[Image.Image] = []
        for chunk_start in range(0, len(ordered), 4):
            chunk = ordered[chunk_start : chunk_start + 4]
            page = Image.new("RGB", (sheet_w, sheet_h), "white")
            self._place_row(page, chunk, side="front", y=margin, col_w=col_w, row_h=row_h, margin=margin, gutter=gutter)
            self._place_row(
                page, chunk, side="back", y=margin + row_h + row_gap, col_w=col_w, row_h=row_h, margin=margin, gutter=gutter
            )
            pages.append(page)

        buffer = io.BytesIO()
        pages[0].save(
            buffer,
            format="PDF",
            resolution=float(_SHEET_DPI),
            save_all=True,
            append_images=pages[1:],
        )
        return buffer.getvalue()

    def _place_row(
        self,
        page: Image.Image,
        chunk: list[PrintBucketItem],
        side: str,
        y: int,
        col_w: int,
        row_h: int,
        margin: int,
        gutter: int,
    ) -> None:
        for i, item in enumerate(chunk):
            card = item.generated_card
            relative_path = card.png_path if side == "front" else card.back_png_path
            path = self._resolve(relative_path)
            x = margin + i * (col_w + gutter)
            if path is None:
                continue
            with Image.open(path) as img:
                fitted = self._fit(img.convert("RGB"), col_w, row_h)
                cell_x = x + (col_w - fitted.width) // 2
                cell_y = y + (row_h - fitted.height) // 2
                page.paste(fitted, (cell_x, cell_y))

    @staticmethod
    def _fit(image: Image.Image, max_w: int, max_h: int) -> Image.Image:
        scale = min(max_w / image.width, max_h / image.height)
        new_size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
        return image.resize(new_size, Image.LANCZOS)
