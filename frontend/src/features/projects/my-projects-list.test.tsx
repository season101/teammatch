import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MyProject } from "@/features/review/queries";
import { MyProjectsList, projectSummary } from "./my-projects-list";

function project(overrides: Partial<MyProject>): MyProject {
  return {
    id: 1,
    title: "Bulldog Bites",
    status: "open",
    roles: [
      { id: 1, title: "Mobile developer", status: "open" },
      { id: 2, title: "Backend developer", status: "filled" },
      { id: 3, title: "UI designer", status: "open" },
    ],
    created_at: "2026-10-12T00:00:00Z",
    ...overrides,
  } as MyProject;
}

describe("projectSummary", () => {
  it("counts filled roles for an open project", () => {
    expect(projectSummary(project({}))).toBe("1 of 3 roles filled");
  });

  it("says a draft is not published", () => {
    expect(projectSummary(project({ status: "draft" }))).toBe(
      "3 roles · not published",
    );
  });

  it("says a locked project has a team", () => {
    expect(projectSummary(project({ status: "locked" }))).toBe(
      "3 roles · team formed",
    );
  });
});

describe("MyProjectsList", () => {
  it("shows an empty state when you own nothing", () => {
    render(<MyProjectsList projects={[]} />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("groups projects by status with a link to each", () => {
    render(
      <MyProjectsList
        projects={[
          project({ id: 1, title: "Bulldog Bites", status: "open" }),
          project({ id: 2, title: "Thesis Tracker", status: "draft" }),
        ]}
      />,
    );
    expect(screen.getByRole("region", { name: "Open" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Drafts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Locked" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Thesis Tracker/ }),
    ).toHaveAttribute("href", "/projects/2");
  });
});
