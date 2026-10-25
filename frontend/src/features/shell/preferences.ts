import { useSyncExternalStore } from "react";

// Per-browser settings, kept in localStorage. Readers re-render when one is saved, here or in another tab.
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function usePreference(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => null);
}

function savePreference(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // shortcut: with storage blocked the choice isn't saved; move settings to the profile API if that matters.
  }
  // "storage" only fires in other tabs, so tell this one too.
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

// Settings → Keyboard shortcuts. On unless turned off.
const SHORTCUTS = "teammatch:keyboard-shortcuts";

// The deck (F3-03) and review queue (F4-04) check this before handling a key.
export function useShortcutsEnabled() {
  return usePreference(SHORTCUTS) !== "off";
}

export function setShortcutsEnabled(on: boolean) {
  savePreference(SHORTCUTS, on ? "on" : "off");
}

// Settings → Theme. Same key as applySavedTheme in theme-script.ts.
export type Theme = "system" | "dark" | "light";
const THEME = "teammatch:theme";

export function useTheme(): Theme {
  const saved = usePreference(THEME);
  return saved === "dark" || saved === "light" ? saved : "system";
}

// System drops data-theme, so the OS setting decides (globals.css).
export function setTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  savePreference(THEME, theme === "system" ? null : theme);
}
