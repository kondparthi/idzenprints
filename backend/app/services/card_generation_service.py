"""
Orchestrates a card render: loads the template + customer data, calls the
renderer, and either hands back in-memory PNG bytes (preview — nothing
saved) or writes PDF/PNG/JPG to disk and records a GeneratedCard (generate).
"""
import io
from pathlib import Path
from typing import Optional

from PIL import Image
from sqlalchemy.orm import Session

from app.config.settings import get_settings
from app.models.customer import Customer
from app.models.customer_details import CustomerDetails
from app.models.generated_card import GeneratedCard
from app.models.template import Template
from app.repositories.customer_details_repository import CustomerDetailsRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.generated_card_repository import GeneratedCardRepository
from app.repositories.template_repository import TemplateRepository
from app.services.card_rendering.data_resolver import resolve_card_variables
from app.services.card_rendering.renderer import decode_data_uri_image, mm_to_px, render_element_layer, render_template
from app.utils.file_storage import resolve_stored_path

settings = get_settings()

# Keyed by side ("front"/"back") -> template element id -> data: URI PNG.
FieldImageOverrides = dict[str, dict[str, str]]


class CustomerNotFoundError(Exception):
    pass


class TemplateNotFoundError(Exception):
    pass


class GeneratedCardNotFoundError(Exception):
    pass


class ElementNotFoundError(Exception):
    pass


