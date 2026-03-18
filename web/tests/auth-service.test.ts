import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { login, getMe, refreshToken, register, verifyEmail, forgotPassword, resetPassword } from "@/services/auth";
import apiClient from "@/services/client";

vi.mock("@/services/client", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

const mockedPost = apiClient.post as Mock;
const mockedGet = apiClient.get as Mock;

describe("auth service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("login", () => {
    it("posts credentials to /auth/login and returns tokens", async () => {
      const tokens = {
        access_token: "at",
        refresh_token: "rt",
        token_type: "bearer",
      };
      mockedPost.mockResolvedValue({ data: tokens });

      const result = await login("test@example.com", "password123");

      expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
      expect(result).toEqual(tokens);
    });

    it("propagates errors from the API", async () => {
      mockedPost.mockRejectedValue(new Error("401"));
      await expect(login("bad@email.com", "wrong")).rejects.toThrow("401");
    });
  });

  describe("getMe", () => {
    it("fetches the current user from /users/me", async () => {
      const user = {
        id: "1",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        role: "user",
        is_active: true,
        email_verified: true,
        created_at: "2026-01-01T00:00:00Z",
      };
      mockedGet.mockResolvedValue({ data: user });

      const result = await getMe();

      expect(mockedGet).toHaveBeenCalledWith("/users/me");
      expect(result).toEqual(user);
    });
  });

  describe("refreshToken", () => {
    it("posts refresh token to /auth/refresh and returns new tokens", async () => {
      const tokens = {
        access_token: "new_at",
        refresh_token: "new_rt",
        token_type: "bearer",
      };
      mockedPost.mockResolvedValue({ data: tokens });

      const result = await refreshToken("old_rt");

      expect(mockedPost).toHaveBeenCalledWith("/auth/refresh", {
        refresh_token: "old_rt",
      });
      expect(result).toEqual(tokens);
    });
  });

  describe("register", () => {
    it("posts registration data and returns response", async () => {
      const response = { message: "Check your email", requires_verification: true };
      mockedPost.mockResolvedValue({ data: response });

      const result = await register("new@example.com", "New", "User", "password123");

      expect(mockedPost).toHaveBeenCalledWith("/auth/register", {
        email: "new@example.com",
        first_name: "New",
        last_name: "User",
        password: "password123",
      });
      expect(result).toEqual(response);
    });
  });

  describe("verifyEmail", () => {
    it("posts token to /auth/verify-email", async () => {
      const response = { message: "Email verified successfully" };
      mockedPost.mockResolvedValue({ data: response });

      const result = await verifyEmail("test-token");

      expect(mockedPost).toHaveBeenCalledWith("/auth/verify-email", { token: "test-token" });
      expect(result).toEqual(response);
    });
  });

  describe("forgotPassword", () => {
    it("posts email to /auth/forgot-password", async () => {
      const response = { message: "If an account exists, we sent a reset link" };
      mockedPost.mockResolvedValue({ data: response });

      const result = await forgotPassword("test@example.com");

      expect(mockedPost).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "test@example.com",
      });
      expect(result).toEqual(response);
    });
  });

  describe("resetPassword", () => {
    it("posts token and new password to /auth/reset-password", async () => {
      const response = { message: "Password reset successfully" };
      mockedPost.mockResolvedValue({ data: response });

      const result = await resetPassword("reset-token", "newpassword123");

      expect(mockedPost).toHaveBeenCalledWith("/auth/reset-password", {
        token: "reset-token",
        password: "newpassword123",
      });
      expect(result).toEqual(response);
    });
  });
});
