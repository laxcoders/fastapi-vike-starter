import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { APP_NAME } from "@/lib/app-config";
import { Head } from "@/pages/+Head";
import LandingPage from "@/pages/index/+Page";
import ProjectsPage from "@/pages/app/projects/+Page";
import TeamPage from "@/pages/app/team/+Page";
import SettingsPage from "@/pages/app/settings/+Page";

describe("Head", () => {
  it("renders viewport meta tag", () => {
    render(<Head />);
    const meta = document.querySelector('meta[name="viewport"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute("content")).toBe("width=device-width, initial-scale=1.0");
  });
});

describe("LandingPage", () => {
  it("renders branding and sign in link", () => {
    render(<LandingPage />);
    expect(screen.getByText(APP_NAME)).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Sign In").closest("a")).toHaveAttribute("href", "/login");
  });
});

describe("ProjectsPage", () => {
  it("renders heading", () => {
    render(<ProjectsPage />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });
});

describe("TeamPage", () => {
  it("renders heading", () => {
    render(<TeamPage />);
    expect(screen.getByText("Team")).toBeInTheDocument();
  });
});

describe("SettingsPage", () => {
  it("renders heading", () => {
    render(<SettingsPage />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
