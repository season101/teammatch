// The root layout inlines this into <head> as `(${applySavedTheme})()`, so the
// saved theme applies before the first paint. It must stay self-contained (no
// imports or closures), so the key repeats the one in preferences.ts.
export function applySavedTheme() {
  try {
    const theme = localStorage.getItem("teammatch:theme");
    if (theme === "dark" || theme === "light") {
      document.documentElement.dataset.theme = theme;
    }
  } catch {
    // Storage is blocked: follow the OS setting.
  }
}
