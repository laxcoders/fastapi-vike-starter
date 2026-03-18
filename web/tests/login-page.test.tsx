import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import LoginPage from "@/pages/login/+Page";

const mockLogin = vi.fn();
const mockGetMe = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/services/auth", () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
}));

vi.mock("vike/client/router", () => ({
  navigate: (...args: unknown[]) => mockNavigate(...args),
}));

function getEmailInput(): HTMLInputElement {
  return document.querySelector('input[type="email"]') as HTMLInputElement;
}

function getPasswordInput(): HTMLInputElement {
  return document.querySelector('input[type="password"]') as HTMLInputElement;
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(getEmailInput(), { target: { value: email } });
  fireEvent.change(getPasswordInput(), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders the login form", () => {
    render(<LoginPage />);

    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows loading state while submitting", async () => {
    mockLogin.mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);
    fillAndSubmit("test@example.com", "password");

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveTextContent("Signing in...");
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  it("calls login and navigates on success", async () => {
    const tokens = {
      access_token: "at",
      refresh_token: "rt",
      token_type: "bearer",
    };
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
    mockLogin.mockResolvedValue(tokens);
    mockGetMe.mockResolvedValue(user);
    mockNavigate.mockResolvedValue(undefined);

    render(<LoginPage />);
    fillAndSubmit("test@example.com", "password123");

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockGetMe).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  it("displays an error message on 401 login failure", async () => {
    const axiosError = Object.assign(new Error("401"), {
      isAxiosError: true,
      response: { status: 401 },
    });
    mockLogin.mockRejectedValue(axiosError);

    render(<LoginPage />);
    fillAndSubmit("bad@email.com", "wrong");

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
    });
  });
});
