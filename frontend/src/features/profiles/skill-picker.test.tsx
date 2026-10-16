import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { SkillPicker } from "./skill-picker";

const SKILLS = [
  { id: 1, name: "Django", slug: "django" },
  { id: 2, name: "Python", slug: "python" },
  { id: 3, name: "React", slug: "react" },
];

test("search shows only matching skills that aren't picked yet", () => {
  render(<SkillPicker skills={SKILLS} selected={[2]} onChange={() => {}} />);
  fireEvent.change(screen.getByLabelText("Search skills"), {
    target: { value: "dja" },
  });

  const toAdd = screen.getByRole("list", { name: "Skills to add" });
  expect(
    within(toAdd).getByRole("button", { name: "+ Django" }),
  ).toBeInTheDocument();
  expect(
    within(toAdd).queryByRole("button", { name: "+ React" }),
  ).not.toBeInTheDocument();
  // Python is already picked, so it is a chip, not a choice
  expect(
    within(toAdd).queryByRole("button", { name: "+ Python" }),
  ).not.toBeInTheDocument();
});

test("picking adds the skill and the remove button drops it", () => {
  const onChange = vi.fn();
  render(<SkillPicker skills={SKILLS} selected={[2]} onChange={onChange} />);

  fireEvent.click(screen.getByRole("button", { name: "+ React" }));
  expect(onChange).toHaveBeenLastCalledWith([2, 3]);

  fireEvent.click(screen.getByRole("button", { name: "Remove Python" }));
  expect(onChange).toHaveBeenLastCalledWith([]);
});

test("a skill that isn't in the list can't be picked", () => {
  render(<SkillPicker skills={SKILLS} selected={[]} onChange={() => {}} />);
  fireEvent.change(screen.getByLabelText("Search skills"), {
    target: { value: "Cobol" },
  });
  expect(screen.getByText("No skills match your search.")).toBeInTheDocument();
  expect(
    screen.queryByRole("list", { name: "Skills to add" }),
  ).not.toBeInTheDocument();
});
