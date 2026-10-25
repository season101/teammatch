import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { playSplash } from "@/features/landing/splash";
import { applySavedTheme } from "@/features/shell/theme-script";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face: variable, with italics and the optical-size axis for big headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "TeamMatch",
  description: "Swipe on roles, not people. Team formation for CSC 5323.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The scripts below set data-theme and data-splash before React hydrates.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        {/* Run before the first paint, so neither the wrong theme nor a repeat splash flashes. */}
        <script dangerouslySetInnerHTML={{ __html: `(${applySavedTheme})()` }} />
        <script dangerouslySetInnerHTML={{ __html: `(${playSplash})()` }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
