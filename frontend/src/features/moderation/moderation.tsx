"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, noticeClass } from "@/components/ui/form-classes";
import { SkeletonRows } from "@/components/ui/skeleton";
import { useMyRole } from "@/features/profiles/queries";
import {
  useAssign,
  useCreateTerm,
  useDemote,
  useModerationProjects,
  useModerators,
  usePromote,
  useTerms,
  type Moderator,
  type ModerationProject,
} from "./queries";

const rowClass =
  "flex flex-wrap items-center justify-between gap-2 rounded-row border border-border bg-surface p-3";

const who = (moderator: Moderator) => moderator.display_name || moderator.email;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `moderation-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Problem({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <p role="alert" className={noticeClass}>
      {error.message}
    </p>
  );
}

// The admin's page: add a term, choose the moderators, put them on projects.
// The API refuses everyone else (403), so this only decides what to draw.
export function Moderation() {
  const role = useMyRole();
  const admin = role === "admin";
  const terms = useTerms(admin);
  const moderators = useModerators(admin);
  const projects = useModerationProjects(admin);

  if (!role) return <SkeletonRows label="Loading moderation" rows={6} />;
  if (!admin) {
    return (
      <p role="alert" className={noticeClass}>
        Only an admin can open this page.
      </p>
    );
  }
  if (terms.isPending || moderators.isPending || projects.isPending) {
    return <SkeletonRows label="Loading moderation" rows={6} />;
  }
  if (terms.isError || moderators.isError || projects.isError) {
    return (
      <p role="alert" className={noticeClass}>
        Could not load this page. Refresh to try again.
      </p>
    );
  }

  return (
    <>
      <Section title="Terms">
        <ul aria-label="Terms" className="flex flex-col gap-2">
          {terms.data.map((term) => (
            <li key={term.id} className={rowClass}>
              <span className="font-semibold">{term.name}</span>
              <span className="text-sm text-muted">
                {term.start_date} to {term.end_date}
              </span>
            </li>
          ))}
        </ul>
        <TermForm />
      </Section>

      <Section title="Moderators">
        <ModeratorList moderators={moderators.data} />
        <PromoteForm />
      </Section>

      <Section title="Projects">
        {projects.data.length === 0 ? (
          <p className="text-muted">No projects yet.</p>
        ) : (
          <ul aria-label="Projects" className="flex flex-col gap-2">
            {projects.data.map((project) => (
              <ProjectRow key={project.id} project={project} moderators={moderators.data} />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function TermForm() {
  const create = useCreateTerm();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { name: name.trim(), start_date: start, end_date: end },
      {
        onSuccess: () => {
          setName("");
          setStart("");
          setEnd("");
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card border border-border p-4">
      <h3 className="font-semibold">New term</h3>
      <label className="font-medium">
        Name
        <input
          className={inputClass}
          value={name}
          maxLength={50}
          required
          placeholder="Spring 2027"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 font-medium">
          Starts
          <input
            type="date"
            className={inputClass}
            value={start}
            required
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="flex-1 font-medium">
          Ends
          <input
            type="date"
            className={inputClass}
            value={end}
            required
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
      </div>
      <Problem error={create.error} />
      <Button type="submit" size="sm" className="self-start" disabled={create.isPending}>
        {create.isPending ? "Adding…" : "Add term"}
      </Button>
    </form>
  );
}

function ModeratorList({ moderators }: { moderators: Moderator[] }) {
  const demote = useDemote();
  if (moderators.length === 0) {
    return <p className="text-muted">No moderators yet.</p>;
  }
  return (
    <>
      <ul aria-label="Moderators" className="flex flex-col gap-2">
        {moderators.map((moderator) => (
          <li key={moderator.id} className={rowClass}>
            <div>
              <p className="font-semibold">{who(moderator)}</p>
              <p className="text-sm text-muted">{moderator.email}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              disabled={demote.isPending}
              aria-label={`Remove ${who(moderator)} as a moderator`}
              onClick={() => demote.mutate(moderator.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Problem error={demote.error} />
    </>
  );
}

function PromoteForm() {
  const promote = usePromote();
  const [email, setEmail] = useState("");

  return (
    <form
      className="flex flex-col gap-3 rounded-card border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        promote.mutate(email.trim(), { onSuccess: () => setEmail("") });
      }}
    >
      <label className="font-medium">
        Make someone a moderator
        <input
          type="email"
          className={inputClass}
          value={email}
          required
          placeholder="name@latech.edu"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <Problem error={promote.error} />
      <Button type="submit" size="sm" className="self-start" disabled={promote.isPending}>
        {promote.isPending ? "Adding…" : "Add moderator"}
      </Button>
    </form>
  );
}

function ProjectRow({
  project,
  moderators,
}: {
  project: ModerationProject;
  moderators: Moderator[];
}) {
  const assign = useAssign();
  const [picked, setPicked] = useState("");
  const assigned = project.moderators.map((moderator) => moderator.id);
  const free = moderators.filter((moderator) => !assigned.includes(moderator.id));

  return (
    <li className="flex flex-col gap-3 rounded-row border border-border bg-surface p-3">
      <div>
        <p className="font-semibold">{project.title}</p>
        <p className="text-sm text-muted">
          {project.term} · {project.status} · by {project.owner_name || "an unnamed owner"}
        </p>
      </div>
      {project.moderators.length > 0 && (
        <ul aria-label={`Moderators on ${project.title}`} className="flex flex-wrap gap-2">
          {project.moderators.map((moderator) => (
            <li
              key={moderator.id}
              className="flex items-center gap-1 rounded-pill border border-border bg-surface-2 pl-3 text-sm"
            >
              {who(moderator)}
              <Button
                variant="danger"
                size="sm"
                disabled={assign.isPending}
                aria-label={`Take ${who(moderator)} off ${project.title}`}
                onClick={() =>
                  assign.mutate({ project: project.id, user: moderator.id, on: false })
                }
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {free.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!picked) return;
            assign.mutate(
              { project: project.id, user: Number(picked), on: true },
              { onSuccess: () => setPicked("") },
            );
          }}
        >
          <select
            aria-label={`Moderator for ${project.title}`}
            className={`${inputClass} mt-0 min-h-11 flex-1 sm:min-h-9`}
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
          >
            <option value="">Choose a moderator</option>
            {free.map((moderator) => (
              <option key={moderator.id} value={moderator.id}>
                {who(moderator)}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            disabled={!picked || assign.isPending}
          >
            Assign
          </Button>
        </form>
      )}
      <Problem error={assign.error} />
    </li>
  );
}
