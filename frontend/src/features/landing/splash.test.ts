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

test("is marked done when the lift ends", () => {
  playSplash();

  const otherEnd = Object.assign(new Event("animationend", { bubbles: true }), {
    animationName: "seat-fill",
  });
  root.dispatchEvent(otherEnd);
  expect(root.dataset.splash).toBe("play");

  const liftEnd = Object.assign(new Event("animationend", { bubbles: true }), {
    animationName: "splash-lift",
  });
  root.dispatchEvent(liftEnd);
  expect(root.dataset.splash).toBe("done");
});

test("is marked done 3 s after the first frame if the animation never runs", () => {
  vi.useFakeTimers();
  playSplash();

  vi.advanceTimersByTime(2900);
  expect(root.dataset.splash).toBe("play");

  vi.advanceTimersByTime(200);
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
