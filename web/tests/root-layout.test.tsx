import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Layout from "@/pages/+Layout";

describe("Root Layout", () => {
  it("renders children inside QueryClientProvider", () => {
    render(
      <Layout>
        <div data-testid="child">Hello</div>
      </Layout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
