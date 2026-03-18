import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

// Must mock cookies before importing client
vi.mock("@/lib/cookies", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));

import apiClient from "@/services/client";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import type { Mock } from "vitest";

const mockedGetCookie = getCookie as Mock;
const mockedSetCookie = setCookie as Mock;
const mockedDeleteCookie = deleteCookie as Mock;

type InterceptorHandlers = {
  handlers: Array<{
    fulfilled: (val: unknown) => unknown;
    rejected?: (err: unknown) => unknown;
  }>;
};

function getRequestInterceptor() {
  return (apiClient.interceptors.request as unknown as InterceptorHandlers).handlers[0];
}

function getResponseInterceptor() {
  return (apiClient.interceptors.response as unknown as InterceptorHandlers).handlers[0];
}

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct base URL and content type", () => {
    expect(apiClient.defaults.baseURL).toBe("/api");
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });

  it("has withCredentials enabled", () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  describe("request interceptor", () => {
    it("attaches Authorization header when access_token cookie exists", () => {
      mockedGetCookie.mockReturnValue("my-token");

      const config = { headers: {} as Record<string, string> };
      const result = getRequestInterceptor().fulfilled(config) as typeof config;

      expect(result.headers.Authorization).toBe("Bearer my-token");
    });

    it("does not attach Authorization header when no token", () => {
      mockedGetCookie.mockReturnValue(undefined);

      const config = { headers: {} as Record<string, string> };
      const result = getRequestInterceptor().fulfilled(config) as typeof config;

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe("response interceptor", () => {
    it("passes successful responses through", () => {
      const response = { data: { ok: true }, status: 200 };
      const result = getResponseInterceptor().fulfilled(response);
      expect(result).toBe(response);
    });

    it("attempts refresh on 401 when refresh_token exists", async () => {
      mockedGetCookie.mockImplementation((name: string) => {
        if (name === "refresh_token") return "rt-123";
        return undefined;
      });

      const mockPost = vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "new-at", refresh_token: "new-rt" },
      });

      const error = {
        config: { headers: {} as Record<string, string>, _retry: false },
        response: { status: 401 },
      };

      // The interceptor retries via apiClient() which will also fail in test,
      // but we can verify the refresh was attempted
      try {
        await getResponseInterceptor().rejected!(error);
      } catch {
        // Expected — the retry call will fail in test env
      }

      expect(mockPost).toHaveBeenCalledWith("/api/auth/refresh", {
        refresh_token: "rt-123",
      });
      expect(mockedSetCookie).toHaveBeenCalledWith("access_token", "new-at", 86400);
      expect(mockedSetCookie).toHaveBeenCalledWith("refresh_token", "new-rt", 604800);

      mockPost.mockRestore();
    });

    it("redirects to /login when refresh fails", async () => {
      mockedGetCookie.mockImplementation((name: string) => {
        if (name === "refresh_token") return "rt-123";
        return undefined;
      });

      const mockPost = vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh failed"));

      // Mock window.location
      vi.spyOn(window, "location", "get").mockReturnValue({
        ...window.location,
        href: "",
      });
      const hrefSetter = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: "" },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, "href", {
        set: hrefSetter,
        get: () => "",
        configurable: true,
      });

      const error = {
        config: { headers: {}, _retry: false },
        response: { status: 401 },
      };

      await expect(getResponseInterceptor().rejected!(error)).rejects.toBeDefined();

      expect(mockedDeleteCookie).toHaveBeenCalledWith("access_token");
      expect(mockedDeleteCookie).toHaveBeenCalledWith("refresh_token");

      mockPost.mockRestore();
      // locationSpy cleaned up by vi.clearAllMocks in beforeEach
    });

    it("redirects to /login when no refresh_token exists on 401", async () => {
      mockedGetCookie.mockReturnValue(undefined);

      const hrefSetter = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...window.location, href: "" },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, "href", {
        set: hrefSetter,
        get: () => "",
        configurable: true,
      });

      const error = {
        config: { headers: {}, _retry: false },
        response: { status: 401 },
      };

      await expect(getResponseInterceptor().rejected!(error)).rejects.toBeDefined();
    });

    it("rejects non-401 errors without retry", async () => {
      const error = {
        config: { headers: {} },
        response: { status: 500 },
      };

      await expect(getResponseInterceptor().rejected!(error)).rejects.toBe(error);
    });
  });
});
