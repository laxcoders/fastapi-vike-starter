import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import VerifyEmailPage from "@/pages/verify-email/+Page";

const mockVerifyEmail = vi.fn();

vi.mock("@/services/auth", () => ({
  verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("shows loading state initially", () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?token=test-token" },
      writable: true,
      configurable: true,
    });
    mockVerifyEmail.mockReturnValue(new Promise(() => {}));

    render(<VerifyEmailPage />);
    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
  });

  it("shows success after verification", async () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?token=valid-token" },
      writable: true,
      configurable: true,
    });
    mockVerifyEmail.mockResolvedValue({ message: "Email verified successfully" });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /email verified/i })).toBeInTheDocument();
      expect(mockVerifyEmail).toHaveBeenCalledWith("valid-token");
    });
  });

  it("shows error on invalid token", async () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?token=bad-token" },
      writable: true,
      configurable: true,
    });
    mockVerifyEmail.mockRejectedValue(new Error("400"));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
    });
  });

  it("shows error when no token in URL", async () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "" },
      writable: true,
      configurable: true,
    });

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/missing verification token/i)).toBeInTheDocument();
    });
  });
});
