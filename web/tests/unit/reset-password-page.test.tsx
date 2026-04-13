import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ResetPasswordPage from "@/pages/reset-password/+Page";

const mockResetPassword = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/services/auth", () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));

vi.mock("vike/client/router", () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    // Set token in URL
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?token=test-reset-token" },
      writable: true,
      configurable: true,
    });
  });

  it("renders the reset password form", () => {
    render(<ResetPasswordPage />);
    const passwords = document.querySelectorAll('input[type="password"]');
    expect(passwords.length).toBe(2);
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows error when passwords don't match", async () => {
    render(<ResetPasswordPage />);
    const passwords = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwords[0], { target: { value: "newpassword1" } });
    fireEvent.change(passwords[1], { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("calls resetPassword and navigates to login on success", async () => {
    mockResetPassword.mockResolvedValue({ message: "ok" });
    mockNavigate.mockResolvedValue(undefined);

    render(<ResetPasswordPage />);
    const passwords = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwords[0], { target: { value: "newpassword123" } });
    fireEvent.change(passwords[1], { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith("test-reset-token", "newpassword123");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("shows error on invalid token", async () => {
    mockResetPassword.mockRejectedValue(new Error("400"));

    render(<ResetPasswordPage />);
    const passwords = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwords[0], { target: { value: "newpassword123" } });
    fireEvent.change(passwords[1], { target: { value: "newpassword123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired/i)).toBeInTheDocument();
    });
  });
});
