import { Logo } from "./logo";

// The root layout inlines this into <head> as `(${playSplash})()`, so it runs
// before the first paint and must stay self-contained (no imports or closures).
// Without it (no JavaScript), data-splash is never set and the splash never shows.
export function playSplash() {
  try {
    const root = document.documentElement;
    if (
      location.pathname !== "/" ||
      sessionStorage.getItem("tm-splash") ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    sessionStorage.setItem("tm-splash", "1");
    root.dataset.splash = "play";
    // Stops a replay on client-side navigation back to /, and frees the page
    // even if the animation never runs. The animation itself ends at ~1 s.
    setTimeout(() => {
      root.dataset.splash = "done";
    }, 1500);
  } catch {
    // Storage is blocked: skip the splash.
  }
}

// Shown once per tab session while the landing page loads. It covers content
// that is already painted and never holds it back.
// See docs/design/patterns/feedback-states.md#splash.
export function Splash() {
  return (
    <div
      data-theme="dark"
      aria-hidden="true"
      className="splash pointer-events-none fixed inset-0 z-50 place-items-center bg-bg text-text"
    >
      <Logo spark className="text-hero" />
    </div>
  );
}
