import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll } from "vitest";
import { Avatar } from "./avatar";

// jsdom has no modal dialog behaviour: showModal() opens it, close() closes it.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

const URL = "/api/v1/profiles/7/avatar/?v=1";

test("shows the photo when there is one, as a button named for the person", () => {
  render(<Avatar name="Sam Rivera" url={URL} className="size-9" />);
  const button = screen.getByRole("button", { name: "Open Sam Rivera's photo" });
  expect(button.querySelector("img")).toHaveAttribute("src", URL);
});

test("the photo opens larger with alt text, and Close or the backdrop shuts it", () => {
  render(<Avatar name="Sam Rivera" url={URL} className="size-9" />);
  const open = screen.getByRole("button", { name: "Open Sam Rivera's photo" });
  expect(screen.queryByRole("dialog")).toBeNull();

  fireEvent.click(open);
  const dialog = screen.getByRole("dialog", { name: "Sam Rivera's photo" });
  expect(screen.getByAltText("Sam Rivera's photo")).toHaveAttribute("src", URL);

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(dialog).not.toHaveAttribute("open");

  fireEvent.click(open);
  fireEvent.click(screen.getByAltText("Sam Rivera's photo")); // inside: stays open
  expect(dialog).toHaveAttribute("open");
  fireEvent.click(dialog); // the backdrop
  expect(dialog).not.toHaveAttribute("open");
});

test("falls back to initials, with nothing to open", () => {
  const { container } = render(<Avatar name="Sam Rivera" url={null} className="size-9" />);
  expect(container.querySelector("img")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(container).toHaveTextContent("SR");
});
