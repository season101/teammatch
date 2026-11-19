import { useId } from "react";
import { Chip } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { MatchBadge } from "@/components/ui/match-badge";
import { Avatar } from "@/features/profiles/avatar";
import { ProfileLinks } from "@/features/profiles/profile-links";
import type { Applicant } from "./queries";

// One candidate for one role, as in docs/design/components/applicant-card.md.
// The match percentage badge and the Details panel are not built yet.
export function ApplicantCard({
  application,
  roleTitle,
  requiredSkillIds,
  missingSkills = [],
  onLike,
  onPass,
}: {
  application: Applicant;
  roleTitle: string;
  // The skills the role asks for. The ones the applicant has are shown first, in lime.
  requiredSkillIds: number[];
  // Names of the required skills the applicant doesn't list.
  missingSkills?: string[];
  onLike: () => void;
  onPass: () => void;
}) {
  const { applicant } = application;
  const name = applicant.display_name || "Unnamed applicant";
  // A seat on another open project this term: a like would be refused (applicant_committed).
  const elsewhere = application.committed_elsewhere;
  const whyNoLike = useId();
  const matched = applicant.skills.filter((skill) =>
    requiredSkillIds.includes(skill.id),
  );
  const others = applicant.skills.filter(
    (skill) => !requiredSkillIds.includes(skill.id),
  );

  return (
    <article
      aria-label={`Applicant ${name} for ${roleTitle}`}
      className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="flex items-center gap-3 bg-surface-2 p-5">
        {/* Only the avatar greys out. Text keeps its contrast (WCAG 1.4.3); the tag and
            the turned-off Like carry the signal. */}
        <Avatar
          name={name}
          url={applicant.avatar_url}
          className={`size-14 text-lg ${elsewhere ? "border border-border bg-surface text-muted grayscale" : "bg-cta text-on-cta"}`}
        />
        <div>
          <p className="text-2xl font-semibold">{name}</p>
          {applicant.major && <p className="text-muted">{applicant.major}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-4 p-5">
        {requiredSkillIds.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <MatchBadge percent={(matched.length / requiredSkillIds.length) * 100} />
            Has {matched.length} of {requiredSkillIds.length} required{" "}
            {requiredSkillIds.length === 1 ? "skill" : "skills"}
          </p>
        )}

        {missingSkills.length > 0 && (
          <p className="text-sm text-muted">
            Doesn&apos;t list: <span className="text-text">{missingSkills.join(", ")}</span>
          </p>
        )}

        {applicant.skills.length > 0 && (
          <ul aria-label={`${name}'s skills`} className="flex flex-wrap gap-2">
            {matched.map((skill) => (
              <li key={skill.id}>
                <Chip variant="matched">{skill.name}</Chip>
              </li>
            ))}
            {others.map((skill) => (
              <li key={skill.id}>
                <Chip>{skill.name}</Chip>
              </li>
            ))}
          </ul>
        )}

        {application.note ? (
          <blockquote className="border-l-2 border-border pl-3 text-text">
            {application.note}
          </blockquote>
        ) : (
          <p className="text-sm text-muted">No note.</p>
        )}

        {applicant.bio && (
          <p className="line-clamp-4 text-sm text-muted">{applicant.bio}</p>
        )}

        <ProfileLinks profile={applicant} compact />
      </div>

      {elsewhere && (
        <div className="flex flex-col items-start gap-2 px-5 pb-5">
          <Chip variant="selected">Has a spot elsewhere</Chip>
          <p id={whyNoLike} className="text-sm text-muted">
            {name} committed to another project this term, so you can&apos;t like them. You
            can still pass.
          </p>
        </div>
      )}

      <div className="flex gap-3 border-t border-border p-5">
        <button
          type="button"
          aria-label={`Pass on ${name}`}
          className={`${buttonClasses("secondary")} flex-1 hover:border-pass hover:text-pass active:border-pass active:text-pass`}
          onClick={onPass}
        >
          Pass
        </button>
        <button
          type="button"
          aria-label={`Like ${name}`}
          // aria-disabled, not disabled, so the button and its reason stay reachable.
          aria-disabled={elsewhere || undefined}
          aria-describedby={elsewhere ? whyNoLike : undefined}
          className={`${buttonClasses("cta")} flex-1 ${elsewhere ? "cursor-not-allowed opacity-50" : "hover:bg-apply hover:text-on-apply active:bg-apply active:text-on-apply"}`}
          onClick={elsewhere ? undefined : onLike}
        >
          Like
        </button>
      </div>
    </article>
  );
}
