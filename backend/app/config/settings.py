"""
Central application settings, loaded from environment variables / .env.
Never hard-code secrets here — every sensitive value comes from the environment.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    ENV: str = "development"
    APP_NAME: str = "PVC Card Printing & Generator"

    # Database
    DATABASE_URL: str

    # Auth
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # File storage
    UPLOAD_DIR: str = "./storage/uploads"
    GENERATED_DIR: str = "./storage/generated"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB

    # OCR (used from Phase 2 onward)
    OCR_PROVIDER: str = ""
    OCR_API_KEY: str = ""
    # Explicit path to the tesseract binary (e.g. tesseract.exe on Windows).
    # Only needed if it's not on PATH and not at one of the default install
    # locations the app already checks automatically — see
    # app/services/ocr/tesseract_provider.py.
    TESSERACT_CMD: str = ""
    # Tesseract language pack(s) to use, e.g. "eng+tel+hin" for English +
    # Telugu + Hindi. IMPORTANT: every language listed here must actually
    # be installed (each regional pack is a separate download from the
    # Tesseract binary itself — see the README's OCR setup section) or
    # Tesseract errors on the *entire* request, not just the missing
    # language. The app falls back to "eng" automatically if a requested
    # language pack is missing, so this is safe to experiment with, but
    # installing the pack is what actually gets you regional-script
    # extraction.
    OCR_LANGUAGES: str = "eng+tel+hin"

    # CORS - comma separated list of allowed origins
    CORS_ORIGINS: str = "http://localhost:5173"

    # SMTP (order confirmation emails + invoice). Never hard-code the
    # password here — it belongs in .env only, and .env is already
    # gitignored throughout this project.
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "IDZEN Prints"
    # Where a copy of every order notification goes, in addition to the
    # customer — defaults to SMTP_USER if not set separately.
    ADMIN_NOTIFICATION_EMAIL: str = ""

    @property
    def admin_email(self) -> str:
        return self.ADMIN_NOTIFICATION_EMAIL or self.SMTP_USER

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
