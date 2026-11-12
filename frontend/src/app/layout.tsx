import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME, BG_DARK, BG_LIGHT } from "@/features/install/app-info";
import { AppInstall } from "@/features/install/app-install";
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
  title: APP_NAME,
  description: APP_DESCRIPTION,
  // iPhone home-screen app (F2-08). The manifest comes from app/manifest.ts.
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// cover: the page reaches the screen edges, and globals.css pads the body by the safe areas.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: BG_DARK },
    { media: "(prefers-color-scheme: light)", color: BG_LIGHT },
  ],
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
        <AppInstall />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
