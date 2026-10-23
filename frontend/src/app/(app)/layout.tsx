import type { Viewport } from "next";
import { AppShell } from "@/features/shell/app-shell";

// cover: lets the phone tab bar pad itself for the home indicator (env(safe-area-inset-bottom)).
export const viewport: Viewport = { viewportFit: "cover" };

// Signed-in screens share the navigation. The landing and auth pages sit outside this group.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
