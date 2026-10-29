"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useSession } from "@/features/accounts/require-sign-in";
import { useMyApplications, useWithdraw, type MyApplication } from "./queries";

const FILTERS = [
  { id: "all", label: "All", keep: () => true },
  {
    id: "pending",
    label: "Pending",
    keep: (a: MyApplication) => a.status === "pending",
  },
  {
    id: "filled",
    label: "Filled",
    keep: (a: MyApplication) => a.status === "liked",
  },
  {
    id: "closed",
    label: "Closed",
    keep: (a: MyApplication) =>
      a.status === "passed" || a.status === "withdrawn",
  },
];

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// Status is shape as well as text (screen 11): liked shows as Filled (DD-22), closed ones are muted.
export function StatusChip({
  status = "pending",
}: {
  status?: MyApplication["status"];
}) {
  if (status === "liked") return <Chip variant="matched">Filled</Chip>;
  if (status === "passed")
    return (
      <span className="opacity-60">
        <Chip>Passed</Chip>
      </span>
    );
  if (status === "withdrawn")
    return (
      <span className="opacity-60">
        <Chip>
          <s>Withdrawn</s>
        </Chip>
      </span>
    );
  return <Chip>Pending</Chip>;
}

function statusLine({ status, role, created_at, updated_at }: MyApplication) {
  const owner = role.project.owner_name;
  if (status === "liked")
    return "You're in. The team locks when every role fills.";
  if (status === "passed")
    return `${owner || "The owner"} picked someone else.`;
  if (status === "withdrawn") return `You withdrew on ${day(updated_at)}.`;
  return `Waiting on ${owner || "the owner"} · applied ${day(created_at)}`;
}

export function MyApplications() {
  const applications = useMyApplications();
  const withdraw = useWithdraw();
  const [target, setTarget] = useState<MyApplication | null>(null);

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

  return (
    <>
      {withdraw.isError && (
        <p role="alert" className="text-danger">
          {withdraw.error.message}
        </p>
      )}
      <Tabs
        label="Filter applications"
        tabs={FILTERS.map((filter) => {
          const shown = applications.data.filter(filter.keep);
          return {
            id: filter.id,
            label: filter.label,
            panel:
              shown.length === 0 ? (
                <p className="text-sm text-muted">Nothing here.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {shown.map((application) => (
                    <li
                      key={application.id}
                      className="flex flex-col gap-2 rounded-row border border-border bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {application.role.title}
                          </p>
                          <p className="text-sm text-muted">
                            {application.role.project.title}
                          </p>
                        </div>
                        <StatusChip status={application.status} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted">
                          {statusLine(application)}
                        </p>
                        {/* Filled applications can't be withdrawn (BR-11), so only pending ones get the action. */}
                        {application.status === "pending" && (
                          <Button
                            variant="danger"
                            size="sm"
                            aria-label={`Withdraw from ${application.role.title}`}
                            onClick={() => setTarget(application)}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ),
          };
        })}
      />
      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Withdraw your application?"
        ctaLabel="Keep my application"
        onCta={() => setTarget(null)}
        escapeLabel="Withdraw"
        onEscape={() => {
          if (target) withdraw.mutate(target.id);
          setTarget(null);
        }}
      >
        {target &&
          `The owner won't see you for ${target.role.title} anymore. You can't apply to it again.`}
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
