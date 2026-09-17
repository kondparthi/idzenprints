"""
Document upload, retrieval, deletion, and OCR-processing endpoints.
The raw file is never exposed at a public URL — /file streams it back
through this authenticated API only.
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.auth_middleware import get_current_user
from app.models.document import DocumentType
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.customer_details import CustomerDetailsOut
from app.schemas.document import DocumentOut
from app.services.document_service import DocumentNotFoundError, DocumentService
from app.utils.audit import record as record_audit
from app.utils.file_storage import resolve_stored_path

router = APIRouter(prefix="/api/documents", tags=["documents"], dependencies=[Depends(get_current_user)])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    customer_id: str = Form(...),
    document_type: DocumentType = Form(...),
    file: UploadFile = File(...),
    back_file: UploadFile | None = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = DocumentService(db)
    return service.upload(customer_id, document_type, file, uploaded_by=current_user.id, back_file=back_file)


@router.get("", response_model=PaginatedResponse[DocumentOut])
def list_documents(
    customer_id: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    service = DocumentService(db)
    items, total = service.list_for_customer(customer_id, page, page_size)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: str, db: Session = Depends(get_db)):
    try:
        return DocumentService(db).get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc


@router.get("/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    try:
        document = DocumentService(db).get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc

    path = resolve_stored_path(document.stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path, media_type=document.mime_type, filename=document.original_filename)


@router.get("/{document_id}/back-file")
def get_document_back_file(document_id: str, db: Session = Depends(get_db)):
    try:
        document = DocumentService(db).get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc

    if not document.back_stored_path:
        raise HTTPException(status_code=404, detail="This document has no back-side file")

    path = resolve_stored_path(document.back_stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing")
    return FileResponse(path, media_type=document.back_mime_type, filename=document.back_original_filename)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        DocumentService(db).delete(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc
    record_audit(db, current_user.id, "delete", "document", document_id)


@router.post("/{document_id}/process", response_model=CustomerDetailsOut)
def process_document(document_id: str, db: Session = Depends(get_db)):
    try:
        service = DocumentService(db)
        return service.process(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=422, detail=f"OCR processing failed: {exc}") from exc
