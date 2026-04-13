"""Unit tests for the validation-error sanitizer.

The integration tests in ``tests/integration/test_error_sanitization.py``
prove the sanitizer is wired to FastAPI end-to-end. These unit tests cover
the shapes the auth routes don't naturally produce — nested locs, list-index
segments, mixed case, and the ``ctx``-stripping branch — so we don't silently
regress the matching logic when we add new fragments.
"""

from app.middleware.errors import (
    _REDACTED,
    SENSITIVE_FIELD_FRAGMENTS,
    _is_sensitive_loc,
    sanitize_validation_errors,
)


class TestIsSensitiveLoc:
    def test_empty_loc_is_not_sensitive(self) -> None:
        assert _is_sensitive_loc(()) is False

    def test_leaf_segment_matches(self) -> None:
        assert _is_sensitive_loc(("body", "password")) is True
        assert _is_sensitive_loc(("body", "access_token")) is True

    def test_ancestor_segment_matches(self) -> None:
        # Leaf is harmless ("format"), but an ancestor is sensitive.
        # Under a full-walk policy this redacts — the whole subtree is tainted.
        assert _is_sensitive_loc(("body", "api_key", "format")) is True
        assert _is_sensitive_loc(("body", "credentials", "password_hash")) is True

    def test_list_index_segments_are_ignored(self) -> None:
        # FastAPI emits ints for list-index positions. They should not trip
        # the matcher and should not break the walk either.
        assert _is_sensitive_loc(("body", "secrets", 0, "value")) is True
        assert _is_sensitive_loc(("body", "items", 0, "name")) is False

    def test_case_insensitive(self) -> None:
        assert _is_sensitive_loc(("body", "Password")) is True
        assert _is_sensitive_loc(("body", "AUTHORIZATION")) is True

    def test_non_sensitive_fields(self) -> None:
        assert _is_sensitive_loc(("body", "first_name")) is False
        assert _is_sensitive_loc(("body", "email")) is False
        assert _is_sensitive_loc(("body", "profile", "bio")) is False

    def test_every_fragment_is_actually_checked(self) -> None:
        # Guard against someone adding a fragment to the tuple but not
        # wiring it into the check (e.g. typo'd constant name).
        for fragment in SENSITIVE_FIELD_FRAGMENTS:
            assert _is_sensitive_loc(("body", fragment)) is True


class TestSanitizeValidationErrors:
    def test_redacts_input_when_leaf_is_sensitive(self) -> None:
        errors = [
            {
                "type": "string_too_short",
                "loc": ("body", "password"),
                "msg": "String should have at least 8 characters",
                "input": "hunt3r",
                "ctx": {"min_length": 8},
            }
        ]
        clean = sanitize_validation_errors(errors)
        assert clean[0]["input"] == _REDACTED
        assert "ctx" not in clean[0]

    def test_redacts_input_when_ancestor_is_sensitive(self) -> None:
        errors = [
            {
                "type": "string_type",
                "loc": ("body", "api_key", "format"),
                "msg": "Input should be a valid string",
                "input": "hex:deadbeef",
            }
        ]
        clean = sanitize_validation_errors(errors)
        assert clean[0]["input"] == _REDACTED
        # The rest of the error payload survives — only `input` is scrubbed.
        assert clean[0]["msg"] == "Input should be a valid string"
        assert clean[0]["loc"] == ("body", "api_key", "format")

    def test_preserves_input_for_non_sensitive_fields(self) -> None:
        errors = [
            {
                "type": "string_too_short",
                "loc": ("body", "first_name"),
                "msg": "String should have at least 1 character",
                "input": "",
            }
        ]
        clean = sanitize_validation_errors(errors)
        assert clean[0]["input"] == ""

    def test_drops_ctx_from_every_entry(self) -> None:
        errors = [
            {"type": "value_error", "loc": ("body", "email"), "ctx": {"error": "oops"}},
            {"type": "value_error", "loc": ("body", "age"), "ctx": {"error": "nope"}},
        ]
        clean = sanitize_validation_errors(errors)
        assert all("ctx" not in err for err in clean)

    def test_handles_empty_error_list(self) -> None:
        assert sanitize_validation_errors([]) == []
