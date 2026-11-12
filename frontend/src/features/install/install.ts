import { useSyncExternalStore } from "react";

// Chrome and Edge only; not in lib.dom.
type InstallPromptEvent = Event & { prompt(): Promise<unknown> };

let promptEvent: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function changed() {
  listeners.forEach((listener) => listener());
}

// The browser fires beforeinstallprompt once, soon after load, so the root layout
// listens from the start and Settings reads what it caught.
export function watchInstall() {
  const onPrompt = (event: Event) => {
    // Keeps the event usable later; Chrome's menu still has its own Install app.
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    changed();
  };
  const onInstalled = () => {
    promptEvent = null;
    installed = true;
    changed();
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

export type InstallState = "installed" | "prompt" | "ios" | "manual";

function isIos() {
  // iPadOS says it is a Mac, but a Mac has no touch screen.
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function installState(): InstallState {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  if (installed || standalone) return "installed";
  if (promptEvent) return "prompt";
  return isIos() ? "ios" : "manual";
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function useInstallState() {
  return useSyncExternalStore(subscribe, installState, (): InstallState => "manual");
}

// A caught event can open the dialog once, so drop it whatever the answer.
export async function promptInstall() {
  const event = promptEvent;
  promptEvent = null;
  changed();
  await event?.prompt();
}
