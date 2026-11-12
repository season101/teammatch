import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, vi } from "vitest";
import { Modal } from "./modal";

// jsdom has no modal dialog behaviour, so stand in for what browsers do:
// showModal() opens it, and Esc or close() fires "close".
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

function renderGate(open: boolean, onClose = vi.fn(), onEscape = vi.fn()) {
  const view = render(
    <Modal
      open={open}
      onClose={onClose}
      title="Withdraw this application?"
      ctaLabel="Keep my application"
      onCta={onClose}
      escapeLabel="Withdraw"
      onEscape={onEscape}
    />,
  );
  return { ...view, onClose, onEscape };
}

test("opening it focuses the safe choice", () => {
  renderGate(true);

  expect(screen.getByRole("dialog")).toHaveAccessibleName(
    "Withdraw this application?",
  );
  expect(
    screen.getByRole("button", { name: "Keep my application" }),
  ).toHaveFocus();
});

test("Esc closes it", () => {
  const { onClose } = renderGate(true);

  // A browser closes the modal on Esc and fires "close".
  (screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement).close();

  expect(onClose).toHaveBeenCalledOnce();
});

test("the text link runs the escape action", () => {
  const { onEscape } = renderGate(true);

  fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));

  expect(onEscape).toHaveBeenCalledOnce();
});

test("turning open off closes the dialog", () => {
  const { rerender, onClose } = renderGate(true);

  rerender(
    <Modal
      open={false}
      onClose={onClose}
      title="Withdraw this application?"
      ctaLabel="Keep my application"
      onCta={onClose}
      escapeLabel="Withdraw"
    />,
  );

  expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute(
    "open",
  );
  expect(onClose).toHaveBeenCalledOnce();
});

test("focusEscape starts on the escape, so Enter can't press the CTA (DD-34)", () => {
  render(
    <Modal
      open
      onClose={vi.fn()}
      title="Commit to Campus Eats?"
      ctaLabel="Commit to Campus Eats"
      onCta={vi.fn()}
      escapeLabel="Keep my options"
      escapeVariant="ghost"
      focusEscape
    />,
  );
  expect(screen.getByRole("button", { name: "Keep my options" })).toHaveFocus();
});

test("escapeHref makes the escape a link", () => {
  const onClose = vi.fn();
  render(
    <Modal
      open
      onClose={onClose}
      title="Close your project first?"
      ctaLabel="Keep this offer"
      onCta={onClose}
      escapeLabel="Go to Trail Finder"
      escapeHref="/projects/8"
      escapeVariant="ghost"
    />,
  );
  expect(screen.getByRole("button", { name: "Keep this offer" })).toHaveFocus();
  expect(screen.getByRole("link", { name: "Go to Trail Finder" })).toHaveAttribute(
    "href",
    "/projects/8",
  );
});
