import { useSyncExternalStore } from "react";

// The status group picked in the desktop sidebar's Applications list, or null when the
// page decides (Offers first, as on a phone). Shared, because on desktop the groups sit
// in the shell's side pane and their panels in the page (same idea as projects-tab.ts).
let tab: string | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function setApplicationsTab(id: string | null) {
  tab = id;
  listeners.forEach((listener) => listener());
}

export function useApplicationsTab() {
  return useSyncExternalStore(
    subscribe,
    () => tab,
    () => null,
  );
}
