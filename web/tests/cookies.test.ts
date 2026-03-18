import { describe, it, expect, beforeEach } from "vitest";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";

function clearCookies() {
  document.cookie.split(";").forEach((c) => {
    const key = c.split("=")[0].trim();
    document.cookie = `${key}=; max-age=0`;
  });
}

describe("getCookie", () => {
  beforeEach(clearCookies);

  it("returns undefined when cookie is not found", () => {
    expect(getCookie("missing")).toBeUndefined();
  });

  it("reads a cookie from document.cookie", () => {
    document.cookie = "token=abc123; path=/";
    expect(getCookie("token")).toBe("abc123");
  });

  it("reads a cookie from an explicit cookie string (SSR)", () => {
    const cookieStr = "access_token=xyz; refresh_token=abc";
    expect(getCookie("access_token", cookieStr)).toBe("xyz");
    expect(getCookie("refresh_token", cookieStr)).toBe("abc");
  });

  it("decodes URL-encoded values", () => {
    document.cookie = `data=${encodeURIComponent("hello world")}; path=/`;
    expect(getCookie("data")).toBe("hello world");
  });

  it("handles cookies with = in the value", () => {
    const cookieStr = "token=abc=def=ghi";
    expect(getCookie("token", cookieStr)).toBe("abc=def=ghi");
  });

  it("returns undefined for empty cookie string", () => {
    expect(getCookie("anything", "")).toBeUndefined();
  });

  it("handles whitespace around cookie names", () => {
    const cookieStr = "  token = abc ";
    // getCookie splits on first `=` and does not trim the value
    expect(getCookie("token", cookieStr)).toBe(" abc");
  });
});

describe("setCookie", () => {
  beforeEach(clearCookies);

  it("sets a cookie with the correct format", () => {
    setCookie("access_token", "mytoken", 1800);
    expect(document.cookie).toContain("access_token=mytoken");
  });

  it("encodes special characters in the value", () => {
    setCookie("data", "hello world", 3600);
    expect(getCookie("data")).toBe("hello world");
  });
});

describe("deleteCookie", () => {
  beforeEach(clearCookies);

  it("removes a cookie", () => {
    document.cookie = "token=abc; path=/";
    expect(getCookie("token")).toBe("abc");
    deleteCookie("token");
    // jsdom may not fully honor max-age=0, but the value should be cleared
    expect(document.cookie).not.toContain("token=abc");
  });
});
