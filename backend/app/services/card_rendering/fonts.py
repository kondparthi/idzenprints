"""
Bundled fonts for server-side card rendering.

Rendering happens on the server (not in the browser), so it can't rely on
whatever fonts happen to be installed on the shop's Windows PC — Arial may
or may not exist at the same path on every machine, and a production
deployment might run on Linux. DejaVu Sans (Bitstream Vera License, freely
redistributable) is bundled under app/assets/fonts so Latin-script output
is identical everywhere.

DejaVu Sans has no glyphs for Indian regional scripts (Telugu, Devanagari,
Tamil, etc.) — text in those scripts would render as blank boxes. Noto
Sans Telugu (SIL Open Font License, a variable font covering weight from
Thin to Black) is bundled alongside it, and get_font_for_text() picks it
automatically whenever the text to render contains Indic-script
characters — so a template text element bound to {{name_local}} or
{{address_local}} renders correctly without the operator having to choose
a font manually.

Known limitation: the designer's font-family picker (Arial/Georgia/Courier
New/Verdana) is a browser-preview-only choice for now — every generated
card renders Latin text with DejaVu Sans regardless of that selection.
Swapping in the real font files, or a font-matching step, is the natural
next increment if exact font fidelity becomes a requirement.
"""
import re
from pathlib import Path

from PIL import ImageFont

_FONTS_DIR = Path(__file__).resolve().parents[2] / "assets" / "fonts"

_FONT_FILES = {
    (False, False): "DejaVuSans.ttf",
    (True, False): "DejaVuSans-Bold.ttf",
    (False, True): "DejaVuSans-Oblique.ttf",
    (True, True): "DejaVuSans-BoldOblique.ttf",
}

_INDIC_SCRIPT_PATTERN = re.compile(
    r"[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF"
    r"\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]"
)
_INDIC_FONT_FILE = "NotoSansTelugu-Regular.ttf"
_INDIC_VARIATION_BOLD = b"Bold"
_INDIC_VARIATION_REGULAR = b"Regular"

_font_cache: dict[tuple[str, bool, int], ImageFont.FreeTypeFont] = {}


def contains_indic_script(text: str) -> bool:
    return bool(_INDIC_SCRIPT_PATTERN.search(text or ""))


def get_font(bold: bool, italic: bool, size_px: int) -> ImageFont.FreeTypeFont:
    size_px = max(1, int(size_px))
    key = (_FONT_FILES[(bold, italic)], False, size_px)
    if key not in _font_cache:
        filename = _FONT_FILES[(bold, italic)]
        _font_cache[key] = ImageFont.truetype(str(_FONTS_DIR / filename), size_px)
    return _font_cache[key]


def get_font_for_text(text: str, bold: bool, italic: bool, size_px: int) -> ImageFont.FreeTypeFont:
    """Same as get_font(), but automatically switches to the bundled Indic
    font when `text` contains Telugu/Devanagari/Tamil/etc. characters.
    Italic has no effect for the Indic font — Noto Sans Telugu doesn't
    ship an oblique variant, so bold-or-not is all that applies there."""
    if not contains_indic_script(text):
        return get_font(bold, italic, size_px)

    size_px = max(1, int(size_px))
    key = (_INDIC_FONT_FILE, bold, size_px)
    if key not in _font_cache:
        font = ImageFont.truetype(str(_FONTS_DIR / _INDIC_FONT_FILE), size_px)
        try:
            font.set_variation_by_name("Bold" if bold else "Regular")
        except Exception:  # noqa: BLE001 - variation support is a nicety, never a hard requirement
            pass
        _font_cache[key] = font
    return _font_cache[key]
