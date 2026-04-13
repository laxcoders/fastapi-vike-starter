import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // tests/unit/*  - component + service unit tests (fast, narrow)
    // tests/integration/* - multi-step flow tests that exercise routing,
    //                       stores, and services together. Keep these
    //                       self-contained since vitest doesn't share mocks
    //                       across files.
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["lib/**", "services/**", "hooks/**", "components/**", "pages/**"],
      exclude: ["pages/+config.ts", "pages/tailwind.css", "lib/types.ts"],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
