"""Print-sheet layouts for a single generated card (front + back images).

All geometry is in millimetres, rendered at 300 dpi. Layouts mirror what
card-print operators use: A4 sheets with 5 or 10 cards, 4x6in photo paper,
and PVC-tray printing (card rotated 90 degrees in a slot).
"""
import io
import math
from dataclasses import dataclass
from typing import Optional

from PIL import Image, ImageDraw, ImageOps

DPI = 300
CARD_W_MM, CARD_H_MM = 85.6, 54.0


def px(mm: float) -> int:
    return round(mm / 25.4 * DPI)


@dataclass
class Options:
    layout: str = "a4_5_cards"
    side: str = "both"        # both | front | back (where the layout allows)
    border: bool = False
    mirror: bool = False
    gap_mm: float = 4.0
    dx_mm: float = 0.0
    dy_mm: float = 0.0
    zoom: float = 100.0
    rotation: float = 0.0
    copies: int = 1


LAYOUTS: dict[str, dict] = {
    "a4_5_cards": {"label": "A4 sheet — 5 cards (front + back)", "paper": (210.0, 297.0), "max_copies": 5, "sides": False},
    "a4_10_duplex": {"label": "A4 sheet — 10 cards duplex (page 1 fronts, page 2 backs)", "paper": (210.0, 297.0), "max_copies": 10, "sides": False},
    "4x6_single": {"label": "10 × 15 cm (4 × 6 in)", "paper": (101.6, 152.4), "max_copies": 1, "sides": True},
    "4x6_both_side": {"label": "10 × 15 cm (4 × 6 in) — both side print", "paper": (101.6, 152.4), "max_copies": 2, "sides": False},
    "pvc_tray": {"label": "PVC tray (Epson L8050)", "paper": (297.0, 210.0), "max_copies": 2, "sides": True},
    "back_tray": {"label": "Back tray PVC card", "paper": (101.6, 152.4), "max_copies": 1, "sides": True},
}


def _prepare(img: Image.Image, o: Options, rotate90: bool = False) -> Image.Image:
    """Card image at physical size (zoom/rotation/mirror/border applied)."""
    w, h = px(CARD_W_MM * o.zoom / 100), px(CARD_H_MM * o.zoom / 100)
    out = img.convert("RGB").resize((w, h), Image.LANCZOS)
    if o.border:
        ImageDraw.Draw(out).rectangle([0, 0, w - 1, h - 1], outline=(120, 120, 120), width=2)
    if o.mirror:
        out = ImageOps.mirror(out)
    angle = (-90 if rotate90 else 0) - o.rotation
    if angle:
        out = out.rotate(angle, expand=True, fillcolor="white", resample=Image.BICUBIC)
    return out


def _put(page: Image.Image, card: Image.Image, cx_mm: float, cy_mm: float, o: Options) -> None:
    x = px(cx_mm + o.dx_mm) - card.width // 2
    y = px(cy_mm + o.dy_mm) - card.height // 2
    page.paste(card, (x, y))


def _blank(paper: tuple[float, float]) -> Image.Image:
    return Image.new("RGB", (px(paper[0]), px(paper[1])), "white")


def build_pages(front: Image.Image, back: Optional[Image.Image], o: Options) -> list[Image.Image]:
    if o.layout not in LAYOUTS:
        raise ValueError(f"unknown layout {o.layout}")
    spec = LAYOUTS[o.layout]
    paper_w, paper_h = spec["paper"]
    copies = max(1, min(int(o.copies), spec["max_copies"]))
    g = max(0.0, o.gap_mm)
    f = _prepare(front, o)
    b = _prepare(back, o) if back is not None else None
    cw, ch = CARD_W_MM * o.zoom / 100, CARD_H_MM * o.zoom / 100
    pages: list[Image.Image] = []

    if o.layout == "a4_5_cards":
        total_h = 5 * ch + 4 * g
        y0 = 10.0 if total_h <= 277 else max(2.0, (paper_h - total_h) / 2)
        x0 = (paper_w - (2 * cw + g)) / 2
        page = _blank(spec["paper"])
        for r in range(copies):
            cy = y0 + r * (ch + g) + ch / 2
            if o.side in ("both", "front"):
                _put(page, f, x0 + cw / 2, cy, o)
            if b is not None and o.side in ("both", "back"):
                _put(page, b, x0 + cw + g + cw / 2, cy, o)
        pages.append(page)

    elif o.layout == "a4_10_duplex":
        total_h = 5 * ch + 4 * g
        y0 = 10.0 if total_h <= 277 else max(2.0, (paper_h - total_h) / 2)
        x0 = (paper_w - (2 * cw + g)) / 2
        slots = [(c, r) for r in range(5) for c in range(2)][:copies]
        front_page = _blank(spec["paper"])
        for c, r in slots:
            _put(front_page, f, x0 + c * (cw + g) + cw / 2, y0 + r * (ch + g) + ch / 2, o)
        pages.append(front_page)
        if b is not None:
            back_page = _blank(spec["paper"])
            for c, r in slots:
                # Paper is flipped on its long edge, so columns swap sides.
                _put(back_page, b, x0 + (1 - c) * (cw + g) + cw / 2, y0 + r * (ch + g) + ch / 2, o)
            pages.append(back_page)

    elif o.layout == "4x6_single":
        sides = [s for s, im in (("front", f), ("back", b)) if im is not None and o.side in ("both", s)]
        block = len(sides) * ch + (len(sides) - 1) * (g + 8)
        y = (paper_h - block) / 2
        page = _blank(spec["paper"])
        for s in sides:
            _put(page, f if s == "front" else b, paper_w / 2, y + ch / 2, o)
            y += ch + g + 8
        pages.append(page)

    elif o.layout == "4x6_both_side":
        rows = [paper_h / 2 - (ch + g) / 2 - 2, paper_h / 2 + (ch + g) / 2 + 2][:copies]
        if copies == 1:
            rows = [paper_h / 2]
        front_page = _blank(spec["paper"])
        for cy in rows:
            _put(front_page, f, paper_w / 2, cy, o)
        pages.append(front_page)
        if b is not None:
            back_page = _blank(spec["paper"])
            for cy in rows:
                _put(back_page, b, paper_w / 2, cy, o)
            pages.append(back_page)

    elif o.layout == "pvc_tray":
        img = f if (o.side != "back" or b is None) else b
        card = _prepare(front if img is f else back, o, rotate90=True)
        page = _blank(spec["paper"])
        centers = [(paper_w * 0.30, paper_h / 2), (paper_w * 0.70, paper_h / 2)][:copies]
        for cx, cy in centers:
            _put(page, card, cx, cy, o)
        pages.append(page)

    elif o.layout == "back_tray":
        img = front if (o.side != "back" or back is None) else back
        card = _prepare(img, o, rotate90=True)
        page = _blank(spec["paper"])
        _put(page, card, paper_w / 2, paper_h / 2 - 6, o)
        d = ImageDraw.Draw(page)
        d.text((px(paper_w / 2) - px(14), px(3)), "REAR FEED DIRECTION", fill=(110, 110, 110))
        pages.append(page)

    return pages


def to_pdf(pages: list[Image.Image]) -> bytes:
    buf = io.BytesIO()
    pages[0].save(buf, format="PDF", resolution=float(DPI), save_all=True, append_images=pages[1:])
    return buf.getvalue()
