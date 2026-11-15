import { render, screen, within } from "@testing-library/react";
import { ApplicantCard } from "./applicant-card";
import type { Applicant } from "./queries";

const APPLICATION: Applicant = {
  id: 9,
  applicant: {
    id: 3,
    display_name: "Sam Rivera",
    bio: "",
    major: "Computer Science",
    skills: [],
    avatar_url: null,
    github_url: "https://github.com/sam",
    linkedin_url: "",
    has_resume: false,
  },
  note: "",
  status: "pending",
  created_at: "2026-10-16T00:00:00Z",
  match_percent: null,
  committed_elsewhere: false,
};

function renderCard(application = APPLICATION) {
  render(
    <ApplicantCard
      application={application}
      roleTitle="Frontend dev"
      requiredSkillIds={[]}
      onLike={() => {}}
      onPass={() => {}}
    />,
  );
}

test("shows a small card for each link the applicant added, opening in a new tab", () => {
  renderCard();

  const links = within(screen.getByRole("list", { name: "Links" })).getAllByRole("link");
  expect(links).toHaveLength(1);
  expect(links[0]).toHaveAccessibleName("GitHub (opens in a new tab)");
  expect(links[0]).toHaveAttribute("href", "https://github.com/sam");
  expect(links[0]).toHaveAttribute("target", "_blank");
  expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
});

test("an applicant's resume is a third tile that opens the in-app viewer", () => {
  renderCard({ ...APPLICATION, applicant: { ...APPLICATION.applicant, has_resume: true } });

  const resume = screen.getByRole("link", { name: /^Resume/ });
  expect(resume).toHaveAttribute("href", "/profiles/3/resume");
});

test("no link cards when the applicant added none", () => {
  renderCard({ ...APPLICATION, applicant: { ...APPLICATION.applicant, github_url: "" } });
  expect(screen.queryByRole("list", { name: "Links" })).not.toBeInTheDocument();
});
