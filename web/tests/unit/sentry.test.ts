import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Breadcrumb, ErrorEvent } from "@sentry/react";

/**
 * sentry.ts is a thin init wrapper, but its `beforeSend` callback is where
 * the real invariants live — it strips Authorization headers from both the
 * event's request headers and any breadcrumb attached by axios. The callback
 * never runs in production tests unless we invoke it directly here.
 *
 * The module uses a dynamic `await import("@sentry/react")`, so we hoist a
 * shared `initMock` and have the mock factory return it. That way we can
 * observe `Sentry.init` calls and grab the `beforeSend` config it was given.
 */

const initMock = vi.hoisted(() => vi.fn());

vi.mock("@sentry/react", () => ({
  init: initMock,
}));

describe("initSentry", () => {
  beforeEach(() => {
    initMock.mockReset();
    vi.resetModules();
    // Intentionally don't pre-stub env vars here — individual tests stub
    // the ones they care about, and `vi.unstubAllEnvs()` in afterEach
    // resets between tests so undefined stays undefined.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is a no-op on the server (no window)", async () => {
    vi.stubGlobal("window", undefined);
    const { initSentry, getSentry } = await import("@/lib/sentry");

    await initSentry();

    expect(initMock).not.toHaveBeenCalled();
    expect(getSentry()).toBeNull();
  });

  it("is a no-op when VITE_SENTRY_DSN is empty/unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");
    const { initSentry, getSentry } = await import("@/lib/sentry");

    await initSentry();

    expect(initMock).not.toHaveBeenCalled();
    expect(getSentry()).toBeNull();
  });

  it("calls Sentry.init with the configured DSN, env, and release", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://abc@sentry.io/1");
    vi.stubEnv("VITE_SENTRY_ENV", "staging");
    vi.stubEnv("VITE_RELEASE_SHA", "deadbeef");

    const { initSentry, getSentry } = await import("@/lib/sentry");
    await initSentry();

    expect(initMock).toHaveBeenCalledTimes(1);
    const config = initMock.mock.calls[0][0];
    expect(config.dsn).toBe("https://abc@sentry.io/1");
    expect(config.environment).toBe("staging");
    expect(config.release).toBe("deadbeef");
    expect(config.tracesSampleRate).toBe(0.1);
    // Explicitly no integrations — Replay is disabled on purpose.
    expect(config.integrations).toEqual([]);
    // Token-bearing URLs are excluded.
    expect(config.denyUrls).toEqual([/\/auth\/verify-email/, /\/auth\/reset-password/, /\/auth\/github\/callback/]);
    // After init succeeds, the module handle is exposed.
    expect(getSentry()).not.toBeNull();
  });

  it("defaults environment to 'development' when VITE_SENTRY_ENV is unset", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://abc@sentry.io/1");
    // No VITE_SENTRY_ENV.
    const { initSentry } = await import("@/lib/sentry");
    await initSentry();

    expect(initMock.mock.calls[0][0].environment).toBe("development");
  });

  describe("beforeSend", () => {
    async function getBeforeSend(): Promise<(event: ErrorEvent) => ErrorEvent | null> {
      vi.stubEnv("VITE_SENTRY_DSN", "https://abc@sentry.io/1");
      const { initSentry } = await import("@/lib/sentry");
      await initSentry();
      return initMock.mock.calls[0][0].beforeSend as (event: ErrorEvent) => ErrorEvent | null;
    }

    it("strips Authorization (both casings) from event.request.headers", async () => {
      const beforeSend = await getBeforeSend();
      const event = {
        request: {
          headers: {
            Authorization: "Bearer top-secret-token",
            authorization: "Bearer also-secret",
            "Content-Type": "application/json",
          },
        },
      } as unknown as ErrorEvent;

      const cleaned = beforeSend(event);

      expect(cleaned).not.toBeNull();
      const headers = cleaned!.request!.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      expect(headers.authorization).toBeUndefined();
      // Non-sensitive headers survive.
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("leaves events without request headers untouched", async () => {
      const beforeSend = await getBeforeSend();
      const event = { message: "boom" } as unknown as ErrorEvent;

      const cleaned = beforeSend(event);

      expect(cleaned).toEqual({ message: "boom" });
    });

    it("strips Authorization from breadcrumb data.request_headers", async () => {
      const beforeSend = await getBeforeSend();
      const event = {
        breadcrumbs: [
          {
            category: "xhr",
            data: {
              url: "/api/items",
              request_headers: {
                Authorization: "Bearer leaked-via-breadcrumb",
                authorization: "Bearer also-leaked",
                Accept: "application/json",
              },
            },
          } as unknown as Breadcrumb,
          // A breadcrumb without request_headers should pass through as-is.
          { category: "navigation", data: { from: "/a", to: "/b" } } as unknown as Breadcrumb,
          // A breadcrumb without data at all — exercises the `data &&` guard.
          { category: "console", message: "hi" } as unknown as Breadcrumb,
        ],
      } as unknown as ErrorEvent;

      const cleaned = beforeSend(event);

      expect(cleaned).not.toBeNull();
      const xhr = cleaned!.breadcrumbs![0] as Breadcrumb;
      const xhrHeaders = (xhr.data as { request_headers: Record<string, string> }).request_headers;
      expect(xhrHeaders.Authorization).toBeUndefined();
      expect(xhrHeaders.authorization).toBeUndefined();
      expect(xhrHeaders.Accept).toBe("application/json");
      // Non-xhr breadcrumbs are returned unchanged.
      expect(cleaned!.breadcrumbs![1].data).toEqual({ from: "/a", to: "/b" });
      expect(cleaned!.breadcrumbs![2]).toEqual({ category: "console", message: "hi" });
    });
  });
});
