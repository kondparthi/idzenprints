"""
SMTP email sending (order confirmations + invoice), via Gmail's SMTP
relay. Uses Python's standard smtplib/email — no extra dependency —
since Gmail SMTP over STARTTLS on port 587 is a well-supported, stable
target and doesn't need a heavier mail library.

Credentials come from Settings (backed by .env), never hard-coded here.
A missing SMTP_USER/SMTP_PASSWORD means email sending is silently
skipped rather than crashing the order flow — a guest's order must
still succeed even if email delivery isn't configured yet.
"""
import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config.settings import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.settings = get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.SMTP_USER and self.settings.SMTP_PASSWORD)

    def send(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        attachment_bytes: bytes | None = None,
        attachment_filename: str | None = None,
    ) -> bool:
        """Returns True if the email was actually sent, False if SMTP
        isn't configured or sending failed — callers should treat a
        False return as "logged, not fatal", never as a reason to fail
        the caller's own operation (e.g. placing an order)."""
        if not self.is_configured:
            logger.warning("SMTP not configured (SMTP_USER/SMTP_PASSWORD unset) — skipping email to %s", to_email)
            return False

        message = MIMEMultipart()
        message["From"] = f"{self.settings.SMTP_FROM_NAME} <{self.settings.SMTP_USER}>"
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(html_body, "html"))

        if attachment_bytes and attachment_filename:
            part = MIMEApplication(attachment_bytes, Name=attachment_filename)
            part["Content-Disposition"] = f'attachment; filename="{attachment_filename}"'
            message.attach(part)

        try:
            with smtplib.SMTP(self.settings.SMTP_HOST, self.settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(self.settings.SMTP_USER, self.settings.SMTP_PASSWORD)
                server.sendmail(self.settings.SMTP_USER, [to_email], message.as_string())
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            return False
