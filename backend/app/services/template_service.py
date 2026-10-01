"""
Business logic for templates, including duplication — copies the full
element layout so an operator can start a new design from an existing one
without touching the original.
"""
from sqlalchemy.orm import Session

from app.models.template import Template
from app.repositories.template_repository import TemplateRepository
from app.schemas.template import TemplateCreate, TemplateUpdate


class TemplateNotFoundError(Exception):
    pass


class TemplateService:
    def __init__(self, db: Session):
        self.repo = TemplateRepository(db)

    def list_templates(self, card_type_id: str | None, include_inactive: bool = True) -> list[Template]:
        return self.repo.list(card_type_id, include_inactive)

    def get_template(self, template_id: str) -> Template:
        template = self.repo.get_by_id(template_id)
        if not template:
            raise TemplateNotFoundError(template_id)
        return template

    def create_template(self, data: TemplateCreate, created_by: str) -> Template:
        template = Template(**data.model_dump(), created_by=created_by)
        return self.repo.create(template)

    def update_template(self, template_id: str, data: TemplateUpdate) -> Template:
        template = self.get_template(template_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(template, field, value)
        return self.repo.save(template)

    def duplicate_template(self, template_id: str, created_by: str) -> Template:
        source = self.get_template(template_id)
        copy = Template(
            name=f"{source.name} (copy)",
            card_type_id=source.card_type_id,
            width_mm=source.width_mm,
            height_mm=source.height_mm,
            dpi=source.dpi,
            background_path=source.background_path,
            elements=source.elements,
            back_background_path=source.back_background_path,
            back_elements=source.back_elements,
            is_active=False,
            created_by=created_by,
        )
        return self.repo.create(copy)

    def delete_template(self, template_id: str) -> None:
        self.repo.delete(self.get_template(template_id))
