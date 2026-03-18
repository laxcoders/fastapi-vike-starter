import { describe, it, expect, beforeEach } from "vitest";

import { guard as indexGuard } from "@/pages/index/+guard";
import { guard as loginGuard } from "@/pages/login/+guard";
import { guard as appGuard } from "@/pages/app/+guard";
import { guard as registerGuard } from "@/pages/register/+guard";
import { guard as forgotPasswordGuard } from "@/pages/forgot-password/+guard";
import type { PageContext } from "vike/types";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const key = c.split("=")[0].trim();
    document.cookie = `${key}=; max-age=0`;
  });
}

function makePageContext(): PageContext {
  return {} as PageContext;
}

interface VikeRedirectError {
  _pageContextAbort?: {
    _urlRedirect?: { url?: string };
  };
}

function getRedirectUrl(err: unknown): string | undefined {
  return (err as VikeRedirectError)?._pageContextAbort?._urlRedirect?.url;
}

describe("index guard", () => {
  beforeEach(clearCookies);

  it("does nothing when no tokens are present", () => {
    expect(() => indexGuard(makePageContext())).not.toThrow();
  });

  it("redirects to /app/dashboard when access token exists", () => {
    document.cookie = "access_token=test; path=/";
    try {
      indexGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });

  it("redirects to /app/dashboard when only refresh token exists", () => {
    document.cookie = "refresh_token=test; path=/";
    try {
      indexGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });
});

describe("login guard", () => {
  beforeEach(clearCookies);

  it("does nothing when no tokens are present", () => {
    expect(() => loginGuard(makePageContext())).not.toThrow();
  });

  it("redirects to /app/dashboard when access token exists", () => {
    document.cookie = "access_token=test; path=/";
    try {
      loginGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });

  it("redirects to /app/dashboard when only refresh token exists", () => {
    document.cookie = "refresh_token=test; path=/";
    try {
      loginGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });
});

describe("app guard", () => {
  beforeEach(clearCookies);

  it("redirects to /login when no tokens are present", () => {
    try {
      appGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/login");
    }
  });

  it("does nothing when access token exists", () => {
    document.cookie = "access_token=test; path=/";
    expect(() => appGuard(makePageContext())).not.toThrow();
  });

  it("does nothing when only refresh token exists", () => {
    document.cookie = "refresh_token=test; path=/";
    expect(() => appGuard(makePageContext())).not.toThrow();
  });
});

describe("register guard", () => {
  beforeEach(clearCookies);

  it("does nothing when no tokens are present", () => {
    expect(() => registerGuard(makePageContext())).not.toThrow();
  });

  it("redirects to /app/dashboard when token exists", () => {
    document.cookie = "access_token=test; path=/";
    try {
      registerGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });
});

describe("forgot-password guard", () => {
  beforeEach(clearCookies);

  it("does nothing when no tokens are present", () => {
    expect(() => forgotPasswordGuard(makePageContext())).not.toThrow();
  });

  it("redirects to /app/dashboard when token exists", () => {
    document.cookie = "refresh_token=test; path=/";
    try {
      forgotPasswordGuard(makePageContext());
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });
});
