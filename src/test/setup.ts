import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-registers its cleanup when vitest runs with
// `globals: true`, which this project does not. Without it, rendered DOM leaks
// between tests and queries start matching elements from earlier ones.
afterEach(() => cleanup());

// jsdom does not implement matchMedia. The global store reads it at import time
// to resolve the initial theme, so anything that transitively imports the store
// (the API client, for one) fails to load without this shim.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
