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
from app.services.card_rendering.renderer import render_template
from app.utils.file_storage import resolve_stored_path

settings = get_settings()


class CustomerNotFoundError(Exception):
    pass


class TemplateNotFoundError(Exception):
    pass


class GeneratedCardNotFoundError(Exception):
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

    def _render(self, customer: Customer, template: Template) -> Image.Image:
        details = self._latest_verified_details(customer.id)
        data = resolve_card_variables(customer, details)

        background_image = None
        if template.background_path:
            bg_path = resolve_stored_path(template.background_path)
            if bg_path.exists():
                background_image = Image.open(bg_path)

        customer_photo_path: Optional[Path] = None
        if details and details.photo_path:
            candidate = resolve_stored_path(details.photo_path)
            if candidate.exists():
                customer_photo_path = candidate

        return render_template(
            width_mm=template.width_mm,
            height_mm=template.height_mm,
            dpi=template.dpi,
            elements=template.elements or [],
            data=data,
            background_image=background_image,
            customer_photo_path=customer_photo_path,
        )

    def preview_png_bytes(self, customer_id: str, template_id: str) -> bytes:
        customer, template = self._load_customer_and_template(customer_id, template_id)
        image = self._render(customer, template)
        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        return buffer.getvalue()

    def generate(self, customer_id: str, template_id: str, created_by: Optional[str], order_id: Optional[str] = None) -> GeneratedCard:
        customer, template = self._load_customer_and_template(customer_id, template_id)
        image = self._render(customer, template)
        rgb_image = image.convert("RGB")

        output_dir = Path(settings.GENERATED_DIR) / customer_id
        output_dir.mkdir(parents=True, exist_ok=True)
        stem = f"{template_id}_{customer_id}"

        png_relative = f"{customer_id}/{stem}.png"
        jpg_relative = f"{customer_id}/{stem}.jpg"
        pdf_relative = f"{customer_id}/{stem}.pdf"

        image.save(Path(settings.GENERATED_DIR) / png_relative, format="PNG")
        rgb_image.save(Path(settings.GENERATED_DIR) / jpg_relative, format="JPEG", quality=95)
        rgb_image.save(
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
