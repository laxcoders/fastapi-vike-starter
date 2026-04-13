import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// `usePageContext` is the Vike hook the page uses to read `is404` and
// abort metadata. Stub it so we can drive the page's two branches without
// booting a real Vike page context.
const pageContextMock = vi.hoisted(() => ({
  is404: false as boolean,
  abortReason: undefined as unknown,
}));

vi.mock("vike-react/usePageContext", () => ({
  usePageContext: () => pageContextMock,
}));

import ErrorPage from "@/pages/_error/+Page";

describe("ErrorPage", () => {
  afterEach(() => {
    cleanup();
    pageContextMock.is404 = false;
    pageContextMock.abortReason = undefined;
  });

  it("renders the 404 copy when pageContext.is404 is true", () => {
    pageContextMock.is404 = true;

    render(<ErrorPage />);

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /return home/i })).toHaveAttribute("href", "/");
  });

  it("renders the generic error copy when is404 is false", () => {
    pageContextMock.is404 = false;
    pageContextMock.abortReason = undefined;

    render(<ErrorPage />);

    expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it("renders the abort reason when the page context supplies one", () => {
    pageContextMock.is404 = false;
    pageContextMock.abortReason = "You do not have access to this team.";

    render(<ErrorPage />);

    expect(screen.getByText(/do not have access/i)).toBeInTheDocument();
  });
});
