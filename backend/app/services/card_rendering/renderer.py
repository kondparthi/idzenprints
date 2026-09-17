"""
Renders a Template (width/height/dpi + JSON element list) into a single
PIL image, substituting {{variable}} tokens with real customer data.

Coordinates are stored in mm in the template; this module is the one place
that converts mm -> px at the template's configured DPI, so the designer
(browser, arbitrary zoom) and the generator (server, fixed DPI) always
agree on where things land.
"""
import base64
import io
import re
from pathlib import Path
from typing import Any, Optional

import barcode as barcode_lib
import qrcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw

from app.services.card_rendering.fonts import get_font_for_text

_VARIABLE_PATTERN = re.compile(r"\{\{(\w+)\}\}")


def substitute_variables(text: str, data: dict[str, str]) -> str:
    return _VARIABLE_PATTERN.sub(lambda m: data.get(m.group(1), ""), text or "")


def mm_to_px(mm: float, dpi: int) -> int:
    return round(mm * dpi / 25.4)


def _decode_data_uri_image(data_uri: str) -> Optional[Image.Image]:
    try:
        header, encoded = data_uri.split(",", 1)
        raw = base64.b64decode(encoded)
        return Image.open(io.BytesIO(raw)).convert("RGBA")
    except Exception:  # noqa: BLE001 - a malformed/missing image must not crash generation
        return None


def _load_image_element(element: dict[str, Any], customer_photo_path: Optional[Path]) -> Optional[Image.Image]:
    image_path = element.get("imagePath")
    if image_path and image_path.startswith("data:"):
        return _decode_data_uri_image(image_path)
    if element.get("type") == "photo" and customer_photo_path and customer_photo_path.exists():
        return Image.open(customer_photo_path).convert("RGBA")
    return None


def _fit_image(image: Image.Image, box_w: int, box_h: int, object_fit: str) -> Image.Image:
    src_w, src_h = image.size
    if src_w == 0 or src_h == 0:
        return Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))

    src_ratio = src_w / src_h
    box_ratio = box_w / box_h

    if object_fit == "contain":
        if src_ratio > box_ratio:
            new_w, new_h = box_w, round(box_w / src_ratio)
        else:
            new_w, new_h = round(box_h * src_ratio), box_h
        resized = image.resize((max(1, new_w), max(1, new_h)), Image.LANCZOS)
        canvas = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
        canvas.paste(resized, ((box_w - new_w) // 2, (box_h - new_h) // 2), resized)
        return canvas

    # cover (default): scale to fill, crop the overhang
    if src_ratio > box_ratio:
        new_h = box_h
        new_w = round(box_h * src_ratio)
    else:
        new_w = box_w
        new_h = round(box_w / src_ratio)
    resized = image.resize((max(1, new_w), max(1, new_h)), Image.LANCZOS)
    left = (new_w - box_w) // 2
    top = (new_h - box_h) // 2
    return resized.crop((left, top, left + box_w, top + box_h))


def _render_text_element(element: dict[str, Any], box_w: int, box_h: int, dpi: int, data: dict[str, str]) -> Image.Image:
    layer = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    text = substitute_variables(element.get("text", ""), data)
    font_size_px = mm_to_px(float(element.get("fontSize", 4)), dpi)
    font = get_font_for_text(text, bool(element.get("bold")), bool(element.get("italic")), font_size_px)
    color = element.get("color", "#000000")
    align = element.get("align", "left")
    line_height = float(element.get("lineHeight", 1.2))
    letter_spacing_px = mm_to_px(float(element.get("letterSpacing", 0)), dpi)

    lines = text.split("\n") if text else [""]
    y = 0
    line_advance = font_size_px * line_height
    for line in lines:
        if letter_spacing_px:
            x = 0
            for ch in line:
                draw.text((x, y), ch, font=font, fill=color)
                x += draw.textlength(ch, font=font) + letter_spacing_px
        else:
            line_w = draw.textlength(line, font=font)
            if align == "center":
                x = (box_w - line_w) / 2
            elif align == "right":
                x = box_w - line_w
            else:
                x = 0
            draw.text((x, y), line, font=font, fill=color)
        y += line_advance
    return layer


def _render_qr_element(element: dict[str, Any], box_w: int, box_h: int, data: dict[str, str]) -> Image.Image:
    value = substitute_variables(element.get("value", ""), data) or " "
    qr_img = qrcode.make(value).convert("RGBA")
    return qr_img.resize((box_w, box_h), Image.NEAREST)


def _render_barcode_element(element: dict[str, Any], box_w: int, box_h: int, data: dict[str, str]) -> Optional[Image.Image]:
    value = substitute_variables(element.get("value", ""), data)
    if not value:
        return None
    try:
        code128 = barcode_lib.get_barcode_class("code128")
        writer = ImageWriter()
        writer.set_options({"write_text": False, "quiet_zone": 1})
        instance = code128(value, writer=writer)
        buffer = io.BytesIO()
        instance.write(buffer)
        buffer.seek(0)
        img = Image.open(buffer).convert("RGBA")
        return img.resize((box_w, box_h), Image.NEAREST)
    except Exception:  # noqa: BLE001 - unencodable value must not crash generation
        return None


def render_template(
    width_mm: float,
    height_mm: float,
    dpi: int,
    elements: list[dict[str, Any]],
    data: dict[str, str],
    background_image: Optional[Image.Image] = None,
    customer_photo_path: Optional[Path] = None,
) -> Image.Image:
    canvas_w = mm_to_px(width_mm, dpi)
    canvas_h = mm_to_px(height_mm, dpi)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (255, 255, 255, 255))

    if background_image is not None:
        fitted_bg = _fit_image(background_image.convert("RGBA"), canvas_w, canvas_h, "cover")
        canvas.paste(fitted_bg, (0, 0), fitted_bg)

    for element in sorted(elements, key=lambda e: e.get("zIndex", 0)):
        box_x = mm_to_px(float(element.get("x", 0)), dpi)
        box_y = mm_to_px(float(element.get("y", 0)), dpi)
        box_w = max(1, mm_to_px(float(element.get("width", 1)), dpi))
        box_h = max(1, mm_to_px(float(element.get("height", 1)), dpi))
        rotation = float(element.get("rotation", 0))
        element_type = element.get("type")

        layer: Optional[Image.Image] = None
        if element_type == "text":
            layer = _render_text_element(element, box_w, box_h, dpi, data)
        elif element_type in ("image", "photo", "logo"):
            source = _load_image_element(element, customer_photo_path)
            if source is not None:
                layer = _fit_image(source, box_w, box_h, element.get("objectFit", "cover"))
        elif element_type == "qrcode":
            layer = _render_qr_element(element, box_w, box_h, data)
        elif element_type == "barcode":
            layer = _render_barcode_element(element, box_w, box_h, data)
        elif element_type == "rectangle":
            layer = Image.new("RGBA", (box_w, box_h), element.get("fill", "#ffffff"))
            draw = ImageDraw.Draw(layer)
            draw.rectangle([0, 0, box_w - 1, box_h - 1], outline=element.get("stroke", "#000000"), width=1)

        if layer is None:
            continue

        if rotation:
            layer = layer.rotate(-rotation, expand=True, resample=Image.BICUBIC)
            paste_x = box_x + box_w // 2 - layer.width // 2
            paste_y = box_y + box_h // 2 - layer.height // 2
        else:
            paste_x, paste_y = box_x, box_y

        canvas.paste(layer, (paste_x, paste_y), layer)

    return canvas
