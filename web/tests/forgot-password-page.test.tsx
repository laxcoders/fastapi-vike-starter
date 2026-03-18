import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ForgotPasswordPage from "@/pages/forgot-password/+Page";

const mockForgotPassword = vi.fn();

vi.mock("@/services/auth", () => ({
  forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders the forgot password form", () => {
    render(<ForgotPasswordPage />);
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows success message after submission", async () => {
    mockForgotPassword.mockResolvedValue({ message: "ok" });

    render(<ForgotPasswordPage />);
    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });

  it("shows success even when API fails (anti-enumeration)", async () => {
    mockForgotPassword.mockRejectedValue(new Error("500"));

    render(<ForgotPasswordPage />);
    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "nobody@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("has link to login page", () => {
    render(<ForgotPasswordPage />);
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
  });
});
