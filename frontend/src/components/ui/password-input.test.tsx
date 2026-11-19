import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { PasswordInput } from "./password-input";

test("the eye button shows and hides what was typed", () => {
  render(<PasswordInput aria-label="Password" />);
  const field = screen.getByLabelText("Password");
  const eye = screen.getByRole("button", { name: "Show characters" });
  expect(field).toHaveAttribute("type", "password");
  fireEvent.click(eye);
  expect(field).toHaveAttribute("type", "text");
  expect(eye).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(eye);
  expect(field).toHaveAttribute("type", "password");
});
