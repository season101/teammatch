import { renderHook } from "@testing-library/react";
import { expect, test } from "vitest";
import { useBump } from "./bump";

test("a count only bumps when it goes up after it has loaded", () => {
  const { result, rerender } = renderHook(({ count }) => useBump(count), {
    initialProps: { count: undefined as number | undefined },
  });
  const bumped = () => result.current.className !== "";

  rerender({ count: 2 }); // first load
  expect(bumped()).toBe(false);
  rerender({ count: 1 }); // went down
  expect(bumped()).toBe(false);
  rerender({ count: 3 });
  expect(bumped()).toBe(true);
  const { key } = result.current;
  rerender({ count: 4 }); // a new key restarts the animation
  expect(result.current.key).not.toBe(key);
});
