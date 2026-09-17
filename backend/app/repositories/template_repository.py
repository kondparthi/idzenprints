from typing import Optional

from sqlalchemy.orm import Session

from app.models.template import Template


class TemplateRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, template_id: str) -> Optional[Template]:
        return self.db.query(Template).filter(Template.id == template_id).first()

    def list(self, card_type_id: Optional[str], include_inactive: bool) -> list[Template]:
        query = self.db.query(Template)
        if card_type_id:
            query = query.filter(Template.card_type_id == card_type_id)
        if not include_inactive:
            query = query.filter(Template.is_active.is_(True))
        return query.order_by(Template.created_at.desc()).all()

    def create(self, template: Template) -> Template:
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        return template

    def save(self, template: Template) -> Template:
        self.db.commit()
        self.db.refresh(template)
        return template

    def delete(self, template: Template) -> None:
        self.db.delete(template)
        self.db.commit()
