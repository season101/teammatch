import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";
import { CoachMarks } from "./coach-marks";

const KEY = "teammatch:coach-seen";

// jsdom has no modal dialog behaviour; see modal.test.tsx.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => localStorage.clear());

test("the first visit opens the sheet with focus on Got it", () => {
  render(<CoachMarks />);
  const sheet = screen.getByRole("dialog");

  expect(sheet).toHaveAccessibleName("One role at a time");
  expect(sheet).toHaveTextContent("Step 4 of 4");
  expect(screen.getAllByRole("listitem").map((row) => row.textContent)).toEqual(
    [
      "→Swipe right to apply",
      "←Swipe left to pass",
      "+Tap the card for details",
    ],
  );
  expect(sheet).toHaveTextContent(
    "You can bring back roles you passed once the deck is empty.",
  );
  expect(screen.getByRole("button", { name: "Got it" })).toHaveFocus();
});

test("Got it closes it and it stays away on the next visit", () => {
  const first = render(<CoachMarks />);
  fireEvent.click(screen.getByRole("button", { name: "Got it" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).not.toBeNull();

  first.unmount();
  render(<CoachMarks />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("Esc closes it for good too", () => {
  render(<CoachMarks />);
  // A browser closes the modal on Esc and fires "close".
  (screen.getByRole("dialog") as HTMLDialogElement).close();

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(localStorage.getItem(KEY)).not.toBeNull();
});

test("Got it still closes the sheet when storage is blocked", () => {
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = () => {
    throw new Error("blocked");
  };
  try {
    render(<CoachMarks />);
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  } finally {
    Storage.prototype.setItem = setItem;
  }
});
