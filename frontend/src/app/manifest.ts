import type { MetadataRoute } from "next";

import { APP_DESCRIPTION, APP_NAME, BG_DARK } from "@/features/install/app-info";

// Served at /manifest.webmanifest; Next adds the <link rel="manifest"> itself.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BG_DARK,
    theme_color: BG_DARK,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Discover", url: "/feed" },
      { name: "Projects", url: "/projects" },
    ],
  };
}
