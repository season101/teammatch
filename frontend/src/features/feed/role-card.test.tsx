import { render, screen, within } from "@testing-library/react";
import type { FeedRole } from "./queries";
import { RoleCard } from "./role-card";

function makeRole(overrides: Partial<FeedRole["project"]> = {}): FeedRole {
  return {
    id: 7,
    title: "Backend dev",
    description: "APIs",
    created_at: "2026-10-16T00:00:00Z",
    project: {
      id: 3,
      title: "TeamMatch",
      pitch: "Find a team",
      owner_name: "Olive Owner",
      ...overrides,
    },
    required_skills: [
      { id: 1, name: "Python", slug: "python" },
      { id: 2, name: "React", slug: "react" },
    ],
  };
}

test("shows the role, project, owner, pitch and required skills", () => {
  render(<RoleCard role={makeRole()} mySkillIds={[]} />);

  const card = screen.getByRole("article", { name: "Backend dev" });
  expect(within(card).getByText("TeamMatch · by Olive Owner")).toBeInTheDocument();
  expect(within(card).getByText("Find a team")).toBeInTheDocument();
  const skills = within(card).getByRole("list", { name: "Required skills" });
  expect(within(skills).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Python",
    "React",
  ]);
});

test("marks the required skills I have", () => {
  render(<RoleCard role={makeRole()} mySkillIds={[2]} />);

  expect(screen.getByText("(you have this skill)").closest("li")).toHaveTextContent("React");
  expect(screen.getAllByText("(you have this skill)")).toHaveLength(1);
});

test("past three skills shows +N more, and screen readers still get all of them", () => {
  const role = {
    ...makeRole(),
    required_skills: ["Python", "React", "Django", "Figma", "SQL"].map((name, i) => ({
      id: i + 1,
      name,
      slug: name.toLowerCase(),
    })),
  };
  render(<RoleCard role={role} mySkillIds={[]} />);

  const skills = screen.getByRole("list", { name: "Required skills" });
  expect(within(skills).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
    "Python",
    "React",
    "Django",
    "Figma",
    "SQL",
  ]);
  expect(within(skills).getByText("Figma")).toHaveClass("sr-only");
  expect(within(skills).getByText("+2 more")).toHaveAttribute("aria-hidden", "true");
});

test("links to the role on its project page", () => {
  render(<RoleCard role={makeRole()} mySkillIds={[]} />);
  expect(screen.getByRole("link", { name: "View details for Backend dev" })).toHaveAttribute(
    "href",
    "/projects/3?role=7",
  );
});

test("falls back when the owner has no display name", () => {
  render(<RoleCard role={makeRole({ owner_name: "" })} mySkillIds={[]} />);
  expect(screen.getByText("TeamMatch · by a classmate")).toBeInTheDocument();
});
