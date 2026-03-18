"""Tests for role-based access control."""

from fastapi import APIRouter, Depends
from httpx import AsyncClient

from app.dependencies import require_role
from app.main import app
from app.models.user import User, UserRole

# Create a test-only admin endpoint
test_router = APIRouter(prefix="/api/test")


@test_router.get("/admin-only")
async def admin_only_endpoint(
    user: User = Depends(require_role(UserRole.ADMIN)),
) -> dict:
    return {"message": "admin access granted", "user": user.email}


# Register the test router
app.include_router(test_router)


async def test_admin_can_access_admin_endpoint(
    client: AsyncClient, admin_user: User, admin_headers: dict
) -> None:
    response = await client.get("/api/test/admin-only", headers=admin_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "admin access granted"


async def test_am_cannot_access_admin_endpoint(
    client: AsyncClient, test_user: User, auth_headers: dict
) -> None:
    response = await client.get("/api/test/admin-only", headers=auth_headers)
    assert response.status_code == 403


async def test_unauthenticated_cannot_access_admin_endpoint(
    client: AsyncClient,
) -> None:
    response = await client.get("/api/test/admin-only")
    assert response.status_code == 401
