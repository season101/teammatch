import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ActionButton } from "./action-button";

test("is named after its action and reports the click", () => {
  const onClick = vi.fn();
  render(<ActionButton kind="apply" onClick={onClick} />);

  fireEvent.click(screen.getByRole("button", { name: "Apply" }));

  expect(onClick).toHaveBeenCalledOnce();
});

test("takes a more specific label", () => {
  render(<ActionButton kind="pass" label="Pass on Frontend dev" />);

  expect(
    screen.getByRole("button", { name: "Pass on Frontend dev" }),
  ).toBeInTheDocument();
});
