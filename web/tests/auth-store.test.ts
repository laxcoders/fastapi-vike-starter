import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "@/stores/auth-store";

// jsdom doesn't implement document.cookie deletion via max-age=0,
// so we reset it manually between tests.
function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const key = c.split("=")[0].trim();
    document.cookie = `${key}=; max-age=0`;
  });
}

describe("auth store", () => {
  beforeEach(() => {
    clearCookies();
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it("starts unauthenticated with no token", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it("setUser marks as authenticated", () => {
    const mockUser = {
      id: "123",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "user" as const,
      is_active: true,
      email_verified: true,
      created_at: "2026-01-01T00:00:00Z",
    };

    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe("test@example.com");
  });

  it("logout clears user and tokens", () => {
    document.cookie = "access_token=test; path=/";
    document.cookie = "refresh_token=test; path=/";

    useAuthStore.getState().setUser({
      id: "123",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "user",
      is_active: true,
      email_verified: true,
      created_at: "2026-01-01T00:00:00Z",
    });

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    // Cookies cleared — key should not appear in document.cookie
    expect(document.cookie).not.toContain("access_token=test");
    expect(document.cookie).not.toContain("refresh_token=test");
  });
});
