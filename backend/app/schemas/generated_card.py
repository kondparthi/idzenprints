from pydantic import BaseModel

# Keyed by side ("front"/"back") -> template element id -> data: URI PNG —
# a staff-confirmed "this box is correct, use exactly this image" snapshot
# (see /cards/box-image), applied in place of the element's normal text/
# QR/barcode render for both the preview and the final generated card.
FieldImageOverrides = dict[str, dict[str, str]]


class GenerateCardRequest(BaseModel):
    customer_id: str
    template_id: str
    order_id: str | None = None
    field_image_overrides: FieldImageOverrides | None = None


class BoxImageRequest(BaseModel):
    customer_id: str
    template_id: str
    side: str = "front"
    element_id: str


class GeneratedCardOut(BaseModel):
    id: str
    customer_id: str
    template_id: str
    order_id: str | None
    pdf_path: str | None
    png_path: str | None
    jpg_path: str | None
    back_png_path: str | None
    back_jpg_path: str | None

    class Config:
        from_attributes = True
