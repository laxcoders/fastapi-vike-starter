"""Edge case tests for email service."""

from unittest.mock import MagicMock, patch

from app.services.email_service import (
    EmailMessage,
    ResendBackend,
    get_email_backend,
    send_email,
)


class TestSendEmail:
    async def test_send_email_uses_console_backend(self) -> None:
        """send_email should use the configured backend."""
        import app.services.email_service

        original = app.services.email_service._backend
        app.services.email_service._backend = None
        try:
            result = await send_email(
                EmailMessage(to="test@example.com", subject="Test", html="<p>Hi</p>")
            )
            assert result["status"] == "sent"
        finally:
            app.services.email_service._backend = original


class TestResendBackend:
    async def test_send_runs_in_executor(self) -> None:
        """ResendBackend.send should not block the event loop."""
        mock_resend = MagicMock()
        mock_resend.Emails.send.return_value = {"id": "re_123"}

        with patch.dict("sys.modules", {"resend": mock_resend}):
            rb = ResendBackend.__new__(ResendBackend)
            rb._resend = mock_resend

            await rb.send(
                EmailMessage(
                    to="test@example.com",
                    subject="Test",
                    html="<p>Content</p>",
                    reply_to="reply@example.com",
                )
            )
            assert mock_resend.Emails.send.called


class TestGetEmailBackend:
    def test_singleton_caching(self) -> None:
        """get_email_backend should return the same instance on repeated calls."""
        import app.services.email_service

        original = app.services.email_service._backend
        app.services.email_service._backend = None
        try:
            b1 = get_email_backend()
            b2 = get_email_backend()
            assert b1 is b2
        finally:
            app.services.email_service._backend = original
