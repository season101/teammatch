import { Chip } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { initials } from "@/features/teams/my-team";
import type { Applicant } from "./queries";

// One candidate for one role, as in docs/design/components/applicant-card.md.
// Match badge and the Details panel come in later PRs.
export function ApplicantCard({
  application,
  roleTitle,
  disabled,
  onLike,
  onPass,
}: {
  application: Applicant;
  roleTitle: string;
  disabled: boolean;
  onLike: () => void;
  onPass: () => void;
}) {
  const { applicant } = application;
  const name = applicant.display_name || "Unnamed applicant";

  return (
    <article
      aria-label={`Applicant ${name} for ${roleTitle}`}
      className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="flex items-center gap-3 bg-surface-2 p-5">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-cta text-lg font-bold text-on-cta"
        >
          {initials(name)}
        </span>
        <div>
          <p className="text-2xl font-semibold">{name}</p>
          {applicant.major && <p className="text-muted">{applicant.major}</p>}
        </div>
      </header>

      <div className="flex flex-col gap-4 p-5">
        {applicant.skills.length > 0 && (
          <ul aria-label={`${name}'s skills`} className="flex flex-wrap gap-2">
            {applicant.skills.map((skill) => (
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
      </div>

      <div className="flex gap-3 border-t border-border p-5">
        <button
          type="button"
          aria-label={`Pass on ${name}`}
          disabled={disabled}
          className={`${buttonClasses("secondary")} flex-1 hover:border-pass hover:text-pass`}
          onClick={onPass}
        >
          Pass
        </button>
        <button
          type="button"
          aria-label={`Like ${name}`}
          disabled={disabled}
          className={`${buttonClasses("cta")} flex-1 hover:bg-apply hover:text-on-apply`}
          onClick={onLike}
        >
          Like
        </button>
      </div>
    </article>
  );
}
