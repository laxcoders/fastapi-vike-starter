from httpx import AsyncClient


async def test_health_check(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    # In test env, postgres (sqlite) is ok but redis may not be running
    assert data["status"] in ("ok", "degraded")