class CardGenerationService:
    def __init__(self, db: Session):
        self.db = db
        self.customer_repo = CustomerRepository(db)
        self.template_repo = TemplateRepository(db)
        self.details_repo = CustomerDetailsRepository(db)
        self.card_repo = GeneratedCardRepository(db)

    def _load_customer_and_template(self, customer_id: str, template_id: str) -> tuple[Customer, Template]:
        customer = self.customer_repo.get_by_id(customer_id)
        if not customer:
            raise CustomerNotFoundError(customer_id)
        template = self.template_repo.get_by_id(template_id)
        if not template:
            raise TemplateNotFoundError(template_id)
        return customer, template

    def _latest_verified_details(self, customer_id: str) -> Optional[CustomerDetails]:
        all_details = self.details_repo.list_for_customer(customer_id)
        verified = [d for d in all_details if d.is_verified]
        return verified[0] if verified else (all_details[0] if all_details else None)

    def _render_side(
        self,
        template: Template,
        background_path: Optional[str],
        elements: list,
        data: dict[str, str],
        customer_photo_path: Optional[Path],
        field_image_overrides: Optional[dict[str, Image.Image]] = None,
    ) -> Image.Image:
        background_image = None
        if background_path:
            bg_path = resolve_stored_path(background_path)
            if bg_path.exists():
                background_image = Image.open(bg_path)

        return render_template(
            width_mm=template.width_mm,
            height_mm=template.height_mm,
            dpi=template.dpi,
            elements=elements or [],
            data=data,
            background_image=background_image,
            customer_photo_path=customer_photo_path,
            field_image_overrides=field_image_overrides,
        )

    @staticmethod
    def _decode_overrides(
        field_image_overrides: Optional[FieldImageOverrides], side: str
    ) -> Optional[dict[str, Image.Image]]:
        if not field_image_overrides:
            return None
        side_overrides = field_image_overrides.get(side)
        if not side_overrides:
            return None
        decoded: dict[str, Image.Image] = {}
        for element_id, data_uri in side_overrides.items():
            image = decode_data_uri_image(data_uri)
            if image is not None:
                decoded[element_id] = image
        return decoded or None

    def has_back_side(self, template: Template) -> bool:
        """A template only has a back design once an admin has actually put
        something on it — an empty element list and no back background is
        indistinguishable from "never designed", so it's treated as a
        front-only card rather than generating a blank second page."""
        return bool(template.back_background_path) or bool(template.back_elements)

    def _render(
        self, customer: Customer, template: Template, field_image_overrides: Optional[FieldImageOverrides] = None
    ) -> tuple[Image.Image, Optional[Image.Image]]:
        """Renders the front, and the back too when the template has one."""
        details = self._latest_verified_details(customer.id)
        data = resolve_card_variables(customer, details)

        customer_photo_path: Optional[Path] = None
        if details and details.photo_path:
            candidate = resolve_stored_path(details.photo_path)
            if candidate.exists():
                customer_photo_path = candidate

        front = self._render_side(
            template,
            template.background_path,
            template.elements,
            data,
            customer_photo_path,
            self._decode_overrides(field_image_overrides, "front"),
        )

        back = None
        if self.has_back_side(template):
            back = self._render_side(
                template,
                template.back_background_path,
                template.back_elements,
                data,
                customer_photo_path,
                self._decode_overrides(field_image_overrides, "back"),
            )

        return front, back

    def preview_png_bytes(
        self,
        customer_id: str,
        template_id: str,
        side: str = "front",
        field_image_overrides: Optional[FieldImageOverrides] = None,
    ) -> bytes:
        customer, template = self._load_customer_and_template(customer_id, template_id)
        front, back = self._render(customer, template, field_image_overrides)
        image = back if (side == "back" and back is not None) else front
        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        return buffer.getvalue()

    def render_box_image(self, customer_id: str, template_id: str, side: str, element_id: str) -> bytes:
        """Renders a single template element on its own, as a transparent
        box_w x box_h PNG — the "confirm this field" drag thumbnail shown
        next to a field once it's been saved. Always rendered fresh from
        the customer's current saved data, so it's exactly what the
        element would look like on the card right now — the same
        rendering path as the full card, just cropped to one box."""
        customer, template = self._load_customer_and_template(customer_id, template_id)
        details = self._latest_verified_details(customer.id)
        data = resolve_card_variables(customer, details)

        elements = template.back_elements if side == "back" else template.elements
        element = next((e for e in (elements or []) if e.get("id") == element_id), None)
        if element is None:
            raise ElementNotFoundError(element_id)

        customer_photo_path: Optional[Path] = None
        if details and details.photo_path:
            candidate = resolve_stored_path(details.photo_path)
            if candidate.exists():
                customer_photo_path = candidate

        box_w = max(1, mm_to_px(float(element.get("width", 1)), template.dpi))
        box_h = max(1, mm_to_px(float(element.get("height", 1)), template.dpi))
        layer = render_element_layer(element, box_w, box_h, template.dpi, data, customer_photo_path)
        if layer is None:
            layer = Image.new("RGBA", (box_w, box_h), (0, 0, 0, 0))

        buffer = io.BytesIO()
        layer.save(buffer, format="PNG")
        return buffer.getvalue()

    def generate(
        self,
        customer_id: str,
        template_id: str,
        created_by: Optional[str],
        order_id: Optional[str] = None,
        field_image_overrides: Optional[FieldImageOverrides] = None,
    ) -> GeneratedCard:
        customer, template = self._load_customer_and_template(customer_id, template_id)
        front, back = self._render(customer, template, field_image_overrides)
        rgb_front = front.convert("RGB")
        rgb_back = back.convert("RGB") if back is not None else None

        output_dir = Path(settings.GENERATED_DIR) / customer_id
        output_dir.mkdir(parents=True, exist_ok=True)
        stem = f"{template_id}_{customer_id}"

        png_relative = f"{customer_id}/{stem}.png"
        jpg_relative = f"{customer_id}/{stem}.jpg"
        pdf_relative = f"{customer_id}/{stem}.pdf"
        back_png_relative = f"{customer_id}/{stem}_back.png" if rgb_back is not None else None
        back_jpg_relative = f"{customer_id}/{stem}_back.jpg" if rgb_back is not None else None

        front.save(Path(settings.GENERATED_DIR) / png_relative, format="PNG")
        rgb_front.save(Path(settings.GENERATED_DIR) / jpg_relative, format="JPEG", quality=95)

        if rgb_back is not None:
            back.save(Path(settings.GENERATED_DIR) / back_png_relative, format="PNG")
            rgb_back.save(Path(settings.GENERATED_DIR) / back_jpg_relative, format="JPEG", quality=95)
            # Two-page PDF — front then back — so a single download has
            # everything needed to print the card both-sided.
            rgb_front.save(
                Path(settings.GENERATED_DIR) / pdf_relative,
                format="PDF",
                resolution=float(template.dpi),
                save_all=True,
                append_images=[rgb_back],
            )
        else:
            rgb_front.save(
                Path(settings.GENERATED_DIR) / pdf_relative,
                format="PDF",
                resolution=float(template.dpi),
            )

        existing = (
            self.db.query(GeneratedCard)
            .filter(GeneratedCard.customer_id == customer_id, GeneratedCard.template_id == template_id)
            .order_by(GeneratedCard.created_at.desc())
            .first()
        )
        if existing:
            existing.png_path = png_relative
            existing.jpg_path = jpg_relative
            existing.pdf_path = pdf_relative
            existing.back_png_path = back_png_relative
            existing.back_jpg_path = back_jpg_relative
            if order_id:
                existing.order_id = order_id
            return self.card_repo.save(existing)

        card = GeneratedCard(
            customer_id=customer_id,
            template_id=template_id,
            order_id=order_id,
            png_path=png_relative,
            jpg_path=jpg_relative,
            pdf_path=pdf_relative,
            back_png_path=back_png_relative,
            back_jpg_path=back_jpg_relative,
            created_by=created_by,
        )
        return self.card_repo.create(card)

    def regenerate(self, card_id: str, created_by: Optional[str]) -> GeneratedCard:
        card = self.card_repo.get_by_id(card_id)
        if not card:
            raise GeneratedCardNotFoundError(card_id)
        return self.generate(card.customer_id, card.template_id, created_by, order_id=card.order_id)

    def get(self, card_id: str) -> GeneratedCard:
        card = self.card_repo.get_by_id(card_id)
        if not card:
            raise GeneratedCardNotFoundError(card_id)
        return card

    def list_for_customer(self, customer_id: str) -> list[GeneratedCard]:
        return self.card_repo.list_for_customer(customer_id)
