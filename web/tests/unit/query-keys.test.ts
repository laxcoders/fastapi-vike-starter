import { describe, expect, it } from "vitest";

import { authKeys, itemKeys } from "@/lib/query-keys";

describe("query-keys", () => {
  describe("authKeys", () => {
    it("has a root 'all' tuple", () => {
      expect(authKeys.all).toEqual(["auth"]);
    });

    it("derives currentUser from the root", () => {
      expect(authKeys.currentUser()).toEqual(["auth", "currentUser"]);
    });
  });

  describe("itemKeys", () => {
    it("has a root 'all' tuple", () => {
      expect(itemKeys.all).toEqual(["items"]);
    });

    it("builds list keys under all", () => {
      expect(itemKeys.lists()).toEqual(["items", "list"]);
      expect(itemKeys.list({ page: 1 })).toEqual(["items", "list", { page: 1 }]);
    });

    it("builds detail keys under all", () => {
      expect(itemKeys.details()).toEqual(["items", "detail"]);
      expect(itemKeys.detail("abc-123")).toEqual(["items", "detail", "abc-123"]);
    });

    it("list and detail share the same 'all' prefix so one invalidateQueries wipes both", () => {
      const invalidationRoot = itemKeys.all;
      expect(itemKeys.list({}).slice(0, invalidationRoot.length)).toEqual(invalidationRoot);
      expect(itemKeys.detail("x").slice(0, invalidationRoot.length)).toEqual(invalidationRoot);
    });
  });
});
