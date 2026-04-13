import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom ships without these — add them globally so tests don't each re-stub.
// Individual test files can still override per-test where the default is wrong.

// ResizeObserver — required by any library that observes element geometry
// (CodeMirror, shadcn Command, radix primitives, virtualised lists).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

// Element.scrollIntoView — cmdk calls this on every selection change.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// HTMLDialogElement.showModal/close — jsdom parses <dialog> but doesn't
// implement the showModal/close methods. Any ConfirmDialog component using
// the native <dialog> element will crash without these.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  }
}

// window.matchMedia — used by useIsMobile, theme detection, and anything
// checking breakpoints. Default to "desktop, light, no reduced motion" and
// let individual tests override per-test when needed.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
