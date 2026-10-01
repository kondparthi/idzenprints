from pydantic import BaseModel


class GenerateCardRequest(BaseModel):
    customer_id: str
    template_id: str
    order_id: str | None = None


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
