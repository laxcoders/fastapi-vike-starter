import uuid

from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_and_verify(self) -> None:
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed)

    def test_wrong_password_fails(self) -> None:
        hashed = hash_password("mypassword")
        assert not verify_password("wrongpassword", hashed)

    def test_hash_is_not_plaintext(self) -> None:
        hashed = hash_password("mypassword")
        assert hashed != "mypassword"


class TestTokens:
    def test_create_and_decode_access_token(self) -> None:
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "access"

    def test_create_and_decode_refresh_token(self) -> None:
        user_id = uuid.uuid4()
        token = create_refresh_token(user_id)
        payload = decode_token(token)
        assert payload["sub"] == str(user_id)
        assert payload["type"] == "refresh"

    def test_invalid_token_raises(self) -> None:
        import pytest

        with pytest.raises(ValueError, match="Invalid token"):
            decode_token("garbage.token.value")
