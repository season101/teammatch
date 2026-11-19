import type { Metadata } from "next";
import type { ReactNode } from "react";

// The page is a client component, so its title lives here.
export const metadata: Metadata = { title: "Design system · TeamMatch" };

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
