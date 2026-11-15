import type { components } from "@teammatch/api-client";
import {
  GitHubIcon,
  LinkCard,
  LinkedInIcon,
  shortLink,
} from "@/components/ui/link-card";

type Profile = components["schemas"]["Profile"];

// GitHub and LinkedIn as link cards (F1-15): full cards on Preview, small tiles on the
// applicant card. Only what the person added; nothing at all without either.
export function ProfileLinks({
  profile,
  compact = false,
}: {
  profile: Pick<Profile, "github_url" | "linkedin_url">;
  compact?: boolean;
}) {
  const links = [
    { title: "GitHub", href: profile.github_url, icon: <GitHubIcon /> },
    { title: "LinkedIn", href: profile.linkedin_url, icon: <LinkedInIcon /> },
  ].filter((link) => link.href);
  if (links.length === 0) return null;
  return (
    <ul
      aria-label="Links"
      className={compact ? "flex gap-2" : "flex flex-col gap-2"}
    >
      {links.map((link) => (
        <li key={link.title} className={compact ? "flex flex-1" : undefined}>
          <LinkCard
            external
            compact={compact}
            href={link.href!}
            icon={link.icon}
            title={link.title}
            detail={shortLink(link.href!)}
          />
        </li>
      ))}
    </ul>
  );
}
