import { useSyncExternalStore } from "react";

// Which of Preview | Edit is open on /profile. Shared, because on desktop the tabs sit
// in the shell's side pane and the panels in the page. Kept for the browser tab's
// session, so Back from the resume viewer reopens Edit (F1-17).
const KEY = "tm-tab:profile";
const listeners = new Set<() => void>();
// Only read when storage is blocked, so the tabs still switch there.
let chosen = "preview";

function read() {
  try {
    return sessionStorage.getItem(KEY) === "edit" ? "edit" : "preview";
  } catch {
    return chosen;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function setProfileTab(id: string) {
  chosen = id;
  try {
    sessionStorage.setItem(KEY, id);
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useProfileTab() {
  return useSyncExternalStore(subscribe, read, () => "preview");
}
