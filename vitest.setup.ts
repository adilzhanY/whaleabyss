import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// This setup file runs for every test, including the node-environment `lib/`
// and API-route suites that have no DOM. Guard the browser patches so those
// files don't throw on `window`/`HTMLElement` being undefined.
if (typeof window !== "undefined") {
  // jsdom implements neither matchMedia nor ResizeObserver; the cart drawer
  // (vaul + the responsive direction hook) needs both to render.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
    ResizeObserverStub;

  // Radix/vaul use these DOM APIs that jsdom lacks.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
}
