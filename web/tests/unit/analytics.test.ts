import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("analytics", () => {
  beforeEach(() => {
    // Each test gets a fresh module so we can exercise the default tracker
    // (which is replaced the moment setTracker is called).
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("forwards events to the tracker with the typed payload", async () => {
    const { setTracker, track } = await import("@/lib/analytics");
    const spy = vi.fn();
    setTracker(spy);

    track("auth:sign_in", { method: "password" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("auth:sign_in", { method: "password" });
  });

  it("supports swapping the tracker at runtime", async () => {
    const { setTracker, track } = await import("@/lib/analytics");
    const first = vi.fn();
    const second = vi.fn();

    setTracker(first);
    track("item:create", { item_id: "a" });

    setTracker(second);
    track("item:delete", { item_id: "b" });

    expect(first).toHaveBeenCalledWith("item:create", { item_id: "a" });
    expect(first).not.toHaveBeenCalledWith("item:delete", { item_id: "b" });
    expect(second).toHaveBeenCalledWith("item:delete", { item_id: "b" });
  });

  it("default tracker logs via console.debug in DEV", async () => {
    vi.stubEnv("DEV", true);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { track } = await import("@/lib/analytics");

    track("auth:sign_out", {});

    expect(debugSpy).toHaveBeenCalledWith("[analytics]", "auth:sign_out", {});
  });

  it("default tracker stays silent outside DEV", async () => {
    vi.stubEnv("DEV", false);
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { track } = await import("@/lib/analytics");

    track("auth:verify_email", {});

    expect(debugSpy).not.toHaveBeenCalled();
  });
});
