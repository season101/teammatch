"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { TeamStrip } from "@/components/ui/team-strip";
import { useSession } from "@/features/accounts/require-sign-in";
import { useProject } from "@/features/projects/queries";
import { useMyProjects } from "@/features/review/queries";
import {
  isBlocked,
  useCommit,
  useDecline,
  useMyApplications,
  useWithdraw,
  type MyApplication,
} from "./queries";

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Status is shape as well as text: an offer is violet, a committed seat is lime with
// a tick, and anything closed is muted (DD-31).
export function StatusChip({
  status = "pending",
}: {
  status?: MyApplication["status"];
}) {
  if (status === "liked") return <Chip variant="selected">Offer</Chip>;
  if (status === "committed") return <Chip variant="matched">Committed</Chip>;
  if (status === "pending") return <Chip>Pending</Chip>;
  return (
    <span className="opacity-60">
      <Chip>Closed</Chip>
    </span>
  );
}

// byCommit: withdrawn for me when I committed to another seat.
function statusLine(
  { status, role, created_at, updated_at }: MyApplication,
  byCommit: boolean,
) {
  const owner = role.project.owner_name;
  if (status === "passed")
    return `${owner || "The owner"} picked someone else.`;
  if (status === "declined") return `You declined on ${day(updated_at)}.`;
  if (status === "withdrawn")
    return byCommit
      ? "Closed when you committed."
      : `You withdrew on ${day(updated_at)}.`;
  return `Waiting on ${owner || "the owner"} · applied ${day(created_at)}`;
}

// What the final confirm says will close (screen 28).
function whatCloses(offers: number, pending: number) {
  const parts = [
    offers > 0 && `${offers} other ${offers === 1 ? "offer" : "offers"}`,
    pending > 0 && plural(pending, "pending application"),
  ].filter(Boolean);
  if (parts.length === 0) return "You can't undo this.";
  return `Your ${parts.join(" and ")} ${offers + pending === 1 ? "closes" : "close"}, and you can't undo this.`;
}

