"""
Business logic for documents: upload, retrieval, deletion, and driving the
OCR -> CustomerDetails pipeline. Supports an optional second ("back") file
per document — Aadhaar's address usually only appears on the back, so OCR
runs on both sides and the extracted fields are merged.
"""
from typing import Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.customer_details import CustomerDetails
from app.models.document import Document, DocumentStatus, DocumentType
from app.repositories.customer_details_repository import CustomerDetailsRepository
from app.repositories.document_repository import DocumentRepository
from app.services.ocr import get_ocr_provider
from app.services.ocr.base import OCRExtractionResult
from app.utils.file_storage import delete_stored_file, resolve_stored_path, save_upload_file


class DocumentNotFoundError(Exception):
    pass


def _merge_ocr_results(front: OCRExtractionResult, back: Optional[OCRExtractionResult]) -> OCRExtractionResult:
    """Prefers the front side's value for each field; falls back to the back
    side only where the front came up empty (e.g. address, which Aadhaar
    usually only prints on the back)."""
    if back is None:
        return front
    return OCRExtractionResult(
        name=front.name or back.name,
        name_local=front.name_local or back.name_local,
        dob=front.dob or back.dob,
        gender=front.gender or back.gender,
        address=front.address or back.address,
        address_local=front.address_local or back.address_local,
        document_number=front.document_number or back.document_number,
        vid_number=front.vid_number or back.vid_number,
        # issue_date is printed on the front, details_as_on on the back —
        # each only ever comes from one side, but "front or back" still
        # covers it either way without assuming which side has which.
        issue_date=front.issue_date or back.issue_date,
        details_as_on=front.details_as_on or back.details_as_on,
        fp_shop_no=front.fp_shop_no or back.fp_shop_no,
        village=front.village or back.village,
        mandal=front.mandal or back.mandal,
        district=front.district or back.district,
        raw_text=f"{front.raw_text or ''}\n{back.raw_text or ''}".strip(),
    )


class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = DocumentRepository(db)
        self.details_repo = CustomerDetailsRepository(db)

    def upload(
        self,
        customer_id: str,
        document_type: DocumentType,
        file: UploadFile,
        uploaded_by: Optional[str],
        back_file: Optional[UploadFile] = None,
    ) -> Document:
        relative_path, file_size, mime_type = save_upload_file(file, subdir=f"documents/{customer_id}")

        back_relative_path = back_mime_type = back_original_filename = None
        back_file_size = None
        if back_file is not None and back_file.filename:
            back_relative_path, back_file_size, back_mime_type = save_upload_file(
                back_file, subdir=f"documents/{customer_id}"
            )
            back_original_filename = back_file.filename

        document = Document(
            customer_id=customer_id,
            document_type=document_type,
            status=DocumentStatus.UPLOADED,
            original_filename=file.filename,
            stored_path=relative_path,
            mime_type=mime_type,
            file_size=file_size,
            back_original_filename=back_original_filename,
            back_stored_path=back_relative_path,
            back_mime_type=back_mime_type,
            back_file_size=back_file_size,
            uploaded_by=uploaded_by,
        )
        return self.repo.create(document)

    def get(self, document_id: str) -> Document:
        document = self.repo.get_by_id(document_id)
        if not document:
            raise DocumentNotFoundError(document_id)
        return document

    def list_for_customer(self, customer_id: Optional[str], page: int, page_size: int):
        return self.repo.list_for_customer(customer_id, page, page_size)

    def delete(self, document_id: str) -> None:
        document = self.get(document_id)
        delete_stored_file(document.stored_path)
        if document.back_stored_path:
            delete_stored_file(document.back_stored_path)
        self.repo.delete(document)

    def process(self, document_id: str, password: str | None = None) -> CustomerDetails:
        """
        Runs OCR against the stored file(s) and upserts a CustomerDetails
        row with whatever fields were found. Always returns an editable
        record, even if OCR found nothing or the provider isn't installed.
        `password` only matters for an encrypted PDF — every other file
        type ignores it.
        """
        document = self.get(document_id)
        document.status = DocumentStatus.PROCESSING
        document.processing_error = None
        self.repo.save(document)

        try:
            provider = get_ocr_provider()
            document_type_value = document.document_type.value if document.document_type else None
            front_result = provider.extract(
                str(resolve_stored_path(document.stored_path)), password=password, document_type=document_type_value
            )
            back_result = None
            if document.back_stored_path:
                back_result = provider.extract(
                    str(resolve_stored_path(document.back_stored_path)),
                    password=password,
                    document_type=document_type_value,
                )
            result = _merge_ocr_results(front_result, back_result)
        except Exception as exc:  # noqa: BLE001 - any OCR failure must not crash the request
            document.status = DocumentStatus.FAILED
            document.processing_error = str(exc)
            self.repo.save(document)
            raise

        document.status = DocumentStatus.PROCESSED
        document.ocr_raw_text = result.raw_text
        self.repo.save(document)

        existing = self.details_repo.get_by_document_id(document_id)
        if existing:
            existing.name = result.name
            existing.name_local = result.name_local
            existing.dob = result.dob
            existing.gender = result.gender
            existing.address = result.address
            existing.address_local = result.address_local
            existing.document_number = result.document_number
            existing.vid_number = result.vid_number
            existing.issue_date = result.issue_date
            existing.details_as_on = result.details_as_on
            existing.fp_shop_no = result.fp_shop_no
            existing.village = result.village
            existing.mandal = result.mandal
            existing.district = result.district
            existing.is_verified = False
            return self.details_repo.save(existing)

        details = CustomerDetails(
            customer_id=document.customer_id,
            document_id=document.id,
            name=result.name,
            name_local=result.name_local,
            dob=result.dob,
            gender=result.gender,
            address=result.address,
            address_local=result.address_local,
            document_number=result.document_number,
            vid_number=result.vid_number,
            issue_date=result.issue_date,
            details_as_on=result.details_as_on,
            fp_shop_no=result.fp_shop_no,
            village=result.village,
            mandal=result.mandal,
            district=result.district,
            is_verified=False,
        )
        return self.details_repo.create(details)
