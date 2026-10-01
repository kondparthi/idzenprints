"""
Template CRUD, duplication, and background-image upload. Uses the same
secure file storage as documents: private path, served only through an
authenticated endpoint.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.user import User
from app.schemas.template import TemplateCreate, TemplateOut, TemplateUpdate
from app.services.template_service import TemplateNotFoundError, TemplateService
from app.utils.file_storage import delete_stored_file, resolve_stored_path, save_upload_file

router = APIRouter(prefix="/api/templates", tags=["templates"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[TemplateOut])
def list_templates(
    card_type_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return TemplateService(db).list_templates(card_type_id)


@router.post("", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TemplateService(db).create_template(payload, created_by=current_user.id)


@router.get("/{template_id}", response_model=TemplateOut)
def get_template(template_id: str, db: Session = Depends(get_db)):
    try:
        return TemplateService(db).get_template(template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(template_id: str, payload: TemplateUpdate, db: Session = Depends(get_db)):
    try:
        return TemplateService(db).update_template(template_id, payload)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc


@router.post("/{template_id}/duplicate", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def duplicate_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return TemplateService(db).duplicate_template(template_id, created_by=current_user.id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: str, db: Session = Depends(get_db)):
    try:
        TemplateService(db).delete_template(template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc


def _validate_side(side: str) -> str:
    if side not in ("front", "back"):
        raise HTTPException(status_code=400, detail="side must be 'front' or 'back'")
    return side


@router.post("/{template_id}/background", response_model=TemplateOut)
def upload_background(
    template_id: str,
    file: UploadFile = File(...),
    side: str = Query(default="front"),
    db: Session = Depends(get_db),
):
    _validate_side(side)
    service = TemplateService(db)
    try:
        template = service.get_template(template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc

    path_field = "background_path" if side == "front" else "back_background_path"
    existing_path = getattr(template, path_field)
    if existing_path:
        delete_stored_file(existing_path)

    relative_path, _size, _mime = save_upload_file(file, subdir=f"templates/{template_id}/{side}")
    setattr(template, path_field, relative_path)
    return service.repo.save(template)


@router.get("/{template_id}/background/file")
def get_background_file(template_id: str, side: str = Query(default="front"), db: Session = Depends(get_db)):
    _validate_side(side)
    try:
        template = TemplateService(db).get_template(template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found") from exc

    path_field = "background_path" if side == "front" else "back_background_path"
    relative_path = getattr(template, path_field)
    if not relative_path:
        raise HTTPException(status_code=404, detail=f"This template has no {side} background image")

    path = resolve_stored_path(relative_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path)
