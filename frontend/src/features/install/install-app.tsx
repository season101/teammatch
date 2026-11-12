"use client";

import { Button } from "@/components/ui/button";
import { promptInstall, useInstallState, type InstallState } from "./install";

const STEPS: Record<InstallState, string> = {
  installed: "Installed",
  prompt: "Add it to your home screen and open it like an app.",
  ios: "In Safari, tap Share, then Add to Home Screen.",
  manual: "Open your browser's menu and choose Install app or Add to Home screen.",
};

// The Settings row (F2-08): an Install button where the browser has one, the steps where it doesn't.
export function InstallApp({ className = "" }: { className?: string }) {
  const state = useInstallState();
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Install TeamMatch</span>
        <span className="text-sm text-muted">{STEPS[state]}</span>
      </span>
      {state === "prompt" && (
        <Button variant="secondary" className="shrink-0" onClick={promptInstall}>
          Install
        </Button>
      )}
    </div>
  );
}
