"""
Turns a display name into a URL-safe slug — used for product categories,
brands, and tags so they're ready for a future public product listing
page without needing a separate migration to add slugs later.
"""
import re
import unicodedata


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    return re.sub(r"[-\s]+", "-", value) or "item"
