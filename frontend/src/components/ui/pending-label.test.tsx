import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PendingLabel } from "./pending-label";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const view = (pending: boolean) => (
  <PendingLabel pending={pending} label="Saving">
    Save
  </PendingLabel>
);

test("a quick reply never shows the spinner", () => {
  const { rerender } = render(view(true));
  act(() => vi.advanceTimersByTime(250));
  rerender(view(false));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole("status")).toBeNull();
});

test("a slow reply shows the spinner after 300ms and holds it 500ms", () => {
  const { rerender } = render(view(true));
  act(() => vi.advanceTimersByTime(300));
  expect(screen.getByRole("status", { name: "Saving" })).toBeInTheDocument();
  rerender(view(false));
  act(() => vi.advanceTimersByTime(400));
  expect(screen.getByRole("status")).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(100));
  expect(screen.queryByRole("status")).toBeNull();
});
