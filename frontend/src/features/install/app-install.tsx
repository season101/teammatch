"use client";

import { useEffect } from "react";

import { watchInstall } from "./install";

// In the root layout: registers the service worker and catches the install prompt.
export function AppInstall() {
  useEffect(() => {
    // Production only: in dev the worker's offline page would hide a restarting dev server.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // No worker just means no offline page.
      });
    }
    return watchInstall();
  }, []);
  return null;
}
