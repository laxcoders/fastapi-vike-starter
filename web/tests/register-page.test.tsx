import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import RegisterPage from "@/pages/register/+Page";

const mockRegister = vi.fn();

vi.mock("@/services/auth", () => ({
  register: (...args: unknown[]) => mockRegister(...args),
}));

function getTextInputs() {
  return document.querySelectorAll('input[type="text"]') as NodeListOf<HTMLInputElement>;
}

function fillForm(firstName: string, lastName: string, email: string, password: string) {
  const textInputs = getTextInputs();
  fireEvent.change(textInputs[0], { target: { value: firstName } });
  fireEvent.change(textInputs[1], { target: { value: lastName } });
  fireEvent.change(document.querySelector('input[type="email"]')!, {
    target: { value: email },
  });
  const passwords = document.querySelectorAll('input[type="password"]');
  fireEvent.change(passwords[0], { target: { value: password } });
  fireEvent.change(passwords[1], { target: { value: password } });
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders the registration form with first and last name fields", () => {
    render(<RegisterPage />);
    const textInputs = getTextInputs();
    expect(textInputs.length).toBe(2);
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows error when passwords don't match", async () => {
    render(<RegisterPage />);
    const textInputs = getTextInputs();
    fireEvent.change(textInputs[0], { target: { value: "Test" } });
    fireEvent.change(textInputs[1], { target: { value: "User" } });
    fireEvent.change(document.querySelector('input[type="email"]')!, {
      target: { value: "test@example.com" },
    });
    const passwords = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwords[0], { target: { value: "password123" } });
    fireEvent.change(passwords[1], { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("shows success message after registration", async () => {
    mockRegister.mockResolvedValue({
      message: "Check your email to verify your account",
      requires_verification: true,
    });

    render(<RegisterPage />);
    fillForm("Test", "User", "test@example.com", "password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
    });
  });

  it("shows error on registration failure", async () => {
    mockRegister.mockRejectedValue(new Error("409"));

    render(<RegisterPage />);
    fillForm("Test", "User", "test@example.com", "password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });

  it("has link to login page", () => {
    render(<RegisterPage />);
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
  });
});
