import { HealthStatus } from "@/features/health/health-status";

export default function StatusPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold">Status</h1>
      <HealthStatus />
    </main>
  );
}
