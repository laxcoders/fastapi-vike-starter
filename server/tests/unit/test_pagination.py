from app.utils.pagination import PaginatedResponse, PaginationParams


class TestPaginationParams:
    def test_defaults(self) -> None:
        p = PaginationParams(page=1, limit=20)
        assert p.page == 1
        assert p.limit == 20
        assert p.offset == 0

    def test_custom_page(self) -> None:
        p = PaginationParams(page=3, limit=10)
        assert p.page == 3
        assert p.limit == 10
        assert p.offset == 20


class TestPaginatedResponse:
    def test_has_more_true(self) -> None:
        resp = PaginatedResponse.create(items=["a", "b"], total=50, page=1, limit=20)
        assert resp.has_more is True
        assert resp.total == 50
        assert resp.page == 1
        assert resp.limit == 20

    def test_has_more_false_on_last_page(self) -> None:
        resp = PaginatedResponse.create(items=["a"], total=21, page=2, limit=20)
        assert resp.has_more is False

    def test_has_more_false_when_exact(self) -> None:
        resp = PaginatedResponse.create(items=["a"] * 20, total=20, page=1, limit=20)
        assert resp.has_more is False

    def test_empty_results(self) -> None:
        resp = PaginatedResponse.create(items=[], total=0, page=1, limit=20)
        assert resp.has_more is False
        assert resp.items == []
        assert resp.total == 0
