"""Tests for custom exceptions."""

from app.utils.exceptions import AppError, AuthenticationError, NotFoundError


class TestExceptions:
    def test_app_error(self) -> None:
        err = AppError("something broke", status_code=500)
        assert err.message == "something broke"
        assert err.status_code == 500
        assert str(err) == "something broke"

    def test_not_found_error(self) -> None:
        err = NotFoundError("Client")
        assert err.message == "Client not found"
        assert err.status_code == 404

    def test_authentication_error(self) -> None:
        err = AuthenticationError()
        assert err.status_code == 401
        assert err.message == "Authentication failed"

    def test_authentication_error_custom_message(self) -> None:
        err = AuthenticationError("Token expired")
        assert err.message == "Token expired"
