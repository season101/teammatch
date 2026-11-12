#!/bin/sh
# Rebuild the app icon PNGs from the two SVGs in public/icons. Needs uv.
cd "$(dirname "$0")/../public/icons" || exit 1
png() { uv run --quiet --with cairosvg cairosvg "$1" -W "$2" -H "$2" -o "$3"; }
png icon.svg 192 icon-192.png
png icon.svg 512 icon-512.png
png icon-maskable.svg 512 icon-maskable-512.png
# iOS wants an opaque square and rounds it itself.
png icon-maskable.svg 180 apple-touch-icon.png
