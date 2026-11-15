import type { components } from "@teammatch/api-client";
import {
  FileIcon,
  GitHubIcon,
  LinkCard,
  LinkedInIcon,
  shortLink,
} from "@/components/ui/link-card";
import { resumeViewerHref } from "./queries";

type Profile = components["schemas"]["Profile"];

// GitHub, LinkedIn and the resume as link cards (F1-15, F1-16): full cards on Preview,
// small tiles on the applicant card. Only what the person added; nothing without any.
export function ProfileLinks({
  profile,
  compact = false,
}: {
  profile: Pick<Profile, "id" | "github_url" | "linkedin_url" | "has_resume">;
  compact?: boolean;
}) {
  const links = [
    { title: "GitHub", href: profile.github_url, icon: <GitHubIcon /> },
    { title: "LinkedIn", href: profile.linkedin_url, icon: <LinkedInIcon /> },
  ]
    .filter((link) => link.href)
    .map((link) => ({
      ...link,
      href: link.href!,
      detail: shortLink(link.href!),
      external: true,
    }));
  if (profile.has_resume) {
    // Read inside the app (F1-17); the API checks who's asking.
    links.push({
      title: "Resume",
      href: resumeViewerHref(profile.id),
      icon: <FileIcon />,
      detail: "PDF. Read it here.",
      external: false,
    });
  }
  if (links.length === 0) return null;
  return (
    <ul
      aria-label="Links"
      className={compact ? "flex gap-2" : "flex flex-col gap-2"}
    >
      {links.map((link) => (
        <li key={link.title} className={compact ? "flex flex-1" : undefined}>
          <LinkCard compact={compact} {...link} />
        </li>
      ))}
    </ul>
  );
}
