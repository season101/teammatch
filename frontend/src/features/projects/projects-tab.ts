import { useSyncExternalStore } from "react";

// Which of Browse | Mine is open on /projects. Shared, because on desktop the tabs sit
// in the shell's side pane and the list in the page (same idea as profile-tab.ts).
let tab = "browse";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function setProjectsTab(id: string) {
  tab = id;
  listeners.forEach((listener) => listener());
}

export function useProjectsTab() {
  return useSyncExternalStore(
    subscribe,
    () => tab,
    () => "browse",
  );
}
