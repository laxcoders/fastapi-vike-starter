import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

/**
 * SSR branch — guards run on both server and client. During server render
 * `typeof window === "undefined"` is true, so the cookie source is
 * `pageContext.headers.cookie` instead of `document.cookie`. This block
 * covers that branch by stubbing the global `window` to `undefined` and
 * passing a real request-style headers bag.
 */
describe("guards on the server (SSR branch)", () => {
  beforeEach(() => {
    clearCookies();
    vi.stubGlobal("window", undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeSsrContext(cookieHeader: string): PageContext {
    return {
      headers: { cookie: cookieHeader },
    } as unknown as PageContext;
  }

  it("app guard: redirects to /login when SSR headers carry no tokens", () => {
    try {
      appGuard(makeSsrContext(""));
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/login");
    }
  });

  it("app guard: lets through when SSR headers include access_token", () => {
    expect(() => appGuard(makeSsrContext("access_token=abc; other=1"))).not.toThrow();
  });

  it("app guard: treats a missing headers bag as unauthenticated", () => {
    // Exercises the `?? ""` fallback when pageContext.headers is undefined.
    const ctx = {} as unknown as PageContext;
    try {
      appGuard(ctx);
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/login");
    }
  });

  it("login guard: redirects to /app/dashboard when SSR headers include refresh_token", () => {
    try {
      loginGuard(makeSsrContext("refresh_token=xyz"));
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });

  it("login guard: lets through when SSR headers carry no tokens", () => {
    expect(() => loginGuard(makeSsrContext("unrelated=1"))).not.toThrow();
  });

  it("index guard: redirects when SSR headers include a token", () => {
    try {
      indexGuard(makeSsrContext("access_token=t"));
      expect.fail("Expected redirect to be thrown");
    } catch (err: unknown) {
      expect(getRedirectUrl(err)).toBe("/app/dashboard");
    }
  });

  it("register guard: lets through unauthenticated SSR requests", () => {
    expect(() => registerGuard(makeSsrContext(""))).not.toThrow();
  });

  it("forgot-password guard: lets through unauthenticated SSR requests", () => {
    expect(() => forgotPasswordGuard(makeSsrContext(""))).not.toThrow();
  });
});