// The seat as a project cover, with the team strip once the project's roles load.
function Seat({
  application,
  children,
}: {
  application: MyApplication;
  children: (roles: { title: string; open: boolean }[] | undefined) => ReactNode;
}) {
  const { role } = application;
  const project = useProject(role.project.id);
  const roles = project.data?.roles;
  return (
    <article
      aria-label={`${role.title} on ${role.project.title}`}
      className="flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface"
    >
      <header className="flex flex-col gap-6 bg-linear-to-br from-cover-indigo to-[color-mix(in_oklab,var(--color-cover-indigo)_62%,black)] p-5 text-white">
        {roles && (
          <TeamStrip
            segments={roles.map((other) =>
              other.status === "filled"
                ? "filled"
                : other.id === role.id
                  ? "current"
                  : "open",
            )}
          />
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/85">
            {role.project.title}
          </p>
          <h2 className="font-display text-2xl font-extrabold">{role.title}</h2>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-5">
        {children(
          roles?.map((other) => ({
            title: other.title,
            open: other.status !== "filled",
          })),
        )}
      </div>
    </article>
  );
}

// A pending or closed application.
function Row({
  application,
  byCommit = false,
  onWithdraw,
}: {
  application: MyApplication;
  byCommit?: boolean;
  onWithdraw?: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-row border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{application.role.title}</p>
          <p className="text-sm text-muted">{application.role.project.title}</p>
        </div>
        <StatusChip status={application.status} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">{statusLine(application, byCommit)}</p>
        {/* Only pending ones can be withdrawn (BR-11). An offer is declined instead. */}
        {onWithdraw && (
          <Button
            variant="danger"
            aria-label={`Withdraw from ${application.role.title}`}
            onClick={onWithdraw}
          >
            Withdraw
          </Button>
        )}
      </div>
    </li>
  );
}

const NOTHING = <p className="text-sm text-muted">Nothing here.</p>;

export function MyApplications() {
  const applications = useMyApplications();
  // Only to name my open project when a commit is blocked (screen 30).
  const myOpenProject = useMyProjects().data?.find(
    (project) => project.status === "open",
  );
  const withdraw = useWithdraw();
  const commit = useCommit();
  const decline = useDecline();
  const [withdrawing, setWithdrawing] = useState<MyApplication | null>(null);
  const [committing, setCommitting] = useState<MyApplication | null>(null);
  const [declining, setDeclining] = useState<MyApplication | null>(null);
  const [blocked, setBlocked] = useState<MyApplication | null>(null);

  if (applications.isPending)
    return <p className="text-muted">Loading your applications…</p>;
  if (applications.isError) {
    return (
      <p role="alert" className="text-danger">
        Couldn&apos;t load your applications. Refresh the page to try again.
      </p>
    );
  }
  if (applications.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <h2 className="font-display text-2xl font-extrabold">
          No applications yet
        </h2>
        <p className="text-muted">
          Swipe right on a role to apply. It shows up here with its status.
        </p>
        <Link href="/feed" className={buttonClasses()}>
          Go to Discover
        </Link>
      </div>
    );
  }

  const withStatus = (...statuses: MyApplication["status"][]) =>
    applications.data.filter((a) => statuses.includes(a.status));
  const offers = withStatus("liked");
  const pending = withStatus("pending");
  const committed = withStatus("committed");
  const closed = withStatus("declined", "passed", "withdrawn");
  // The commit withdraws my other applications in the same transaction, so they're stamped after it.
  const committedAt = committed[0] && Date.parse(committed[0].updated_at);
  const byCommit = (a: MyApplication) =>
    Boolean(committedAt) &&
    a.status === "withdrawn" &&
    Date.parse(a.updated_at) >= committedAt;
  const closedByCommit = closed.filter(byCommit);

  const busy = commit.isPending || decline.isPending;
  // The blocked commit gets its own dialog instead.
  const error =
    withdraw.error ??
    decline.error ??
    (isBlocked(commit.error) ? null : commit.error);
  // Offers open first when there are any (screen 27), and a commit lands on Committed.
  const first =
    offers.length > 0 ? "offers" : committed.length > 0 ? "committed" : "pending";

  const seat = (a: MyApplication | null) => ({
    role: a?.role.title ?? "",
    project: a?.role.project.title ?? "",
    owner: a?.role.project.owner_name || "The owner",
  });

  return (
    <>
      {error && (
        <p role="alert" className="text-danger">
          {error.message}
        </p>
      )}
      <Tabs
        key={first}
        defaultTab={first}
        label="Filter applications"
        tabs={[
          {
            id: "offers",
            label: offers.length > 0 ? `Offers ${offers.length}` : "Offers",
            panel:
              offers.length === 0 ? (
                NOTHING
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-muted">
                    Commit to one. Your other offers close when you do.
                  </p>
                  <ul className="grid gap-3 lg:grid-cols-3">
                    {offers.map((offer) => {
                      const { role, project, owner } = seat(offer);
                      return (
                        <li key={offer.id}>
                          <Seat application={offer}>
                            {(roles) => (
                              <>
                                <p className="text-sm text-muted">
                                  {owner} liked you
                                  {roles &&
                                    ` · ${roles.filter((r) => !r.open).length} of ${roles.length} roles filled`}
                                </p>
                                <p>{offer.role.project.pitch}</p>
                                <div className="mt-auto flex items-center gap-3">
                                  <Button
                                    variant="danger"
                                    disabled={busy}
                                    aria-label={`Decline ${role} on ${project}`}
                                    onClick={() => setDeclining(offer)}
                                  >
                                    Decline
                                  </Button>
                                  {/* Secondary, so the dialog holds the view's one CTA. */}
                                  <Button
                                    variant="secondary"
                                    disabled={busy}
                                    className="flex-1"
                                    aria-label={`Commit to ${role} on ${project}`}
                                    onClick={() => setCommitting(offer)}
                                  >
                                    Commit
                                  </Button>
                                </div>
                              </>
                            )}
                          </Seat>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
          },
          {
            id: "pending",
            label: "Pending",
            panel:
              pending.length === 0 ? (
                NOTHING
              ) : (
                <ul className="flex flex-col gap-3">
                  {pending.map((application) => (
                    <Row
                      key={application.id}
                      application={application}
                      onWithdraw={() => setWithdrawing(application)}
                    />
                  ))}
                </ul>
              ),
          },
          {
            id: "committed",
            label: "Committed",
            panel:
              committed.length === 0 ? (
                NOTHING
              ) : (
                <div className="flex flex-col gap-6">
                  {committed.map((application) => (
                    <div key={application.id} className="max-w-xl">
                      <Seat application={application}>
                        {(roles) => {
                          const left = roles?.filter((r) => r.open) ?? [];
                          return (
                            <>
                              <div>
                                <StatusChip status="committed" />
                              </div>
                              <p>
                                {roles && left.length === 0
                                  ? "You're in. Every role is filled."
                                  : "You're in. Team chat opens when the last role fills."}
                              </p>
                              {left.length > 0 && (
                                <p className="text-sm text-muted">
                                  {plural(left.length, "role")} left:{" "}
                                  {left.map((r) => r.title).join(", ")}
                                </p>
                              )}
                            </>
                          );
                        }}
                      </Seat>
                    </div>
                  ))}
                  {closedByCommit.length > 0 && (
                    <section
                      aria-labelledby="closed-by-commit"
                      className="flex max-w-xl flex-col gap-3"
                    >
                      <h2
                        id="closed-by-commit"
                        className="text-sm font-semibold text-muted"
                      >
                        Closed when you committed
                      </h2>
                      <ul className="flex flex-col gap-3">
                        {closedByCommit.map((application) => (
                          <Row key={application.id} application={application} byCommit />
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              ),
          },
          {
            id: "closed",
            label: "Closed",
            panel:
              closed.length === 0 ? (
                NOTHING
              ) : (
                <ul className="flex flex-col gap-3">
                  {closed.map((application) => (
                    <Row
                      key={application.id}
                      application={application}
                      byCommit={byCommit(application)}
                    />
                  ))}
                </ul>
              ),
          },
        ]}
      />
      <Modal
        open={withdrawing !== null}
        onClose={() => setWithdrawing(null)}
        title="Withdraw your application?"
        ctaLabel="Keep my application"
        onCta={() => setWithdrawing(null)}
        escapeLabel="Withdraw"
        onEscape={() => {
          if (withdrawing) withdraw.mutate(withdrawing.id);
          setWithdrawing(null);
        }}
      >
        {withdrawing &&
          `The owner won't see you for ${withdrawing.role.title} anymore. You can't apply to it again.`}
      </Modal>
      {/* The one gate whose CTA is the risky choice, so focus starts on the escape (DD-34). */}
      <Modal
        open={committing !== null}
        onClose={() => setCommitting(null)}
        title={`Commit to ${seat(committing).project}?`}
        ctaLabel={`Commit to ${seat(committing).project}`}
        onCta={() => {
          const offer = committing;
          setCommitting(null);
          if (!offer) return;
          commit.mutate(offer.id, {
            onError: (error) => {
              if (isBlocked(error)) setBlocked(offer);
            },
          });
        }}
        escapeLabel="Keep my options"
        escapeVariant="ghost"
        focusEscape
      >
        {committing &&
          `You take the ${committing.role.title} seat. ${whatCloses(offers.length - 1, pending.length)}`}
      </Modal>
      <Modal
        open={declining !== null}
        onClose={() => setDeclining(null)}
        title="Decline this offer?"
        ctaLabel="Keep this offer"
        onCta={() => setDeclining(null)}
        escapeLabel="Decline"
        onEscape={() => {
          if (declining) decline.mutate(declining.id);
          setDeclining(null);
        }}
      >
        {declining &&
          `${seat(declining).owner} can offer ${declining.role.title} to someone else. You can't get this offer back.`}
      </Modal>
      <Modal
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title="Close your project first?"
        ctaLabel="Keep this offer"
        onCta={() => setBlocked(null)}
        escapeLabel={
          myOpenProject ? `Go to ${myOpenProject.title}` : "Go to your projects"
        }
        escapeHref={myOpenProject ? `/projects/${myOpenProject.id}` : "/projects"}
        escapeVariant="ghost"
      >
        {blocked &&
          `You own ${myOpenProject?.title ?? "a project"}, which is still open. You can only hold one spot this term, so close it before you commit to ${blocked.role.project.title}.`}
      </Modal>
    </>
  );
}

// The desktop sidebar's Applications tab (Discover mode). Rows open the full list on the stage.
export function ApplicationsPanel() {
  const { data: user } = useSession();
  const applications = useMyApplications(Boolean(user));

  if (!applications.data) return null;
  if (applications.data.length === 0) {
    return (
      <p className="px-3 text-sm text-muted">
        No applications yet. Swipe right on a role to apply.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {applications.data.map((application) => (
        <li key={application.id}>
          <Link
            href="/applications"
            className="flex min-h-11 items-center justify-between gap-2 rounded-row px-3 py-2 hover:bg-surface-2"
          >
            <span>
              <span className="block font-semibold">
                {application.role.title}
              </span>
              <span className="block text-xs text-muted">
                {application.role.project.title}
              </span>
            </span>
            <StatusChip status={application.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
