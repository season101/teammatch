import { afterEach, beforeEach, vi } from "vitest";
import { playSplash } from "./splash";

const root = document.documentElement;

function prefersReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", () => ({ matches: reduce }));
}

beforeEach(() => {
  sessionStorage.clear();
  delete root.dataset.splash;
  window.history.replaceState(null, "", "/");
  prefersReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("plays on the first visit to / and not again this session", () => {
  playSplash();
  expect(root.dataset.splash).toBe("play");

  delete root.dataset.splash;
  playSplash();
  expect(root.dataset.splash).toBeUndefined();
});

test("is marked done after 1.5 s so it can't replay or get stuck", () => {
  vi.useFakeTimers();
  playSplash();

  vi.advanceTimersByTime(1500);

  expect(root.dataset.splash).toBe("done");
});

test("is skipped with reduced motion", () => {
  prefersReducedMotion(true);
  playSplash();
  expect(root.dataset.splash).toBeUndefined();
});

test("is skipped on other pages", () => {
  window.history.replaceState(null, "", "/login");
  playSplash();
  expect(root.dataset.splash).toBeUndefined();
});

test("is skipped when storage is blocked", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => playSplash()).not.toThrow();
  expect(root.dataset.splash).toBeUndefined();
});
