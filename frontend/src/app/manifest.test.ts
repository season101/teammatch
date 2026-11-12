import { readFileSync } from "node:fs";
import path from "node:path";

import manifest from "./manifest";

// Width and height sit at bytes 16 and 20 of a PNG (the IHDR chunk).
function pngSize(src: string) {
  const png = readFileSync(path.join(process.cwd(), "public", src));
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

test("opens full screen on the feed, inside the whole site", () => {
  expect(manifest()).toMatchObject({
    id: "/",
    name: "TeamMatch",
    short_name: "TeamMatch",
    description: expect.stringContaining("Swipe on roles"),
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0a10",
    theme_color: "#0b0a10",
  });
});

test("lists 192 and 512 icons plus a maskable 512, each a real PNG of that size", () => {
  const icons = manifest().icons ?? [];

  expect(icons.map((icon) => `${icon.purpose} ${icon.sizes}`)).toEqual([
    "any 192x192",
    "any 512x512",
    "maskable 512x512",
  ]);
  for (const icon of icons) {
    expect(icon.type).toBe("image/png");
    expect(pngSize(icon.src)).toBe(icon.sizes);
  }
});

test("the iPhone icon is 180 px with no alpha channel", () => {
  expect(pngSize("icons/apple-touch-icon.png")).toBe("180x180");
  // Colour type 2 is plain RGB; iOS paints transparent pixels black.
  expect(readFileSync(path.join(process.cwd(), "public/icons/apple-touch-icon.png"))[25]).toBe(2);
});

test("has shortcuts to Discover and Projects", () => {
  expect(manifest().shortcuts).toEqual([
    { name: "Discover", url: "/feed" },
    { name: "Projects", url: "/projects" },
  ]);
});
