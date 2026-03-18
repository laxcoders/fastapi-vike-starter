from httpx import AsyncClient

from app.models.user import User


async def test_login_success(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient, test_user: User) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever"},
    )
    assert response.status_code == 401


async def test_refresh_token(client: AsyncClient, test_user: User) -> None:
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    response = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


async def test_get_me(client: AsyncClient, test_user: User, auth_headers: dict) -> None:
    response = await client.get("/api/users/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"
    assert data["role"] == "user"


async def test_get_me_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/users/me")
    assert response.status_code == 401  # No bearer token


async def test_get_me_invalid_token(client: AsyncClient) -> None:
    response = await client.get(
        "/api/users/me",
        headers={"Authorization": "Bearer invalid.token.here"},
    )
    assert response.status_code == 401
