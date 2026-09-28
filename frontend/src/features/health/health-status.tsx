"use client";

import { useHealth, type Health } from "./queries";

type Tone = "ok" | "bad" | "pending";

const dot: Record<Tone, string> = {
  ok: "bg-emerald-500",
  bad: "bg-rose-500",
  pending: "bg-zinc-400 animate-pulse",
};

function Row({ label, tone, detail }: { label: string; tone: Tone; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2.5">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className={`size-2.5 rounded-full ${dot[tone]}`} />
        <span className="font-medium">{label}</span>
      </span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{detail}</span>
    </li>
  );
}

function checkRow(label: string, check: Health["checks"]["database"]) {
  return (
    <Row
      key={label}
      label={label}
      tone={check.ok ? "ok" : "bad"}
      detail={check.ok ? `${check.latency_ms} ms` : (check.error ?? "down")}
    />
  );
}

export function HealthStatus() {
  const { data, isPending, isError, dataUpdatedAt } = useHealth();

  let summary = "Checking…";
  if (isError) summary = "API unreachable";
  else if (data) summary = data.status === "ok" ? "All systems go" : "Degraded";

  return (
    <section
      aria-labelledby="health-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="health-heading" className="text-lg font-semibold">
          System status
        </h2>
        <p role="status" className="text-sm font-medium">
          {summary}
        </p>
      </div>
      <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
        <Row
          label="API"
          tone={isPending ? "pending" : isError ? "bad" : "ok"}
          detail={data ? `v${data.version}` : isError ? "no response" : "…"}
        />
        {data ? (
          [checkRow("Database", data.checks.database), checkRow("Redis", data.checks.redis)]
        ) : (
          <>
            <Row label="Database" tone={isError ? "bad" : "pending"} detail="…" />
            <Row label="Redis" tone={isError ? "bad" : "pending"} detail="…" />
          </>
        )}
      </ul>
      {dataUpdatedAt > 0 && (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Checked {new Date(dataUpdatedAt).toLocaleTimeString()} · refreshes every 15 s
        </p>
      )}
    </section>
  );
}
