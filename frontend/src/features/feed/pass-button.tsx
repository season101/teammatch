"use client";

import { Button } from "@/components/ui/button";
import { useDismiss } from "./queries";

// The owner is never told about a pass (BR-10).
export function PassButton({ roleId }: { roleId: number }) {
  const dismiss = useDismiss();

  return (
    <div className="flex flex-col gap-2">
      {dismiss.isError && (
        <p role="alert" className="text-sm text-pass">
          {dismiss.error.message}
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={dismiss.isPending}
        onClick={() => dismiss.mutate(roleId)}
      >
        {dismiss.isPending ? "Passing…" : "Pass"}
      </Button>
    </div>
  );
}
