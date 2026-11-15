// The root layout inlines this into <head> as `(${applySavedTheme})()`, so the
// saved theme applies before the first paint. It must stay self-contained (no
// imports or closures), so the key repeats the one in preferences.ts.
export function applySavedTheme() {
  function apply() {
    try {
      const theme = localStorage.getItem("teammatch:theme");
      if (theme === "dark" || theme === "light") {
        document.documentElement.dataset.theme = theme;
      } else {
        delete document.documentElement.dataset.theme;
      }
    } catch {
      // Storage is blocked: follow the OS setting.
    }
  }
  apply();
  // Settings → Theme in another tab saves the key, so every open tab follows,
  // whatever page it's on. A null key means that tab cleared storage.
  window.addEventListener("storage", (event) => {
    if (event.key === "teammatch:theme" || event.key === null) apply();
  });
}
