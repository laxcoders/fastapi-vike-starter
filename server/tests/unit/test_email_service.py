from app.services.email_service import ConsoleBackend, EmailMessage, get_email_backend


class TestEmailMessage:
    def test_create_message(self) -> None:
        msg = EmailMessage(
            to="test@example.com",
            subject="Welcome",
            html="<h1>Hi</h1>",
        )
        assert msg.to == "test@example.com"
        assert msg.subject == "Welcome"
        assert msg.from_email is None

    def test_message_with_list_of_recipients(self) -> None:
        msg = EmailMessage(
            to=["a@example.com", "b@example.com"],
            subject="Batch",
            html="<p>Hello</p>",
        )
        assert len(msg.to) == 2


class TestConsoleBackend:
    async def test_send_returns_success(self) -> None:
        backend = ConsoleBackend()
        result = await backend.send(
            EmailMessage(to="test@example.com", subject="Test", html="<p>Test</p>")
        )
        assert result["status"] == "sent"
        assert result["id"] == "console"


class TestGetEmailBackend:
    def test_default_is_console(self) -> None:
        backend = get_email_backend()
        assert isinstance(backend, ConsoleBackend)
