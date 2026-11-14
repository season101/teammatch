import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PassToast } from "./pass-toast";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test("goes after 4 seconds", () => {
  const onDone = vi.fn();
  render(<PassToast role="Backend dev" onUndo={() => {}} onDone={onDone} />);
  expect(screen.getByText("Passed on Backend dev")).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(3999));
  expect(onDone).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("waits while it's hovered or focused", () => {
  const onDone = vi.fn();
  render(<PassToast role="Backend dev" onUndo={() => {}} onDone={onDone} />);
  const undo = screen.getByRole("button", { name: "Undo" });

  fireEvent.mouseEnter(undo);
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).not.toHaveBeenCalled();

  fireEvent.mouseLeave(undo);
  fireEvent.focus(undo);
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).not.toHaveBeenCalled();

  fireEvent.blur(undo);
  act(() => vi.advanceTimersByTime(4000));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("leaving with the pointer doesn't release a focused Undo", () => {
  const onDone = vi.fn();
  render(<PassToast role="Backend dev" onUndo={() => {}} onDone={onDone} />);
  const undo = screen.getByRole("button", { name: "Undo" });

  fireEvent.mouseEnter(undo);
  fireEvent.focus(undo);
  fireEvent.mouseLeave(undo);
  act(() => vi.advanceTimersByTime(10_000));
  expect(onDone).not.toHaveBeenCalled();

  fireEvent.blur(undo);
  act(() => vi.advanceTimersByTime(4000));
  expect(onDone).toHaveBeenCalledTimes(1);
});

test("Undo and × call back", () => {
  const onUndo = vi.fn();
  const onDone = vi.fn();
  render(<PassToast role="Backend dev" onUndo={onUndo} onDone={onDone} />);

  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

  expect(onUndo).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledTimes(1);
});
