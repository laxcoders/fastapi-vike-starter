"""Email service abstraction.

Supports Resend, SMTP, and a console backend for dev/testing.
Swap implementations by changing EMAIL_BACKEND in settings.
"""

import abc
import asyncio
from dataclasses import dataclass
from typing import Any

import structlog

from app.config import settings

logger = structlog.get_logger()

_backend: "EmailBackend | None" = None


@dataclass(frozen=True)
class EmailMessage:
    to: str | list[str]
    subject: str
    html: str
    from_email: str | None = None
    reply_to: str | None = None


class EmailBackend(abc.ABC):
    """Abstract email backend."""

    @abc.abstractmethod
    async def send(self, message: EmailMessage) -> dict[str, Any]: ...


class ResendBackend(EmailBackend):
    """Send emails via Resend API."""

    def __init__(self) -> None:
        import resend

        resend.api_key = settings.resend_api_key
        self._resend = resend

    async def send(self, message: EmailMessage) -> dict[str, Any]:
        resend = self._resend

        to = message.to if isinstance(message.to, list) else [message.to]
        from_email = message.from_email or settings.email_from

        params: dict[str, Any] = {
            "from": from_email,
            "to": to,
            "subject": message.subject,
            "html": message.html,
        }
        if message.reply_to:
            params["reply_to"] = message.reply_to

        # resend.Emails.send is synchronous — run in executor to avoid blocking the event loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, lambda: resend.Emails.send(params))

        logger.info("email_sent", to=to, subject=message.subject)
        return dict(result) if not isinstance(result, dict) else result


class SmtpBackend(EmailBackend):
    """Send emails via SMTP (works with any provider)."""

    async def send(self, message: EmailMessage) -> dict[str, Any]:
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        import aiosmtplib

        from_email = message.from_email or settings.email_from
        to = message.to if isinstance(message.to, list) else [message.to]

        msg = MIMEMultipart("alternative")
        msg["From"] = from_email
        msg["To"] = ", ".join(to)
        msg["Subject"] = message.subject
        if message.reply_to:
            msg["Reply-To"] = message.reply_to
        msg.attach(MIMEText(message.html, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username or None,
            password=settings.smtp_password or None,
            start_tls=settings.smtp_use_tls,
        )

        logger.info("email_sent_smtp", to=to, subject=message.subject)
        return {"id": "smtp", "status": "sent"}


class ConsoleBackend(EmailBackend):
    """Print emails to console — for dev/testing."""

    async def send(self, message: EmailMessage) -> dict[str, Any]:
        print(f"\n{'=' * 60}")  # noqa: T201
        print("  EMAIL (console backend)")  # noqa: T201
        print(f"  To:      {message.to}")  # noqa: T201
        print(f"  Subject: {message.subject}")  # noqa: T201
        print(f"  HTML:    {message.html[:500]}")  # noqa: T201
        print(f"{'=' * 60}\n")  # noqa: T201
        return {"id": "console", "status": "sent"}


def get_email_backend() -> EmailBackend:
    """Factory: returns a cached email backend singleton."""
    global _backend
    if _backend is None:
        if settings.email_backend == "resend":
            _backend = ResendBackend()
        elif settings.email_backend == "smtp":
            _backend = SmtpBackend()
        else:
            _backend = ConsoleBackend()
    return _backend


async def send_email(message: EmailMessage) -> dict[str, Any]:
    """Convenience function: send an email using the configured backend."""
    backend = get_email_backend()
    return await backend.send(message)
