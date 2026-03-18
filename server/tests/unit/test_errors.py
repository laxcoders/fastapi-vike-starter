from app.middleware.errors import ErrorResponse, error_response


class TestErrorResponse:
    def test_error_response_json(self) -> None:
        resp = error_response(code="NotFound", message="User not found", status_code=404)
        assert resp.status_code == 404
        body = resp.body.decode()
        assert '"code":"NotFound"' in body
        assert '"message":"User not found"' in body

    def test_error_response_with_detail(self) -> None:
        resp = error_response(
            code="ValidationError",
            message="Bad request",
            status_code=422,
            detail=[{"field": "email", "msg": "invalid"}],
        )
        assert resp.status_code == 422
        body = resp.body.decode()
        assert "email" in body

    def test_error_response_model(self) -> None:
        from app.middleware.errors import ErrorDetail

        model = ErrorResponse(error=ErrorDetail(code="Test", message="msg"))
        dumped = model.model_dump()
        assert dumped["error"]["code"] == "Test"
        assert dumped["error"]["message"] == "msg"
        assert dumped["error"]["detail"] is None
