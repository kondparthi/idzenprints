"""
Secure file storage for uploaded documents.

Files are saved under settings.UPLOAD_DIR with a random name — never the
customer's original filename — and are only ever served back through an
authenticated API endpoint, never a public static path.
"""
import mimetypes
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image

from app.config.settings import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return ext


def read_validated_upload(upload_file: UploadFile) -> tuple[bytes, str, str]:
    """
    Validates an uploaded file (name, extension, content type, size) and
    returns (contents, extension, mime_type) without saving it anywhere.
    Raises HTTPException on validation failure.
    """
    if not upload_file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    ext = _validate_extension(upload_file.filename)

    mime_type = upload_file.content_type or mimetypes.guess_type(upload_file.filename)[0]
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{mime_type}'",
        )

    contents = upload_file.file.read()
    file_size = len(contents)
    if file_size == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")
    if file_size > settings.MAX_FILE_SIZE:
        max_kb = settings.MAX_FILE_SIZE / 1024
        limit_text = f"{max_kb / 1024:.0f} MB" if max_kb >= 1024 else f"{max_kb:.0f} KB"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds the maximum allowed size of {limit_text}",
        )

    return contents, ext, mime_type or "application/octet-stream"


def save_upload_file(upload_file: UploadFile, subdir: str) -> tuple[str, int, str]:
    """
    Validates and saves an uploaded file.

    Returns (stored_path_relative_to_UPLOAD_DIR, file_size_bytes, mime_type).
    Raises HTTPException on validation failure.
    """
    contents, ext, mime_type = read_validated_upload(upload_file)

    target_dir = Path(settings.UPLOAD_DIR) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    stored_filename = f"{uuid.uuid4().hex}{ext}"
    absolute_path = target_dir / stored_filename
    absolute_path.write_bytes(contents)

    relative_path = str(Path(subdir) / stored_filename)
    return relative_path, len(contents), mime_type


def save_pil_image(image: "Image.Image", subdir: str) -> str:
    """Saves a Pillow image as a PNG under UPLOAD_DIR with a random name and
    returns its path relative to UPLOAD_DIR."""
    target_dir = Path(settings.UPLOAD_DIR) / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}.png"
    image.save(target_dir / stored_filename, format="PNG")
    return str(Path(subdir) / stored_filename)


def resolve_stored_path(relative_path: str) -> Path:
    return Path(settings.UPLOAD_DIR) / relative_path


def delete_stored_file(relative_path: str) -> None:
    path = resolve_stored_path(relative_path)
    if path.exists():
        path.unlink()
