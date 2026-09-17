from sqlalchemy.orm import Session

from app.models.tag import Tag
from app.repositories.tag_repository import TagRepository
from app.schemas.tag import TagCreate
from app.utils.slugify import slugify


class TagService:
    def __init__(self, db: Session):
        self.repo = TagRepository(db)

    def list_tags(self) -> list[Tag]:
        return self.repo.list()

    def get_or_create_by_names(self, names: list[str]) -> list[Tag]:
        """Used by the product form's free-text tag input — any name that
        doesn't already exist becomes a new tag."""
        tags = []
        for name in names:
            name = name.strip()
            if not name:
                continue
            existing = self.repo.get_by_name(name)
            tags.append(existing or self.repo.create(Tag(name=name, slug=slugify(name))))
        return tags

    def create_tag(self, data: TagCreate) -> Tag:
        existing = self.repo.get_by_name(data.name)
        if existing:
            return existing
        return self.repo.create(Tag(name=data.name, slug=slugify(data.name)))
